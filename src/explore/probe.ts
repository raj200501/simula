// Probe: a one-screen go/no-go before a long exploration. It answers "can the explorer work on this
// app?" from what the device shows right now: how many elements, how many labelled actionables, whether
// numbers (a balance) can be read as text, the insets, and how long one observation takes. The insets
// are saved to config/device.json.
import path from "node:path";
import type { Device } from "../device/types.ts";
import type { StageCtx } from "../core/run.ts";
import { ROOT } from "../core/config.ts";
import type { DeviceInfo, Observation } from "../core/schema.ts";
import { ensureDir, nowIso, writeText } from "../core/io.ts";
import { trace } from "../core/trace.ts";
import { dhashOf, newExclusions, normalize, textsOf } from "./observe.ts";
import { heuristicAnnotation } from "./heuristic.ts";
import { guardReason } from "./guards.ts";
import { isInApp } from "./externals.ts";
import { labelOf, signatureOf } from "./signature.ts";

export interface ProbeReport {
  app: string;
  fg: string;
  inApp: boolean;
  device: DeviceInfo;
  elements: number;
  labelled: number;
  labelledActionable: number;
  numbers: string[];
  counters: { name: string; text: string }[];
  secsPerObserve: number;
  screenshot: string;
  deviceFile: string;
  checks: ProbeCheck[];
  go: boolean;
}

/** gate: the check decides GO; otherwise it is a warning (printed, never blocking). */
export interface ProbeCheck { name: string; pass: boolean; detail: string; gate: boolean }

export async function probe(c: StageCtx, dev: Device, o: { deviceFile?: string } = {}): Promise<ProbeReport> {
  const info = await dev.info();
  const dir = ensureDir(path.join(c.paths.explore, "probe"));
  const shot = path.join(dir, "probe.png");
  // time two full observations: elements + foreground + screenshot is the floor of one explorer step
  let raw = await dev.elements();
  let fg = "";
  const times: number[] = [];
  for (let i = 0; i < 2; i++) {
    const t0 = Date.now();
    raw = await dev.elements();
    fg = await dev.foreground();
    await dev.screenshot(shot);
    times.push((Date.now() - t0) / 1000);
  }
  const els = normalize(raw, info, newExclusions());
  const obs: Observation = {
    id: "probe", step: 0, ts: nowIso(), fg, screenshot: "probe/probe.png", elements: els,
    signature: signatureOf(els), dhash: await dhashOf(shot), scrollIndex: 0, counters: [], texts: textsOf(els),
  };
  const ann = heuristicAnnotation(obs, { info });
  // every labelled element the explorer could tap (not only the 2-per-list sample it would try)
  const screen = info.widthPx * info.heightPx;
  const actionable = els.filter(e => labelOf(e) && !e.ad && e.rect.w * e.rect.h < 0.9 * screen && !guardReason(e, labelOf(e), "tap"));
  const byId = new Map(els.map(e => [e.id, e]));
  const counters = ann.counters.map(k => ({ name: k.name, text: labelOf(byId.get(k.el) ?? {}) }));
  const numbers = els.map(labelOf).filter(t => /\d/.test(t)).slice(0, 12);
  const secs = Number((times.reduce((a, b) => a + b, 0) / times.length).toFixed(2));
  const inApp = isInApp(fg, c.app.package);
  // gate checks decide GO (can the explorer see and act on this app at all?); warnings are printed but a
  // sparse first screen (a guest chat home: a greeting, a few suggestion chips and an input) is still explorable
  const checks: ProbeCheck[] = [
    { name: "the app is in the foreground", pass: inApp, detail: fg, gate: true },
    { name: "at least 3 elements after normalizing", pass: els.length >= 3, detail: `${els.length} elements`, gate: true },
    { name: "at least 3 labelled actionable elements", pass: actionable.length >= 3, detail: `${actionable.length} labelled actionables`, gate: true },
    { name: "at least 10 labelled actionable elements", pass: actionable.length >= 10, detail: `${actionable.length} labelled actionables`, gate: false },
    { name: "a balance or other number is readable as text", pass: counters.length > 0 || numbers.length > 0, detail: counters.map(k => `${k.name}: "${k.text}"`).join(", ") || numbers.slice(0, 3).join(", ") || "none", gate: false },
    { name: "insets known", pass: info.kind === "web" || (info.statusBarPx > 0 && info.navBarPx > 0), detail: `status ${info.statusBarPx}px, nav ${info.navBarPx}px`, gate: false },
    { name: "one observation under 10 s", pass: secs < 10, detail: `${secs}s`, gate: false },
  ];
  const go = checks.filter(k => k.gate).every(k => k.pass);
  const deviceFile = o.deviceFile ?? path.join(ROOT, "config", "device.json");
  writeText(deviceFile, JSON.stringify({ widthPx: info.widthPx, heightPx: info.heightPx, density: info.density, statusBarPx: info.statusBarPx, navBarPx: info.navBarPx }, null, 2) + "\n");
  const report: ProbeReport = {
    app: c.app.id, fg, inApp, device: info, elements: els.length, labelled: els.filter(e => labelOf(e)).length,
    labelledActionable: actionable.length, numbers, counters, secsPerObserve: secs, screenshot: shot, deviceFile, checks, go,
  };
  writeText(path.join(dir, "probe.json"), JSON.stringify(report, null, 2) + "\n");
  trace("info", { probe: { go, elements: report.elements, labelledActionable: report.labelledActionable, counters, secs } });
  const lines = [
    `probe ${c.app.id}: ${go ? "GO" : "NO-GO"}  (screen "${ann.name}", ${ann.kind})`,
    ...checks.map(k => `  [${k.pass ? "x" : k.gate ? " " : "!"}] ${k.name}: ${k.detail}${!k.pass && !k.gate ? "  (warning)" : ""}`),
    `  device ${info.widthPx}x${info.heightPx} @${info.density} -> ${deviceFile}`,
  ];
  process.stdout.write(lines.join("\n") + "\n");
  return report;
}
