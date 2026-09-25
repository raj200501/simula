import sharp from "sharp";
const q = "/tmp/claude-0/-home-user-simula/25c848c5-fa91-54b9-9b9c-b7d1ed4ee763/scratchpad/mockqa/fixture/out/fixture/qa/";
for (const s of ["s01", "s02", "s06", "s08"]) {
  const a = await sharp(q + s + "/original.png").resize(300).toBuffer();
  const b = await sharp(q + s + "/r0/mock.png").resize(300).toBuffer();
  const meta = await sharp(a).metadata();
  await sharp({ create: { width: 610, height: meta.height!, channels: 3, background: "#888" } }).composite([{ input: a, left: 0, top: 0 }, { input: b, left: 310, top: 0 }]).png().toFile(q + "../../../side-" + s + ".png");
}
