// The rewarded-ad proposer (FINAL_PLAN §8, as amended by BUILD_SPEC and CRITIQUE T6/T9).
//
// Inputs are ONLY the product model (already loaded), digest(m), a few key screenshots from the model
// directory, and the KB. Two kinds of calls:
//   1. breadth  - one call: baseline, moment sweep, profile.candidates one-line ideas, and the pick.
//                 validateSet() checks the set in code; on violations the call is retried once.
//   2. depth    - one call PER selected idea, in parallel (isolates failures, bounds output size),
//                 each returning a full Proposal. Economics are then computed in code.
// revise() rewrites one proposal from the judge's required changes (never its scores).
// Stub mode runs the deterministic templates in stub.ts through the same call sites.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { Candidates, Proposal, type ProductModel } from "../core/schema.ts";
import { json, type Img } from "../core/llm.ts";
import { MODELS } from "../core/config.ts";
import { canonical, fileSha, save, sha256, writeText } from "../core/io.ts";
import { trace } from "../core/trace.ts";
import type { StageCtx } from "../core/run.ts";
import { digest } from "../model/digest.ts";
import { proposalEconomics } from "../model/economics.ts";
import { kbSystemBlock } from "./kb.ts";
import { Breadth, LlmProposal, fromLlmProposal, normalizeStoryboard, toLlmProposal, verifyEvidence, type LlmIdea } from "./schemas.ts";
import { validateSet } from "./validate.ts";
import { stubCandidates, stubRevise, templates } from "./stub.ts";
import { candidatesMd } from "./render.ts";

const STAGE = "propose";

// Stable rules block: identical bytes on every call so the [KB, RULES] prefix is cached.
export const RULES = `<role>
You are the rewarded-ads proposer on Simula's solutions team. You read one app's product model (a digest
of what an explorer agent observed) and propose where rewarded advertising should live inside the product,
including product changes that create a real value exchange.
</role>

<rules>
1. Use this app's own nouns and ids exactly as they appear in the digest: resource names and units, screen
   names, screen ids (sNN), element ids (eNN on their screen), moment ids (mN) and economy ids. Never invent
   an existing id. New screens and elements you add are declared in the patch with new ids (ns1, ns2 ... for
   screens; ne1, ne2 ... for elements).
2. Cite KB chunk ids for archetypes and precedents, e.g. TAX-1, AI-4, EX-DUO, TRIG-5.
3. Never do arithmetic: do not compute revenue, ARPDAU or exchange rates. State assumptions (engagedShare,
   viewsPerEngager, cogs, cogsUnitsPerView); code computes the economics. Size rewards with the digest's
   derived numbers: the EXCHANGE RATE line and the cheapest action and pack.
4. Never propose on a moment marked NO OFFERS ALLOWED (first value) [ANTI-12].
5. SFW surfaces only; nothing near sensitive topics [SAFE-1] [POL-9].
6. A product change must not remove anything free users get today. If it does, set
   anchor.newMechanic.removesFreeValue = true and list it as a high risk [AI-X] [EX-DUO].
7. Never reward clicks, installs, ratings or anything cash-like (cash, gift cards, crypto, vouchers) [POL-2].
8. Never interrupt a streaming response: offers appear only at a boundary (after the reply has finished,
   when the composer is blocked by a limit, or between conversations), and the user's typed input survives
   the ad [ANTI-5].
9. Every offer is opt-in with an explicit tap, discloses the exact reward and the required action before
   the ad, and has an equally legible decline that returns the user exactly where they were, with no penalty
   [POL-2] [TRIG-5] [ANTI-9]. No loss or hostage framing [ANTI-10].
10. Grant on REWARD_VERIFIED [POL-8]. Default to non-payers; never offer subscribers what they already have.
11. "existing" = anchored to something valuable the app already has (a resource, limit, entitlement, action);
    it must cite at least one economy id. "product-change" = adds or changes a constraint, resource, surface
    or flow; it must fill anchor.newMechanic.
12. Every user-facing string (title, oneLiner, trigger, offer, reward.what, captions, callouts) reads like a
    product team wrote it: action names are short user-facing verb phrases like "send a message" or
    "generate an image" (never the explorer's wording such as "type a short message and send it (may spend)"),
    screens are called by their names, never by ids. offer.title is at most 5 words; the first sentence of
    offer.body is at most 14 words; captions at most 12 words.
13. simula.gamePartner is the character or persona the user already talks to on the surface (for example the
    chat's title), else the app's name. Never a placeholder like "the character".
</rules>

<simula_vocabulary>
Units [POL-8]: SIM-RWD (rewarded: play a mini-game, then claim an in-app reward), SIM-INT (interstitial
mini-game at transitions), SIM-NAT (native card in a feed). Entry points: button | invitation | interstitial.
React Native SDK names: MiniGameButton, MiniGameInvitation, MiniGameInterstitial, MiniGameMenu,
CharacterSelector, useRewardedAd / SimulaRewardedAd; events EARNED_REWARD then REWARD_VERIFIED (grant on
REWARD_VERIFIED; rewardToken for server-side verification). minPlaySec 10-30, default 15. The character who
plays along is the "Game Partner". Describe a proposal as surface -> trigger -> unit -> Game Partner ->
min play -> REWARD_VERIFIED -> grant.
</simula_vocabulary>

<proposal_fields>
- surface: a screen id from the digest, or a new screen id declared in patch.newScreens.
- anchor.moments: moment ids; anchor.economy: RESOURCE / SINK / SOURCE / OFFER / WALL ids you rely on.
- trigger: when exactly the offer appears (a boundary, never mid-stream). eligibility: who sees it.
- offer: title, body (states the exact reward and the action, e.g. "Play a 15-second game to get +N <unit>"),
  cta, decline (an equally legible "No thanks" that returns the user where they were).
- simula: unit, entry, gamePartner (null if none), minPlaySec.
- reward: what (user-facing, in the app's nouns); resource id + amount for a resource (sized with the
  exchange rate: about one cheapest action per view, far below the cheapest pack), or duration for a time box;
  grantOn REWARD_VERIFIED.
- caps: perDay (>= 1) and cooldownMin. cannibalizationGuard: why paid conversion is protected.
- assumptions: engagedShare (0-1), viewsPerEngager, cogs (cost class of what the reward is spent on:
  none | text-cheap | text-premium | image | voice), cogsUnitsPerView (how many of those one view grants).
- kpis: primary, guardrails (paid conversion non-inferiority, retention, ...), holdout (user-level, share, duration).
- precedents: KB ids. risks: honest risks. evidence: [{obs: screen or observation id, el, quote: verbatim
  on-screen text}].
- patch: newScreens [{id, basedOn, kind, change}], newElements [{id, in (screen id or new screen id), near
  (an element id on that screen, or null), place, change}], newEdges [{from, el (usually your new element),
  to (screen id, new screen id, or "rwd" for the rewarded flow), effects [{resource, delta}] applied on
  REWARD_VERIFIED, guard}].
- storyboard: exactly 5 frames in this order: today, change, offer, ad, value. Each has screen (existing or
  new id), counters [{resource, value}], overlay (today/change: none, offer: invite, ad: game, value:
  verified), callouts [{node: an element id on that screen or one of your new element ids, text}], caption.
</proposal_fields>`;

function system(): string[] {
  return [kbSystemBlock("proposer"), RULES];
}

// ------------------------------------------------------------------------------------------------
// Key screenshots: the wall, decline, post-reward, desire and hub screens, then stores and chats.
// Downscaled locally (bytes can differ across machines), so the cache key uses the originals' sha.
// ------------------------------------------------------------------------------------------------
interface Shots { imgs: Img[]; shas: string[] }

export function keyScreens(m: ProductModel, max = 8): string[] {
  const order = ["wall", "decline", "post-reward", "desire", "hub"] as const;
  const fromMoments = order.flatMap(t => m.moments.filter(x => x.type === t && !x.noOffer).map(x => x.screen));
  const kinds = m.screens.filter(s => s.inScope && (s.kind === "store" || s.kind === "paywall")).map(s => s.id);
  const chats = m.screens.filter(s => s.inScope && s.kind === "chat").sort((a, b) => b.visits - a.visits).map(s => s.id);
  const tabs = m.screens.filter(s => s.inScope && s.kind === "tab").sort((a, b) => b.visits - a.visits).map(s => s.id);
  return [...new Set([...fromMoments, ...kinds, ...chats, ...tabs])].slice(0, max);
}

async function shots(m: ProductModel, modelDir: string, screenIds: string[]): Promise<Shots> {
  const imgs: Img[] = [], shas: string[] = [];
  for (const id of screenIds) {
    const s = m.screens.find(x => x.id === id);
    const file = s && path.join(modelDir, s.screenshot);
    if (!s || !file || !fs.existsSync(file)) continue;
    const data = await sharp(file).resize({ width: 720, withoutEnlargement: true }).png().toBuffer();
    imgs.push({ data, mediaType: "image/png", label: `${s.id} ${s.name} [${s.kind}]` });
    shas.push(fileSha(file));
  }
  return { imgs, shas };
}

const keyOf = (sys: string[], prompt: string, shas: string[]) => ({ system: sha256(canonical(sys)), prompt: sha256(prompt), images: shas });

// ------------------------------------------------------------------------------------------------
// Call 1: breadth
// ------------------------------------------------------------------------------------------------
function breadthPrompt(m: ProductModel, dig: string, nIdeas: number, nPick: number): string {
  const mix = m.regime === "no-scarcity"
    ? "- The regime is no-scarcity (nothing scarce is observed): at least 5 ideas must be product changes; existing ideas are optional."
    : '- At least 3 ideas are "existing" and at least 3 are "product-change".';
  return [
    "# Product model digest", "", dig, "",
    "# Task", "",
    "Propose rewarded-ad opportunities for this app. Return four sections:",
    "(a) baseline: the 3 ideas a generic ad-ops person would propose here, one line each. They are the bar to beat.",
    "(b) momentSweep: one entry per moment id in the digest (all of them, including NO OFFERS ones): is there a real value exchange here? {moment, exchange, viable}.",
    `(c) ideas: exactly ${nIdeas} one-line candidates {title, case, archetype (one KB id), moment (a moment id from the digest), reward (what the user gets, in this app's nouns), beyondBaseline}.`,
    mix,
    "- At least 4 distinct archetypes; at least 1 reactive idea (wall, desire or decline moment) and at least 1 proactive idea (hub or post-reward moment).",
    "- At least half are beyondBaseline: clearly different from the 3 baseline ideas, not a re-skin.",
    "- No two ideas share the same (moment, reward).",
    `(d) selected: the ${nPick} best ideas to write up in full, as 0-based indices into ideas, each with why. Prefer a portfolio: a reactive and a proactive surface, and at least one product change.`,
  ].join("\n");
}

async function breadth(c: StageCtx, m: ProductModel, dig: string, sh: Shots, stubSet: () => Candidates): Promise<{ b: Breadth; stubbed: boolean; violations: string[] }> {
  const nIdeas = c.profile.candidates, nPick = c.profile.proposals;
  const sys = system();
  let stubbed = false;
  const stub = (): Breadth => { stubbed = true; const s = stubSet(); return { baseline: s.baseline, momentSweep: s.momentSweep, ideas: s.ideas, selected: s.selected }; };
  const call = (prompt: string, purpose: string) => json({
    stage: STAGE, purpose, model: MODELS.main, effort: "high", maxTokens: 32000,
    system: sys, prompt, images: sh.imgs, schema: Breadth, cacheKey: keyOf(sys, prompt, sh.shas), stub,
  });
  const prompt = breadthPrompt(m, dig, nIdeas, nPick);
  let b = await call(prompt, "breadth");
  let violations = validateSet(b, m);
  if (violations.length && !stubbed) {
    trace("decision", { what: "breadth set failed validateSet; retrying once", violations });
    const retry = `${prompt}\n\n# Your previous answer failed these checks\n${violations.map(v => `- ${v}`).join("\n")}\n\nPrevious ideas:\n${JSON.stringify(b.ideas, null, 1)}\n\nReturn the complete corrected answer (all four sections).`;
    const b2 = await call(retry, "breadth-retry");
    const v2 = validateSet(b2, m);
    // Keep whichever attempt violates less; the leftovers are reported, not hidden.
    if (v2.length <= violations.length) { b = b2; violations = v2; }
    if (violations.length) trace("failure", { where: "propose:validateSet", error: `still violating after retry: ${violations.join(" | ")}` });
  }
  return { b, stubbed, violations };
}

// ------------------------------------------------------------------------------------------------
// Call 2: depth, one per selected idea
// ------------------------------------------------------------------------------------------------
function depthPrompt(dig: string, idea: LlmIdea, others: LlmIdea[]): string {
  return [
    "# Product model digest", "", dig, "",
    "# The idea to write up", "", JSON.stringify(idea, null, 1), "",
    others.length ? `Other ideas being written up in parallel (do not duplicate them): ${others.map(o => `"${o.title}"`).join("; ")}.` : "",
    "",
    "# Task", "",
    "Write this idea up as one complete proposal, following <proposal_fields>. Ground every id in the digest,",
    "declare every new id in the patch, size the reward with the exchange rate, and make the storyboard exactly",
    "the 5 frames today, change, offer, ad, value.",
  ].join("\n");
}

/** Stub for a depth call: the template that matches the idea (same archetype and moment), else the closest one. */
function templateFor(m: ProductModel, idea: LlmIdea, pid: string): Proposal {
  const ts = templates(m);
  const t = ts.find(x => x.idea.archetype === idea.archetype && x.idea.moment === idea.moment)
    ?? ts.find(x => x.idea.moment === idea.moment) ?? ts.find(x => x.idea.case === idea.case) ?? ts[0];
  if (!t) throw new Error("No stub template applies to this model (no moments with an offer allowed).");
  return t.build(pid, t.defaults);
}

async function depth(c: StageCtx, m: ProductModel, dig: string, idea: LlmIdea, pid: string, others: LlmIdea[]): Promise<Proposal | null> {
  const sys = system();
  const prompt = depthPrompt(dig, idea, others);
  const screenId = m.moments.find(x => x.id === idea.moment)?.screen;
  const sh = await shots(m, c.paths.model, screenId ? [screenId] : []);
  try {
    const out = await json({
      stage: STAGE, purpose: `depth:${pid}`, model: MODELS.main, effort: "high", maxTokens: 32000,
      system: sys, prompt, images: sh.imgs, schema: LlmProposal, cacheKey: keyOf(sys, prompt, sh.shas),
      stub: () => toLlmProposal(templateFor(m, idea, pid)),
    });
    return finishProposal(fromLlmProposal(out, pid, 1), m);
  } catch (e) {
    // One failed write-up must not sink the others (CRITIQUE T6).
    trace("failure", { where: `propose:depth:${pid}`, error: String((e as Error)?.message ?? e).slice(0, 300) });
    return null;
  }
}

/** Code-side finishing: 5-phase storyboard, verified evidence, economics. Returns a schema-valid Proposal. */
export function finishProposal(p: Proposal, m: ProductModel): Proposal {
  const { storyboard, repaired } = normalizeStoryboard(p);
  if (repaired) trace("recovery", { how: `storyboard of ${p.id} v${p.version} normalized to the 5 phases today/change/offer/ad/value` });
  const q: Proposal = { ...p, storyboard, evidence: verifyEvidence(p.evidence, m), economics: undefined };
  return Proposal.parse({ ...q, economics: proposalEconomics(q, m) });
}

// ------------------------------------------------------------------------------------------------
// Entry points
// ------------------------------------------------------------------------------------------------
export async function propose(c: StageCtx, m: ProductModel): Promise<Candidates> {
  const dig = digest(m);
  let stubSetCache: Candidates | undefined;
  const stubSet = () => (stubSetCache ??= stubCandidates(m, c.profile));
  const sh = await shots(m, c.paths.model, keyScreens(m));
  trace("decision", { what: "propose inputs", screenshots: sh.imgs.map(i => i.label), regime: m.regime, ideas: c.profile.candidates, proposals: c.profile.proposals });

  let b: Breadth, stubbed: boolean, violations: string[];
  try {
    ({ b, stubbed, violations } = await breadth(c, m, dig, sh, stubSet));
  } catch (e) {
    trace("failure", { where: "propose:breadth", error: String((e as Error)?.message ?? e).slice(0, 300) });
    trace("recovery", { how: "deterministic stub proposals (templates over the model's moments and economy)" });
    return write(c, m, stubSet(), validateSet(stubSet(), m));
  }

  // Depth: the model's pick, de-duplicated and capped at profile.proposals.
  const picks = [...new Map(b.selected.filter(s => Number.isInteger(s.index) && b.ideas[s.index]).map(s => [s.index, s])).values()].slice(0, c.profile.proposals);
  const drafted = await Promise.all(picks.map((s, i) => depth(c, m, dig, b.ideas[s.index], `P${i + 1}`, picks.filter(o => o !== s).map(o => b.ideas[o.index]))));
  let proposals = drafted.filter((p): p is Proposal => !!p);
  if (!proposals.length && picks.length) {
    trace("recovery", { how: "every depth call failed: using the deterministic stub proposals" });
    return write(c, m, stubSet(), validateSet(stubSet(), m));
  }
  proposals = proposals.map((p, i) => ({ ...p, id: `P${i + 1}` })); // contiguous ids after any drops
  const cands: Candidates = {
    schema: "simula.candidates/1", app: m.app.id,
    baseline: b.baseline, momentSweep: b.momentSweep, ideas: b.ideas, selected: picks, proposals,
    generatedBy: stubbed ? "stub" : "llm",
  };
  return write(c, m, cands, violations);
}

function write(c: StageCtx, m: ProductModel, cands: Candidates, violations: string[]): Candidates {
  const finished = { ...cands, proposals: cands.proposals.map(p => finishProposal(p, m)) };
  const out = save(Candidates, path.join(c.paths.proposals, "candidates.json"), finished);
  writeText(path.join(c.paths.proposals, "candidates.md"), candidatesMd(out, m, violations));
  trace("decision", { what: "proposals written", generatedBy: out.generatedBy, ideas: out.ideas.length, proposals: out.proposals.map(p => `${p.id}:${p.archetype}:${p.case}`), violations });
  return out;
}

export async function revise(c: StageCtx, m: ProductModel, p: Proposal, requiredChanges: string[], topConcern: string, round: number): Promise<Proposal> {
  const sys = system();
  // The reviser sees the proposal and the requested changes, never the scores (FINAL_PLAN §9.2).
  const current = toLlmProposal(p);
  const prompt = [
    "# Product model digest", "", digest(m), "",
    `# Current proposal (${p.id})`, "", "```json", JSON.stringify(current, null, 1), "```", "",
    "# Reviewer's required changes", "", ...requiredChanges.map(r => `- ${r}`), "", `Top concern: ${topConcern}`, "",
    "# Task", "",
    "Return the complete revised proposal. Address every required change; keep everything that was not criticized.",
    `Keep the same idea: case (${p.case}), archetype (${p.archetype}) and anchor moments stay as they are. A revision fixes this proposal; it never turns it into a different one.`,
    "Stay grounded in the digest's ids and follow <proposal_fields>.",
  ].join("\n");
  const ask = (text: string, purpose: string) => json({
    stage: STAGE, purpose, model: MODELS.main, effort: "high", maxTokens: 32000,
    system: sys, prompt: text, schema: LlmProposal,
    stub: () => toLlmProposal(stubRevise(m, p, requiredChanges, topConcern)),
  });
  // A reviser that swaps in another idea would ship something the judge never reviewed as a candidate
  // (and often a duplicate of another proposal): the idea's identity is checked in code.
  const drift = (x: LlmProposal) => [x.case !== p.case ? `case ${p.case} -> ${x.case}` : "", x.archetype !== p.archetype ? `archetype ${p.archetype} -> ${x.archetype}` : ""].filter(Boolean);
  try {
    let out = await ask(prompt, `revise:${p.id}:r${round}`);
    let d = drift(out);
    if (d.length) {
      trace("failure", { where: `propose:revise:${p.id}:r${round}`, error: `the revision changed the idea (${d.join("; ")}); asking once more` });
      out = await ask(`${prompt}\n\n# Your previous answer changed the idea (${d.join("; ")}). Revise THIS proposal instead: same case, archetype and moments.`, `revise:${p.id}:r${round}:keep`);
      d = drift(out);
      if (d.length) throw new Error(`the revision changed the idea again (${d.join("; ")})`);
    }
    return finishProposal(fromLlmProposal(out, p.id, p.version + 1), m);
  } catch (e) {
    trace("failure", { where: `propose:revise:${p.id}:r${round}`, error: String((e as Error)?.message ?? e).slice(0, 300) });
    trace("recovery", { how: "deterministic stub revision (resize to the exchange rate, tighten caps, fix named fields)" });
    return finishProposal(stubRevise(m, p, requiredChanges, topConcern), m);
  }
}
