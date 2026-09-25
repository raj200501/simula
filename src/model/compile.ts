// compile: explore graph -> screens, edges, externals, design tokens, transcripts, coverage.
// Fully deterministic (no LLM): the same graph always compiles to the same model skeleton.
// Screenshots and asset crops are written into the model directory, so downstream stages never
// need to read the explore run.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  ExternalKind, type Action, type DesignSystem, type DeviceInfo, type Economy, type Edge, type ExploreGraph, type External,
  type Flow, type NormElement, type Observation, type ProductModel, type Rect, type Screen, type State, type UiElement,
} from "../core/schema.ts";
import { ensureDir, sha256 } from "../core/io.ts";
import { trace } from "../core/trace.ts";
import { blurRects, hasPii, redactAction, redactKey, redactText } from "./redact.ts";
import { crop, dHash, decode, hamming, hex, inkFg, inkFontDp, palette, ringBg, samplePixels, tightFontDp, typeScale, type RawImage, type RGB } from "./tokens.ts";

type UiRole = UiElement["role"];
type Transition = Edge["transition"];

export interface Compiled {
  graph: ExploreGraph;
  runDir: string;
  modelDir: string;
  screens: Screen[];
  edges: Edge[];
  externals: External[];
  design: DesignSystem;
  transcripts: ProductModel["transcripts"];
  coverage: ProductModel["coverage"];
  launch: string;                    // screen id of the launch state
  screenOf: Map<string, string>;     // graph state id -> screen id
  obs: Map<string, Observation>;
  obsScreen: Map<string, string>;    // observation id -> screen id
  actionOf: Map<string, Action>;     // edge id -> the action that produced it
  shotSha: Map<string, string>;      // screen / external id -> sha256 of the ORIGINAL screenshot (stable LLM cache keys)
}

const INPUT = /EditText|TextField|TextInput|AutoComplete|SearchView|\binput\b|textarea/i;
const TOGGLE = /Switch|CheckBox|Checkbox|ToggleButton|RadioButton|Toggle/i;
const IMAGE = /Image|\bimg\b|svg|Icon/i;
const BUTTON = /Button|Chip|MenuItem/i;
const IMAGE_ID = /avatar|icon|logo|thumb|photo|image|img|picture|banner|cover/i;
const OVERLAY_KINDS = new Set(["modal", "sheet", "dialog"]);

const label = (e: { text?: string; label?: string }) => e.text || e.label || "";
const r1 = (n: number) => Math.round(n * 10) / 10;
const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** Representative observation: not scrolled, then most elements, then earliest. */
export function pickRepresentative(st: State, obs: Map<string, Observation>): Observation | undefined {
  const list = st.obs.map(id => obs.get(id)).filter((o): o is Observation => !!o);
  return [...list].sort((a, b) => (a.scrollIndex > 0 ? 1 : 0) - (b.scrollIndex > 0 ? 1 : 0) || b.elements.length - a.elements.length || a.step - b.step)[0];
}

/** Tab bars: explicit (type / resource id says tab) or positional (3-6 short labels in one row of
 *  the top or bottom 15% band that together span most of the width). Nested labels inside a tab
 *  container are left as text, so the mock does not render a tab inside a tab. */
export function tabIds(els: NormElement[], dev: DeviceInfo): Set<string> {
  const W = dev.widthPx || 1, H = dev.heightPx || 1;
  const out = new Set<string>();
  for (const e of els) if (/TabView|TabItem|BottomNavigation|NavigationBarItem/i.test(e.type) || /(^|[/_:])tab|bottom_?nav|navigation_bar_item/i.test(e.identifier ?? "")) out.add(e.id);
  const band = els.filter(e => {
    const cy = center(e.rect).y;
    return (cy > H * 0.85 || cy < H * 0.15) && !INPUT.test(e.type) && e.rect.w < W * 0.5 && label(e).length > 0 && label(e).length <= 20;
  }).sort((a, b) => center(a.rect).y - center(b.rect).y);
  const rows: NormElement[][] = [];
  for (const e of band) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(center(row[0].rect).y - center(e.rect).y) <= Math.max(8, H * 0.012)) row.push(e); else rows.push([e]);
  }
  const inside = (a: Rect, b: Rect) => a !== b && a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
  for (const row of rows) {
    const outer = row.filter(e => !row.some(o => inside(e.rect, o.rect)));
    const span = Math.max(...outer.map(e => e.rect.x + e.rect.w)) - Math.min(...outer.map(e => e.rect.x));
    if (outer.length >= 3 && outer.length <= 6 && span >= W * 0.6) outer.forEach(e => out.add(e.id));
  }
  return out;
}

/** Element role from type, flags and what the explorer learned (bindings, tap targets, groups). */
export function roleOf(e: NormElement, tabs: Set<string>, bound: Set<string>, tapped: Set<string>): UiRole {
  if (INPUT.test(e.type)) return "input";
  if (TOGGLE.test(e.type)) return "toggle";
  if (bound.has(e.key)) return "counter";
  if (tabs.has(e.id)) return "tab";
  if (/ImageButton/i.test(e.type)) return "button";
  if (IMAGE.test(e.type) && !e.text) return "image";
  if (e.group) return "list-item";
  if (BUTTON.test(e.type) || tapped.has(e.key)) return "button";
  if (label(e)) return "text";
  return "container";
}

/** Resolve an action's element key to an element id on the representative observation. Keys are
 *  stable re-find keys, but the ordinal or the text may differ between observations, so fall back
 *  to type+text, then to rect overlap with the element as it was when the action ran. */
export function resolveEl(key: string | undefined, rep: Observation | undefined, before?: Observation): string | undefined {
  if (!key || !rep) return undefined;
  const hit = rep.elements.find(e => e.key === key);
  if (hit) return hit.id;
  const src = before?.elements.find(e => e.key === key);
  if (!src) {
    const base = key.split("|").slice(0, -1).join("|");
    return rep.elements.find(e => e.key.split("|").slice(0, -1).join("|") === base)?.id;
  }
  const same = label(src) && rep.elements.find(e => e.type === src.type && label(e) === label(src));
  if (same) return same.id;
  let best: { id: string; iou: number } | undefined;
  for (const e of rep.elements) {
    const iou = overlap(e.rect, src.rect);
    if (iou > 0.5 && (!best || iou > best.iou)) best = { id: e.id, iou };
  }
  return best?.id;
}

function overlap(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / (a.w * a.h + b.w * b.h - w * h);
}

const shotPath = (runDir: string, o: Observation) => path.resolve(runDir, o.screenshot);

async function placeholder(dev: DeviceInfo): Promise<Buffer> {
  return sharp({ create: { width: Math.max(1, dev.widthPx), height: Math.max(1, dev.heightPx), channels: 3, background: "#E5E7EB" } }).png().toBuffer();
}

/** Copy an observation's screenshot into the model dir, blurring any PII element first. The bytes
 *  are copied verbatim when nothing needs blurring (keeps shas stable across machines). */
async function writeShot(runDir: string, o: Observation, dev: DeviceInfo, file: string): Promise<{ png: Buffer; img: RawImage; sha: string } | null> {
  const src = shotPath(runDir, o);
  if (!fs.existsSync(src)) return null;
  const orig = fs.readFileSync(src);
  const scale = await scaleOf(orig, dev);
  const pii = o.elements.filter(e => hasPii(e.text) || hasPii(e.label)).map(e => scaleRect(e.rect, scale));
  const png = await blurRects(orig, pii);
  if (pii.length) trace("decision", { what: "redact", obs: o.id, rects: pii.length });
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, png);
  return { png, img: await decode(png), sha: sha256(orig) };
}

async function scaleOf(png: Buffer, dev: DeviceInfo): Promise<number> {
  const w = (await sharp(png).metadata()).width ?? dev.widthPx;
  return dev.widthPx ? w / dev.widthPx : 1;
}
const scaleRect = (r: Rect, s: number): Rect => ({ x: r.x * s, y: r.y * s, w: r.w * s, h: r.h * s });

interface AssetRec { id: string; hash: string; w: number; h: number }

export async function compile(graph: ExploreGraph, runDir: string, modelDir: string): Promise<Compiled> {
  const dev = graph.device;
  const density = dev.density || 1;
  const obs = new Map(graph.observations.map(o => [o.id, o]));
  const states = [...graph.states].sort((a, b) => a.firstStep - b.firstStep || a.id.localeCompare(b.id));
  const screenOf = new Map(states.map((s, i) => [s.id, `s${String(i + 1).padStart(2, "0")}`]));
  const obsScreen = new Map<string, string>();
  for (const s of states) for (const o of s.obs) obsScreen.set(o, screenOf.get(s.id)!);
  const shotSha = new Map<string, string>();
  const reps = new Map<string, Observation | undefined>();

  fs.rmSync(path.join(modelDir, "screens"), { recursive: true, force: true }); // stale outputs of an earlier run
  fs.rmSync(path.join(modelDir, "assets"), { recursive: true, force: true });
  ensureDir(path.join(modelDir, "screens"));
  ensureDir(path.join(modelDir, "assets"));

  const pixels: RGB[] = [];
  const fonts: number[] = [];
  const assetLib: AssetRec[] = [];
  const assets: DesignSystem["assets"] = [];
  const screens: Screen[] = [];

  for (const st of states) {
    const id = screenOf.get(st.id)!;
    const rep = pickRepresentative(st, obs);
    reps.set(id, rep);
    const file = `screens/${id}.png`;
    let shot = rep ? await writeShot(runDir, rep, dev, path.join(modelDir, file)) : null;
    if (!shot) {
      trace("failure", { where: "understand:compile", error: `no screenshot for ${st.id} (${rep?.id ?? "no observation"}); using a placeholder` });
      const png = await placeholder(dev);
      fs.writeFileSync(path.join(modelDir, file), png);
      shot = { png, img: await decode(png), sha: sha256(png) };
    }
    shotSha.set(id, shot.sha);
    const scale = shot.img.width / (dev.widthPx || shot.img.width);
    const pxPerDp = density * scale;
    if (st.inScope) pixels.push(...samplePixels(shot.img, 2500));

    const els = rep?.elements ?? [];
    const tabs = tabIds(els, dev);
    const bound = new Set(graph.resources.flatMap(r => r.bindings.filter(b => b.state === st.id).map(b => b.elKey)));
    const tapped = new Set(st.actions.filter(a => a.kind === "tap" && a.elKey).map(a => a.elKey!));
    const elements: UiElement[] = [];
    for (const e of els) {
      const role = roleOf(e, tabs, bound, tapped);
      const rImg = scaleRect(e.rect, scale);
      const bg = ringBg(shot.img, rImg);
      const fg = bg ? inkFg(shot.img, rImg, bg) : undefined;
      const text = label(e);
      let fontDp: number | undefined;
      if (text) {
        // Text views are tight around their text; padded elements are measured by their ink. A tight
        // estimate far above the ink estimate means the "text view" is padded after all.
        const ink = inkFontDp(shot.img, rImg, pxPerDp, bg);
        const tight = role === "text" || role === "counter" ? tightFontDp(rImg, pxPerDp, text) : undefined;
        fontDp = tight && (!ink || tight <= ink * 1.35) ? tight : ink ?? tight;
        if (fontDp && e.text) fonts.push(fontDp);
      }
      const ui: UiElement = {
        id: e.id, key: redactKey(e.key), role, type: e.type,
        text: redactText(e.text), label: redactText(e.label), identifier: e.identifier,
        rectPx: e.rect,
        rectDp: { x: r1(e.rect.x / density), y: r1(e.rect.y / density), w: r1(e.rect.w / density), h: r1(e.rect.h / density) },
        style: { bg: bg && hex(bg), fg: fg && hex(fg), fontDp },
        ad: e.ad || undefined,
      };
      const flags = { selected: e.selected || undefined, checked: e.checked || undefined, disabled: e.disabled || undefined, focused: e.focused || undefined };
      if (Object.values(flags).some(Boolean)) ui.flags = flags;
      if (rep) await cropAsset(ui, e, rImg, shot.png, shot.img, dev, density, rep.id, id, modelDir, assetLib, assets);
      elements.push(ui);
    }

    // Scrollable screens keep one scrolled observation (the mock renders the continuation from it).
    const scrolled = st.obs.map(o => obs.get(o)).filter((o): o is Observation => !!o && o.scrollIndex > 0)
      .sort((a, b) => a.scrollIndex - b.scrollIndex || b.elements.length - a.elements.length)[0];
    let scrolledScreenshot: string | undefined;
    if (scrolled && (await writeShot(runDir, scrolled, dev, path.join(modelDir, `screens/${id}-scrolled.png`)))) scrolledScreenshot = `screens/${id}-scrolled.png`;

    // Signals were annotated on the state's first observation; re-point their element ids at the representative.
    const first = obs.get(st.obs[0]);
    const signals = st.signals.map(s => {
      const src = s.el ? first?.elements.find(e => e.id === s.el) : undefined;
      return { ...s, text: redactText(s.text), el: src ? resolveEl(src.key, rep, first) : s.el && rep?.elements.some(e => e.id === s.el) ? s.el : undefined };
    });
    const bindings = graph.resources.flatMap(r => r.bindings.filter(b => b.state === st.id).map(b => ({ resource: r.id, el: resolveEl(b.elKey, rep) }))
      .filter((b): b is { resource: string; el: string } => !!b.el));

    screens.push({
      id, name: redactText(st.name), purpose: redactText(st.purpose), kind: st.kind, inScope: st.inScope,
      signature: st.signature.map(t => redactKey(t)), observations: st.obs, representative: rep?.id ?? "", screenshot: file, scrolledScreenshot,
      scrollable: st.scrollable, visits: st.visits, elements, actions: st.actions.map(redactAction), bindings, signals, render: "image", variants: [],
    });
  }

  const byId = new Map(screens.map(s => [s.id, s]));
  const stateById = new Map(graph.states.map(s => [s.id, s]));
  const actionOf = new Map<string, Action>();
  const edges: Edge[] = [];
  for (const g of graph.edges) {
    const from = screenOf.get(g.from);
    const to = g.to.startsWith("ext:") ? g.to : screenOf.get(g.to);
    if (!from || !to) { trace("failure", { where: "understand:compile", error: `edge ${g.id} references unknown state ${from ? g.to : g.from}; dropped` }); continue; }
    // Element resolution needs the raw re-find key; the model keeps the redacted copy of the action.
    const raw = stateById.get(g.from)?.actions.find(a => a.id === g.action);
    const action = byId.get(from)!.actions.find(a => a.id === g.action);
    if (action) actionOf.set(g.id, action);
    const el = resolveEl(raw?.elKey, reps.get(from), obs.get(g.obsBefore));
    edges.push({
      id: g.id, from, to, action: g.action, el,
      transition: classify(g.from === g.to, to, action, byId.get(from)!, byId.get(to), el, reps.get(from), reps.get(to), dev),
      effects: g.effects.map(f => (f.kind === "counter" ? f : { ...f, text: redactText(f.text) })),
      context: { selected: g.context.selected.map(t => redactText(t)) }, limitHit: g.limitHit, seen: g.seen, failures: g.failures,
    });
  }
  assignParents(screens, edges, graph);

  const launch = (graph.launchState && screenOf.get(graph.launchState)) || screens[0]?.id || "";
  return {
    graph, runDir, modelDir, screens, edges, launch, screenOf, obs, obsScreen, actionOf, shotSha,
    externals: await buildExternals(graph, runDir, modelDir, screenOf, edges, obs, shotSha),
    transcripts: buildTranscripts(graph, screenOf, actionOf),
    coverage: buildCoverage(graph, screenOf, edges),
    design: {
      fonts: [{ family: dev.kind === "web" ? "system-ui" : "Roboto", source: "system" }],
      palette: palette(pixels.length > 40000 ? pixels.filter((_, i) => i % Math.ceil(pixels.length / 40000) === 0) : pixels),
      typeScaleDp: typeScale(fonts),
      radiiDp: [],
      assets,
    },
  };
}

/** Crop image-like elements (icons, avatars, photos) into model/assets, deduplicated across screens by dHash. */
async function cropAsset(ui: UiElement, e: NormElement, rImg: Rect, png: Buffer, img: RawImage, dev: DeviceInfo, density: number,
  obsId: string, screen: string, modelDir: string, lib: AssetRec[], assets: DesignSystem["assets"]): Promise<boolean> {
  const imageLike = ui.role === "image" || (IMAGE.test(e.type) && !e.text) || (!e.text && IMAGE_ID.test(`${e.identifier ?? ""} ${e.label ?? ""}`));
  const wDp = e.rect.w / density, hDp = e.rect.h / density;
  const fullScreen = e.rect.w * e.rect.h > 0.5 * dev.widthPx * dev.heightPx;
  if (!imageLike || e.ad || wDp < 24 || hDp < 24 || fullScreen) return false;
  const buf = await crop(png, img, rImg);
  if (!buf) return false;
  const hash = await dHash(buf);
  const dup = lib.find(a => hamming(a.hash, hash) <= 5 && Math.abs(a.w - wDp) <= wDp * 0.15 && Math.abs(a.h - hDp) <= hDp * 0.15);
  if (dup) { ui.asset = dup.id; return true; }
  const id = `a${String(lib.length + 1).padStart(3, "0")}`;
  const file = `assets/${id}.png`;
  fs.writeFileSync(path.join(modelDir, file), buf);
  lib.push({ id, hash, w: wDp, h: hDp });
  const hint = `${e.identifier ?? ""} ${e.label ?? ""}`;
  const square = wDp / hDp > 0.8 && wDp / hDp < 1.25;
  const kind = /logo/i.test(hint) ? "logo" : /avatar|profile|user|person/i.test(hint) ? "avatar"
    : wDp <= 40 && hDp <= 40 ? "icon" : square && wDp <= 72 ? "avatar" : wDp >= 160 || hDp >= 160 ? "photo" : "illustration";
  assets.push({ id, file, fromObs: obsId, screen, el: ui.id, rectPx: e.rect, kind, label: e.label || undefined });
  ui.asset = id;
  return true;
}

/** Transition type. Only the TYPE is observed (animations are off on the device); motion is defaulted by the mock. */
function classify(selfLoop: boolean, to: string, action: Action | undefined, fromS: Screen, toS: Screen | undefined, el: string | undefined,
  fromRep: Observation | undefined, toRep: Observation | undefined, dev: DeviceInfo): Transition {
  if (to.startsWith("ext:")) return "external";
  if (selfLoop) return "replace";
  if (action?.kind === "back") return "back";
  if (toS?.kind === "sheet") return "sheet";
  if (toS?.kind === "modal" || toS?.kind === "dialog") return "modal";
  const tabEl = fromS.elements.find(e => e.id === el);
  const selTab = (s: Screen | undefined) => s?.elements.filter(e => e.role === "tab" && (e.flags?.selected || e.flags?.checked)).map(label).join("|");
  if (tabEl?.role === "tab" || (selTab(fromS) && selTab(toS) && selTab(fromS) !== selTab(toS))) return "tab";
  // Overlay: at least half of the previous signature AND most of its elements are still there (an
  // overlay covers the screen, it does not replace it), plus a new block smaller than the screen.
  // Dismissing an overlay shrinks the tree instead, so it never matches.
  if (fromRep && toRep && fromS.signature.length && toRep.elements.length > fromRep.elements.length) {
    const prev = new Set(fromS.signature);
    const kept = (toS?.signature ?? []).filter(t => prev.has(t)).length / prev.size;
    const now = new Set(toRep.elements.map(e => `${e.type}|${label(e)}`));
    const stayed = fromRep.elements.filter(e => now.has(`${e.type}|${label(e)}`)).length / Math.max(1, fromRep.elements.length);
    const old = new Set(fromRep.elements.map(e => `${e.type}|${label(e)}`));
    const fresh = toRep.elements.filter(e => !old.has(`${e.type}|${label(e)}`));
    if (kept >= 0.5 && stayed >= 0.7 && fresh.length) {
      const x0 = Math.min(...fresh.map(e => e.rect.x)), y0 = Math.min(...fresh.map(e => e.rect.y));
      const x1 = Math.max(...fresh.map(e => e.rect.x + e.rect.w)), y1 = Math.max(...fresh.map(e => e.rect.y + e.rect.h));
      if ((x1 - x0) * (y1 - y0) < 0.7 * dev.widthPx * dev.heightPx) return y1 >= dev.heightPx * 0.9 && y0 >= dev.heightPx * 0.3 ? "sheet" : "modal";
    }
  }
  return "push";
}

/** A modal or sheet sits on the screen it was opened from (or, for one shown at launch, the screen
 *  it dismisses to). Edges from an overlay back to its parent are dismissals: transition "back". */
function assignParents(screens: Screen[], edges: Edge[], graph: ExploreGraph): void {
  const step = new Map(graph.edges.map(g => [g.id, g.firstStep]));
  const byStep = (a: Edge, b: Edge) => (step.get(a.id) ?? 0) - (step.get(b.id) ?? 0);
  // Two phases: decide every parent from the ORIGINAL classification, then relabel dismissals.
  const parents = new Map<Screen, string>();
  for (const s of screens) {
    const opened = edges.filter(e => e.to === s.id && (e.transition === "modal" || e.transition === "sheet") && e.from !== s.id).sort(byStep)[0];
    const p = opened?.from ?? (OVERLAY_KINDS.has(s.kind) ? edges.filter(e => e.from === s.id && !e.to.startsWith("ext:") && e.to !== s.id).sort(byStep)[0]?.to : undefined);
    if (p) parents.set(s, p);
  }
  for (const [s, p] of parents) {
    s.parent = p;
    for (const e of edges) if (e.from === s.id && e.to === p && e.transition !== "external") e.transition = "back";
  }
}

async function buildExternals(graph: ExploreGraph, runDir: string, modelDir: string, screenOf: Map<string, string>, edges: Edge[],
  obs: Map<string, Observation>, shotSha: Map<string, string>): Promise<External[]> {
  const out = new Map<string, External>();
  const dev = graph.device;
  for (const v of graph.externals) {
    const id = `ext:${v.kind}`;
    const x = out.get(id) ?? { id, kind: v.kind, package: v.package, texts: [], from: [] };
    x.texts = [...new Set([...x.texts, ...v.texts.map(t => redactText(t))])].slice(0, 40);
    const s = screenOf.get(v.from);
    if (s && !x.from.some(f => f.screen === s && f.action === v.action)) x.from.push({ screen: s, action: v.action });
    if (!x.screenshot) {
      // External observations may or may not be listed in the graph; fall back to the conventional files.
      const o = obs.get(v.obs) ?? ["obs", "ext"].map(d => ({ id: v.obs, screenshot: `${d}/${v.obs}.png`, elements: [] as NormElement[] }))
        .find(c => fs.existsSync(path.resolve(runDir, c.screenshot))) as Observation | undefined;
      const file = `screens/ext-${v.kind}.png`;
      const shot = o ? await writeShot(runDir, o, dev, path.join(modelDir, file)) : null;
      if (shot) { x.screenshot = file; shotSha.set(id, shot.sha); }
    }
    out.set(id, x);
  }
  for (const e of edges) {
    if (!e.to.startsWith("ext:")) continue;
    const kind = e.to.slice(4);
    const x = out.get(e.to) ?? { id: e.to, kind: ExternalKind.safeParse(kind).success ? (kind as External["kind"]) : "other", package: "", texts: [], from: [] };
    if (!x.from.some(f => f.screen === e.from && f.action === e.action)) x.from.push({ screen: e.from, action: e.action });
    out.set(e.to, x);
  }
  return [...out.values()];
}

/** Chat transcripts from consume edges: the typed input, then the texts that appeared in reply. */
function buildTranscripts(graph: ExploreGraph, screenOf: Map<string, string>, actionOf: Map<string, Action>): ProductModel["transcripts"] {
  const typed = new Set(graph.typed.map(t => t.trim().toLowerCase()));
  const by = new Map<string, { role: "user" | "app"; text: string }[]>();
  for (const g of [...graph.edges].sort((a, b) => a.firstStep - b.firstStep)) {
    const a = actionOf.get(g.id);
    if (!a || (a.kind !== "consume" && a.kind !== "type-send")) continue;
    const screen = screenOf.get(g.from);
    if (!screen) continue;
    const replies = g.effects.flatMap(f => (f.kind === "appeared" ? [f.text.trim()] : []))
      .filter(t => t.length >= 8 && !typed.has(t.toLowerCase()) && t !== a.input && !/^[+\-−]?\d[\d,.]*\s*\S{0,12}$/.test(t));
    if (!replies.length) continue;
    const turns = by.get(screen) ?? [];
    if (a.input) turns.push({ role: "user", text: redactText(a.input) });
    for (const t of replies.slice(0, 3)) turns.push({ role: "app", text: redactText(t) });
    by.set(screen, turns.slice(0, 16));
  }
  return [...by].map(([screen, turns]) => ({ screen, turns }));
}

/** Coverage, including what was deliberately NOT explored and why (guard rails, unreachable, failures). */
function buildCoverage(graph: ExploreGraph, screenOf: Map<string, string>, edges: Edge[]): ProductModel["coverage"] {
  const minutes = graph.finishedAt ? Math.max(0, (Date.parse(graph.finishedAt) - Date.parse(graph.startedAt)) / 60000) : 0;
  const acts = graph.states.flatMap(s => s.actions.map(a => ({ s, a })));
  return {
    steps: graph.steps, minutes: r1(minutes), usd: graph.usd, states: graph.states.length, edges: edges.length,
    externals: new Set([...graph.externals.map(x => x.kind), ...edges.filter(e => e.to.startsWith("ext:")).map(e => e.to.slice(4))]).size,
    frontierLeft: acts.filter(({ s, a }) => s.inScope && a.status === "untried").length,
    unreachable: acts.filter(({ a }) => a.status === "unreachable").length,
    stopReason: graph.stopReason ?? "done",
    humanInterventions: graph.human.length,
    notExplored: acts.filter(({ a }) => a.status === "skipped" || a.status === "unreachable" || a.status === "failed")
      .map(({ s, a }) => ({ screen: screenOf.get(s.id) ?? s.id, action: a.id, intent: redactText(a.intent), why: redactText(a.skip || a.note || a.status) })),
  };
}

/**
 * render + variants, decided once flows and the economy are known.
 * HTML (generated, interactive) goes first to tabs, stores, paywalls and walls, then flow screens,
 * then screens with signals, then the most visited, up to the profile cap; the rest are shown as
 * images. Each HTML screen keeps up to 3 observed variants (another mode selected, a disabled send,
 * a toast) so the mock can render states, not just one frame.
 */
export async function finalizeScreens(cm: Compiled, flows: Flow[], economy: Economy, htmlCap: number): Promise<void> {
  const inFlow = new Set(flows.flatMap(f => f.steps.map(s => s.screen)));
  const walls = new Set(economy.walls.map(w => w.shows));
  const score = (s: Screen) => (["tab", "store", "paywall"].includes(s.kind) || walls.has(s.id) ? 4 : 0) + (inFlow.has(s.id) ? 2 : 0) + (s.signals.length ? 1 : 0);
  const ranked = cm.screens.filter(s => s.inScope).sort((a, b) => score(b) - score(a) || b.visits - a.visits || a.id.localeCompare(b.id));
  const html = new Set(ranked.slice(0, Math.max(0, htmlCap)).map(s => s.id));
  for (const s of cm.screens) {
    s.render = html.has(s.id) ? "html" : "image";
    s.variants = s.render === "html" ? await variants(cm, s) : [];
  }
  trace("decision", { what: "render", html: [...html], image: cm.screens.filter(s => !html.has(s.id)).map(s => s.id), cap: htmlCap });
}

async function variants(cm: Compiled, s: Screen): Promise<Screen["variants"]> {
  const rep = cm.obs.get(s.representative);
  if (!rep) return [];
  const sel = (o: Observation) => new Set(o.elements.filter(e => e.selected || e.checked).map(label).filter(Boolean));
  const dis = (o: Observation) => new Set(o.elements.filter(e => e.disabled).map(label).filter(Boolean));
  const texts = (o: Observation) => new Set((o.texts.length ? o.texts : o.elements.map(label)).filter(Boolean));
  const minus = <T>(a: Set<T>, b: Set<T>) => [...a].filter(x => !b.has(x));
  const base = { sel: sel(rep), dis: dis(rep), texts: texts(rep) };
  const seen = new Set<string>([[...base.sel].sort().join("|") + "#" + [...base.dis].sort().join("|") + "#" + [...base.texts].sort().join("|")]);
  const cands: { o: Observation; rank: number; note: string }[] = [];
  for (const id of s.observations) {
    const o = cm.obs.get(id);
    if (!o || o.id === rep.id || o.scrollIndex > 0) continue;
    const v = { sel: sel(o), dis: dis(o), texts: texts(o) };
    const key = [...v.sel].sort().join("|") + "#" + [...v.dis].sort().join("|") + "#" + [...v.texts].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    const selNew = minus(v.sel, base.sel), disNew = minus(v.dis, base.dis), dis0 = minus(base.dis, v.dis);
    const added = minus(v.texts, base.texts), removed = minus(base.texts, v.texts);
    if (!selNew.length && !disNew.length && !dis0.length && !added.length && !removed.length) continue;
    const note = [
      selNew.length && `selected: ${selNew.join(", ")}`, disNew.length && `disabled: ${disNew.join(", ")}`, dis0.length && `enabled: ${dis0.join(", ")}`,
      added.length && `shows: ${added.slice(0, 3).map(t => `"${t.slice(0, 30)}"`).join(", ")}`, removed.length && `hides: ${removed.slice(0, 2).map(t => `"${t.slice(0, 30)}"`).join(", ")}`,
    ].filter(Boolean).join("; ");
    // State changes (selection, enabled) are the valuable variants; big text diffs next.
    cands.push({ o, rank: (selNew.length || disNew.length || dis0.length ? 1000 : 0) + added.length + removed.length, note: redactText(note).slice(0, 160) });
  }
  const out: Screen["variants"] = [];
  for (const c of cands.sort((a, b) => b.rank - a.rank || a.o.step - b.o.step).slice(0, 3)) {
    const id = `${s.id}-v${out.length + 1}`;
    if (await writeShot(cm.runDir, c.o, cm.graph.device, path.join(cm.modelDir, `screens/${id}.png`))) out.push({ id, obs: c.o.id, screenshot: `screens/${id}.png`, note: c.note });
  }
  return out;
}
