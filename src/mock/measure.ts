// Screen-level measurements the element list does not carry, read from the screenshot in the model
// directory: the page background is the dominant colour of the pixels NOT covered by any element
// (element backgrounds are ring samples of each box, so on a card-heavy screen they would pick the
// card colour instead of the page).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { ProductModel, Screen } from "../core/schema.ts";
import { deviceDp, isOverlay } from "./roles.ts";

export interface RenderHints { pageBg?: string }

const hex = (r: number, g: number, b: number) => "#" + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

export async function screenHints(modelDir: string, s: Screen, m: ProductModel): Promise<RenderHints> {
  const file = path.join(modelDir, s.screenshot);
  if (isOverlay(s) || !fs.existsSync(file)) return {};
  const dev = deviceDp(m);
  // One pixel per dp is plenty for a background colour.
  const { data } = await sharp(file).resize(dev.w, dev.h, { fit: "fill" }).flatten({ background: "#ffffff" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const covered = new Uint8Array(dev.w * dev.h);
  for (const e of s.elements) {
    const r = e.rectDp;
    if (r.w * r.h > dev.w * dev.h * 0.6) continue; // a full-screen container is the page itself
    for (let y = Math.max(0, Math.floor(r.y)); y < Math.min(dev.h, Math.ceil(r.y + r.h)); y++)
      covered.fill(1, y * dev.w + Math.max(0, Math.floor(r.x)), y * dev.w + Math.min(dev.w, Math.ceil(r.x + r.w)));
  }
  const bins = new Map<number, [number, number, number, number]>();
  let n = 0;
  const y0 = dev.statusDp, y1 = dev.h - dev.navDp;
  for (const onlyFree of [true, false]) {
    for (let y = y0; y < y1; y++) for (let x = 0; x < dev.w; x++) {
      if (onlyFree && covered[y * dev.w + x]) continue;
      const i = (y * dev.w + x) * 3;
      const k = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
      const b = bins.get(k) ?? [0, 0, 0, 0];
      b[0]++; b[1] += data[i]; b[2] += data[i + 1]; b[3] += data[i + 2];
      bins.set(k, b);
      n++;
    }
    if (n >= dev.w * (y1 - y0) * 0.02) break; // enough free pixels; otherwise use the whole screen
    bins.clear(); n = 0;
  }
  let best: [number, number, number, number] | undefined;
  for (const b of bins.values()) if (!best || b[0] > best[0]) best = b;
  return best ? { pageBg: hex(best[1] / best[0], best[2] / best[0], best[3] / best[0]) } : {};
}
