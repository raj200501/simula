// User-facing wording: explorer intents become short verb phrases, rewards read as what they buy,
// and slide pins sit outside the elements they point at.
import { test } from "node:test";
import assert from "node:assert/strict";
import { actionCount, betterScreenName, cleanName, firstQuoted, humanizeAction, modeName, sinkUse } from "../src/core/humanize.ts";
import { placePins } from "../src/slides/deck.ts";
import { claimOf } from "../src/slides/facts.ts";
import type { Proposal } from "../src/core/schema.ts";

test("explorer intents become short, sentence-cased verb phrases", () => {
  assert.equal(humanizeAction("type a short message and send it (may spend)"), "Send a message");
  assert.equal(humanizeAction("Type a message to the AI assistant"), "Send a message");
  assert.equal(humanizeAction('tap "Claim" (monetization)'), "Claim");
  assert.equal(humanizeAction("press BACK"), "Go back");
  assert.equal(humanizeAction("type a short text and submit it"), "Submit a text");
  assert.equal(humanizeAction("Continue with limited access"), "Continue with limited access");
  assert.equal(humanizeAction("Send a message"), "Send a message", "idempotent");
  assert.ok(humanizeAction("tap the unlabeled icon at top right (web:id/x)").split(" ").length <= 6);
  assert.doesNotMatch(humanizeAction("open the settings page and look at every single option there"), /\bthere$/);
});

test("amounts read as what they buy", () => {
  assert.equal(actionCount("Send a message", 1), "one message");
  assert.equal(actionCount("Send a message", 30), "30 messages");
  assert.equal(actionCount("Claim", 2), "2× claim");
  assert.equal(modeName("Premium · 30"), "Premium");
  assert.equal(modeName("Basic 10 coins per message"), "Basic");
  assert.equal(sinkUse("Send a message", 1, "Basic · 10"), "one message in Basic");
  assert.equal(cleanName("CreditChat (fixture)"), "CreditChat");
  assert.equal(firstQuoted('Secondary button "▶ Play 15 s" with "3 left today"'), "▶ Play 15 s");
});

test("a monogram screen name is replaced by the top-bar title", () => {
  const els = [
    { text: "ML", role: "text", rectDp: { x: 56, y: 34, w: 36, h: 36 } },
    { text: "The Midnight Library", role: "text", rectDp: { x: 102, y: 41, w: 149, h: 22 } },
    { text: "Premium · 30", role: "button", rectDp: { x: 259, y: 36, w: 140, h: 32 } },
    { label: "Back", role: "button", rectDp: { x: 4, y: 30, w: 44, h: 44 } },
  ];
  assert.equal(betterScreenName("ML", els, 914), "The Midnight Library");
  assert.equal(betterScreenName("Store", els, 914), "Store");
});

test("flow-slide claims are complete sentences of at most 70 characters", () => {
  const p = (title: string, body: string) => ({ title: "Fallback title", offer: { title, body, cta: "Play", decline: "No thanks" } }) as unknown as Proposal;
  for (const c of [
    claimOf(p("Out of credits", "Play a 15-second game to get +10 credits, enough for one message in Basic. 3 per day.")),
    claimOf(p("Bonus credits?", "Play a 15-second game to get a +10 credits bonus on top of today's +300.")),
  ]) {
    assert.ok(c.length <= 70, c);
    assert.doesNotMatch(c, /…/);
  }
  assert.equal(claimOf(p("Out of credits", "Play a 15-second game to get +10 credits, enough for one message.")), "Out of credits: play a 15-second game to get +10 credits.");
});

test("slide pins sit outside their element, clear of each other and of the other targets", () => {
  // The offer card's two buttons side by side, and a callout above them.
  const boxes = [{ x: 20, y: 600, w: 370, h: 30 }, { x: 214, y: 700, w: 176, h: 44 }, { x: 20, y: 700, w: 176, h: 44 }];
  const r = 26;
  const spots = placePins(boxes, 411, 914, r);
  const covers = (s: { x: number; y: number }, b: typeof boxes[number]) => {
    const nx = Math.max(b.x, Math.min(s.x, b.x + b.w)), ny = Math.max(b.y, Math.min(s.y, b.y + b.h));
    return (s.x - nx) ** 2 + (s.y - ny) ** 2 < r * r;
  };
  spots.forEach((s, i) => {
    boxes.forEach((b, j) => assert.ok(!covers(s, b), `pin ${i} covers box ${j}`));
    spots.forEach((t, k) => { if (k !== i) assert.ok((s.x - t.x) ** 2 + (s.y - t.y) ** 2 >= (2 * r) ** 2, `pins ${i} and ${k} overlap`); });
    assert.ok(s.x >= r && s.x <= 411 - r && s.y >= r && s.y <= 914 - r, "inside the screen");
  });
});
