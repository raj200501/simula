// The heuristic annotator: no model, same output shape as the LLM annotator. It is the annotator for
// web crawls, the LLM call's deterministic stub (--llm stub), and the fallback when the model refuses
// or fails. Everything here is a generic layout or vocabulary rule, never knowledge of one app.
import type { DeviceInfo, NormElement, Observation, Rect, ScreenKind, State } from "../core/schema.ts";
import type { Annotation } from "./annotate.ts";
import { BAND, LONG_TEXT, SHORT_LABEL, inheritLabels, isInputType } from "./observe.ts";
import { labelOf, overlayOf, shortType, templateSame } from "./signature.ts";
import { CORE_RE, MONEY_RE, signalKinds, type SignalKind } from "./signals.ts";

export const DEFAULT_INPUT = "Hi! What happens next?";
export const SEND_RE = /send|submit|arrow/i;

const COUNTER_RE = /^\s*[\d,.]+\s*[A-Za-z]{2,}|[A-Za-z]+\s*[\d,.]+$/;
const BALANCE_WORD = /\b(coins?|balance|credits?|gems?|tokens?|diamonds?|points?|wallet|energy|stars?)\b/i;
const PRICE_RE = /[$€£¥₹]\s?\d/;
const LOGIN_RE = /\b(sign ?in|log ?in|sign ?up|create (an )?account)\b|continue with (google|apple|facebook|email|phone)/i;
const HUMAN_CHECK_RE = /captcha|not a robot|verify (that )?you('| a)re (a )?human|verification code|enter the code|confirm your phone/i;
const LEGAL_RE = /\b(privacy|terms|licen[cs]es?|legal|about|help|faq)\b/i;
const ICON_DP = [24, 72];  // an unlabeled square control this size in a bar is an icon button (menu, +, close)

export function isInput(e: NormElement): boolean {
  return isInputType(e.type);
}

/** "app:id/btn_logout" -> "btn logout", "buttonAddComposer" -> "button Add Composer". */
const idWords = (e: NormElement) => ((e.identifier ?? "").split("/").pop() ?? "").replace(/[_\-.]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
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
  const inh = inheritLabels(els, info.widthPx, H);
  const words = new Map(els.map((e, i) => [e.id, labelOf(e) || inh.label[i]]));
  const absorbed = new Set(els.filter((_, i) => inh.owner[i] >= 0).map(e => e.id));
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
  else if (overlay) kind = prices.length ? "paywall" : overlayKind(overlay, H);
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
      ...actionsOf(scope, kind, tabs, new Set(counterEls.map(e => e.id)), info, words, absorbed),
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

/** A panel resting on the bottom edge is a sheet; one floating mid-screen is a dialog. */
export function overlayKind(overlay: NormElement[], H: number): "sheet" | "dialog" {
  const top = Math.min(...overlay.map(e => e.rect.y));
  const bottom = Math.max(...overlay.map(e => e.rect.y + e.rect.h));
  return top >= 0.4 * H && bottom >= 0.85 * H ? "sheet" : "dialog";
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
export function nameOf(scope: NormElement[], info: DeviceInfo): string | undefined {
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

/** A small list of distinct short labels (settings rows, suggestion chips) leads to distinct places: try every member. */
function isNavGroup(members: NormElement[], words: ReadonlyMap<string, string>): boolean {
  const labels = members.map(m => (words.get(m.id) ?? labelOf(m)).toLowerCase());
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

function priorityOf(e: NormElement, lab: string, tabIds: Set<string>, counterIds: Set<string>): { priority: number; why: string } {
  const hay = `${lab} ${idWords(e)}`;
  if (tabIds.has(e.id)) return e.selected ? { priority: 1, why: "current tab" } : { priority: 3, why: "tab: unexplored navigation" };
  if (counterIds.has(e.id)) return { priority: 3, why: "balance" };
  const money = signalKinds(lab).some(k => k === "price" || k === "upsell" || k === "reward" || k === "limit");
  if (money || MONEY_RE.test(hay)) return { priority: 3, why: "monetization" };
  if (CORE_RE.test(hay)) return { priority: 2, why: "core loop" };
  return { priority: 1, why: "" };
}

/** Unlabeled, icon-sized, square-ish, in the top or bottom bar: a menu, "+", close or overflow button. */
function isIcon(e: NormElement, info: DeviceInfo): boolean {
  const [lo, hi] = ICON_DP.map(d => d * info.density);
  const { w, h, y } = e.rect;
  const inBar = y + h <= info.heightPx * BAND || y >= info.heightPx * (1 - BAND);
  return w >= lo && h >= lo && w <= hi && h <= hi && w / h >= 0.6 && w / h <= 1.6 && inBar;
}

function whereOf(r: Rect, info: DeviceInfo): string {
  const cx = r.x + r.w / 2;
  const col = cx < info.widthPx / 3 ? "left" : cx > (2 * info.widthPx) / 3 ? "right" : "centre";
  return `${r.y + r.h / 2 < info.heightPx / 2 ? "top" : "bottom"}-${col}`;
}

/**
 * The candidate set is built by code, from every element that looks actionable: each labelled element
 * (its own words, or the words drawn inside it) outside repeated groups, 2 members per repeated group
 * (every member of a small group of distinct short labels: suggestion chips, settings rows), unlabeled
 * icon buttons in the bars, and a type-and-send action per text field (a spending "consume" on a chat).
 * Text drawn inside a control is part of that control, not a second action.
 */
function actionsOf(scope: NormElement[], kind: ScreenKind, tabs: NormElement[], counterIds: Set<string>, info: DeviceInfo,
  words: ReadonlyMap<string, string>, absorbed: ReadonlySet<string>): Annotation["actions"] {
  const W = info.widthPx;
  const H = info.heightPx;
  const tabIds = new Set(tabs.map(t => t.id));
  const wordsOf = (e: NormElement) => words.get(e.id) ?? labelOf(e);
  const picked = new Set<string>();
  for (const members of groupsOf(scope.filter(e => !e.ad && !absorbed.has(e.id))).values()) {
    const labelled = members.filter(m => wordsOf(m) && !isInput(m));
    for (const m of isNavGroup(labelled, words) ? labelled : pickRows(labelled, H)) picked.add(m.id);
  }
  const out: Annotation["actions"] = [];
  for (const e of scope) {
    if (e.ad || isInput(e) || absorbed.has(e.id)) continue;
    if (e.rect.w * e.rect.h >= 0.9 * W * H) continue; // a root container, not a control
    const lab = wordsOf(e);
    if (!lab) {
      if (isIcon(e, info)) {
        const id = idWords(e).trim();
        out.push({ el: e.id, intent: `tap the unlabeled icon at ${whereOf(e.rect, info)}${id ? ` (${id})` : ""}`, kind: "tap", priority: 1 });
      }
      continue;
    }
    if (e.group && !picked.has(e.id)) continue;
    const p = priorityOf(e, lab, tabIds, counterIds);
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
    if (lab && !e.ad) for (const k of signalKinds(lab)) add(k, lab, e.id);
  }
  for (const ad of adUnits(all)) add("ad", ad.text, ad.el);
  for (const e of counterEls) add("balance", labelOf(e), e.id);
  return out;
}

const AD_MARK = /^(ad|ads|sponsored|adchoices|advertisement|promoted)$/i;
const holds = (o: Rect, i: Rect) => i.x >= o.x - 2 && i.y >= o.y - 2 && i.x + i.w <= o.x + o.w + 2 && i.y + i.h <= o.y + o.h + 2;

/**
 * One ad per ad unit, not one per text inside it: the outermost ad-flagged element is the unit; its
 * signal quotes the "Sponsored" marker if it has one, else its first words. Exported for tests.
 */
export function adUnits(els: NormElement[]): { el: string; text: string }[] {
  const ads = els.filter(e => e.ad).sort((a, b) => b.rect.w * b.rect.h - a.rect.w * a.rect.h);
  const units: { root: NormElement; members: NormElement[] }[] = [];
  for (const e of ads) {
    const u = units.find(x => holds(x.root.rect, e.rect));
    if (u) u.members.push(e); else units.push({ root: e, members: [e] });
  }
  return units.map(u => {
    const inReading = [...u.members].sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
    const quote = inReading.find(m => AD_MARK.test(labelOf(m))) ?? inReading.find(m => labelOf(m));
    return { el: u.root.id, text: quote ? labelOf(quote) : "ad" };
  });
}
