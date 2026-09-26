// Fixed explanatory copy shared by the report site and the deck appendix: the brief's six
// "how you operate" questions answered in one line each, and the productionization sketch
// (docs/design/FINAL_PLAN.md §18). Kept in one place so the two never drift apart.

export const HOW_IT_WORKS: { q: string; a: string }[] = [
  { q: "How is the device controlled?",
    a: "mobile-mcp over stdio (screenshots, accessibility tree, tap / swipe / type) behind one Device interface; the fixture app runs through the same interface on Playwright." },
  { q: "How does the agent decide what to explore?",
    a: "Code owns the frontier and stop rules; a model annotates each new screen once (name, kind, action priorities 0–3, monetization signals), a drain probe spends any metered resource until the wall, and guard rails block destructive taps, ads and purchases." },
  { q: "How is app knowledge represented?",
    a: "One typed, schema-validated product model: screens with element rects and styles, edges with observed effects, an economy (resources, sinks, sources, offers, walls, ads) with verified evidence, moments, flows and design tokens." },
  { q: "How do agents share context?",
    a: "Typed files on disk as a blackboard (graph.json → product-model.json → mock → qa → candidates.json → judgments.json → deck); agents never message each other, and every artifact is validated on read and write." },
  { q: "What is deterministic vs model-driven?",
    a: "Code: state identity, frontier, guards, economics arithmetic, gates and verdict thresholds, mock runtime, captures and slide layout. Models: screen annotation, product synthesis, screen HTML and QA fixes, proposals, rubric scores, variant screens." },
  { q: "How are failures handled?",
    a: "Every failure and recovery is traced; model calls are cached, replayable and budgeted, with deterministic stubs as fallbacks; weak proposals go back for up to two revisions; blocked apps are recorded, not bypassed." },
];

export const PRODUCTIONIZATION: { title: string; points: string[] }[] = [
  { title: "Storage and versioning", points: [
    "Screenshots, element lists and HTML are content-addressed blobs; artifact JSON references them by hash.",
    "A model version is keyed by package, version code and a UI fingerprint of the core flows, which also catches over-the-air updates.",
    "A diff between two model versions (screens, walls, prices, offers) is itself a sales signal.",
  ] },
  { title: "When to re-explore", points: [
    "Daily store version poll; weekly no-LLM smoke replay of the core flows and the path to the wall.",
    "Drift above 10% or any price change triggers an incremental re-explore from the known graph (about 20% of first-run cost).",
    "A new ad format re-runs only propose and judge.",
  ] },
  { title: "Where humans review", points: [
    "App onboarding and login (15 min); economy review, the highest-leverage step (10 min).",
    "Deck approval before any customer sees it (15–30 min); exception queue for blocked apps.",
    "Monthly judge audit against labelled outcomes.",
  ] },
  { title: "Cost and sales fit", points: [
    "Prospect scan without a mock ≈ $5 of model calls; full pitch pack ≈ $20–25 plus 45–60 min of human review.",
    "The deck, clickable prototype and sizing sheet attach to the CRM deal; each SHIP's integration snippet becomes the implementation ticket.",
    "Post-launch opt-in, completion and IAP guardrails flow back to recalibrate economics and the judge.",
  ] },
];
