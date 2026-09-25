// McpDevice: the Android emulator driven through mobile-mcp 1.0.5 over stdio (the "mobile MCP" the brief asks for).
// Every tool name, argument and failure mode used here is taken from docs/research/mobile-mcp.md (read from the
// package source and checked against the live server).
//
// The server is fragile in three ways, and this file exists mostly to absorb them:
//   1. It runs mobilecli with execFileSync, so one server handles exactly one call at a time and a hung call
//      freezes it. We queue calls strictly, time each out, and kill + respawn the process on a hang.
//   2. Some failures come back as ordinary text ("... Please fix the issue and try again.") without isError.
//      We detect both styles and retry once.
//   3. It logs every call with its full response to stderr. If nobody reads that pipe it fills up and the
//      server blocks, which looks exactly like a device hang. We drain it into a capped ring buffer.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport, getDefaultEnvironment } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { DeviceInfo, type RawElement } from "../core/schema.ts";
import { ROOT } from "../core/config.ts";
import { ensureDir, sleep } from "../core/io.ts";
import { trace } from "../core/trace.ts";
import { DeviceError, type Device } from "./types.ts";

const require = createRequire(import.meta.url);

export const CALL_TIMEOUT_MS = 45_000;
const CONNECT_TIMEOUT_MS = 30_000;
const STDERR_CAP = 64 * 1024;
/** Pixel 8 (420 dpi / 160). Used only when neither config/device.json nor adb can tell us the density. */
export const DEFAULT_DENSITY = 2.625;
const BOOT_HINT = "boot the emulator: npm run device -- boot";

/** The tools this driver relies on; mcpDoctor checks that the installed server still has them. */
export const REQUIRED_TOOLS = [
  "mobile_list_available_devices", "mobile_get_screen_size", "mobile_list_elements_on_screen", "mobile_get_foreground_app",
  "mobile_save_screenshot", "mobile_click_on_screen_at_coordinates", "mobile_type_keys", "mobile_press_button",
  "mobile_swipe_on_screen", "mobile_launch_app", "mobile_terminate_app",
];

// ---------------------------------------------------------------------------------------------
// Pure helpers (unit-tested without a device)
// ---------------------------------------------------------------------------------------------

/** mobile-mcp reports "actionable" errors as plain text without isError; real exceptions start with "Error: ". */
export function isErrorText(text: string): boolean {
  return /Please fix the issue and try again\.$/.test(text.trim()) || /^Error: /.test(text);
}

interface McpElement {
  type?: string; text?: string; label?: string; name?: string; value?: string; identifier?: string;
  coordinates?: { x: number; y: number; width: number; height: number };
  focused?: boolean; selected?: boolean; checked?: boolean; enabled?: boolean;
}

/**
 * Parse mobile_list_elements_on_screen {format:"json"}. The positional `ref` is dropped on purpose: we always tap
 * by coordinates we computed, never by ref. Document order (DFS pre-order) is kept. Empty strings are dropped so
 * `text || label` works downstream; iOS `value`/`name` fill in for text/label so the same parser would serve iOS.
 */
export function parseElements(text: string): RawElement[] {
  const body = text.replace(/^\s*Found these elements on screen:\s*/, "").trim();
  if (!body.startsWith("[")) throw new DeviceError(`unexpected element list: ${body.slice(0, 160)}`, "mobile_list_elements_on_screen");
  const items = JSON.parse(body) as McpElement[];
  const nonEmpty = (s?: string) => (s && s.length ? s : undefined);
  return items.map((e): RawElement => {
    const c = e.coordinates ?? { x: 0, y: 0, width: 0, height: 0 };
    const el: RawElement = { type: e.type || "text", rect: { x: c.x, y: c.y, w: c.width, h: c.height } };
    const t = nonEmpty(e.text) ?? nonEmpty(e.value);
    const l = nonEmpty(e.label) ?? nonEmpty(e.name);
    if (t !== undefined) el.text = t;
    if (l !== undefined) el.label = l;
    if (nonEmpty(e.identifier)) el.identifier = e.identifier;
    // mobile-mcp only emits non-default states; mirror that (true flags only).
    if (e.focused) el.focused = true;
    if (e.selected) el.selected = true;
    if (e.checked) el.checked = true;
    if (e.enabled === false) el.disabled = true;
    return el;
  });
}

/** "Foreground app: App Name (com.pkg)" -> "com.pkg". */
export function parseForeground(text: string): string | null {
  return /\(([\w.]+)\)\s*$/.exec(text.trim())?.[1] ?? null;
}

/** "Screen size is 1080x2400 pixels" -> {width:1080, height:2400}. */
export function parseScreenSize(text: string): { width: number; height: number } {
  const m = /(\d+)x(\d+)/.exec(text);
  if (!m) throw new DeviceError(`cannot parse screen size from: ${text.slice(0, 120)}`, "mobile_get_screen_size");
  return { width: Number(m[1]), height: Number(m[2]) };
}

export interface ListedDevice { id: string; name?: string; platform?: string; type?: string; version?: string; state?: string }

/** mobile_list_available_devices returns a JSON string {"devices":[...]}; online devices only. */
export function parseDevices(text: string): ListedDevice[] {
  try {
    const j = JSON.parse(text) as { devices?: ListedDevice[] };
    return Array.isArray(j.devices) ? j.devices : [];
  } catch {
    throw new DeviceError(`unexpected device list: ${text.slice(0, 160)}`, "mobile_list_available_devices");
  }
}

/** ANDROID_SERIAL (or an explicit serial) wins; otherwise the first Android device. No device is a precondition failure, not a retry. */
export function pickDevice(devices: ListedDevice[], preferred?: string): string {
  if (preferred) {
    if (devices.some(d => d.id === preferred)) return preferred;
    throw new DeviceError(`Device "${preferred}" is not online (online: ${devices.map(d => d.id).join(", ") || "none"}); ${BOOT_HINT}`, "mobile_list_available_devices", false);
  }
  const android = devices.find(d => d.platform === "android");
  if (!android) throw new DeviceError(`No online Android device found by mobile-mcp; ${BOOT_HINT}`, "mobile_list_available_devices", false);
  return android.id;
}

/** `adb shell wm density`: "Physical density: 420" [+ "Override density: 440"] -> px per dp. */
export function parseDensity(text: string): number | null {
  const pick = (re: RegExp) => { const m = re.exec(text); return m ? Number(m[1]) : null; };
  const dpi = pick(/Override density:\s*(\d+)/) ?? pick(/Physical density:\s*(\d+)/);
  return dpi ? dpi / 160 : null;
}

/**
 * Status/navigation bar heights from `adb shell dumpsys window`. Handles the Android 13-15 InsetsSource format
 * ("mType=statusBars mFrame=[0,0][1080,136]") and the older one ("type=ITYPE_STATUS_BAR frame=[0,0][1080,136]").
 * The dump holds one InsetsState per window, some with empty frames, so we keep the largest height per kind.
 */
export function parseInsets(text: string): { statusBarPx: number | null; navBarPx: number | null } {
  const re = /(?:mType=|type=ITYPE_)(statusBars|navigationBars|STATUS_BAR|NAVIGATION_BAR)\b[^\[\]]*?(?:mFrame|frame)=\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]/g;
  let status: number | null = null;
  let nav: number | null = null;
  for (const m of text.matchAll(re)) {
    const h = Number(m[5]) - Number(m[3]);
    if (h <= 0) continue;
    if (/status/i.test(m[1])) status = Math.max(status ?? 0, h);
    else nav = Math.max(nav ?? 0, h);
  }
  return { statusBarPx: status, navBarPx: nav };
}

/**
 * Vertical swipe with start and end kept inside 15-85% of the height (and x inside 10-90% of the width), away
 * from the gesture-navigation edges where a swipe would go Home or Back. mobile-mcp does not clamp the end point.
 * "up" = the finger moves up = content scrolls toward what is below.
 */
export function planSwipe(dir: "up" | "down", x: number, y: number, dist: number, width: number, height: number): { x: number; y: number; distance: number } {
  const lo = Math.round(height * 0.15);
  const hi = Math.round(height * 0.85);
  const distance = Math.max(1, Math.min(Math.round(Math.abs(dist)), hi - lo));
  const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
  const startY = dir === "up" ? clamp(Math.round(y), lo + distance, hi) : clamp(Math.round(y), lo, hi - distance);
  const startX = clamp(Math.round(x), Math.round(width * 0.1), Math.round(width * 0.9));
  return { x: startX, y: startY, distance };
}

// ---------------------------------------------------------------------------------------------
// Process plumbing: server spawn, mobilecli binary, adb
// ---------------------------------------------------------------------------------------------

/** How to start the server. Tests pass a fake server; production always uses the pinned npm package. */
export interface McpServerSpec { command: string; args: string[] }

export function defaultServerSpec(): McpServerSpec {
  // Spawning the pinned package with our own node skips npx resolution (and any download) on every run.
  return { command: process.execPath, args: [require.resolve("@mobilenext/mobile-mcp/lib/index.js"), "--stdio"] };
}

function serverEnv(): Record<string, string> {
  // StdioClientTransport only inherits HOME, LOGNAME, PATH, SHELL, TERM, USER by default: pass the SDK location
  // explicitly, switch telemetry off, and allow custom-scheme deep links.
  const env: Record<string, string> = { ...getDefaultEnvironment(), MOBILEMCP_DISABLE_TELEMETRY: "1", MOBILEMCP_ALLOW_UNSAFE_URLS: "1" };
  for (const k of ["ANDROID_HOME", "MOBILECLI_PATH"]) if (process.env[k]) env[k] = process.env[k]!;
  return env;
}

/** The bundled mobilecli binary (node_modules/@mobilenext/mobilecli-<os>-<arch>/), or MOBILECLI_PATH. */
export function mobilecliPath(): string | null {
  if (process.env.MOBILECLI_PATH) return process.env.MOBILECLI_PATH;
  const osName = process.platform === "win32" ? "windows" : process.platform;
  const pkg = `mobilecli-${osName}-${process.arch === "arm64" ? "arm64" : "amd64"}`;
  const bin = pkg + (process.platform === "win32" ? ".exe" : "");
  let mcpDir = path.join(ROOT, "node_modules", "@mobilenext", "mobile-mcp");
  try { mcpDir = path.dirname(require.resolve("@mobilenext/mobile-mcp/package.json")); } catch { /* keep the default guess */ }
  const candidates = [
    path.join(mcpDir, "..", pkg, bin),                              // hoisted next to mobile-mcp (npm)
    path.join(mcpDir, "node_modules", "@mobilenext", pkg, bin),     // nested under mobile-mcp
    path.join(ROOT, "node_modules", "@mobilenext", pkg, bin),
  ];
  return candidates.find(p => fs.existsSync(p)) ?? null;
}

function run(cmd: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024 }, (err, stdout) => (err ? reject(err) : resolve(String(stdout))));
  });
}

/** Last resort after repeated hangs: the mobilecli daemon keeps state across server restarts, so reset it. Best effort. */
async function stopMobilecliDaemon(): Promise<void> {
  const bin = mobilecliPath();
  if (!bin) { trace("failure", { where: "mcp:daemon-stop", error: "mobilecli binary not found" }); return; }
  try {
    await run(bin, ["daemon", "stop"], 15_000);
    trace("recovery", { where: "mcp", how: "mobilecli daemon stop" });
  } catch (e) {
    trace("failure", { where: "mcp:daemon-stop", error: errMsg(e) });
  }
}

function adbBinary(): string {
  const sdk = process.env.ANDROID_HOME;
  const p = sdk ? path.join(sdk, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb") : "";
  return p && fs.existsSync(p) ? p : "adb";
}

function errMsg(e: unknown): string {
  return String((e as Error)?.message ?? e);
}

function contentText(content: unknown): string {
  const items = Array.isArray(content) ? (content as { type?: string; text?: string }[]) : [];
  return items.filter(c => c.type === "text").map(c => c.text ?? "").join("\n");
}

function isUnder(file: string, root: string): boolean {
  const real = (p: string) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
  const rel = path.relative(real(root), real(path.dirname(file)));
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

/** A failure the tool itself reported (as opposed to a hang or a dead server). The server is fine; just retry. */
class ToolReportedError extends DeviceError {}

// ---------------------------------------------------------------------------------------------
// McpSession: one server process, strictly sequential calls, timeout + retry + respawn
// ---------------------------------------------------------------------------------------------

export class McpSession {
  readonly cwd: string;
  readonly server: McpServerSpec;
  readonly timeoutMs: number;
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private stderrBuf = "";
  private consecutiveTimeouts = 0;
  private spawns = 0;

  constructor(o: { cwd: string; server?: McpServerSpec; timeoutMs?: number }) {
    this.cwd = o.cwd;
    this.server = o.server ?? defaultServerSpec();
    this.timeoutMs = o.timeoutMs ?? CALL_TIMEOUT_MS;
  }

  /** The last n characters the server wrote to stderr (it logs every call and response). */
  stderrTail(n = 2000): string {
    return this.stderrBuf.slice(-n);
  }

  /** Call a tool and return its text. Throws DeviceError after one retry. */
  call(tool: string, args: Record<string, unknown>): Promise<string> {
    return this.enqueue(() => this.callWithRecovery(tool, args));
  }

  listTools(): Promise<string[]> {
    return this.enqueue(async () => {
      const client = await this.ensureStarted();
      const r = await client.listTools(undefined, { timeout: this.timeoutMs });
      return r.tools.map(t => t.name);
    });
  }

  close(): Promise<void> {
    return this.enqueue(() => this.kill());
  }

  /** The server can only do one thing at a time, so every call waits for the previous one (success or failure). */
  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn, fn);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async callWithRecovery(tool: string, args: Record<string, unknown>): Promise<string> {
    let lastError: unknown;
    let how = "retry";
    for (let attempt = 1; attempt <= 2; attempt++) {
      const t0 = Date.now();
      try {
        const client = await this.ensureStarted();
        const res = await client.callTool({ name: tool, arguments: args }, undefined, { timeout: this.timeoutMs });
        const text = contentText(res.content);
        if (res.isError || isErrorText(text)) throw new ToolReportedError(`${tool}: ${text.slice(0, 500)}`, tool);
        trace("mcp_call", { tool, ms: Date.now() - t0, ok: true });
        this.consecutiveTimeouts = 0;
        if (attempt > 1) trace("recovery", { where: `mcp:${tool}`, how });
        return text;
      } catch (e) {
        lastError = e;
        const timedOut = e instanceof McpError && e.code === ErrorCode.RequestTimeout;
        trace("mcp_call", { tool, ms: Date.now() - t0, ok: false, attempt, error: errMsg(e).slice(0, 300) });
        trace("failure", { where: `mcp:${tool}`, error: errMsg(e).slice(0, 300), attempt });
        if (e instanceof ToolReportedError) {
          await sleep(500); // usually a screen mid-transition; give it a moment before the retry
        } else {
          // A hang or a dead process. The server blocks inside execFileSync, so the only cure is a fresh process.
          await this.kill();
          how = "killed and respawned mobile-mcp";
          if (timedOut && ++this.consecutiveTimeouts >= 2) {
            await stopMobilecliDaemon();
            this.consecutiveTimeouts = 0;
            how = "mobilecli daemon stop + respawn";
          }
        }
      }
    }
    if (lastError instanceof DeviceError) throw lastError;
    const tail = this.stderrTail(400).trim();
    throw new DeviceError(`${tool}: ${errMsg(lastError)}${tail ? `\nserver stderr: ${tail}` : ""}`, tool);
  }

  private async ensureStarted(): Promise<Client> {
    if (this.client) return this.client;
    const transport = new StdioClientTransport({
      command: this.server.command,
      args: this.server.args,
      cwd: this.cwd, // mobile_save_screenshot may only write under the server's cwd (or the OS temp dir)
      env: serverEnv(),
      stderr: "pipe",
    });
    // Attach before start: the PassThrough exists immediately, so no early output is lost and the pipe never fills.
    transport.stderr?.on("data", (chunk: Buffer) => {
      this.stderrBuf += chunk.toString();
      if (this.stderrBuf.length > STDERR_CAP) this.stderrBuf = this.stderrBuf.slice(-STDERR_CAP);
    });
    const client = new Client({ name: "simula-explorer", version: "0.1.0" });
    client.onclose = () => {
      if (this.client === client) { this.client = null; this.transport = null; }
    };
    this.client = client;
    this.transport = transport;
    try {
      await client.connect(transport, { timeout: CONNECT_TIMEOUT_MS });
    } catch (e) {
      await this.kill();
      throw new Error(`mobile-mcp did not start: ${errMsg(e)}`);
    }
    this.spawns++;
    trace("info", { where: "mcp", event: this.spawns === 1 ? "server started" : "server respawned", spawns: this.spawns });
    return client;
  }

  private async kill(): Promise<void> {
    const client = this.client;
    const transport = this.transport;
    this.client = null;
    this.transport = null;
    if (!transport) return;
    // SIGKILL first: a hung server is stuck in execFileSync and would ignore stdin EOF and SIGTERM grace periods.
    const pid = transport.pid;
    if (pid) { try { process.kill(pid, "SIGKILL"); } catch { /* already gone */ } }
    await (client ?? transport).close().catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------------------------
// Screen geometry that mobile-mcp does not expose (density, insets)
// ---------------------------------------------------------------------------------------------

/** config/device.json is written by `probe` (widthPx, heightPx, density, statusBarPx, navBarPx). */
export function readDeviceConfig(file = path.join(ROOT, "config", "device.json")): Partial<DeviceInfo> | null {
  if (!fs.existsSync(file)) return null;
  try {
    const r = DeviceInfo.partial().safeParse(JSON.parse(fs.readFileSync(file, "utf8")));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

/**
 * density + insets, in order of trust:
 *   1. config/device.json, if it describes a screen of this size (a file from another device is ignored);
 *   2. adb (`wm density`, `dumpsys window`) - read-only geometry queries, outside MCP because MCP has no tool for it;
 *   3. Pixel 8 defaults: density 2.625, insets 0 (the explorer then simply does not mask the bars).
 */
async function screenMetrics(serial: string, size: { width: number; height: number }): Promise<{ density: number; statusBarPx: number; navBarPx: number; source: string }> {
  const cfg = readDeviceConfig();
  const sameScreen = cfg && (cfg.widthPx === undefined || cfg.widthPx === size.width) && (cfg.heightPx === undefined || cfg.heightPx === size.height);
  if (cfg && sameScreen && cfg.density) {
    return { density: cfg.density, statusBarPx: cfg.statusBarPx ?? 0, navBarPx: cfg.navBarPx ?? 0, source: "config/device.json" };
  }
  const adb = adbBinary();
  const [dens, win] = await Promise.all([
    run(adb, ["-s", serial, "shell", "wm", "density"], 10_000).catch(() => ""),
    run(adb, ["-s", serial, "shell", "dumpsys", "window"], 15_000).catch(() => ""),
  ]);
  const density = parseDensity(dens);
  const insets = parseInsets(win);
  const source = density || insets.statusBarPx || insets.navBarPx ? "adb" : "defaults";
  return { density: density ?? DEFAULT_DENSITY, statusBarPx: insets.statusBarPx ?? 0, navBarPx: insets.navBarPx ?? 0, source };
}

// ---------------------------------------------------------------------------------------------
// McpDevice
// ---------------------------------------------------------------------------------------------

export class McpDevice implements Device {
  readonly kind = "android" as const;
  readonly serial: string;
  readonly appPackage: string;
  private readonly session: McpSession;
  private cachedInfo: DeviceInfo | null = null;

  private constructor(session: McpSession, serial: string, appPackage: string) {
    this.session = session;
    this.serial = serial;
    this.appPackage = appPackage;
  }

  /**
   * Spawn the server and pick the device (ANDROID_SERIAL / `serial`, else the first Android device).
   * `server` and `timeoutMs` exist for tests (a fake server, short timeouts); production uses the defaults.
   */
  static async connect(o: { appPackage: string; serial?: string; cwd: string; server?: McpServerSpec; timeoutMs?: number }): Promise<McpDevice> {
    const session = new McpSession({ cwd: o.cwd, server: o.server, timeoutMs: o.timeoutMs });
    try {
      const devices = parseDevices(await session.call("mobile_list_available_devices", {}));
      const serial = pickDevice(devices, o.serial ?? process.env.ANDROID_SERIAL);
      trace("info", { where: "device.connect", serial, online: devices.map(d => d.id) });
      return new McpDevice(session, serial, o.appPackage);
    } catch (e) {
      await session.close();
      throw e;
    }
  }

  /** The server's recent stderr, for failure reports. */
  serverLog(n?: number): string {
    return this.session.stderrTail(n);
  }

  private call(tool: string, args: Record<string, unknown> = {}): Promise<string> {
    return this.session.call(tool, { device: this.serial, ...args });
  }

  /** Cached: the screen does not change size mid-run (orientation is fixed by the setup script). */
  async info(): Promise<DeviceInfo> {
    if (this.cachedInfo) return this.cachedInfo;
    const size = parseScreenSize(await this.call("mobile_get_screen_size"));
    const m = await screenMetrics(this.serial, size);
    trace("info", { where: "device.info", widthPx: size.width, heightPx: size.height, density: m.density, statusBarPx: m.statusBarPx, navBarPx: m.navBarPx, source: m.source });
    this.cachedInfo = DeviceInfo.parse({ widthPx: size.width, heightPx: size.height, density: m.density, statusBarPx: m.statusBarPx, navBarPx: m.navBarPx, kind: "android" });
    return this.cachedInfo;
  }

  async foreground(): Promise<string> {
    const text = await this.call("mobile_get_foreground_app");
    return parseForeground(text) ?? "unknown";
  }

  async elements(): Promise<RawElement[]> {
    return parseElements(await this.call("mobile_list_elements_on_screen", { format: "json" }));
  }

  /** Full-resolution lossless PNG (mobile_save_screenshot without maxSize/scale). */
  async screenshot(absPath: string): Promise<void> {
    ensureDir(path.dirname(absPath));
    // The server only writes under its cwd or the OS temp dir; anything else is staged through the temp dir.
    const direct = isUnder(absPath, this.session.cwd) || isUnder(absPath, os.tmpdir());
    const target = direct ? absPath : path.join(os.tmpdir(), `simula-shot-${process.pid}-${Date.now()}${path.extname(absPath) || ".png"}`);
    await this.call("mobile_save_screenshot", { saveTo: target });
    if (!direct) {
      fs.copyFileSync(target, absPath);
      fs.rmSync(target, { force: true });
    }
    if (!fs.existsSync(absPath)) throw new DeviceError(`screenshot was not written: ${path.basename(absPath)}`, "mobile_save_screenshot");
  }

  /** Always by coordinates (rect centres we computed). Refs are positional and can hit the wrong element. */
  async tap(x: number, y: number): Promise<void> {
    await this.call("mobile_click_on_screen_at_coordinates", { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) });
  }

  /** Never submits: chat apps treat ENTER as a newline, so the explorer taps Send instead. */
  async typeText(text: string): Promise<void> {
    await this.call("mobile_type_keys", { text, submit: false });
  }

  async pressEnter(): Promise<void> {
    await this.call("mobile_press_button", { button: "ENTER" });
  }

  async back(): Promise<void> {
    await this.call("mobile_press_button", { button: "BACK" });
  }

  async swipe(dir: "up" | "down", x: number, y: number, distPx: number): Promise<void> {
    const { widthPx, heightPx } = await this.info();
    const s = planSwipe(dir, x, y, distPx, widthPx, heightPx);
    await this.call("mobile_swipe_on_screen", { direction: dir, x: s.x, y: s.y, distance: s.distance });
  }

  /** cold: force-stop first (keeps the login, resets the in-memory navigation stack). */
  async launch(opts: { cold?: boolean } = {}): Promise<void> {
    if (opts.cold) await this.call("mobile_terminate_app", { packageName: this.appPackage });
    await this.call("mobile_launch_app", { packageName: this.appPackage });
  }

  async close(): Promise<void> {
    await this.session.close();
  }
}

// ---------------------------------------------------------------------------------------------
// Doctor
// ---------------------------------------------------------------------------------------------

/** Spawn the server, list its tools, list devices. Never throws: every problem becomes a line. */
export async function mcpDoctor(o: { cwd?: string; server?: McpServerSpec; timeoutMs?: number } = {}): Promise<{ ok: boolean; lines: string[] }> {
  const lines: string[] = [];
  let ok = false;
  const session = new McpSession({ cwd: o.cwd ?? ROOT, server: o.server, timeoutMs: o.timeoutMs ?? 20_000 });
  try {
    const bin = mobilecliPath();
    lines.push(bin ? `mobilecli: ${path.relative(ROOT, bin) || bin}` : "mobilecli: binary not found (install with npm, not pnpm, or set MOBILECLI_PATH)");
    const tools = await session.listTools();
    const missing = REQUIRED_TOOLS.filter(t => !tools.includes(t));
    lines.push(`mobile-mcp: ${tools.length} tools${missing.length ? `, MISSING ${missing.join(", ")}` : ", all required tools present"}`);
    const devices = parseDevices(await session.call("mobile_list_available_devices", {}));
    for (const d of devices) lines.push(`device: ${d.id} ${d.platform ?? "?"} ${d.type ?? ""} ${d.version ?? ""} ${d.state ?? ""}`.trim());
    const android = devices.some(d => d.platform === "android");
    if (!android) lines.push(`no online Android device: ${BOOT_HINT}`);
    ok = !missing.length && android;
  } catch (e) {
    lines.push(`error: ${errMsg(e).split("\n")[0]}`);
    const tail = session.stderrTail(400).trim();
    if (tail) lines.push(`server stderr: ${tail}`);
  } finally {
    await session.close();
  }
  return { ok, lines };
}
