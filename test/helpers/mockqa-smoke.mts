import path from "node:path";
import { chromium } from "playwright";
import { sampleModel } from "./sample-model.ts";
import { buildMock } from "../../src/mock/build.ts";
const out = "/tmp/claude-0/-home-user-simula/25c848c5-fa91-54b9-9b9c-b7d1ed4ee763/scratchpad/mockqa/mock";
const m = sampleModel();
const idx = buildMock(m, "/nonexistent", out);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 411, height: 914 }, deviceScaleFactor: 1 });
p.on("console", m => console.log("console:", m.text()));
p.on("pageerror", e => console.log("pageerror:", e.message));
for (const s of ["s01", "s03", "s04", "s05", "s06", "s02"]) {
  await p.goto("file://" + idx + "?frame=0&screen=" + s);
  await p.waitForFunction("document.documentElement.dataset.mockReady === '1'");
  await p.screenshot({ path: path.join(out, "..", s + ".png") });
}
const p2 = await b.newPage({ viewport: { width: 520, height: 980 } });
await p2.goto("file://" + idx + "?debug=1");
await p2.waitForTimeout(300);
await p2.screenshot({ path: path.join(out, "..", "framed.png") });
await b.close();
