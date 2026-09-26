// Guard rails: deterministic vetoes over what the annotator proposes (FINAL_PLAN §4.3, BUILD_SPEC T3).
// The model may add skips of its own; it can never remove one of these. Their reasons start with
// "guard:" and nothing in the explorer clears such a skip (gap-check retries included).
import type { RawElement } from "../core/schema.ts";

/** Actions that could lose the account or its data. */
export const DESTRUCTIVE =
  /\b(log ?out|sign ?out|delete|remove account|deactivate|report|block|unsubscribe|cancel (my )?(subscription|plan|membership))\b/i;

/**
 * Surfaces that tell us nothing about the product's monetization, or that touch the user's device and data
 * (the camera, the microphone, files). Not here: "Rate us" (it only opens the store or a browser, which the
 * explorer records as an external surface and leaves; it never acts inside another app) and photo features
 * ("Edit a photo" is often a paid feature; a photo picker is another app, recorded and left).
 */
export const OUT_OF_SCOPE =
  /\b(camera|gallery|upload|attach(ment)?|microphone|mic|voice|audio|dictat(e|ion)|record(ing)?|share|privacy|terms|licen[cs]es?)\b/i;

/** Fields a human fills in. The explorer never types credentials, codes, phone numbers or CAPTCHA answers. */
export const CREDENTIALS =
  /\b(password|passcode|pin|otp|one[- ]time|verification|captcha|phone|mobile number|e-?mail|card number|cvv|cvc)\b/i;

// Ads (T3): clicking a real ad is invalid traffic, so ads are observed and never tapped.
const AD_ID = /gms\.ads|AdView|NativeAd|taboola|prebid|adchoices|ad_container|sponsor/i;
const AD_LABEL = /^(ad|sponsored|adchoices|advertisement)$/i;

export function isAdContainer(e: Pick<RawElement, "type" | "identifier">): boolean {
  return AD_ID.test(e.type) || AD_ID.test(e.identifier ?? "");
}

export function isAdLabel(e: Pick<RawElement, "text" | "label">): boolean {
  return AD_LABEL.test((e.text ?? "").trim()) || AD_LABEL.test((e.label ?? "").trim());
}

export const GUARD = "guard:";

export function isGuardSkip(skip: string | undefined): boolean {
  return !!skip && skip.startsWith(GUARD);
}

type Guardable = { text?: string; label?: string; identifier?: string; ad?: boolean };

/** Why this action must never run, or undefined. Checks the element's words and the stated intent. */
export function guardReason(el: Guardable | undefined, intent: string, kind: string): string | undefined {
  if (el?.ad) return `${GUARD} ad (observe ads, never click them)`;
  // resource ids like "btn_logout" -> "btn logout" so word boundaries work
  const idWords = (el?.identifier ?? "").split("/").pop()!.replace(/[_\-.]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  const hay = [el?.text, el?.label, idWords, intent].filter(Boolean).join(" \n ");
  if (DESTRUCTIVE.test(hay)) return `${GUARD} destructive`;
  if (OUT_OF_SCOPE.test(hay)) return `${GUARD} out of scope`;
  if ((kind === "type-send" || kind === "consume") && CREDENTIALS.test(hay)) return `${GUARD} credential field (a human enters these)`;
  return undefined;
}
