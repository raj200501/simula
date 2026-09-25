// Pure economics. Every number that reaches a slide is computed here from observed prices and
// explicit, cited constants - never by an LLM. Constants cite kb/rewarded_ads_kb.md chunk ids.
import type { Derived, Economy, ProductModel, Proposal, ProposalEconomics, Regime } from "../core/schema.ts";

export const ECON = {
  // Gross revenue per completed rewarded view = eCPM / 1000. [CORE-4], [MEAS-3]
  grossPerViewUsd: { US: [0.012, 0.02] as [number, number], EU: [0.005, 0.009] as [number, number], LATAM: [0.002, 0.004] as [number, number] },
  // Non-game apps monetize rewarded inventory below game benchmarks. [MEAS-3]
  nonGameHaircut: 0.25,
  // Network / platform take before the publisher sees revenue. [inf]
  platformShare: 0.3,
  // Cost to serve one unit of the reward. [TRIG-4] (text-premium, [inf])
  cogsPerUnitUsd: { none: 0, "text-cheap": 0.0018, "text-premium": 0.009, image: 0.025, voice: 0.03 } as Record<string, number>,
  // Reward worth more than this multiple of one view's gross revenue at list price gets flagged.
  maxRewardToView: 3,
};

const r4 = (n: number) => Math.round(n * 10000) / 10000;
const r2 = (n: number) => Math.round(n * 100) / 100;

export function viewValueUsd(): Derived["viewValueUsd"] {
  const k = 1 - ECON.nonGameHaircut;
  const f = ([a, b]: [number, number]): [number, number] => [r4(a * k), r4(b * k)];
  return { US: f(ECON.grossPerViewUsd.US), EU: f(ECON.grossPerViewUsd.EU), LATAM: f(ECON.grossPerViewUsd.LATAM) };
}

export function deriveEconomy(e: Economy): Derived {
  const unitPriceUsd = unitPrices(e);
  const price = (res: string) => unitPriceUsd.find(u => u.resource === res);
  const actionCostUsd = e.sinks.flatMap(s => {
    const u = price(s.resource);
    return u ? [{ sink: s.id, min: r4(s.amount * u.min), max: r4(s.amount * u.max) }] : [];
  });
  const freeDailyUnits = [...groupSum(e.sources.filter(s => s.cadence === "daily" && s.amount != null), s => s.resource, s => s.amount ?? 0)]
    .map(([resource, units]) => {
      const sinks = e.sinks.filter(s => s.resource === resource && s.amount > 0).sort((a, b) => a.amount - b.amount);
      const buys = sinks.length
        ? sinks.map(s => `${Math.floor(units / s.amount)}x ${s.action}${s.context ? ` (${s.context})` : ""}`).join(", ")
        : "no observed sink";
      return { resource, units, buys };
    });
  const vv = viewValueUsd();
  const unitsPerView = unitPriceUsd.map(u => ({ resource: u.resource, min: r2(vv.US[0] / u.max), max: r2(vv.US[1] / u.min) }));
  const packPrices = e.offers.filter(o => o.kind === "pack" && o.priceUsd != null).map(o => o.priceUsd as number);
  const notes: string[] = [];
  if (!unitPriceUsd.length) notes.push("No priced packs observed: unit prices, action costs and exchange rate are unavailable.");
  if (!e.sources.some(s => s.cadence === "daily")) notes.push("No daily free source observed.");
  return {
    unitPriceUsd, actionCostUsd, freeDailyUnits, viewValueUsd: vv, unitsPerView,
    cheapestPaidUnitUsd: packPrices.length ? Math.min(...packPrices) : null,
    notes,
  };
}

/** Unit price range per resource from packs that grant it: priceUsd / amount. */
export function unitPrices(e: Economy): Derived["unitPriceUsd"] {
  const by = new Map<string, number[]>();
  for (const o of e.offers) {
    const res = o.grants.resource, amt = o.grants.amount;
    if (!res || !amt || amt <= 0 || o.priceUsd == null || o.priceUsd <= 0) continue;
    by.set(res, [...(by.get(res) ?? []), o.priceUsd / amt]);
  }
  return [...by].map(([resource, xs]) => ({ resource, min: Math.min(...xs), max: Math.max(...xs) }));
}

function groupSum<T>(xs: T[], key: (x: T) => string, val: (x: T) => number): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of xs) m.set(key(x), (m.get(key(x)) ?? 0) + val(x));
  return m;
}

/**
 * consumable-economy: something is spent per action AND (users hit a wall OR the resource is sold)
 * subscription-gated: no consumable loop, but a paid plan / entitlements exist
 * no-scarcity: nothing scarce observed -> proposals must be product changes
 */
export function regimeOf(e: Economy): Regime {
  const soldResources = new Set(e.offers.map(o => o.grants.resource).filter(Boolean));
  if (e.sinks.length && (e.walls.length || e.sinks.some(s => soldResources.has(s.resource)))) return "consumable-economy";
  if (e.entitlements.length || e.offers.some(o => o.kind === "subscription" || o.kind === "trial")) return "subscription-gated";
  return "no-scarcity";
}

export function proposalEconomics(p: Proposal, m: ProductModel): ProposalEconomics {
  const derived = m.economy.derived ?? deriveEconomy(m.economy);
  const vv = derived.viewValueUsd.US;
  const u = p.reward.resource ? derived.unitPriceUsd.find(x => x.resource === p.reward.resource) : undefined;
  const rewardValue = u && p.reward.amount ? p.reward.amount * u.min : null;
  const cogs = (ECON.cogsPerUnitUsd[p.assumptions.cogs] ?? 0) * p.assumptions.cogsUnitsPerView;
  const impressionsPerDau = p.assumptions.engagedShare * p.assumptions.viewsPerEngager;
  const midGross = (ECON.grossPerViewUsd.US[0] + ECON.grossPerViewUsd.US[1]) / 2 * (1 - ECON.nonGameHaircut);
  const arpdau = impressionsPerDau * midGross;
  const flags: string[] = [];
  const ratio = rewardValue != null ? rewardValue / vv[1] : null;
  if (ratio != null && ratio > ECON.maxRewardToView) flags.push(`Reward is worth ${ratio.toFixed(1)}x one view's revenue at list price: size it down or cap it harder.`);
  const maxDaily = rewardValue != null ? rewardValue * p.caps.perDay : null;
  if (maxDaily != null && derived.cheapestPaidUnitUsd != null && maxDaily >= derived.cheapestPaidUnitUsd)
    flags.push(`Max daily earnable value ($${maxDaily.toFixed(2)} at list) >= cheapest pack ($${derived.cheapestPaidUnitUsd.toFixed(2)}): cannibalization risk.`);
  const netPerView = vv[0] * (1 - ECON.platformShare);
  if (cogs > netPerView) flags.push(`Cost to serve the reward ($${cogs.toFixed(4)}) exceeds net revenue per view ($${netPerView.toFixed(4)}) at the low end.`);
  return {
    viewValueUsd: vv,
    rewardValueUsdAtList: rewardValue != null ? r4(rewardValue) : null,
    rewardToViewRatio: ratio != null ? r2(ratio) : null,
    maxDailyEarnUsdAtList: maxDaily != null ? r4(maxDaily) : null,
    cheapestPaidUnitUsd: derived.cheapestPaidUnitUsd,
    cogsPerViewUsd: r4(cogs),
    scenario: {
      engagedShare: p.assumptions.engagedShare, viewsPerEngager: p.assumptions.viewsPerEngager,
      impressionsPerDau: r4(impressionsPerDau), arpdauUsd: r4(arpdau), annualPer1mDauUsd: Math.round(arpdau * 1e6 * 365),
      label: `Scenario, not a forecast: ${(p.assumptions.engagedShare * 100).toFixed(0)}% of DAU engage, ${p.assumptions.viewsPerEngager} views each, US mid eCPM after a ${ECON.nonGameHaircut * 100}% non-game haircut.`,
    },
    flags,
  };
}

/** "1 US view ~ 6.5-10.8 credits at list price" - the headline number for slides. */
export function exchangeRateLine(m: ProductModel, resource: string): string | null {
  const d = m.economy.derived ?? deriveEconomy(m.economy);
  const u = d.unitsPerView.find(x => x.resource === resource);
  const res = m.economy.resources.find(r => r.id === resource);
  if (!u) return null;
  return `1 completed US view ≈ ${fmt(u.min)}–${fmt(u.max)} ${res?.unit ?? res?.name ?? resource} at list price`;
}

function fmt(n: number): string {
  return n >= 10 ? n.toFixed(0) : n.toFixed(1);
}

