// The heuristic annotator: no model, same output shape as the LLM annotator. It is the annotator for
// web crawls, the LLM call's deterministic stub (--llm stub), and the fallback when the model refuses
// or fails. Everything here is a generic layout or vocabulary rule, never knowledge of one app.
import type { DeviceInfo, NormElement, Observation, ScreenKind, State } from "../core/schema.ts";
import type { Annotation } from "./annotate.ts";
import { BAND, LONG_TEXT, SHORT_LABEL } from "./observe.ts";
import { labelOf, shortType, templateSame, token } from "./signature.ts";
import { CORE_RE, MONEY_RE, signalKinds, type SignalKind } from "./signals.ts";

export const DEFAULT_INPUT = "Hi! What happens next?";
export const SEND_RE = /send|submit|arrow/i;

const INPUT_TYPE = /edit|input|textfield|textarea|searchbox|textbox/i;
const COUNTER_RE = /^\s*[\d,.]+\s*[A-Za-z]{2,}|[A-Za-z]+\s*[\d,.]+$/;
const BALANCE_WORD = /\b(coins?|balance|credits?|gems?|tokens?|diamonds?|points?|wallet|energy|stars?)\b/i;
const PRICE_RE = /[$€£¥₹]\s?\d/;
const LOGIN_RE = /\b(sign ?in|log ?in|sign ?up|create (an )?account)\b|continue with (google|apple|facebook|email|phone)/i;
const HUMAN_CHECK_RE = /captcha|not a robot|verify (that )?you('| a)re (a )?human|verification code|enter the code|confirm your phone/i;
const LEGAL_RE = /\b(privacy|terms|licen[cs]es?|legal|about|help|faq)\b/i;
const OVERLAY_KEEP = 0.6; // share of the previous screen still present when something opened on top of it

export function isInput(e: NormElement): boolean {
  return INPUT_TYPE.test(shortType(e.type));
}

const idWords = (e: NormElement) => ((e.identifier ?? "").split("/").pop() ?? "").replace(/[_\-.]+/g, " ");
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const sameRow = (a: NormElement, b: NormElement) =>
  Math.abs(a.rect.y + a.rect.h / 2 - (b.rect.y + b.rect.h / 2)) <= Math.max(b.rect.h, 48);

/** A balance or quota shown as a number: "450 credits", "Coins 120", or a number in a balance-labelled element. */
export function counterOf(e: NormElement, info: DeviceInfo): { name: string; unit: string } | null {
  const t = labelOf(e);
  if (!t || !/\d/.test(t) || t.length > SHORT_LABEL || e.group || e.ad) return null;
  if (PRICE_RE.test(t) || /tab|switch|check|radio/i.test(e.type)) return null;
  const inTop = e.rect.y + e.rect.h <= info.heightPx * BAND;
  const described = `${e.label ?? ""} ${idWords(e)}`;
  const balanceLike = BALANCE_WORD.test(described);
  if (!(COUNTER_RE.test(t) && inTop) && !balanceLike) return null;
  const word = /[\d,.]+\s*([A-Za-z]{2,})/.exec(t)?.[1] ?? /([A-Za-z]+)\s*[\d,.]+$/.exec(t)?.[1] ?? BALANCE_WORD.exec(described)?.[1] ?? "balance";
  const name = word.toLowerCase();
  return { name, unit: name };
}

export interface HeuristicCtx {
  info: DeviceInfo;
  prev?: Observation | null;   // the observation before the action: detects overlays
  candidates?: State[];        // borderline states: the sameAs question
}

export function heuristicAnnotation(obs: Observation, ctx: HeuristicCtx): Annotation {
  const { info } = ctx;
  const H = info.heightPx;
  const els = obs.elements;
  const overlay = overlayOf(obs, ctx.prev ?? null, info);
  const scope = overlay ?? els;
  const tabs = overlay ? [] : tabBar(els, info);
  const counterEls = els.filter(e => counterOf(e, info));
  const prices = scope.filter(e => PRICE_RE.test(labelOf(e)));
  const allText = els.map(labelOf).join("\n");
  const humanCheck = HUMAN_CHECK_RE.test(allText);
  const loginWall = humanCheck || (LOGIN_RE.test(allText) && els.some(e => isInput(e) || /continue with/i.test(labelOf(e))));
  const input = els.find(e => isInput(e) && !e.ad && e.rect.y > H * 0.6);
  const mid = (e: NormElement) => e.rect.y + e.rect.h / 2 > H * BAND && e.rect.y + e.rect.h / 2 < H * (1 - BAND);
  const rows = els.filter(e => e.text && !isInput(e) && !/button/i.test(e.type) && mid(e));

  let kind: ScreenKind;
  if (loginWall) kind = "login";
  else if (overlay) kind = prices.length ? "paywall" : Math.min(...overlay.map(e => e.rect.y)) >= 0.4 * H ? "sheet" : "dialog";
  else if (prices.length >= 2) kind = "store";
  else if (input && rows.length >= 1 && !tabs.length) kind = "chat";
  else if (tabs.length) kind = "tab";
  else kind = "page";

  const name = nameOf(scope, info) ?? (overlay ? "Overlay" : "Untitled screen");
  const safeBottom = H - info.navBarPx;
  const cut = els.some(e => e.rect.h < 0.8 * H && e.rect.y < safeBottom && e.rect.y + e.rect.h > safeBottom + 4);
  const bigGroup = [...groupsOf(els).values()].some(m => m.length >= 5);
  const scrollable = !overlay && (cut || bigGroup);

  return {
    sameAs: (ctx.candidates ?? []).find(c => templateSame(c.signature, obs.signature))?.id ?? null,
    name: clip(name, 60),
    kind,
    purpose: PURPOSE[kind],
    inScope: !LEGAL_RE.test(name),
    scrollable,
    loginWall,
    actions: [
      ...actionsOf(scope, kind, tabs, new Set(counterEls.map(e => e.id)), info),
      ...(scrollable ? [{ el: null, intent: "scroll down to reveal more", kind: "scroll" as const, priority: 1 }] : []),
    ],
    counters: counterEls.map(e => ({ ...counterOf(e, info)!, el: e.id })),
    signals: signalsOf(scope, els, counterEls),
  };
}

const PURPOSE: Record<ScreenKind, string> = {
  tab: "Top-level tab of the app",
  page: "Content page",
  chat: "Conversation screen with a message composer",
  modal: "Modal shown over the previous screen",
  sheet: "Sheet shown over the previous screen",
  dialog: "Dialog shown over the previous screen",
  paywall: "Overlay asking the user to pay",
  store: "Lists purchasable items with prices",
  webview: "Embedded web content",
  login: "Sign-in or verification screen (needs a human)",
  onboarding: "Onboarding step",
  other: "Screen",
};

/**
 * Something opened on top of the previous screen: most of the previous screen's elements are still there,
 * same token at the same place (a dimmed backdrop is invisible in the element list, so this is how an
 * overlay shows), and the new elements include at least two labels, one of them a button or short text.
 * Position matters: in apps without resource ids, two different screens share most token types.
 * Returns the overlay's own elements, or null.
 */
function overlayOf(obs: Observation, prev: Observation | null, info: DeviceInfo): NormElement[] | null {
  if (!prev?.elements.length) return null;
  const screen = info.widthPx * info.heightPx;
  const samePlace = (a: NormElement, b: NormElement) =>
    token(a) === token(b) && Math.abs(a.rect.x - b.rect.x) <= 8 && Math.abs(a.rect.y - b.rect.y) <= 8;
  const before = prev.elements.filter(e => e.rect.w * e.rect.h < 0.9 * screen); // root containers are always there
  if (!before.length) return null;
  const kept = before.filter(p => obs.elements.some(e => samePlace(e, p))).length;
  if (kept / before.length < OVERLAY_KEEP) return null;
  const added = obs.elements.filter(e => !prev.elements.some(p => samePlace(e, p)));
  const labelled = added.filter(e => e.chrome && labelOf(e));
  if (labelled.length < 2) return null;
  if (!labelled.some(e => /button/i.test(e.type) || labelOf(e).length <= 16)) return null;
  return added;
}

/** Bottom row of 3-5 same-type labelled items: a tab bar. */
function tabBar(els: NormElement[], info: DeviceInfo): NormElement[] {
  const H = info.heightPx;
  const cands = els.filter(e => labelOf(e) && !e.ad && !isInput(e) && e.rect.y >= H * (1 - BAND) && labelOf(e).length <= SHORT_LABEL);
  let best: NormElement[] = [];
  for (const e of cands) {
    const row = cands.filter(o => shortType(o.type) === shortType(e.type) && sameRow(o, e));
    const distinctX = new Set(row.map(o => Math.round(o.rect.x / 8))).size === row.length;
    if (row.length >= 3 && row.length <= 5 && distinctX && row.length > best.length) best = row;
  }
  return best;
}

/** Top-most prominent text: skips icons (label only), counters, prices, inputs and long content. */
function nameOf(scope: NormElement[], info: DeviceInfo): string | undefined {
  return scope
    .filter(e => e.text && !e.ad && !isInput(e) && !counterOf(e, info) && !PRICE_RE.test(e.text)
      && e.text.trim().length >= 2 && e.text.trim().length <= LONG_TEXT)
    .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x)[0]?.text?.trim();
}

function groupsOf(els: NormElement[]): Map<string, NormElement[]> {
  const m = new Map<string, NormElement[]>();
  for (const e of els) if (e.group) m.set(e.group, [...(m.get(e.group) ?? []), e]);
  return m;
}

/** A small list of distinct short labels (settings rows, chips) is navigation: try every member. */
function isNavGroup(members: NormElement[]): boolean {
  const labels = members.map(m => labelOf(m).toLowerCase());
  return members.length <= 6 && labels.every(l => l && l.length <= SHORT_LABEL) && new Set(labels).size === labels.length;
}

/** Two members from different rows (a card's title and its blurb open the same thing). */
function pickRows(members: NormElement[], H: number): NormElement[] {
  const sorted = [...members].sort((a, b) => a.rect.y - b.rect.y);
  const out: NormElement[] = sorted.slice(0, 1);
  for (const m of sorted.slice(1)) {
    const last = out[out.length - 1];
    if (out.length < 2 && m.rect.y >= last.rect.y + last.rect.h + 0.02 * H) out.push(m);
  }
  return out;
}

function priorityOf(e: NormElement, tabIds: Set<string>, counterIds: Set<string>): { priority: number; why: string } {
  const lab = labelOf(e);
  const hay = `${lab} ${idWords(e)}`;
  if (tabIds.has(e.id)) return e.selected ? { priority: 1, why: "current tab" } : { priority: 3, why: "tab: unexplored navigation" };
  if (counterIds.has(e.id)) return { priority: 3, why: "balance" };
  const money = signalKinds(lab).some(k => k === "price" || k === "upsell" || k === "reward" || k === "limit");
  if (money || MONEY_RE.test(hay)) return { priority: 3, why: "monetization" };
  if (CORE_RE.test(hay)) return { priority: 2, why: "core loop" };
  return { priority: 1, why: "" };
}

/**
 * Every labelled element outside repeated groups, 2 members per repeated group (every member of a
 * navigation group), and a type-and-send action per text field (a spending "consume" on a chat).
 */
function actionsOf(scope: NormElement[], kind: ScreenKind, tabs: NormElement[], counterIds: Set<string>, info: DeviceInfo): Annotation["actions"] {
  const W = info.widthPx;
  const H = info.heightPx;
  const tabIds = new Set(tabs.map(t => t.id));
  const picked = new Set<string>();
  for (const members of groupsOf(scope.filter(e => !e.ad)).values()) {
    const labelled = members.filter(m => labelOf(m) && !isInput(m));
    for (const m of isNavGroup(members) ? labelled : pickRows(labelled, H)) picked.add(m.id);
  }
  const out: Annotation["actions"] = [];
  for (const e of scope) {
    const lab = labelOf(e);
    if (!lab || e.ad || isInput(e)) continue;
    if (e.rect.w * e.rect.h >= 0.9 * W * H) continue; // a root container, not a control
    if (e.group && !picked.has(e.id)) continue;
    const p = priorityOf(e, tabIds, counterIds);
    out.push({ el: e.id, intent: `tap "${clip(lab, 40)}"${p.why ? ` (${p.why})` : ""}`, kind: "tap", priority: p.priority });
  }
  for (const e of scope.filter(x => isInput(x) && !x.ad)) {
    const send = scope.find(s => s !== e && !isInput(s) && sameRow(s, e) && (SEND_RE.test(s.label ?? "") || SEND_RE.test(idWords(s))));
    const consume = kind === "chat";
    out.push({
      el: e.id,
      intent: consume ? "type a short message and send it (may spend)" : "type a short text and submit it",
      kind: consume ? "consume" : "type-send",
      priority: 2,
      input: DEFAULT_INPUT,
      ...(send ? { sendEl: send.id } : {}),
    });
  }
  return out;
}

function signalsOf(scope: NormElement[], all: NormElement[], counterEls: NormElement[]): Annotation["signals"] {
  const out: Annotation["signals"] = [];
  const seen = new Set<string>();
  const add = (kind: SignalKind, text: string, el: string) => {
    const k = `${kind}|${text}`;
    if (!seen.has(k)) { seen.add(k); out.push({ kind, text: clip(text, 120), el }); }
  };
  for (const e of scope) {
    const lab = labelOf(e);
    if (lab) for (const k of signalKinds(lab)) add(k, lab, e.id);
  }
  for (const e of all) if (e.ad && labelOf(e)) add("ad", labelOf(e), e.id);
  for (const e of counterEls) add("balance", labelOf(e), e.id);
  return out;
}
