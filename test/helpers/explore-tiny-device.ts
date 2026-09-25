// A tiny scriptable Android-like device for explorer behaviour tests: each screen is a function that returns
// its elements (with tap handlers), and everything the explorer does is recorded. Screens decide what a tap,
// BACK, typing or ENTER does, so one test can model "BACK on the root screen brings another app to the
// front", "tapping the field does not focus it", or "a search page with a text field".
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { Device } from "../../src/device/types.ts";
import type { DeviceInfo, RawElement, Rect } from "../../src/core/schema.ts";

export interface TinyEl extends RawElement { tap?: () => void }

export const TW = 1080;
export const TH = 2400;
export const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
export const T = (name: string) => `android.widget.${name}`;

export class TinyDevice implements Device {
  readonly kind = "android" as const;
  fg: string;
  screen: string;
  typed: string[] = [];
  taps: { x: number; y: number; label: string }[] = [];
  backs = 0;
  backsOutsideApp = 0;
  launches = 0;
  enters = 0;
  /** What BACK does on each screen (default: nothing). */
  onBack: (d: TinyDevice) => void = () => undefined;

  constructor(readonly pkg: string, readonly screens: Record<string, (d: TinyDevice) => TinyEl[]>, start: string) {
    this.fg = pkg;
    this.screen = start;
  }

  private els(): TinyEl[] {
    return this.fg === this.pkg ? this.screens[this.screen](this) : [{ type: T("TextView"), text: "Another app", rect: rect(100, 900, 800, 120) }];
  }

  async info(): Promise<DeviceInfo> {
    return { widthPx: TW, heightPx: TH, density: 2.625, statusBarPx: 63, navBarPx: 126, kind: "android" };
  }
  async foreground(): Promise<string> { return this.fg; }
  async elements(): Promise<RawElement[]> { return this.els().map(({ tap: _t, ...e }) => e); }
  /** Each element drawn as a coloured box (sparse screens are told apart by their pixels, so draw them). */
  async screenshot(file: string): Promise<void> {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const s = 8;
    const colour = (k: string) => `#${([...k].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7) & 0xffffff).toString(16).padStart(6, "0")}`;
    const layers = this.els().map(e => ({
      input: { create: { width: Math.max(1, Math.round(e.rect.w / s)), height: Math.max(1, Math.round(e.rect.h / s)), channels: 3 as const, background: colour(`${e.type}${e.text ?? e.label ?? ""}`) } },
      left: Math.min(TW / s - 1, Math.round(e.rect.x / s)), top: Math.min(TH / s - 1, Math.round(e.rect.y / s)),
    }));
    await sharp({ create: { width: TW / s, height: TH / s, channels: 3, background: "#ffffff" } }).composite(layers).png().toFile(file);
  }
  async tap(x: number, y: number): Promise<void> {
    const hit = this.els().filter(e => x >= e.rect.x && x < e.rect.x + e.rect.w && y >= e.rect.y && y < e.rect.y + e.rect.h)
      .sort((a, b) => a.rect.w * a.rect.h - b.rect.w * b.rect.h);
    this.taps.push({ x, y, label: hit[0]?.text ?? hit[0]?.label ?? "" });
    hit.find(e => e.tap)?.tap?.();
  }
  async typeText(text: string): Promise<void> { this.typed.push(text); }
  async swipe(): Promise<void> {}
  async back(): Promise<void> {
    this.backs++;
    if (this.fg !== this.pkg) { this.backsOutsideApp++; return; }
    this.onBack(this);
  }
  async pressEnter(): Promise<void> { this.enters++; }
  async launch(): Promise<void> { this.launches++; this.fg = this.pkg; }
  async close(): Promise<void> {}
}
