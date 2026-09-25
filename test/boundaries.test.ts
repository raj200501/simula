// Architectural boundaries, enforced on the source tree (BUILD_SPEC "Conventions"):
//   (a) no app-specific strings under src/: no id, name or package of a real test app (apps/*.json);
//   (b) stages downstream of `understand` never reach the device layer or the explorer, directly or
//       through another module, so "could another agent mock the app from the model alone" holds;
//   (c) nothing under src/ reads eval/ except the judge calibration (the held-out set stays held out).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = path.join(ROOT, "src");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
}
const rel = (p: string) => path.relative(ROOT, p).split(path.sep).join("/");
const SOURCES = walk(SRC).filter(f => /\.(ts|js|css|html|md|json)$/.test(f));
const TS = SOURCES.filter(f => f.endsWith(".ts"));

// ------------------------------------------------------------------------------------------------ (a)
test("(a) no app id, name or package from apps/*.json appears under src/ (the fixture's excepted)", () => {
  const apps = fs.readdirSync(path.join(ROOT, "apps")).filter(f => f.endsWith(".json"))
    .map(f => JSON.parse(fs.readFileSync(path.join(ROOT, "apps", f), "utf8")) as { id: string; name: string; package: string });
  assert.ok(apps.length >= 2, "apps/*.json lists the test apps");
  const fixture = apps.find(a => a.id === "fixture");
  assert.ok(fixture, "the fixture app config exists");
  const allowed = new Set([fixture.id, fixture.name, fixture.package].map(s => s.toLowerCase()));
  const needles = [...new Set(apps.filter(a => a.id !== "fixture").flatMap(a => [a.id, a.name, a.package]).map(s => s.toLowerCase()))]
    .filter(s => s && !allowed.has(s));
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hits: string[] = [];
  for (const file of SOURCES) {
    const lines = fs.readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      for (const n of needles) {
        // Word boundaries that also treat "." as part of a package name ("com.x.y" is one token).
        if (new RegExp(`(^|[^A-Za-z0-9_])${esc(n)}($|[^A-Za-z0-9_])`, "i").test(line)) hits.push(`${rel(file)}:${i + 1} "${n}": ${line.trim().slice(0, 120)}`);
      }
    });
  }
  assert.deepEqual(hits, [], `app-specific strings under src/:\n${hits.join("\n")}`);
});

// ------------------------------------------------------------------------------------------------ (b)
/** Relative imports of a TS file: static `import ... from`, `export ... from`, and dynamic `import("...")`. */
function importsOf(file: string): string[] {
  const src = fs.readFileSync(file, "utf8");
  const specs = [
    ...[...src.matchAll(/^\s*(?:import|export)\s[^;]*?\sfrom\s+["']([^"']+)["']/gm)].map(m => m[1]),
    ...[...src.matchAll(/^\s*import\s+["']([^"']+)["']/gm)].map(m => m[1]),
    ...[...src.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)].map(m => m[1]),
  ];
  return specs;
}

function resolveRel(from: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const p = path.resolve(path.dirname(from), spec);
  return fs.existsSync(p) ? p : fs.existsSync(`${p}.ts`) ? `${p}.ts` : p;
}

/** Every file reachable from `start` through relative imports, with the chain that reaches it. */
function closure(start: string): Map<string, string[]> {
  const seen = new Map<string, string[]>([[start, [rel(start)]]]);
  const queue = [start];
  while (queue.length) {
    const f = queue.shift()!;
    if (!f.endsWith(".ts") || !fs.existsSync(f)) continue;
    for (const spec of importsOf(f)) {
      const t = resolveRel(f, spec);
      if (!t || seen.has(t)) continue;
      seen.set(t, [...seen.get(f)!, rel(t)]);
      queue.push(t);
    }
  }
  return seen;
}

const DOWNSTREAM = ["model", "mock", "qa", "propose", "judge", "slides", "report"];
// Downstream modules that drive a browser page through the web device (none today). Adding one here
// is a deliberate decision; they may still never reach mobile-mcp or the explorer.
const WEB_DEVICE_OK = new Set<string>([]);

test("(b) model, mock, qa, propose, judge, slides and report never reach src/device/mcp.ts or src/explore/*", () => {
  const bad: string[] = [];
  for (const mod of DOWNSTREAM) {
    const files = TS.filter(f => rel(f).startsWith(`src/${mod}/`));
    assert.ok(files.length > 0, `src/${mod} has sources`);
    for (const f of files) {
      for (const [target, chain] of closure(f)) {
        const r = rel(target);
        const forbidden = r === "src/device/mcp.ts" || r.startsWith("src/explore/")
          || (r === "src/device/web.ts" && !WEB_DEVICE_OK.has(mod));
        if (forbidden) bad.push(chain.join(" -> "));
      }
      for (const spec of importsOf(f)) {
        if (/^@mobilenext\/mobile-mcp|^@modelcontextprotocol\//.test(spec)) bad.push(`${rel(f)} imports ${spec}`);
      }
    }
  }
  assert.deepEqual([...new Set(bad)], [], `downstream stages reach the device / explorer:\n${bad.join("\n")}`);
});

// ------------------------------------------------------------------------------------------------ (c)
test("(c) nothing under src/ reads eval/ except src/judge/calibrate.ts", () => {
  const hits: string[] = [];
  for (const f of TS) {
    if (rel(f) === "src/judge/calibrate.ts") continue;
    const lines = fs.readFileSync(f, "utf8").split("\n");
    lines.forEach((line, i) => {
      // A path segment named eval: "eval/…", '…/eval', path.join(ROOT, "eval", …).
      if (/["'`](?:\.{0,2}\/)?eval(?:\/[^"'`]*)?["'`]|["'`][^"'`\s]*\/eval\/[^"'`]*["'`]/.test(line)) hits.push(`${rel(f)}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  assert.deepEqual(hits, [], `src/ reads eval/ outside the judge calibration:\n${hits.join("\n")}`);
  // The calibration itself does read it (so the check above is meaningful).
  assert.match(fs.readFileSync(path.join(SRC, "judge", "calibrate.ts"), "utf8"), /["']eval["']/);
});
