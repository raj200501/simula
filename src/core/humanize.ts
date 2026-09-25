// User-facing wording for things the explorer names for itself. The explorer's action intents are
// instructions to a robot ("type a short message and send it (may spend)", `tap "Claim" (monetization)`);
// anything a product team reads (sink names, captions, slide titles) uses the short verb phrase a
// person would say ("Send a message", "Claim"). Pure string functions, generic across apps.

const STOP_END = /\s+(?:a|an|the|to|and|or|of|with|for|in|on|at|by|from|your|my|it|its|this|that)$/i;
const FILLER = /\b(?:short|quick|simple|brief|sample|test|dummy|new)\s+/gi;
const MSG_NOUN = "(message|messages|reply|replies|question|questions|prompt|prompts)";

/** Cut to at most `n` words, never ending on an article or preposition. */
export function clampPhrase(s: string, n = 6): string {
  let w = s.replace(/\s+/g, " ").trim().split(" ").filter(Boolean).slice(0, n).join(" ");
  while (STOP_END.test(w)) w = w.replace(STOP_END, "");
  return w.replace(/[\s,;:.\-–—]+$/, "");
}

export function sentenceCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Lower-case the first letter for use mid-sentence, unless the phrase starts with an acronym or a quoted UI label. */
export function midSentence(s: string): string {
  if (!s || /^["“'«]/.test(s) || /^[A-Z0-9]{2,}\b/.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** The first quoted string in a text ("…", “…”, '…' or «…»), if any. */
export function firstQuoted(s: string): string | undefined {
  return quotedAll(s)[0];
}

export function quotedAll(s: string): string[] {
  return [...(s ?? "").matchAll(/"([^"]{1,80})"|“([^”]{1,80})”|«([^»]{1,80})»|(?:^|[\s(])'([^']{1,80})'(?=[\s).,:;!?]|$)/g)]
    .map(m => (m[1] ?? m[2] ?? m[3] ?? m[4] ?? "").trim()).filter(Boolean);
}

/**
 * "type a short message and send it (may spend)" -> "Send a message"; `tap "Claim" (monetization)` ->
 * "Claim"; "press BACK" -> "Go back"; "Type a message to the AI assistant" -> "Send a message".
 * Parentheticals are dropped, the result is sentence-cased and at most `maxWords` words.
 * Already-human phrases pass through unchanged (idempotent).
 */
export function humanizeAction(raw: string | undefined, maxWords = 6): string {
  let s = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  // Notes in brackets are for the explorer ("(may spend)", "(monetization)", "[p2]").
  s = s.replace(/\s*\([^()]*\)/g, "").replace(/\s*\[[^\]]*\]/g, "").trim();
  // Tap / press / select "Label" -> the label itself: it is what the user sees and taps.
  const tapped = /^(?:tap|click|press|select|open|choose|toggle|long-press)\s+(?:on\s+)?(?:the\s+)?["“]([^"”]+)["”]/i.exec(s);
  if (tapped) {
    const label = tapped[1].replace(/…$/, "").trim();
    return sentenceCase(clampPhrase(label, maxWords));
  }
  if (/^press\s+back$/i.test(s) || /^(?:go|navigate)\s+back\b/i.test(s)) return "Go back";
  if (/^scroll\b/i.test(s)) return /\bup\b/i.test(s) ? "Scroll up" : "Scroll down";
  // Composing and sending text: "type ... message ... send", "write a reply", "send a message to X".
  if (new RegExp(`\\b(type|write|enter|compose|send|ask|submit)\\b.*\\b${MSG_NOUN}\\b`, "i").test(s) && !/\bsearch\b/i.test(s)) {
    const noun = new RegExp(`\\b${MSG_NOUN}\\b`, "i").exec(s)![1].toLowerCase();
    if (/^(question|questions)$/.test(noun)) return "Ask a question";
    if (/^(prompt|prompts)$/.test(noun)) return "Send a prompt";
    if (/^(reply|replies)$/.test(noun)) return "Send a reply";
    return "Send a message";
  }
  // "type a short text and submit it" -> "Submit a text"; "enter a query and search" -> "Search".
  const typed = /^(?:type|enter|write|input|fill in)\s+(?:a |an |the |some )?(.+?)\s+and\s+(send|submit|search|save|post|generate|create)\b/i.exec(s);
  if (typed) {
    const verb = typed[2].toLowerCase();
    if (verb === "search") return "Search";
    const noun = typed[1].replace(FILLER, "").trim();
    return sentenceCase(clampPhrase(`${verb} ${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}`, maxWords));
  }
  s = s.replace(/\s+and\s+(?:send|submit)\s+it$/i, "").replace(/^(?:try to|attempt to)\s+/i, "")
    .replace(/\s+(?:at|in|on)\s+(?:the\s+)?(?:top|bottom|upper|lower|left|right|center|centre|middle)\b.*$/i, "");
  return sentenceCase(clampPhrase(s.replace(FILLER, ""), maxWords));
}

/** The countable thing an action produces, if it has one: "Send a message" -> "message". */
export function actionNoun(action: string): string | undefined {
  const h = humanizeAction(action);
  const m = /^(?:send|ask|write|post|generate|create|make|submit)\s+(?:a|an|one)\s+([a-z][a-z-]{1,20})\b/i.exec(h);
  return m ? m[1].toLowerCase() : undefined;
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const plural = (w: string, n: number) => (n === 1 ? w : /(s|x|ch|sh)$/.test(w) ? `${w}es` : /[^aeiou]y$/.test(w) ? `${w.slice(0, -1)}ies` : `${w}s`);

/** "one message", "30 messages", or "3× claim" when the action has no countable noun. */
export function actionCount(action: string, n: number): string {
  const noun = actionNoun(action);
  const num = n >= 0 && n <= 10 && Number.isInteger(n) ? WORDS[n] : String(n);
  return noun ? `${num} ${plural(noun, n)}` : `${n}× ${midSentence(humanizeAction(action))}`;
}

/** A selection context without its price: "Premium · 30" -> "Premium", "Basic 10 coins" -> "Basic". */
export function modeName(context: string | undefined): string {
  const c = (context ?? "").replace(/\s+/g, " ").trim();
  if (!c) return "";
  const first = c.split(" / ")[0];
  const stripped = (/^([^\d]{2,40}?)[\s·•:|\-–]+\d/.exec(first)?.[1] ?? first).trim();
  return stripped || c;
}

/** "one message in Basic" / "3× claim": what an amount of a resource buys at a sink, in plain words. */
export function sinkUse(action: string, n: number, context?: string): string {
  const mode = modeName(context);
  return `${actionCount(action, n)}${mode ? ` in ${mode}` : ""}`;
}

/** App / screen names without test-harness suffixes: "CreditChat (fixture)" -> "CreditChat". */
export function cleanName(s: string): string {
  return s.replace(/\s*\([^()]*\)\s*$/, "").trim() || s;
}

interface TitleEl { text?: string; label?: string; role?: string; type?: string; ad?: boolean; rectDp: { x: number; y: number; w: number; h: number } }
const GENERIC_TITLE = /^(back|close|menu|more|search|settings|share|today|yesterday|now|new|online|typing…?|options|navigate up|home)$/i;

/**
 * The title shown in a screen's top bar (a chat's character or persona, a page's heading): the longest
 * short text in the top band that is not a control glyph, an avatar monogram, a price or a mode chip.
 */
export function topBarTitle(elements: TitleEl[], heightDp: number): string | undefined {
  const band = Math.max(80, heightDp * 0.12);
  const cands = elements
    .filter(e => !e.ad && e.role !== "input" && e.rectDp.y < band && e.rectDp.h < 64)
    .map(e => ({ e, t: (e.text || e.label || "").replace(/\s+/g, " ").trim() }))
    .filter(({ t }) => t.length >= 4 && t.length <= 40 && !/\d/.test(t) && !GENERIC_TITLE.test(t) && !/^[A-Z]{1,3}$/.test(t))
    .sort((a, b) => b.t.length - a.t.length || a.e.rectDp.y - b.e.rectDp.y);
  return cands[0]?.t;
}

/** A screen name that is only an avatar monogram or an icon label ("ML", "AB") is replaced by the top-bar title. */
export function betterScreenName(name: string, elements: TitleEl[], heightDp: number): string {
  if (name.trim().length > 3 && !/^[A-Z]{1,3}$/.test(name.trim())) return name;
  return topBarTitle(elements, heightDp) ?? name;
}
