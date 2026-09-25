// Hidden allowances. Some apps cap a free action without ever showing a counter (a guest chat that
// allows N messages, then asks the user to sign up). The explorer's drain probe measures that cap by
// repeating the send until a wall appears, and records "limit after N sends" on the wall edge.
// If the synthesizer didn't already turn that into economy items, this pass does: a quota resource,
// a one-unit sink for the send, a daily-or-unknown free source of N, and the wall. Generic: it works
// for any capped action (messages, images, edits), named from the action itself.
import type { Economy, Edge, Screen } from "../core/schema.ts";
import { actionNoun, humanizeAction } from "../core/humanize.ts";

const LIMIT_AFTER = /limit after (\d+) sends?/i;

const plural = (w: string) => (/(s|x|ch|sh)$/.test(w) ? `${w}es` : /[^aeiou]y$/.test(w) ? `${w.slice(0, -1)}ies` : `${w}s`);

/** The measured cap on an edge, if the explorer recorded one. */
export function measuredCap(e: Edge): number | null {
  if (!e.limitHit) return null;
  for (const f of e.effects) if (f.kind === "appeared") { const m = LIMIT_AFTER.exec(f.text); if (m) return Number(m[1]); }
  return null;
}

export function quotaFromLimits(economy: Economy, edges: Edge[], screens: Screen[]): Economy {
  const e: Economy = structuredClone(economy);
  const screen = (id: string) => screens.find(s => s.id === id);
  for (const wallEdge of edges) {
    const cap = measuredCap(wallEdge);
    if (cap == null) continue;
    // A visible counter already explains this wall (credits etc.): nothing hidden to add.
    const sameAction = edges.filter(x => x.from === wallEdge.from && x.action === wallEdge.action);
    if (sameAction.some(x => x.effects.some(f => f.kind === "counter"))) continue;
    if (e.sinks.some(k => k.edges.some(id => sameAction.some(x => x.id === id)))) continue;

    const action = screen(wallEdge.from)?.actions.find(a => a.id === wallEdge.action);
    const verb = humanizeAction(action?.intent ?? "use the feature");
    const noun = actionNoun(verb) ?? "use";
    const unit = plural(noun);
    const wallScreen = screen(wallEdge.to);
    // Quote the wall's own limit/upsell text when it has one, so the claim stays tied to the screen.
    const quote = wallScreen?.signals.find(s => s.kind === "limit" || s.kind === "upsell")?.text
      ?? wallScreen?.elements.find(el => /limit|free|sign ?up|log ?in|create (an )?account|come back|upgrade/i.test(el.text ?? el.label ?? ""))?.text;
    const ev = { obs: wallScreen?.representative ?? wallEdge.to, quote, verified: !!quote };
    const n = e.resources.length + 1;
    const rid = `rq${n}`;
    e.resources.push({
      id: rid, name: `free ${unit}`, unit, kind: "quota",
      shownOn: [], observedValues: [cap], conf: "observed",
      evidence: [{ obs: wallEdge.id, quote: `limit after ${cap} sends`, verified: false }, ...(quote ? [ev] : [])],
    });
    e.sinks.push({
      id: `kq${n}`, resource: rid, amount: 1, action: verb, edges: sameAction.map(x => x.id),
      conf: "observed", evidence: [{ obs: wallEdge.id, quote: `limit after ${cap} sends`, verified: false }],
    });
    e.sources.push({
      id: `sq${n}`, resource: rid, amount: cap, cadence: "unknown",
      how: `Free allowance before the wall (measured: blocked after ${cap} ${cap === 1 ? noun : unit})`,
      screen: wallEdge.from, conf: "observed", evidence: [{ obs: wallEdge.id, quote: `limit after ${cap} sends`, verified: false }],
    });
    const existing = e.walls.find(w => w.edge === wallEdge.id);
    if (existing) existing.resource ??= rid;
    else {
      const decline = edges.find(x => x.from === wallEdge.to && (x.transition === "back" || /not now|no thanks|close|later|dismiss/i.test(x.action)));
      e.walls.push({
        id: `wq${n}`, edge: wallEdge.id, resource: rid, blockedIntent: verb, shows: wallEdge.to,
        offers: e.offers.filter(o => o.screen === wallEdge.to).map(o => o.id), declineEdge: decline?.id,
        conf: "observed", evidence: quote ? [ev] : [{ obs: wallEdge.id, quote: `limit after ${cap} sends`, verified: false }],
      });
    }
  }
  return e;
}
