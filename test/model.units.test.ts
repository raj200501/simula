// Unit tests for the deterministic pieces of the understand stage: verify, number/price parsing,
// redaction, pixel tokens, paths.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import type { Economy, Edge } from "../src/core/schema.ts";
import { numbersIn, quoteFound, verifyEconomy, type Corpus } from "../src/model/verify.ts";
import { pricesIn } from "../src/model/synthesize.ts";
import { blurRects, hasPii, redactText } from "../src/model/redact.ts";
import { contrast, decode, dHash, hamming, inkFg, kmeans, palette, ringBg, typeScale, type RGB } from "../src/model/tokens.ts";
import { shortestPath } from "../src/model/flows.ts";

process.env.SIMULA_LLM = "stub";

describe("verify", () => {
  const corpus: Corpus = {
    texts: new Map([["o1", ["Premium · 30", "Send"]], ["o2", ["1,000 credits $1.39", "2,000 $2.89"]], ["s01", ["Premium · 30", "Send"]]]),
    elements: new Map([["o1", new Set(["e1", "e2"])]]),
    effects: [{ resource: "r1", delta: -30 }],
  };
  const ids = { screens: new Set(["s01", "s02"]), edges: new Set(["g1"]), externals: new Map([["ext:billing", "s02"]]) };
  const eco = (over: Partial<Economy>): Economy => ({ resources: [], sinks: [], sources: [], offers: [], walls: [], entitlements: [], ads: [], ...over });
  const sink = (quote: string, amount: number) => ({ id: "k1", resource: "r1", amount, action: "Send", edges: ["g1", "g-unknown"], conf: "inferred" as const, evidence: [{ obs: "o1", quote, verified: false }] });
  const res = { id: "r1", name: "credits", unit: "credits", kind: "currency" as const, shownOn: [], observedValues: [], conf: "inferred" as const, evidence: [{ obs: "o1", el: "e1", verified: false }] };

  test("a verbatim quote (case and whitespace insensitive) is observed", () => {
    const r = verifyEconomy(eco({ resources: [res], sinks: [sink("premium   ·  30", 30)] }), corpus, ids);
    assert.equal(r.economy.sinks[0].conf, "observed");
    assert.equal(r.economy.sinks[0].evidence[0].verified, true);
    assert.deepEqual(r.economy.sinks[0].edges, ["g1"]); // unknown edge ids are dropped
    assert.equal(r.economy.resources[0].conf, "observed"); // evidence by element existence
  });

  test("a fabricated quote is marked inferred", () => {
    const r = verifyEconomy(eco({ resources: [res], sinks: [sink("Each message costs 45 gems", 45)] }), corpus, ids);
    assert.equal(r.economy.sinks[0].conf, "inferred");
    assert.equal(r.economy.sinks[0].evidence[0].verified, false);
    assert.equal(r.inferred, 1);
    assert.equal(r.verified, 1);
  });

  test("a number found neither in a quote nor in a counter effect is inferred", () => {
    assert.equal(verifyEconomy(eco({ resources: [res], sinks: [sink("Send", 45)] }), corpus, ids).economy.sinks[0].conf, "inferred");
    assert.equal(verifyEconomy(eco({ resources: [res], sinks: [sink("Send", 30)] }), corpus, ids).economy.sinks[0].conf, "observed"); // measured -30
  });

  test("offers: price and amount must be quoted; ext screens are re-pointed; unknown screens are dropped", () => {
    const offer = (id: string, amount: number, screen: string) => ({ id, kind: "pack" as const, label: "x", priceText: "$1.39", priceUsd: 1.39, grants: { resource: "r1", amount }, screen, conf: "inferred" as const, evidence: [{ obs: "o2", quote: "1,000 credits $1.39", verified: false }] });
    const r = verifyEconomy(eco({ offers: [offer("of1", 1000, "ext:billing"), offer("of2", 5000, "s02"), offer("of3", 1000, "s99")] }), corpus, ids);
    assert.deepEqual(r.economy.offers.map(o => [o.id, o.screen, o.conf]), [["of1", "s02", "observed"], ["of2", "s02", "inferred"]]);
  });

  test("quoteFound spans adjacent texts; numbersIn reads grouped and decimal numbers", () => {
    assert.ok(quoteFound("Send", ["Premium · 30", "Send"]));
    assert.ok(quoteFound("30 send", ["Premium · 30", "Send"]));
    assert.ok(!quoteFound("", ["x"]));
    assert.deepEqual(numbersIn("1,000 credits $1.39"), [1000, 1.39]);
    assert.deepEqual(numbersIn("+300 credits, 1.234.567 views, 2K, 1,39 €"), [300, 1234567, 2000, 1.39]);
    assert.deepEqual(numbersIn("$1,299.99"), [1299.99]);
  });
});

describe("prices and PII", () => {
  test("pricesIn finds prefix and suffix currencies and converts to USD", () => {
    assert.deepEqual(pricesIn("5,000 $7.09").map(p => [p.text, p.value, p.usd]), [["$7.09", 7.09, 7.09]]);
    assert.deepEqual(pricesIn("Pro US$ 4.99 / month").map(p => p.usd), [4.99]);
    assert.equal(pricesIn("1,39 €")[0].value, 1.39);
    assert.deepEqual(pricesIn("1,000 credits"), []);
  });

  test("emails and phone numbers are detected, prices and dates are not", () => {
    assert.ok(hasPii("jane.doe@example.com"));
    assert.ok(hasPii("Call +1 (415) 555-0100"));
    assert.ok(!hasPii("1,000 credits $1.39"));
    assert.ok(!hasPii("2026-09-25 09:41"));
    assert.equal(redactText("Signed in as jane.doe@example.com"), "Signed in as [email]");
    assert.equal(redactText("+1 415 555 0100"), "[phone]");
  });

  test("blurRects changes pixels inside the rect only", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#fff"/><rect x="20" y="20" width="60" height="10" fill="#000"/><rect x="150" y="60" width="30" height="10" fill="#000"/></svg>`;
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const out = await decode(await blurRects(png, [{ x: 10, y: 10, w: 80, h: 30 }]));
    const inp = await decode(png);
    const at = (img: typeof out, x: number, y: number) => img.data[(y * img.width + x) * 3];
    assert.ok(at(out, 30, 25) > 40, "text inside the rect is no longer solid black");
    assert.equal(at(out, 160, 65), at(inp, 160, 65), "outside the rect is untouched");
  });
});

describe("tokens", () => {
  test("ring background, highest-contrast ink, palette, hashes", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="#6C4DF6"/><rect x="20" y="20" width="60" height="16" fill="#FFFFFF"/><rect x="90" y="25" width="2" height="2" fill="#00FF00"/></svg>`;
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const img = await decode(png);
    const bg = ringBg(img, { x: 0, y: 0, w: 120, h: 60 })!;
    assert.deepEqual(bg.map(Math.round), [0x6c, 0x4d, 0xf6]);
    assert.deepEqual(inkFg(img, { x: 0, y: 0, w: 120, h: 60 }, bg)!.map(Math.round), [255, 255, 255]); // the 4-pixel green speck is ignored
    const pal = palette([...Array(80).fill([255, 255, 255]), ...Array(20).fill([0, 0, 0])] as RGB[]);
    assert.deepEqual(pal.map(p => p.hex), ["#FFFFFF", "#000000"]);
    assert.deepEqual(kmeans([[1, 1, 1], [1, 1, 1]] as RGB[], 8).length, 1);
    assert.ok(contrast([0, 0, 0], [255, 255, 255]) > 20);
    const h1 = await dHash(png);
    assert.equal(h1.length, 16);
    assert.equal(hamming(h1, h1), 0);
    assert.deepEqual(typeScale([14, 14.2, 13.9, 16, 16, 22, 22.4]), [14, 16, 22]);
  });
});

describe("paths", () => {
  const e = (id: string, from: string, to: string, transition: Edge["transition"] = "push", seen = 1): Edge =>
    ({ id, from, to, action: "a", transition, effects: [], context: { selected: [] }, seen, failures: 0 });
  test("shortestPath prefers forward edges, falls back to back edges, and picks the most reliable parallel edge", () => {
    const edges = [e("g1", "a", "b"), e("g2", "b", "c"), e("g3", "a", "c", "back"), e("g4", "a", "b", "push", 5), e("g5", "c", "ext:billing", "external")];
    assert.deepEqual(shortestPath(edges, "a", "c")!.map(x => x.id), ["g4", "g2"]);
    assert.deepEqual(shortestPath([e("g3", "a", "c", "back")], "a", "c")!.map(x => x.id), ["g3"]);
    assert.equal(shortestPath(edges, "c", "a"), null);
    assert.deepEqual(shortestPath(edges, "a", "a"), []);
  });
});
