// Integration snippet for a proposal, written against the real @simula/ads-react-native 1.4.1 API
// (docs/research/simula-sdk/react-native-src). Every identifier outside comments was checked against
// those sources: SimulaAds.checkFrequencyCap (ads/SimulaAds.ts), useRewardedAd and its returned
// fields (hooks/useRewardedAd.ts), load() options (ads/types.ts SimulaAdLoadOptions), error codes
// (SimulaAdErrorCode), and the MiniGame* component props (types/index.ts). Anything we could not
// verify (dashboard settings, min-play, server grant) is written as a comment, never as code.
// test/slidesreport.integration.test.ts re-checks the output against the SDK sources.
import type { Proposal } from "../core/schema.ts";

export const SDK_PACKAGE = "@simula/ads-react-native";

/** Which SDK component renders the offer for each proposal entry point. */
const ENTRY_COMPONENT: Record<Proposal["simula"]["entry"], string> = {
  button: "MiniGameButton",
  invitation: "MiniGameInvitation",
  interstitial: "MiniGameInterstitial",
};

export interface SnippetOpts {
  /** Human label for the surface screen, e.g. "Out of credits". */
  surfaceName?: string;
  /** Resource display name for the grant, e.g. "credits". */
  resourceName?: string;
}

export function integrationSnippet(p: Proposal, o: SnippetOpts = {}): string {
  // A unit is a placement, so name it after the surface the offer lives on.
  const unitId = `${p.simula.unit}-${slug(o.surfaceName ?? "") || slug(p.title) || p.id.toLowerCase()}`;
  const comp = ENTRY_COMPONENT[p.simula.entry];
  const fn = `${pascal(p.title) || p.id}Offer`;
  const grant = [
    p.reward.amount != null ? `amount: ${p.reward.amount}` : null,
    o.resourceName || p.reward.resource ? `resource: ${js(o.resourceName ?? p.reward.resource ?? "")}` : null,
    p.reward.duration ? `duration: ${js(p.reward.duration)}` : null,
  ].filter(Boolean).join(", ");
  const partner = p.simula.gamePartner?.trim();

  const lines: string[] = [];
  lines.push(`import { SimulaAds, useRewardedAd, ${comp} } from "${SDK_PACKAGE}";`);
  lines.push(`import { useEffect, useState } from "react";`);
  lines.push("");
  lines.push(`// ${p.id}${o.surfaceName ? ` on "${oneLine(o.surfaceName)}"` : ""}. Trigger: ${clip(oneLine(p.trigger), 90)}`);
  lines.push(`// Caps ${p.caps.perDay}/day${p.caps.cooldownMin > 0 ? `, ${p.caps.cooldownMin} min apart` : ""}: app remote config (unit cap: dashboard)`);
  if (p.simula.unit !== "SIM-RWD") lines.push(`// Proposal names ${p.simula.unit}; only rewarded units emit REWARD_VERIFIED.`);
  lines.push(`const AD_UNIT = ${js(unitId)}; // placeholder: create it in the dashboard`);
  lines.push("");
  lines.push(`export function ${fn}({ userId, partnerImageUrl, grant, onDecline }) {`);
  lines.push(`  const rwd = useRewardedAd(AD_UNIT);`);
  lines.push(`  const [capped, setCapped] = useState(true);`);
  lines.push(`  useEffect(() => {`);
  lines.push(`    SimulaAds.checkFrequencyCap(AD_UNIT, userId).then(setCapped); // true: hide`);
  lines.push(`    rwd.setMetadata({ surface: ${js(slug(o.surfaceName ?? p.surface) || p.surface)}, proposal: ${js(p.id)} });`);
  lines.push(partner
    ? `    rwd.load({ charName: ${js(partner)} }); // Game Partner`
    : `    rwd.load();`);
  lines.push(`  }, [userId]);`);
  lines.push(`  useEffect(() => {`);
  lines.push(`    // Grant on REWARD_VERIFIED (server-verified), never on EARNED_REWARD.`);
  lines.push(`    if (rwd.rewardVerified) grant({ ${grant}${grant ? ", " : ""}token: rwd.rewardToken });`);
  lines.push(`  }, [rwd.rewardVerified]);`);
  lines.push(`  // no_fill or not loaded: render nothing; today's path is unchanged.`);
  lines.push(`  if (capped || !rwd.isLoaded || rwd.error?.code === "no_fill") return null;`);
  lines.push(...offerJsx(p, comp));
  lines.push(`}`);
  lines.push(`// Min play ${p.simula.minPlaySec}s is a unit setting (no RN load option; unverified).`);
  lines.push(`// Needs <SimulaProvider apiKey={...}> at the root; grant() is your server call.`);
  return lines.join("\n");
}

function offerJsx(p: Proposal, comp: string): string[] {
  const play = `    onClick={() => rwd.show()}`;
  if (comp === "MiniGameButton") {
    return [
      `  // "${oneLine(p.offer.decline)}" stays the app's own control: back to where the user was.`,
      `  return (`,
      `    <MiniGameButton`,
      `      text=${jsx(p.offer.cta)}`,
      `  ${play}`,
      `    />`,
      `  );`,
    ];
  }
  if (comp === "MiniGameInterstitial") {
    return [
      `  return (`,
      `    <MiniGameInterstitial`,
      `      isOpen`,
      `      charImage={partnerImageUrl}`,
      `      invitationText=${jsx(`${oneLine(p.offer.title)} ${oneLine(p.offer.body)}`)}`,
      `      ctaText=${jsx(p.offer.cta)}`,
      `  ${play}`,
      `      onClose={onDecline} // "${oneLine(p.offer.decline)}": nothing lost`,
      `    />`,
      `  );`,
    ];
  }
  return [
    `  return (`,
    `    <MiniGameInvitation`,
    `      isOpen`,
    `      titleText=${jsx(p.offer.title)}`,
    `      subText=${jsx(p.offer.body)}`,
    `      ctaText=${jsx(p.offer.cta)}`,
    `      charImage={partnerImageUrl}`,
    `  ${play}`,
    `      onClose={onDecline} // "${oneLine(p.offer.decline)}": nothing lost`,
    `    />`,
    `  );`,
  ];
}

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…");
const js = (s: string) => JSON.stringify(oneLine(s));
const jsx = (s: string) => `{${js(clip(oneLine(s), 90))}}`;
const STOP = new Set(["a", "an", "the", "at", "of", "on", "in", "to", "for", "with", "and", "when"]);
/** Lowercase, dash-separated, cut on a word boundary (max 28 chars). */
function slug(s: string): string {
  let out = "";
  for (const w of s.toLowerCase().normalize("NFKD").split(/[^a-z0-9]+/).filter(Boolean)) {
    if (out && out.length + 1 + w.length > 28) break;
    out = out ? `${out}-${w}` : w.slice(0, 28);
  }
  return out;
}
function pascal(s: string): string {
  const w = s.normalize("NFKD").replace(/[^A-Za-z0-9 ]+/g, " ").trim().split(/\s+/).filter(x => x && !STOP.has(x.toLowerCase())).slice(0, 3);
  const out = w.map(x => x[0].toUpperCase() + x.slice(1).toLowerCase()).join("");
  return /^[A-Z]/.test(out) ? out : "";
}
