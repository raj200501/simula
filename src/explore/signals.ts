// Monetization vocabulary as regexes. Generic on purpose: they describe how apps in general talk
// about prices, limits, upsells and rewards, never one app's wording. Used by the heuristic
// annotator, by the drain probe's wall test, and to keep wall-like text in a state's identity.
import type { Signal } from "../core/schema.ts";

export type SignalKind = Signal["kind"];

export const SIGNAL_RES: ReadonlyArray<{ kind: SignalKind; re: RegExp }> = [
  { kind: "price", re: /[$€£¥₹]\s?\d|\d[\d.,]*\s?(€|£|usd|eur|gbp)\b/i },
  { kind: "limit", re: /out of|no more|limit|insufficient|run out|not enough|free messages?|messages? left|come back (later|tomorrow)|try again (later|tomorrow)|(sign ?up|log ?in|create (an |your )?account) to (continue|keep|send|chat)/i },
  { kind: "upsell", re: /upgrade|premium|\bpro\b|\bplus\b|refill|get more|subscribe/i },
  { kind: "reward", re: /\+\d+|claim|reward|bonus|\bfree\b/i },
  { kind: "timer", re: /\d+:\d\d|resets? in|come back/i },
  { kind: "ad", re: /sponsored|\bad\b|advertisement/i },
  { kind: "lock", re: /\blocked\b|\bunlock/i },
];

export function signalKinds(text: string): SignalKind[] {
  return SIGNAL_RES.filter(s => s.re.test(text)).map(s => s.kind);
}

/**
 * A message in the conversation itself that says the spending stopped ("You've used your free messages",
 * "Sign up to keep chatting", "Come back tomorrow"): a wall even though the screen did not change. Strict
 * phrases only, because a bot's ordinary reply may well mention a limit.
 */
export const LIMIT_MESSAGE_RE =
  /free messages?|messages? left|no more messages|message limit|daily limit|limit reached|reached (your|the) (daily |free |message )?limit|out of (free )?(messages|credits|coins|tokens|gems)|run out of|(sign ?up|log ?in|create (an |your )?account|upgrade|subscribe) to (continue|keep|send|chat)|come back (later|tomorrow)|try again (later|tomorrow)|insufficient|not enough (credits|coins|gems|tokens|messages)/i;

/** An account gate: what a guest meets when the free allowance ends (upgrade/subscribe are upsell signals). */
export const GATE_RE = /\b(sign ?up|sign ?in|log ?in|create (an |your )?account|register)\b/i;

/** Signals that make a screen reached by spending look like a wall (BUILD_SPEC T2). */
export const WALL_KINDS: ReadonlySet<SignalKind> = new Set<SignalKind>(["limit", "price", "upsell"]);

export function isWallText(text: string): boolean {
  return signalKinds(text).some(k => WALL_KINDS.has(k));
}

/** Words that make an action monetization-related: priority 3 in the heuristic annotator. */
export const MONEY_RE =
  /credit|coin|\bgems?\b|token|diamond|\bpoints?\b|balance|wallet|store|shop|premium|upgrade|subscri|\bplans?\b|\bpro\b|\bplus\b|\bvip\b|refill|reward|claim|bonus|\bfree\b|check.?in|daily|streak|\btasks?\b|challenge|mission|\bmodes?\b|\bmodels?\b|price|\bbuy\b|\bpacks?\b|unlock|energy|\btickets?\b/i;

/** Words that mark the core loop: priority 2. */
export const CORE_RE = /start|begin|chat|message|\bsend\b|\bplay\b|create|\bnew\b|continue|\bnext\b|generate|\bask\b|\btry\b|\bread\b|watch|listen/i;
