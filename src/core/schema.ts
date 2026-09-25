// The typed contracts between stages. Every artifact on disk is validated against
// one of these schemas on read and on write (see io.ts). Agents never talk to each
// other directly: explore -> graph.json -> understand -> product-model.json -> everything else.
//
// Schemas used as LLM structured outputs live next to the stage that calls the model;
// they must avoid z.record, recursion and regex (the API rejects those).
import { z } from "zod";

export const Rect = z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() });
export type Rect = z.infer<typeof Rect>;

export const Confidence = z.enum(["observed", "inferred"]);
export const Evidence = z.object({
  obs: z.string(),                     // observation id (o0042) or screen id when compiled
  el: z.string().optional(),           // element id / key
  quote: z.string().optional(),        // verbatim on-screen text supporting the claim
  verified: z.boolean().default(false) // set by model/verify.ts, never by an LLM
});
export type Evidence = z.infer<typeof Evidence>;

// ---------------------------------------------------------------------------------------------
// Device level (what a Device returns)
// ---------------------------------------------------------------------------------------------
export const RawElement = z.object({
  type: z.string(),
  text: z.string().optional(),
  label: z.string().optional(),       // Android content-desc
  identifier: z.string().optional(),  // Android resource-id
  rect: Rect,                         // device px
  selected: z.boolean().optional(),
  checked: z.boolean().optional(),
  focused: z.boolean().optional(),
  disabled: z.boolean().optional(),
});
export type RawElement = z.infer<typeof RawElement>;

export const DeviceInfo = z.object({
  widthPx: z.number(), heightPx: z.number(), density: z.number(), // density = px per dp (2.625 on Pixel 8)
  statusBarPx: z.number().default(0), navBarPx: z.number().default(0),
  kind: z.enum(["android", "web"]).default("android"),
});
export type DeviceInfo = z.infer<typeof DeviceInfo>;

// ---------------------------------------------------------------------------------------------
// Explore level (graph.json) - written by src/explore, read only by src/model/compile.ts
// ---------------------------------------------------------------------------------------------
export const NormElement = RawElement.extend({
  id: z.string(),                     // e1..eN within the observation
  key: z.string(),                    // re-find key: shortType|identifier|maskedLabel|ordinal
  chrome: z.boolean(),                // contributes its text to the state signature
  group: z.string().optional(),       // repeated-group id (list rows, bubbles)
  ad: z.boolean().optional(),         // looks like an ad container / sponsored element: never tapped
});
export type NormElement = z.infer<typeof NormElement>;

export const Observation = z.object({
  id: z.string(),                     // o0001
  step: z.number(),
  ts: z.string(),
  fg: z.string(),                     // foreground package, or "web"
  screenshot: z.string(),             // path relative to the run dir (obs/o0001.png)
  elements: z.array(NormElement),
  signature: z.array(z.string()),     // sorted set of tokens
  dhash: z.string(),
  scrollIndex: z.number().default(0), // 0 = top of screen, n = after n scroll-downs within the same state
  counters: z.array(z.object({ resource: z.string(), value: z.number() })).default([]),
  texts: z.array(z.string()).default([]), // all visible text/labels, for effect diffs + quote verification
});
export type Observation = z.infer<typeof Observation>;

export const ScreenKind = z.enum(["tab", "page", "chat", "modal", "sheet", "dialog", "paywall", "store", "webview", "login", "onboarding", "other"]);
export type ScreenKind = z.infer<typeof ScreenKind>;
export const SignalKind = z.enum(["price", "balance", "limit", "ad", "upsell", "reward", "lock", "timer"]);
export const Signal = z.object({ kind: SignalKind, text: z.string(), el: z.string().optional() });
export type Signal = z.infer<typeof Signal>;

export const ActionKind = z.enum(["tap", "type-send", "consume", "scroll", "back"]);
export const ActionStatus = z.enum(["untried", "done", "no-effect", "skipped", "unreachable", "failed"]);
export const Action = z.object({
  id: z.string(),                      // a<state>_<n>, e.g. a07_3
  elKey: z.string().optional(),        // element re-find key (absent for back/scroll/vision taps)
  tapPoint: z.object({ x: z.number(), y: z.number() }).optional(), // device px, vision fallback
  kind: ActionKind,
  intent: z.string(),
  input: z.string().optional(),        // text to type for type-send / consume
  sendElKey: z.string().optional(),    // send button key if known before typing
  priority: z.number().int().min(0).max(3),
  status: ActionStatus.default("untried"),
  tries: z.number().default(0),
  skip: z.string().optional(),         // why it was skipped (guard rail / out-of-scope / ad)
  note: z.string().optional(),
});
export type Action = z.infer<typeof Action>;

export const State = z.object({
  id: z.string(),                      // s01
  signature: z.array(z.string()),
  dhash: z.string(),
  obs: z.array(z.string()),            // all observations of this state
  name: z.string(),
  kind: ScreenKind,
  purpose: z.string(),
  inScope: z.boolean(),
  scrollable: z.boolean(),
  loginWall: z.boolean().default(false),
  annotatedBy: z.enum(["llm", "heuristic", "stub"]),
  actions: z.array(Action),
  signals: z.array(Signal).default([]),
  visits: z.number().default(0),
  firstStep: z.number(),
});
export type State = z.infer<typeof State>;

export const Effect = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("counter"), resource: z.string(), before: z.number(), after: z.number(), delta: z.number(), inferred: z.boolean().optional() }),
  z.object({ kind: z.literal("appeared"), text: z.string() }),
  z.object({ kind: z.literal("disappeared"), text: z.string() }),
]);
export type Effect = z.infer<typeof Effect>;

export const ExternalKind = z.enum(["billing", "signin", "browser", "permission", "camera", "picker", "settings", "launcher", "crash", "ad", "other"]);
export type ExternalKind = z.infer<typeof ExternalKind>;

export const GraphEdge = z.object({
  id: z.string(),                      // g0001
  from: z.string(),
  to: z.string(),                      // state id or ext:<kind>
  action: z.string(),
  obsBefore: z.string(),
  obsAfter: z.string(),
  effects: z.array(Effect).default([]),
  context: z.object({ selected: z.array(z.string()).default([]) }).default({ selected: [] }),
  limitHit: z.boolean().optional(),    // drain probe: this consume action led to a wall
  seen: z.number().default(1),
  failures: z.number().default(0),
  firstStep: z.number(),
});
export type GraphEdge = z.infer<typeof GraphEdge>;

export const Resource = z.object({
  id: z.string(),                      // r1
  name: z.string(),                    // "credits"
  unit: z.string(),
  bindings: z.array(z.object({ state: z.string(), elKey: z.string() })), // where it is displayed
});
export type Resource = z.infer<typeof Resource>;

export const ExternalVisit = z.object({
  kind: ExternalKind,
  package: z.string(),
  from: z.string(), action: z.string(), obs: z.string(),
  texts: z.array(z.string()).default([]),
});

export const StopReason = z.enum(["frontier_empty", "saturated", "budget_steps", "budget_time", "budget_usd", "device_unhealthy", "interrupted", "done"]);
export type StopReason = z.infer<typeof StopReason>;

export const ExploreGraph = z.object({
  schema: z.literal("simula.explore-graph/1"),
  app: z.object({ id: z.string(), package: z.string(), name: z.string(), versionName: z.string().optional() }),
  runId: z.string(),
  device: DeviceInfo,
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  launchState: z.string().optional(),
  states: z.array(State),
  edges: z.array(GraphEdge),
  observations: z.array(Observation),
  resources: z.array(Resource),
  externals: z.array(ExternalVisit),
  typed: z.array(z.string()).default([]), // every string the explorer typed (excluded from chrome identity)
  steps: z.number(),
  stepsSinceNew: z.number().default(0),
  usd: z.number().default(0),
  stopReason: StopReason.optional(),
  human: z.array(z.object({ ts: z.string(), note: z.string() })).default([]),
});
export type ExploreGraph = z.infer<typeof ExploreGraph>;

// ---------------------------------------------------------------------------------------------
// Product model (product-model.json) - THE contract for mock / qa / propose / judge / slides
// ---------------------------------------------------------------------------------------------
export const UiRole = z.enum(["button", "tab", "text", "image", "input", "list-item", "counter", "toggle", "container"]);
export const UiElement = z.object({
  id: z.string(),                      // e12 -> data-node="e12"
  key: z.string(),
  role: UiRole,
  type: z.string(),
  text: z.string().optional(),
  label: z.string().optional(),
  identifier: z.string().optional(),
  rectPx: Rect,
  rectDp: Rect,
  style: z.object({ bg: z.string().optional(), fg: z.string().optional(), fontDp: z.number().optional() }).optional(),
  asset: z.string().optional(),
  flags: z.object({ selected: z.boolean().optional(), checked: z.boolean().optional(), disabled: z.boolean().optional(), focused: z.boolean().optional() }).optional(),
  ad: z.boolean().optional(),
});
export type UiElement = z.infer<typeof UiElement>;

export const Screen = z.object({
  id: z.string(),
  name: z.string(),
  purpose: z.string(),
  kind: ScreenKind,
  inScope: z.boolean(),
  parent: z.string().optional(),       // modal/sheet: screen underneath
  signature: z.array(z.string()),
  observations: z.array(z.string()),
  representative: z.string(),
  screenshot: z.string(),              // relative to model dir: screens/s07.png
  scrolledScreenshot: z.string().optional(),
  scrollable: z.boolean(),
  visits: z.number(),
  elements: z.array(UiElement),
  actions: z.array(Action),
  bindings: z.array(z.object({ resource: z.string(), el: z.string() })).default([]),
  signals: z.array(Signal).default([]),
  render: z.enum(["html", "image"]),
  variants: z.array(z.object({ id: z.string(), obs: z.string(), screenshot: z.string(), note: z.string() })).default([]),
});
export type Screen = z.infer<typeof Screen>;

export const Transition = z.enum(["push", "tab", "modal", "sheet", "back", "replace", "external"]);
export const Edge = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),                      // screen id or ext:<kind>
  action: z.string(),
  el: z.string().optional(),           // element id on `from`
  transition: Transition,
  effects: z.array(Effect).default([]),
  context: z.object({ selected: z.array(z.string()).default([]) }).default({ selected: [] }),
  limitHit: z.boolean().optional(),
  seen: z.number(),
  failures: z.number().default(0),
});
export type Edge = z.infer<typeof Edge>;

export const External = z.object({
  id: z.string(),                      // ext:billing
  kind: ExternalKind,
  package: z.string(),
  screenshot: z.string().optional(),
  texts: z.array(z.string()).default([]),
  from: z.array(z.object({ screen: z.string(), action: z.string() })),
});
export type External = z.infer<typeof External>;

export const EconomyResource = z.object({
  id: z.string(), name: z.string(), unit: z.string(),
  kind: z.enum(["currency", "quota", "time", "entitlement"]),
  shownOn: z.array(z.object({ screen: z.string(), el: z.string() })).default([]),
  observedValues: z.array(z.number()).default([]),
  resets: z.string().optional(),
  conf: Confidence, evidence: z.array(Evidence),
});
export const Sink = z.object({
  id: z.string(), resource: z.string(), amount: z.number(), action: z.string(),
  edges: z.array(z.string()).default([]), context: z.string().optional(),
  conf: Confidence, evidence: z.array(Evidence),
});
export const Source = z.object({
  id: z.string(), resource: z.string(), amount: z.number().nullable(),
  cadence: z.enum(["once", "daily", "per-task", "purchase", "unknown"]),
  how: z.string(), screen: z.string().optional(),
  conf: Confidence, evidence: z.array(Evidence),
});
export const Offer = z.object({
  id: z.string(), kind: z.enum(["pack", "subscription", "trial", "one-off"]),
  label: z.string(), priceText: z.string(), priceUsd: z.number().nullable(),
  grants: z.object({ resource: z.string().optional(), amount: z.number().optional(), period: z.string().optional(), entitlements: z.array(z.string()).optional() }),
  screen: z.string(), conf: Confidence.default("observed"), evidence: z.array(Evidence),
});
export const Wall = z.object({
  id: z.string(), edge: z.string().optional(), resource: z.string().optional(),
  blockedIntent: z.string(), shows: z.string(), offers: z.array(z.string()).default([]),
  declineEdge: z.string().optional(), conf: Confidence.default("observed"), evidence: z.array(Evidence),
});
export const Entitlement = z.object({ plan: z.string(), benefits: z.array(z.string()), conf: Confidence.default("observed"), evidence: z.array(Evidence) });
export const AdPlacement = z.object({
  format: z.enum(["banner", "interstitial", "native", "rewarded", "sponsored-answer", "unknown"]),
  screen: z.string(), el: z.string().optional(), conf: Confidence.default("observed"), evidence: z.array(Evidence),
});

// Computed by model/economics.ts - never by an LLM.
export const Derived = z.object({
  unitPriceUsd: z.array(z.object({ resource: z.string(), min: z.number(), max: z.number() })),
  actionCostUsd: z.array(z.object({ sink: z.string(), min: z.number(), max: z.number() })),
  freeDailyUnits: z.array(z.object({ resource: z.string(), units: z.number(), buys: z.string() })),
  viewValueUsd: z.object({ US: z.tuple([z.number(), z.number()]), EU: z.tuple([z.number(), z.number()]), LATAM: z.tuple([z.number(), z.number()]) }),
  // basis: list-price = from the app's own packs; cost-to-serve = no prices visible, so one view is
  // measured against what the unit costs to serve (net of platform share).
  unitsPerView: z.array(z.object({ resource: z.string(), min: z.number(), max: z.number(), basis: z.enum(["list-price", "cost-to-serve"]).default("list-price"), cogsKind: z.string().optional() })),
  cheapestPaidUnitUsd: z.number().nullable(),
  notes: z.array(z.string()).default([]),
});
export type Derived = z.infer<typeof Derived>;

export const Economy = z.object({
  resources: z.array(EconomyResource).default([]),
  sinks: z.array(Sink).default([]),
  sources: z.array(Source).default([]),
  offers: z.array(Offer).default([]),
  walls: z.array(Wall).default([]),
  entitlements: z.array(Entitlement).default([]),
  ads: z.array(AdPlacement).default([]),
  derived: Derived.optional(),
});
export type Economy = z.infer<typeof Economy>;

export const MomentType = z.enum(["wall", "desire", "decline", "post-reward", "hub", "first-value"]);
export const Moment = z.object({
  id: z.string(), type: MomentType, screen: z.string(), edge: z.string().optional(), resource: z.string().optional(),
  description: z.string(), reach: z.enum(["core-loop", "frequent", "occasional", "rare"]),
  noOffer: z.boolean().default(false),  // first-value: offers forbidden here
  evidence: z.array(Evidence).default([]),
});
export type Moment = z.infer<typeof Moment>;

export const Flow = z.object({
  id: z.string(), name: z.string(), kind: z.enum(["core", "monetization", "secondary"]), goal: z.string(),
  steps: z.array(z.object({ screen: z.string(), edge: z.string().optional(), note: z.string() })),
});
export type Flow = z.infer<typeof Flow>;

export const DesignSystem = z.object({
  fonts: z.array(z.object({ family: z.string(), source: z.enum(["apk", "lookalike", "system"]), file: z.string().optional() })).default([]),
  palette: z.array(z.object({ hex: z.string(), share: z.number() })).default([]),
  typeScaleDp: z.array(z.number()).default([]),
  radiiDp: z.array(z.number()).default([]),
  assets: z.array(z.object({ id: z.string(), file: z.string(), fromObs: z.string(), screen: z.string(), el: z.string().optional(), rectPx: Rect, kind: z.enum(["icon", "avatar", "illustration", "logo", "photo"]), label: z.string().optional() })).default([]),
  css: z.string().optional(),          // relative path of generated design-system CSS (mock stage)
});
export type DesignSystem = z.infer<typeof DesignSystem>;

export const Regime = z.enum(["consumable-economy", "subscription-gated", "no-scarcity"]);
export type Regime = z.infer<typeof Regime>;

export const Coverage = z.object({
  steps: z.number(), minutes: z.number(), usd: z.number(), states: z.number(), edges: z.number(), externals: z.number(),
  frontierLeft: z.number(), unreachable: z.number(), stopReason: StopReason, humanInterventions: z.number(),
  notExplored: z.array(z.object({ screen: z.string(), action: z.string(), intent: z.string(), why: z.string() })).default([]),
});

export const Brief = z.object({
  oneLiner: z.string(), audience: z.string(), coreLoop: z.array(z.string()), howItMakesMoney: z.string(),
  whatIsScarce: z.array(z.string()), adsToday: z.string(), openQuestions: z.array(z.string()),
});
export type Brief = z.infer<typeof Brief>;

export const ProductModel = z.object({
  schema: z.literal("simula.product-model/1"),
  app: z.object({ id: z.string(), package: z.string(), name: z.string(), versionName: z.string().optional(), capturedAt: z.string(), runId: z.string(), accountState: z.enum(["guest", "logged-in", "unknown"]).default("unknown") }),
  device: DeviceInfo,
  brief: Brief,
  regime: Regime,
  screens: z.array(Screen),
  edges: z.array(Edge),
  externals: z.array(External).default([]),
  economy: Economy,
  moments: z.array(Moment).default([]),
  flows: z.array(Flow).default([]),
  design: DesignSystem,
  transcripts: z.array(z.object({ screen: z.string(), turns: z.array(z.object({ role: z.enum(["user", "app"]), text: z.string() })) })).default([]),
  coverage: Coverage,
  human: z.array(z.object({ ts: z.string(), note: z.string() })).default([]),
  provenance: z.object({ synthesizedBy: z.enum(["llm", "stub"]), inferredClaims: z.number().default(0), verifiedClaims: z.number().default(0) }),
});
export type ProductModel = z.infer<typeof ProductModel>;

// ---------------------------------------------------------------------------------------------
// Proposals and judgments
// ---------------------------------------------------------------------------------------------
export const ProposalCase = z.enum(["existing", "product-change"]);
export const Phase = z.enum(["today", "change", "offer", "ad", "value"]); // 5 frames on the flow slide
export const Proposal = z.object({
  id: z.string(),                      // P1..Pn
  version: z.number().default(1),
  title: z.string(),
  oneLiner: z.string(),
  case: ProposalCase,
  archetype: z.string(),               // KB TAX-* / AI-* id
  beyondBaseline: z.boolean(),
  anchor: z.object({
    moments: z.array(z.string()),
    economy: z.array(z.string()),      // economy item ids (resources/sinks/sources/offers/walls)
    newMechanic: z.object({ name: z.string(), description: z.string(), whyNeeded: z.string(), removesFreeValue: z.boolean() }).optional(),
  }),
  surface: z.string(),                 // screen id where the offer appears
  trigger: z.string(),                 // "balance < 90 after tapping Send with Superb selected"
  eligibility: z.string(),
  offer: z.object({ title: z.string(), body: z.string(), cta: z.string(), decline: z.string() }),
  simula: z.object({ unit: z.enum(["SIM-RWD", "SIM-INT", "SIM-NAT"]), entry: z.enum(["button", "invitation", "interstitial"]), gamePartner: z.string().optional(), minPlaySec: z.number() }),
  reward: z.object({ what: z.string(), resource: z.string().optional(), amount: z.number().optional(), duration: z.string().optional(), grantOn: z.literal("REWARD_VERIFIED") }),
  caps: z.object({ perDay: z.number(), cooldownMin: z.number() }),
  cannibalizationGuard: z.string(),
  // Inputs to the code-computed economics. The LLM states assumptions; it never does the arithmetic.
  assumptions: z.object({
    engagedShare: z.number(),          // share of DAU that sees the surface and opts in at least once/day (0-1)
    viewsPerEngager: z.number(),       // completed views per engaged user per day
    cogs: z.enum(["none", "text-cheap", "text-premium", "image", "voice"]),
    cogsUnitsPerView: z.number(),      // e.g. messages / images / voice-minutes granted per view
  }),
  kpis: z.object({ primary: z.string(), guardrails: z.array(z.string()), holdout: z.string() }),
  precedents: z.array(z.string()),     // KB ids
  risks: z.array(z.string()),
  evidence: z.array(Evidence),
  patch: z.object({
    newScreens: z.array(z.object({ id: z.string(), basedOn: z.string().optional(), kind: z.enum(["modal", "sheet", "screen"]), change: z.string() })).default([]),
    newElements: z.array(z.object({ id: z.string(), in: z.string(), near: z.string().optional(), place: z.enum(["before", "after", "overlay"]), change: z.string() })).default([]),
    newEdges: z.array(z.object({ from: z.string(), el: z.string(), to: z.string(), effects: z.array(z.object({ resource: z.string(), delta: z.number() })).default([]), guard: z.object({ resource: z.string(), lt: z.number() }).optional() })).default([]),
  }),
  storyboard: z.array(z.object({
    phase: Phase, screen: z.string(),
    counters: z.array(z.object({ resource: z.string(), value: z.number() })).default([]),
    overlay: z.enum(["none", "invite", "game", "verified"]).default("none"),
    callouts: z.array(z.object({ node: z.string(), text: z.string() })).default([]),
    caption: z.string(),
  })),
  economics: z.lazy(() => ProposalEconomics).optional(), // filled by CODE (model/economics.ts)
});
export type Proposal = z.infer<typeof Proposal>;

export const ProposalEconomics = z.object({
  viewValueUsd: z.tuple([z.number(), z.number()]),     // US gross per completed view, after non-game haircut
  rewardValueUsdAtList: z.number().nullable(),         // reward.amount x unitPrice.min
  rewardToViewRatio: z.number().nullable(),            // rewardValueAtList / viewValue.max  (>1 = giving away more than the view earns, at list)
  maxDailyEarnUsdAtList: z.number().nullable(),
  cheapestPaidUnitUsd: z.number().nullable(),
  cogsPerViewUsd: z.number(),
  scenario: z.object({ engagedShare: z.number(), viewsPerEngager: z.number(), impressionsPerDau: z.number(), arpdauUsd: z.number(), annualPer1mDauUsd: z.number(), label: z.string() }),
  flags: z.array(z.string()),
});
export type ProposalEconomics = z.infer<typeof ProposalEconomics>;

export const Verdict = z.enum(["SHIP", "REVISE", "REJECT"]);
export type Verdict = z.infer<typeof Verdict>;
export const Criterion = z.enum(["value-moment-fit", "product-integrity", "cannibalization-safety", "unit-economics", "reach", "feasibility", "specificity", "frequency-fatigue", "measurability"]);
export type Criterion = z.infer<typeof Criterion>;

export const GateResult = z.object({ gate: z.string(), pass: z.boolean(), by: z.enum(["code", "llm"]), severity: z.enum(["policy", "fixable"]), evidence: z.string() });
export type GateResult = z.infer<typeof GateResult>;

export const JudgmentRound = z.object({
  proposalId: z.string(), version: z.number(), round: z.number(),
  gates: z.array(GateResult),
  scores: z.array(z.object({ criterion: Criterion, evidence: z.string(), score: z.number() })),
  weighted: z.number().nullable(),
  requiredChanges: z.array(z.string()),
  topConcern: z.string(),
  verdict: Verdict,
  reasons: z.array(z.string()),       // computed by verdict.ts
  judgedBy: z.enum(["llm", "stub", "code-only"]),
});
export type JudgmentRound = z.infer<typeof JudgmentRound>;

export const Judgments = z.object({
  schema: z.literal("simula.judgments/1"),
  app: z.string(),
  rubricWeights: z.array(z.object({ criterion: Criterion, weight: z.number() })),
  thresholds: z.object({ ship: z.number(), revise: z.number(), minCriterion: z.number(), maxRounds: z.number() }),
  rounds: z.array(JudgmentRound),
  final: z.array(z.object({ proposalId: z.string(), version: z.number(), verdict: Verdict, weighted: z.number().nullable(), summary: z.string() })),
});
export type Judgments = z.infer<typeof Judgments>;

export const Candidates = z.object({
  schema: z.literal("simula.candidates/1"),
  app: z.string(),
  baseline: z.array(z.string()),       // the 3 obvious ideas a generic ad-ops person would propose
  momentSweep: z.array(z.object({ moment: z.string(), exchange: z.string(), viable: z.boolean() })),
  ideas: z.array(z.object({ title: z.string(), case: ProposalCase, archetype: z.string(), moment: z.string(), reward: z.string(), beyondBaseline: z.boolean() })),
  selected: z.array(z.object({ index: z.number(), why: z.string() })),
  proposals: z.array(Proposal),
  generatedBy: z.enum(["llm", "stub"]),
});
export type Candidates = z.infer<typeof Candidates>;

// Stage manifest (core/run.ts)
export const Manifest = z.object({
  stage: z.string(), app: z.string(), runId: z.string(), gitSha: z.string().optional(),
  startedAt: z.string(), finishedAt: z.string().optional(), status: z.enum(["running", "ok", "failed"]),
  error: z.string().optional(), stopReason: z.string().optional(),
  inputs: z.array(z.object({ path: z.string(), sha256: z.string() })).default([]),
  outputs: z.array(z.string()).default([]),
  llm: z.object({ calls: z.number(), cached: z.number(), usd: z.number(), mode: z.string() }).optional(),
});
export type Manifest = z.infer<typeof Manifest>;
