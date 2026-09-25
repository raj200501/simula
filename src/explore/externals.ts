// Leaving the app: classify what took the foreground, then get back (FINAL_PLAN §4.4 handleExternal).
// The explorer never acts inside another package: it records the surface (billing sheets carry
// prices in their element text) and escapes.
import type { Device } from "../device/types.ts";
import { ExternalKind } from "../core/schema.ts";
import { sleep } from "../core/io.ts";

export type Surface = "in-app" | ExternalKind;

const TABLE: ReadonlyArray<[RegExp, ExternalKind]> = [
  [/^com\.android\.vending$/, "billing"],
  [/^com\.google\.android\.gms$|^com\.android\.credentialmanager$/, "signin"],
  [/permissioncontroller|packageinstaller/i, "permission"],
  [/chrome|browser|firefox|customtabs/i, "browser"],
  [/camera/i, "camera"],
  [/documentsui|providers\.media|photopicker|mediaprovider/i, "picker"],
  [/^com\.android\.settings$/, "settings"],
  [/launcher/i, "launcher"],
  [/^android$/, "crash"],
];

/** "in-app" for the app itself (or a WebDevice page, "web"); otherwise the kind of external surface. */
export function classifyForeground(fg: string, appPackage: string): Surface {
  if (fg === appPackage || fg === "web") return "in-app";
  // WebDevice reports external cards as "ext:<kind>"
  if (fg.startsWith("ext:")) {
    const k = ExternalKind.safeParse(fg.slice(4));
    return k.success ? k.data : "other";
  }
  for (const [re, kind] of TABLE) if (re.test(fg)) return kind;
  return "other";
}

export function isInApp(fg: string, appPackage: string): boolean {
  return classifyForeground(fg, appPackage) === "in-app";
}

const DENY = /don.?t allow|deny|not now|no thanks/i;

/**
 * Escape policy: permission prompts are denied; everything else gets BACK up to twice; the launcher
 * or a crash gets a relaunch. Returns a short description for the `recovery` trace event.
 */
export async function escapeExternal(dev: Device, kind: ExternalKind, appPackage: string, waitMs = 600): Promise<string> {
  const back = async () => isInApp(await dev.foreground(), appPackage);
  if (kind === "permission") {
    const deny = (await dev.elements()).find(e => DENY.test(e.text ?? "") || DENY.test(e.label ?? ""));
    if (deny) {
      await dev.tap(Math.round(deny.rect.x + deny.rect.w / 2), Math.round(deny.rect.y + deny.rect.h / 2));
      await sleep(waitMs);
      if (await back()) return "denied the permission prompt";
    }
  }
  if (kind !== "launcher" && kind !== "crash") {
    for (let i = 1; i <= 2; i++) {
      await dev.back();
      await sleep(waitMs);
      if (await back()) return `pressed BACK x${i}`;
    }
  }
  await dev.launch({ cold: kind === "crash" });
  await sleep(waitMs);
  return kind === "crash" ? "cold relaunch after a crash" : "relaunched the app";
}
