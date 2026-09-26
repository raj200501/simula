// KB loading: Appendix T is always dropped, [JUDGE-6] only for the judge, chunk ids are exposed.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ROOT } from "../src/core/config.ts";
import { citedIds, dropSection, kbChunkIds, kbSystemBlock, loadKb } from "../src/propose/kb.ts";

describe("kb", () => {
  test("the proposer KB drops Appendix T but keeps the calibration section", () => {
    const kb = loadKb("proposer");
    assert.ok(!kb.text.includes("## Appendix T"));
    assert.ok(!/\[T-[A-Z]+-\d\]/.test(kb.text), "no test-app chunk survives");
    assert.ok(kb.text.includes("[JUDGE-6]"));
    assert.ok(kb.text.includes("## Source index"), "the section after Appendix T is kept");
  });

  test("nothing the model sees names a test app or the panel's own reference slides", () => {
    for (const v of ["proposer", "judge"] as const) {
      const text = loadKb(v).text;
      assert.doesNotMatch(text, /\b(Luzia|JanitorAI|Janitor AI|OOC|AOL)\b/, `${v} KB names a test app`);
      assert.doesNotMatch(text, /reference slide|\[assignment\]/i, `${v} KB cites the assignment's slides`);
    }
  });

  test("the judge KB also drops [JUDGE-6] and keeps the glossary after it", () => {
    const kb = loadKb("judge");
    assert.ok(!kb.text.includes("## Appendix T"));
    assert.ok(!kb.text.includes("[JUDGE-6]"));
    assert.ok(!kb.text.includes("Calibration set"));
    assert.ok(kb.text.includes("[JUDGE-5]"));
    assert.ok(kb.text.includes("## 9. Glossary"));
  });

  test("chunk ids cover headings and bold bullets, never the dropped chunks", () => {
    const p = loadKb("proposer").ids;
    for (const id of ["CORE-1", "POL-8", "TAX-1", "TAX-13", "EX-DUO", "TRIG-4", "ANTI-10", "AI-4", "AI-X", "JUDGE-6"]) assert.ok(p.includes(id), id);
    assert.ok(!p.some(id => id.startsWith("T-")));
    assert.ok(!loadKb("judge").ids.includes("JUDGE-6"));
  });

  test("dropSection stops at the next heading of the same or higher level", () => {
    const md = "# A\n## B\nx\n### [C-1] c\ny\n## D\nz\n";
    assert.equal(dropSection(md, "### [C-1]"), "# A\n## B\nx\n## D\nz\n");
    assert.equal(dropSection(md, "## B"), "# A\n## D\nz\n");
    assert.deepEqual(kbChunkIds("### [TAX-1] a\n- **[ANTI-2] b**\n**[AI-X] c**"), ["TAX-1", "ANTI-2", "AI-X"]);
  });

  test("the system block is stable and cites resolve", () => {
    assert.equal(kbSystemBlock("judge"), kbSystemBlock("judge"));
    const block = kbSystemBlock("proposer");
    assert.ok(!block.includes(ROOT), "no absolute repo paths in the cached block");
    assert.ok(!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(block), "no timestamps in the cached block");
    assert.deepEqual(citedIds(["[TAX-1] and AI-4", "EX-NOPE"]), { known: ["TAX-1", "AI-4"], unknown: ["EX-NOPE"] });
  });
});
