// An in-memory Android-like device running a tiny credit-metered chat app, built to exercise the
// explorer's known failure modes without an emulator:
//   - the balance is shown on Home only (the chat never shows it)            -> T1 drain back-fill
//   - Send appears only after typing (a mic is shown before)                 -> T7
//   - chat bubbles vary in width; user bubbles right-aligned, bot left       -> T2 identity
//   - a Sponsored card in the feed (no ad resource id, just a badge)         -> T3
//   - a "Log out" row                                                        -> guard rails
//   - a row half hidden under the navigation bar (taps there go "home")      -> T8
//   - store packs open an external billing surface (com.android.vending)     -> handleExternal
//   - an "Out of credits" sheet when balance < cost                          -> wall / limitHit
// Everything the explorer does is recorded (taps, sends, ad taps, logouts) for assertions.
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { Device } from "../../src/device/types.ts";
import type { DeviceInfo, RawElement, Rect } from "../../src/core/schema.ts";
import { paths, type AppConfig, type Profile } from "../../src/core/config.ts";
import type { StageCtx } from "../../src/core/run.ts";
import type { Timing } from "../../src/explore/observe.ts";

export const FAKE_PKG = "com.example.fakechat";
export const LAUNCHER_PKG = "com.google.android.apps.nexuslauncher";
export const BILLING_PKG = "com.android.vending";
export const W = 1080;
export const H = 2400;
export const STATUS = 63;
export const NAV = 126;
const TOP_BAR = 231;
const TAB_Y = 2127;
const COMPOSER_Y = 2080;

type Tab = "home" | "store" | "profile";
type Screen = Tab | "detail" | "chat";
interface El extends RawElement { tap?: () => void; overlay?: boolean }

const STORIES: { title?: string; blurb?: string; h: number; ad?: boolean }[] = [
  { title: "The Last Lighthouse", blurb: "A keeper hears knocking at midnight, far out at sea.", h: 330 },
  { title: "Neon Detective", blurb: "Rain, neon and one last case before the city wakes up.", h: 420 },
  { ad: true, h: 300 },
  { title: "Moon Garden", blurb: "Something grows in the greenhouse that nobody ever planted.", h: 380 },
];
const REPLIES = [
  "The door creaks open and a cold wind rushes up the stairs.",
  "Mara lifts the lantern. Who sent you here, and why now?",
  "Somewhere below, the sea answers with a long and low roar.",
  "A second knock, softer this time, almost polite, then silence.",
  "Footprints of salt water lead from the door to the stairs.",
];
const PACKS: [string, string][] = [["1,000 credits", "$1.39"], ["2,000 credits", "$2.89"], ["5,000 credits", "$7.09"]];
const GREETING = "The lamp flickers on the landing. Who is climbing the stairs at this hour?";

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
const T = (name: string) => `android.widget.${name}`;
const area = (e: El) => e.rect.w * e.rect.h;

export interface FakeOpts {
  balance?: number;
  cost?: number;
  replyDelayMs?: number;
  /** After this many device calls every call throws, like an emulator that went away. */
  failAfter?: number;
}

export class FakeCreditChat implements Device {
  readonly kind = "android" as const;
  balance: number;
  cost: number;
  replyDelayMs: number;
  stack: Screen[] = ["home"];
  wall = false;
  external: null | "billing" | "launcher" = null;
  billingPack = 0;
  story = 0;
  messages: { me: boolean; text: string }[] = [{ me: false, text: GREETING }];
  pending: { at: number; text: string } | null = null;
  input = "";
  focused = false;
  detailOffset = 0;
  replies = 0;
  // audit trail for assertions
  taps: { x: number; y: number; label: string; screen: string }[] = [];
  logouts = 0;
  adTaps = 0;
  purchases = 0;
  micTaps = 0;
  sends = 0;
  billingOpens = 0;
  maxMessages = 1;
  calls = 0;
  failAfter: number;

  constructor(o: FakeOpts = {}) {
    this.balance = o.balance ?? 120;
    this.cost = o.cost ?? 10;
    this.replyDelayMs = o.replyDelayMs ?? 30;
    this.failAfter = o.failAfter ?? Infinity;
  }

  private alive(): void {
    if (++this.calls > this.failAfter) throw new Error("device offline");
  }

  get screen(): Screen { return this.stack[this.stack.length - 1]; }

  /** Test hook: fill the chat with n messages (alternating bot / user). */
  setMessages(n: number): void {
    this.messages = [{ me: false, text: GREETING }];
    for (let i = 1; i < n; i++) this.messages.push(i % 2 ? { me: true, text: "Hi! What happens next?" } : { me: false, text: REPLIES[i % REPLIES.length] });
    this.maxMessages = Math.max(this.maxMessages, n);
  }

  // ---------------------------------------------------------------- Device
  async info(): Promise<DeviceInfo> {
    return { widthPx: W, heightPx: H, density: 2.625, statusBarPx: STATUS, navBarPx: NAV, kind: "android" };
  }

  async foreground(): Promise<string> {
    this.alive();
    return this.external === "billing" ? BILLING_PKG : this.external === "launcher" ? LAUNCHER_PKG : FAKE_PKG;
  }

  async elements(): Promise<RawElement[]> {
    this.alive();
    this.tick();
    return this.render().map(({ tap: _t, overlay: _o, ...e }) => e);
  }

  async screenshot(file: string): Promise<void> {
    this.alive();
    const s = 4;
    const cw = W / s;
    const ch = H / s;
    const layers = this.render()
      .filter(e => e.rect.w > 0 && e.rect.h > 0)
      .map(e => {
        const left = Math.max(0, Math.min(cw - 1, Math.round(e.rect.x / s)));
        const top = Math.max(0, Math.min(ch - 1, Math.round(e.rect.y / s)));
        const width = Math.max(1, Math.min(cw - left, Math.round(e.rect.w / s)));
        const height = Math.max(1, Math.min(ch - top, Math.round(e.rect.h / s)));
        return { input: { create: { width, height, channels: 3 as const, background: colour(`${e.type}${e.identifier}${e.text}`) } }, left, top };
      });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await sharp({ create: { width: cw, height: ch, channels: 3, background: this.external ? "#202020" : "#ffffff" } }).composite(layers).png().toFile(file);
  }

  async tap(x: number, y: number): Promise<void> {
    this.alive();
    const els = this.render();
    const hit = (e: El) => x >= e.rect.x && x < e.rect.x + e.rect.w && y >= e.rect.y && y < e.rect.y + e.rect.h;
    const labelled = els.filter(e => hit(e) && (e.text || e.label)).sort((a, b) => area(a) - area(b))[0];
    this.taps.push({ x, y, label: labelled?.text ?? labelled?.label ?? "", screen: this.external ?? (this.wall ? "wall" : this.screen) });
    if (y >= H - NAV) { this.external = "launcher"; return; } // the gesture bar means "go home"
    if (y < STATUS || this.external === "launcher") return;
    const pool = this.wall && !this.external ? els.filter(e => e.overlay) : els; // the sheet's scrim blocks the rest
    pool.filter(e => e.tap && hit(e)).sort((a, b) => area(a) - area(b))[0]?.tap?.();
  }

  async typeText(text: string): Promise<void> {
    if (this.screen === "chat" && this.focused && !this.wall && !this.external) this.input += text;
  }

  async swipe(dir: "up" | "down", _x: number, _y: number, dist: number): Promise<void> {
    if (this.screen === "detail" && !this.external) this.detailOffset = Math.max(0, Math.min(400, this.detailOffset + (dir === "up" ? dist : -dist)));
  }

  async back(): Promise<void> {
    if (this.external === "billing") { this.external = null; return; }
    if (this.external === "launcher") return;
    if (this.wall) { this.wall = false; return; }
    if (this.stack.length > 1) { this.stack.pop(); this.focused = false; return; }
    this.external = "launcher"; // BACK on a tab root leaves the app
  }

  async pressEnter(): Promise<void> {
    if (this.screen === "chat" && this.input) this.send();
  }

  async launch(o: { cold?: boolean } = {}): Promise<void> {
    this.alive();
    this.external = null;
    if (o.cold) {
      if (this.pending) { this.messages.push({ me: false, text: this.pending.text }); this.pending = null; }
      this.stack = ["home"];
      this.wall = false;
      this.input = "";
      this.focused = false;
      this.detailOffset = 0;
    }
  }

  async close(): Promise<void> {}

  // ---------------------------------------------------------------- app logic
  private tick(): void {
    if (this.pending && Date.now() >= this.pending.at) {
      this.messages.push({ me: false, text: this.pending.text });
      this.pending = null;
      this.maxMessages = Math.max(this.maxMessages, this.messages.length);
    }
  }

  private send(): void {
    if (!this.input.trim()) return;
    if (this.balance < this.cost) { this.wall = true; this.input = ""; this.focused = false; return; }
    this.balance -= this.cost;
    this.sends++;
    this.messages.push({ me: true, text: this.input });
    this.maxMessages = Math.max(this.maxMessages, this.messages.length);
    this.input = "";
    this.focused = false;
    this.pending = { at: Date.now() + this.replyDelayMs, text: REPLIES[this.replies++ % REPLIES.length] };
  }

  private upButton(): El {
    return { type: T("ImageButton"), label: "Navigate up", identifier: "app:id/up", rect: rect(0, STATUS, 147, 168), tap: () => { this.stack.pop(); this.focused = false; } };
  }

  private render(): El[] {
    if (this.external === "billing") {
      const [name, price] = PACKS[this.billingPack];
      return [
        { type: T("TextView"), text: "Google Play", identifier: "com.android.vending:id/title", rect: rect(60, 1500, 960, 80) },
        { type: T("TextView"), text: name, identifier: "com.android.vending:id/item", rect: rect(60, 1600, 960, 80) },
        { type: T("TextView"), text: price, identifier: "com.android.vending:id/price", rect: rect(60, 1700, 400, 80) },
        { type: T("Button"), text: "Buy", identifier: "com.android.vending:id/buy", rect: rect(60, 1900, 960, 150), tap: () => { this.purchases++; } },
      ];
    }
    if (this.external === "launcher") {
      return [{ type: T("TextView"), text: "Phone", identifier: "launcher:id/icon", rect: rect(100, 1900, 200, 200) }];
    }
    const out: El[] = [
      { type: T("TextView"), text: "9:41", identifier: "com.android.systemui:id/clock", rect: rect(40, 10, 100, 43) },
      { type: "android.view.View", identifier: "app:id/spacer", rect: rect(0, 500, 0, 0) },
      { type: "android.widget.FrameLayout", identifier: "android:id/content", rect: rect(0, 0, W, H) },
    ];
    switch (this.screen) {
      case "home": out.push(...this.home()); break;
      case "detail": out.push(...this.detail()); break;
      case "chat": out.push(...this.chat()); break;
      case "store": out.push(...this.store()); break;
      case "profile": out.push(...this.profile()); break;
    }
    if (this.screen === "home" || this.screen === "store" || this.screen === "profile") out.push(...this.tabBar());
    if (this.wall) out.push(...this.wallSheet());
    return out;
  }

  private home(): El[] {
    const out: El[] = [
      { type: T("TextView"), text: "Stories", identifier: "app:id/title", rect: rect(42, 110, 400, 100) },
      { type: T("TextView"), text: `${this.balance} credits`, identifier: "app:id/balance", rect: rect(700, 120, 338, 80) },
    ];
    let y = 300;
    STORIES.forEach((s, i) => {
      if (s.ad) {
        // a native ad: no ad resource id, only the "Sponsored" badge gives it away
        out.push({ type: "android.view.ViewGroup", identifier: "app:id/promo_card", rect: rect(42, y, 996, s.h), tap: () => { this.adTaps++; } });
        out.push({ type: T("TextView"), text: "Sponsored", identifier: "app:id/promo_badge", rect: rect(84, y + 30, 200, 60) });
        out.push({ type: T("TextView"), text: "SkyBank: open an account in minutes", identifier: "app:id/promo_body", rect: rect(84, y + 110, 900, 120) });
      } else {
        out.push({ type: "android.view.ViewGroup", identifier: "app:id/card", rect: rect(42, y, 996, s.h), tap: () => this.open(i) });
        out.push({ type: T("TextView"), text: s.title, identifier: "app:id/card_title", rect: rect(84, y + 30, 900, 80) });
        out.push({ type: T("TextView"), text: s.blurb, identifier: "app:id/card_blurb", rect: rect(84, y + 130, 900, s.h - 160) });
      }
      y += s.h + 40;
    });
    return out;
  }

  private open(i: number): void {
    this.story = i;
    this.detailOffset = 0;
    this.stack.push("detail");
  }

  private detail(): El[] {
    const s = STORIES[this.story];
    const content: El[] = [
      { type: T("ImageView"), identifier: "app:id/cover", rect: rect(42, 300, 996, 700) },
      { type: T("TextView"), text: `${s.blurb} The storm has cut the radio, and the only boat left is yours.`, identifier: "app:id/body", rect: rect(42, 1030, 996, 500) },
      { type: T("Button"), text: "Start chat", identifier: "app:id/start", rect: rect(42, 1600, 996, 150), tap: () => { this.stack.push("chat"); this.focused = false; } },
      // half hidden under the navigation bar: its rect centre (y 2284) is inside the gesture bar
      { type: T("TextView"), text: "More like this", identifier: "app:id/more", rect: rect(42, 2184, 996, 200), tap: () => {} },
      { type: T("TextView"), text: "Similar stories", identifier: "app:id/similar", rect: rect(42, 2424, 996, 160), tap: () => {} },
    ];
    const out: El[] = [this.upButton(), { type: T("TextView"), text: s.title, identifier: "app:id/title", rect: rect(189, 100, 800, 100) }];
    for (const e of content) {
      const r = { ...e.rect, y: e.rect.y - this.detailOffset };
      if (r.y + r.h <= TOP_BAR) continue;
      if (r.y < TOP_BAR) { r.h -= TOP_BAR - r.y; r.y = TOP_BAR; }
      out.push({ ...e, rect: r });
    }
    return out;
  }

  private chat(): El[] {
    const out: El[] = [
      this.upButton(),
      { type: T("TextView"), text: "Mara", identifier: "app:id/title", rect: rect(189, 100, 400, 100) },
      { type: T("Button"), text: `Basic · ${this.cost}`, identifier: "app:id/mode", rect: rect(700, 105, 338, 90), tap: () => {} },
    ];
    // bubbles laid out bottom-up above the composer, clipped under the app bar
    const bubbles: El[] = [];
    let bottom = COMPOSER_Y - 40;
    for (let i = this.messages.length - 1; i >= 0 && bottom > TOP_BAR; i--) {
      const m = this.messages[i];
      const h = 40 + 52 * Math.ceil(m.text.length / 28);
      const w = Math.min(900, 200 + m.text.length * 11);
      const y = bottom - h;
      const r = rect(m.me ? 1038 - w : 42, y, w, h);
      if (y < TOP_BAR) { r.h -= TOP_BAR - y; r.y = TOP_BAR; }
      bubbles.unshift({ type: T("TextView"), text: m.text, identifier: "app:id/bubble", rect: r });
      bottom = y - 24;
    }
    out.push(...bubbles);
    out.push({ type: T("EditText"), text: this.input || "Message", identifier: "app:id/input", rect: rect(42, COMPOSER_Y, 800, 150), tap: () => { this.focused = true; } });
    if (this.input) out.push({ type: T("ImageButton"), label: "Send", identifier: "app:id/send", rect: rect(870, COMPOSER_Y, 168, 150), tap: () => this.send() });
    else out.push({ type: T("ImageButton"), label: "Voice message", identifier: "app:id/mic", rect: rect(870, COMPOSER_Y, 168, 150), tap: () => { this.micTaps++; } });
    return out;
  }

  private wallSheet(): El[] {
    return [
      { type: "android.view.ViewGroup", identifier: "app:id/sheet", rect: rect(0, 1500, W, 774), overlay: true },
      { type: T("TextView"), text: "Out of credits", identifier: "app:id/sheet_title", rect: rect(60, 1560, 960, 100), overlay: true },
      { type: T("TextView"), text: `You need ${this.cost} credits to send a message.`, identifier: "app:id/sheet_body", rect: rect(60, 1680, 960, 120), overlay: true },
      { type: T("Button"), text: "Refill now", identifier: "app:id/refill", rect: rect(60, 1840, 960, 150), overlay: true, tap: () => { this.wall = false; this.stack = ["store"]; } },
      { type: T("Button"), text: "Not now", identifier: "app:id/dismiss", rect: rect(60, 2020, 960, 100), overlay: true, tap: () => { this.wall = false; } },
    ];
  }

  private store(): El[] {
    return [
      { type: T("TextView"), text: "Store", identifier: "app:id/title", rect: rect(42, 110, 400, 100) },
      { type: T("TextView"), text: "Buy credits to keep chatting", identifier: "app:id/subtitle", rect: rect(42, 240, 996, 80) },
      ...PACKS.map(([name, price], i): El => ({
        type: T("Button"), text: `${name} · ${price}`, identifier: "app:id/pack", rect: rect(42, 420 + i * 220, 996, 180),
        tap: () => { this.external = "billing"; this.billingPack = i; this.billingOpens++; },
      })),
    ];
  }

  private profile(): El[] {
    const rows: [string, () => void][] = [
      ["Settings", () => {}],
      ["Rate us", () => {}],
      ["Terms of service", () => {}],
      ["Log out", () => { this.logouts++; this.balance = 120; }],
    ];
    return [
      { type: T("TextView"), text: "Profile", identifier: "app:id/title", rect: rect(42, 110, 400, 100) },
      ...rows.map(([text, tap], i): El => ({ type: T("TextView"), text, identifier: "app:id/row", rect: rect(42, 400 + i * 200, 996, 150), tap })),
    ];
  }

  private tabBar(): El[] {
    return (["home", "store", "profile"] as Tab[]).map((t, i): El => ({
      type: T("Button"), text: t[0].toUpperCase() + t.slice(1), identifier: `app:id/tab_${t}`, rect: rect(i * 360, TAB_Y, 360, 147),
      ...(this.screen === t ? { selected: true } : {}),
      tap: () => { this.stack = [t]; },
    }));
  }
}

function colour(s: string): string {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `#${(h & 0xffffff).toString(16).padStart(6, "0")}`;
}

// ---------------------------------------------------------------- stage context for tests
export const FAST_TIMING: Partial<Timing> = { pollMs: 2, settleMaxMs: 500, contentPollMs: 15, contentMinMs: 150, contentMaxMs: 1500, clearMaxMs: 200 };

export function testProfile(over: Partial<Profile> = {}): Profile {
  return {
    crawlSteps: 150, minutes: 5, exploreUsd: 1, totalUsd: 5, drainMax: 30, gapRounds: 0, htmlScreens: 4, qaRounds: 1,
    qaTopN: 4, qaUsd: 1, candidates: 4, proposals: 2, saturation: 80, ...over,
  };
}

export function testCtx(outRoot: string, runId = "ex-test-1", over: Partial<Profile> = {}): StageCtx {
  const app: AppConfig = { id: "fakechat", package: FAKE_PKG, name: "FakeChat", profile: "shallow", login: "none" };
  return { app, profile: testProfile(over), paths: paths("fakechat", { outRoot }), runId, llm: "stub", opts: {} };
}

export function tmpDir(prefix = "simula-explore-"): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}
