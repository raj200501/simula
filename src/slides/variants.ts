// Variant screens for a SHIP proposal: one model call per patch entry (newScreens / newElements)
// that edits the mock's own HTML for the base screen, so the "What changed" frame looks like the
// app rather than a generic overlay. The stub returns no fragment: the mock runtime then renders its
// default (a clone of basedOn with a callout card, or an accent pill button), which is honest and
// still clearly marked as new. Safety cleaning of the markup happens once, in buildMock.
import fs from "node:fs";
import path from "node:path";
import { MODELS } from "../core/config.ts";
import { fenced, text } from "../core/llm.ts";
import type { ProductModel, Proposal } from "../core/schema.ts";
import { trace } from "../core/trace.ts";

export interface Fragment { id: string; html: string }

const SYSTEM = [
  `You edit one screen of a high-fidelity HTML mock of a mobile app so a product team can see a proposed change.
Rules:
- Reply with exactly one \`\`\`html fenced block and nothing else.
- Reuse the base screen's markup patterns, class names and CSS variables from design.css so the change looks native to the app. Do not restyle anything that already exists.
- Every element you ADD carries a data-new attribute (data-new="<entry id>" on the outermost added element). Existing elements keep their data-node attributes unchanged.
- No <script>, no inline event handlers, no external URLs, no web fonts, no images other than paths already used by the base screen.
- Use the exact user-facing copy you are given (title, body, button labels). Keep it short and in the app's tone.
- The offer is opt-in: never auto-play, never add countdowns or guilt copy, and always keep a visible way to decline.`,
];

/**
 * One fragment per patch entry that the model produced. Entries without base HTML (image-rendered
 * or missing screens) are skipped: the runtime default is better than a guess without context.
 */
export async function variantFragments(p: Proposal, m: ProductModel, mockDir: string): Promise<Fragment[]> {
  const css = readOr(path.join(mockDir, "design.css"));
  const baseHtml = (screen?: string) => (screen ? readOr(path.join(mockDir, "screens", `${screen}.html`)) : "");
  const name = (id?: string) => (id ? m.screens.find(s => s.id === id)?.name ?? id : "");
  const copy = `Offer copy: title "${p.offer.title}", body "${p.offer.body}", play button "${p.offer.cta}", decline button "${p.offer.decline}".
Reward: ${p.reward.what}${p.reward.amount != null ? ` (${p.reward.amount})` : ""}, granted only after the sponsored game is verified.`;

  const jobs: { id: string; base: string; ask: string }[] = [
    ...p.patch.newScreens.map(s => ({
      id: s.id, base: baseHtml(s.basedOn),
      ask: `Produce the COMPLETE screen fragment for a new ${s.kind} "${s.id}" based on the screen "${name(s.basedOn)}" (${s.basedOn ?? "none"}): same root structure as the base screen, with the change applied.
Change: ${s.change}`,
    })),
    ...p.patch.newElements.map(e => ({
      id: e.id, base: baseHtml(e.in),
      ask: `Produce ONLY the new element "${e.id}" (a fragment, not the whole screen). The runtime inserts it ${e.place} ${e.near ? `the element data-node="${e.near}"` : "the screen content"} on screen "${name(e.in)}" (${e.in}).
Change: ${e.change}`,
    })),
  ];

  const out: Fragment[] = [];
  for (const job of jobs) {
    if (!job.base) {
      trace("decision", { stage: "slides", proposal: p.id, entry: job.id, choice: "runtime-default", why: "no HTML base screen in the mock" });
      continue;
    }
    const prompt = `${job.ask}
${copy}
Proposal: ${p.title}. ${p.oneLiner}

Base screen HTML:
\`\`\`html
${job.base}
\`\`\`

design.css:
\`\`\`css
${css.slice(0, 16000)}
\`\`\``;
    const raw = await text({
      stage: "slides", purpose: `variant:${p.id}:${job.id}`, model: MODELS.main, effort: "high",
      system: SYSTEM, prompt, stub: () => "",
    });
    // buildMock sanitizes every fragment (scripts, handlers, remote URLs) and the runtime stamps
    // data-new on what it inserts, so here we only drop output that contains no markup at all.
    const html = raw ? fenced(raw, "html").trim() : "";
    if (/<[a-z]/i.test(html)) out.push({ id: job.id, html });
    else trace("decision", { stage: "slides", proposal: p.id, entry: job.id, choice: "runtime-default", why: raw ? "model output unusable after sanitizing" : "stub: no fragment" });
  }
  return out;
}

function readOr(file: string): string {
  try {
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  } catch {
    return "";
  }
}
