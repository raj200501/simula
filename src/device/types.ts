// One Device interface, two drivers:
//   McpDevice (device/mcp.ts)  - Android emulator through mobile-mcp over stdio (the real apps)
//   WebDevice (device/web.ts)  - Playwright over a web page at phone size (the fixture app, and the generated mock)
// The explorer only sees this interface, so the same explorer crawls a real app, the fixture, or our own mock.
import type { DeviceInfo, RawElement } from "../core/schema.ts";

export interface Device {
  readonly kind: "android" | "web";
  info(): Promise<DeviceInfo>;
  /** Foreground package ("com.example.app"), "web" for the WebDevice page, or "ext:<kind>" when the web page shows an external card. */
  foreground(): Promise<string>;
  elements(): Promise<RawElement[]>;
  /** Save a full-resolution PNG to an absolute path. */
  screenshot(absPath: string): Promise<void>;
  tap(x: number, y: number): Promise<void>;
  /** Types into the focused field. Never presses ENTER (chat apps treat it as a newline). */
  typeText(text: string): Promise<void>;
  swipe(dir: "up" | "down", x: number, y: number, distPx: number): Promise<void>;
  back(): Promise<void>;
  /** Press ENTER (fallback submit when no Send button can be found). */
  pressEnter(): Promise<void>;
  launch(opts?: { cold?: boolean }): Promise<void>;
  close(): Promise<void>;
}

export class DeviceError extends Error {
  constructor(message: string, readonly tool?: string, readonly retriable = true) { super(message); }
}
