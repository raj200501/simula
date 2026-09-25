// The annotator (FINAL_PLAN §4.3): once per new state, a fast model looks at the screenshot and the
// element list and advises: what the screen is, which actions are worth trying and how important they
// are, which numbers are balances, and what monetization evidence is visible. Code still decides:
// guard rails veto actions, and the explorer picks what to do next.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { BudgetExceeded, json, llmMode } from "../core/llm.ts";
import { MODELS } from "../core/config.ts";
import { fileSha, sha256 } from "../core/io.ts";
import { trace } from "../core/trace.ts";
import { ScreenKind, SignalKind, type Action, type DeviceInfo, type Observation, type Signal, type State } from "../core/schema.ts";
import { heuristicAnnotation, DEFAULT_INPUT } from "./heuristic.ts";
import { guardReason } from "./guards.ts";
import { labelOf, shortType } from "./signature.ts";

// Structured-output schema: no z.record, no recursion, no regex, no numeric bounds (checked in code).
export const Annotation = z.object({
  sameAs: z.string().nullable(),
  name: z.string(),
  kind: ScreenKind,
  purpose: z.string(),
  inScope: z.boolean(),
  scrollable: z.boolean(),
  loginWall: z.boolean(),
  actions: z.array(z.object({
    el: z.string().nullable(),
    tapPoint: z.object({ x: z.number(), y: z.number() }).optional(),
    intent: z.string(),
    kind: z.enum(["tap", "type-send", "consume", "scroll"]),
    priority: z.number(),
    input: z.string().optional(),
    sendEl: z.string().optional(),
    skip: z.string().optional(),
  })),
  counters: z.array(z.object({ name: z.string(), unit: z.string(), el: z.string() })),
  signals: z.array(z.object({ kind: SignalKind, text: z.string(), el: z.string().optional() })),
});
export type Annotation = z.infer<typeof Annotation>;
type AnnAction = Annotation["actions"][number];

const PROMPT_VERSION = 1;

const SYSTEM = [
  "You annotate one screen of a mobile app for an autonomous explorer that maps the app's product and how it makes money.",
  "You get the screenshot and the list of on-screen elements: id, type, resource id, text or label, rect [x,y,w,h] in device px, flags.",
  "The list has no clickable or scrollable information: infer it from the screenshot.",
  "",
  "Rules:",
  "- sameAs: if this screen is one of the candidate states listed, return its id, else null. Same template, different content = same state (the same chat with more messages, the same detail page for another item, a refreshed feed). A different selected tab or mode, a different page title, or a modal/sheet/dialog opened on top is a different state.",
  "- name: 2-4 words. kind: the screen kind. purpose: one sentence. inScope: false for settings, legal, help and account-management screens that say nothing about the product or its monetization.",
  "- loginWall: true when the screen blocks progress until the user signs in or passes a phone check or CAPTCHA (a human will do that).",
  "- actions: what is worth trying here. el = element id (\"e12\"). Use tapPoint (screenshot pixels) only for a visible control with no element. kind: tap; type-send (type into a field and submit); consume (spends something: sending a chat message, generating content); scroll (el null).",
  "- priority: 3 = unexplored navigation and anything about monetization (balance, credits or coins, store, premium or subscription, mode or model picker, limits, check-in, challenges or tasks, rewards, paywalls); 2 = the core loop; 1 = secondary; 0 = destructive or out of scope (log out, delete, report, share, camera, uploads, legal pages).",
  "- Ads: observe ads, never click them. Report them as signals of kind \"ad\"; if you list one as an action, set skip to \"ad\".",
  "- Text to type is short and safe for work, e.g. \"Hi! What happens next?\". Never type passwords, codes, emails, phone numbers or CAPTCHA answers.",
  "- counters: elements that show a balance or quota as a number (name like \"coins\", unit like \"coins\").",
  "- signals: visible monetization evidence (price, balance, limit, ad, upsell, reward, lock, timer). Quote the on-screen text exactly.",
].join("\n");

export interface AnnotateIn {
  obs: Observation;
  runDir: string;
  info: DeviceInfo;
  appName: string;
  prev: Observation | null;   // the screen before the action (overlay detection in the heuristic)
  candidates: State[];        // borderline states for sameAs
  mode: "llm" | "heuristic";
}

export interface AnnotateOut {
  ann: Annotation;
  by: "llm" | "heuristic" | "stub";
  tapScale: number;           // screenshot px -> device px, for tapPoints
  budgetHit?: boolean;
}

export async function annotate(a: AnnotateIn): Promise<AnnotateOut> {
  const heuristic = () => heuristicAnnotation(a.obs, { info: a.info, prev: a.prev, candidates: a.candidates });
  if (a.mode === "heuristic") return { ann: heuristic(), by: "heuristic", tapScale: 1 };
  const stub = llmMode() === "stub";
  try {
    const shot = path.join(a.runDir, a.obs.screenshot);
    // stub mode never looks at images, so do not spend time making one
    const img = stub ? null : await annotatorImage(shot);
    const sig = sha256(a.obs.signature.join("\n"));
    const ann = await json({
      stage: "explore",
      purpose: `annotate:${sig.slice(0, 10)}`,
      model: MODELS.fast,
      effort: "low",
      system: [SYSTEM],
      prompt: promptFor(a, img),
      images: img ? [{ data: img.data, mediaType: "image/jpeg", label: "Screenshot" }] : [],
      schema: Annotation,
      maxTokens: 8000,
      cacheKey: { v: PROMPT_VERSION, sig, shot: fs.existsSync(shot) ? fileSha(shot) : "", candidates: a.candidates.map(c => c.id) },
      stub: heuristic,
    });
    return { ann, by: stub ? "stub" : "llm", tapScale: img ? a.info.widthPx / img.w : 1 };
  } catch (e) {
    // refusal, invalid output twice, replay miss, budget: the heuristic annotator takes over
    trace("failure", { where: "annotate", error: String((e as Error)?.message ?? e).slice(0, 300) });
    trace("recovery", { how: "heuristic annotator" });
    return { ann: heuristic(), by: "heuristic", tapScale: 1, budgetHit: e instanceof BudgetExceeded };
  }
}

/** 1024 px long edge JPEG: enough to read a phone screen, a fraction of the full PNG's tokens. */
async function annotatorImage(file: string): Promise<{ data: Buffer; w: number; h: number } | null> {
  if (!fs.existsSync(file)) return null;
  const { data, info } = await sharp(file).resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 }).toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function promptFor(a: AnnotateIn, img: { w: number; h: number } | null): string {
  const lines = [`App: ${a.appName}`, `Device: ${a.info.widthPx}x${a.info.heightPx} px.`];
  if (img) lines.push(`The screenshot is ${img.w}x${img.h} px; give tapPoint in screenshot pixels.`);
  lines.push("", "Candidate states for sameAs:");
  lines.push(...(a.candidates.length ? a.candidates.map(c => `- ${c.id} "${c.name}" (${c.kind})`) : ["(none: sameAs must be null)"]));
  lines.push("", "Elements (id type id=resource-id \"text or label\" [x,y,w,h] {flags}):");
  for (const e of a.obs.elements.slice(0, 160)) {
    const r = e.rect;
    const flags = [e.selected && "selected", e.checked && "checked", e.disabled && "disabled", e.group && `group=${e.group}`, e.ad && "AD"].filter(Boolean).join(",");
    const lab = labelOf(e);
    lines.push(`${e.id} ${shortType(e.type)}${e.identifier ? ` id=${e.identifier}` : ""}${lab ? ` "${lab.slice(0, 80)}"` : ""} [${r.x},${r.y},${r.w},${r.h}]${flags ? ` {${flags}}` : ""}`);
  }
  if (a.obs.elements.length > 160) lines.push(`(${a.obs.elements.length - 160} more elements not listed)`);
  return lines.join("\n");
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Turn annotator actions into graph actions: resolve element ids to re-find keys, scale tap points,
 * apply the guard rails (never overridden), treat the model's priority 0 as its own skip, sort by
 * priority then reading order, and add BACK (priority 0) to every state.
 */
export function toActions(
  proposed: AnnAction[], obs: Observation, stateNum: number,
  o: { tapScale?: number; scrollable?: boolean; startAt?: number; withBack?: boolean } = {},
): Action[] {
  const byId = new Map(obs.elements.map(e => [e.id, e]));
  const seen = new Set<string>();
  const out: { a: Action; pos: number }[] = [];
  for (const x of proposed) {
    const el = x.el ? byId.get(x.el) : undefined;
    if (x.kind !== "scroll" && !el && !x.tapPoint) continue; // nothing to act on
    const dedupe = `${x.kind}|${el?.key ?? (x.tapPoint ? `${Math.round(x.tapPoint.x)},${Math.round(x.tapPoint.y)}` : "")}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const priority = Math.max(0, Math.min(3, Math.round(x.priority)));
    const a: Action = { id: "", kind: x.kind, intent: clip(x.intent || x.kind, 160), priority, status: "untried", tries: 0 };
    if (el) a.elKey = el.key;
    else if (x.tapPoint) a.tapPoint = { x: Math.round(x.tapPoint.x * (o.tapScale ?? 1)), y: Math.round(x.tapPoint.y * (o.tapScale ?? 1)) };
    if (x.kind === "type-send" || x.kind === "consume") {
      a.input = clip(x.input?.trim() || DEFAULT_INPUT, 80);
      const send = x.sendEl ? byId.get(x.sendEl) : undefined;
      if (send) a.sendElKey = send.key;
    }
    const skip = guardReason(el, a.intent, a.kind) ?? (x.skip?.trim() || (x.kind !== "scroll" && priority === 0 ? "annotator: destructive or out of scope" : undefined));
    if (skip) { a.status = "skipped"; a.skip = skip; a.priority = 0; }
    out.push({ a, pos: el ? el.rect.y * 100_000 + el.rect.x : Number.MAX_SAFE_INTEGER });
  }
  if (o.scrollable && !out.some(x => x.a.kind === "scroll")) {
    out.push({ a: { id: "", kind: "scroll", intent: "scroll down to reveal more", priority: 1, status: "untried", tries: 0 }, pos: Number.MAX_SAFE_INTEGER });
  }
  out.sort((x, y) => y.a.priority - x.a.priority || x.pos - y.pos);
  const actions = out.map(x => x.a);
  // BACK is an explicit action on every state (priority 0: tried when everything else is done)
  if (o.withBack ?? true) actions.push({ id: "", kind: "back", intent: "press BACK", priority: 0, status: "untried", tries: 0 });
  const start = o.startAt ?? 1;
  actions.forEach((a, i) => { a.id = `a${pad2(stateNum)}_${start + i}`; });
  return actions;
}

/** Annotator signals with element ids replaced by re-find keys (stable across observations). */
export function toSignals(ann: Annotation, obs: Observation): Signal[] {
  const byId = new Map(obs.elements.map(e => [e.id, e]));
  return ann.signals.map(s => {
    const key = s.el ? byId.get(s.el)?.key : undefined;
    return key ? { kind: s.kind, text: s.text, el: key } : { kind: s.kind, text: s.text };
  });
}
