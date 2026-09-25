// The integration snippet may only use API names that exist in the real @simula/ads-react-native
// sources under docs/research/simula-sdk/react-native-src. Comments are exempt (that is where
// unverified ideas go), so they are stripped before checking.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { integrationSnippet, SDK_PACKAGE } from "../src/slides/integration.ts";
import type { Proposal } from "../src/core/schema.ts";
import { shipProposal } from "./helpers/slidesreport-fixtures.ts";

const SDK = path.join(import.meta.dirname, "..", "docs", "research", "simula-sdk", "react-native-src");
const read = (f: string) => fs.readFileSync(path.join(SDK, f), "utf8");

/** Member names declared in `interface <name> { ... }` (one level, `name?:` or `name:`). */
function interfaceKeys(src: string, name: string): Set<string> {
  const start = src.indexOf(`interface ${name}`);
  assert.ok(start >= 0, `interface ${name} not found in the SDK`);
  let i = src.indexOf("{", start), depth = 0, end = i;
  for (; end < src.length; end++) {
    if (src[end] === "{") depth++;
    if (src[end] === "}" && --depth === 0) break;
  }
  const body = src.slice(i + 1, end);
  return new Set([...body.matchAll(/^\s{2}(\w+)\??\s*[:(]/gm)].map(m => m[1]));
}

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

function checkSnippet(snippet: string): string[] {
  const code = stripComments(snippet);
  const problems: string[] = [];
  const index = read("index.ts");
  const ads = read("ads/SimulaAds.ts");
  const types = read("ads/types.ts");
  const hook = interfaceKeys(read("hooks/useRewardedAd.ts"), "UseRewardedAd");
  const uiTypes = read("types/index.ts");

  const imp = new RegExp(`import \\{([^}]+)\\} from "${SDK_PACKAGE.replace("/", "\\/")}"`).exec(code);
  assert.ok(imp, "snippet imports from the SDK package");
  const imported = imp![1].split(",").map(s => s.trim()).filter(Boolean);
  for (const name of imported) if (!new RegExp(`export \\{[^}]*\\b${name}\\b`).test(index)) problems.push(`import ${name} is not exported by index.ts`);

  for (const [, fn] of code.matchAll(/\bSimulaAds\.(\w+)/g)) if (!new RegExp(`\\b(async\\s+)?${fn}\\(`).test(ads)) problems.push(`SimulaAds.${fn} does not exist`);
  for (const [, member] of code.matchAll(/\brwd\.(\w+)/g)) if (!hook.has(member)) problems.push(`useRewardedAd().${member} does not exist`);

  const loadOpts = interfaceKeys(types, "SimulaAdLoadOptions");
  for (const [, body] of code.matchAll(/rwd\.load\(\{([^}]*)\}\)/g))
    for (const [, key] of body.matchAll(/(\w+)\s*:/g)) if (!loadOpts.has(key)) problems.push(`load option ${key} does not exist`);

  const codes = /export type SimulaAdErrorCode =([\s\S]*?);/.exec(types)![1];
  for (const [, c] of code.matchAll(/\.code\s*===\s*"(\w+)"/g)) if (!codes.includes(`"${c}"`)) problems.push(`error code ${c} does not exist`);

  for (const [, comp, props] of code.matchAll(/<(MiniGame\w+)\s*\n([\s\S]*?)\/>/g)) {
    if (!imported.includes(comp)) problems.push(`${comp} used but not imported`);
    const allowed = interfaceKeys(uiTypes, `${comp}Props`);
    for (const [, prop] of props.matchAll(/^\s+(\w+)(?==|\s*$)/gm)) if (!allowed.has(prop)) problems.push(`${comp} has no prop ${prop}`);
  }
  if (!/useRewardedAd\(/.test(code)) problems.push("useRewardedAd is not called");
  return problems;
}

const variants: [string, Proposal][] = [
  ["invitation with a Game Partner", shipProposal()],
  ["button entry", { ...shipProposal(), simula: { unit: "SIM-RWD", entry: "button", minPlaySec: 20 } }],
  ["interstitial entry on an INT unit", { ...shipProposal(), simula: { unit: "SIM-INT", entry: "interstitial", gamePartner: "Mara", minPlaySec: 15 } }],
];

describe("integration snippet", () => {
  for (const [label, p] of variants) {
    test(`${label}: every SDK name is verified against the sources`, () => {
      const s = integrationSnippet(p, { surfaceName: "Out of credits", resourceName: "credits" });
      assert.deepEqual(checkSnippet(s), []);
    });
  }

  test("covers unit id, frequency cap, Game Partner, caps, REWARD_VERIFIED grant and no_fill fallback", () => {
    const s = integrationSnippet(shipProposal(), { surfaceName: "Out of credits", resourceName: "credits" });
    assert.match(s, /const AD_UNIT = "SIM-RWD-out-of-credits"/);
    assert.match(s, /export function RefillByPlayOffer\(/);
    assert.match(s, /SimulaAds\.checkFrequencyCap\(AD_UNIT, userId\)/);
    assert.match(s, /rwd\.load\(\{ charName: "Mara" \}\)/);
    assert.match(s, /3\/day, 30 min cooldown/);
    assert.match(s, /if \(rwd\.rewardVerified\) grant\(\{ amount: 10, resource: "credits", token: rwd\.rewardToken \}\)/);
    assert.match(s, /rwd\.error\?\.code === "no_fill"/);
    assert.match(s, /ctaText=\{"Play now"\}/);
  });

  test("the checker itself rejects invented names", () => {
    const bad = integrationSnippet(shipProposal()).replace("rwd.rewardVerified)", "rwd.rewardGranted)").replace("checkFrequencyCap", "checkCap");
    const problems = checkSnippet(bad);
    assert.ok(problems.some(p => /rewardGranted/.test(p)) && problems.some(p => /checkCap/.test(p)), problems.join("; "));
  });
});
