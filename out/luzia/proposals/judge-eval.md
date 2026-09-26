# Judge calibration: Luzia

Single-fault confusion table. 3 positives adapted from the KB precedents that fit this app's economy, grounded in its ids; each negative changes exactly one field of a positive. Every item is judged once: code gates, then one LLM judge (gemini-2.5-flash, gemini-3.1-flash-lite, gemini-3.5-flash-lite) call (skipped when a policy gate already failed). No revision rounds, no Batch API.

n = 13 items from one run: this shows what each layer catches; it is not a statistical estimate of judge accuracy.

## Confusion table

| item | kind | fault (field changed) | expected catch | verdict | weighted | caught by | lowest criterion | failed gates |
|---|---|---|---|---|---|---|---|---|
| pos-ent-sample | positive | EX-MUSIC: Intent-triggered sample of a paid feature (Pandora Premium Access: the missing premium capability, small and expiring) | SHIP | SHIP ✓ | 4.9 | — | reach 4 | none |
| pos-ent-decline | positive | TAX-10: Decline fallback for a gated feature: one small sample, only after the paid (or sign-up) path was declined | SHIP | SHIP ✓ | 4.55 | — | reach 3 | none |
| pos-ent-tasks | positive | TAX-9: Sponsored daily tasks whose completed set unlocks one use of a paid feature (Character.AI Charms, Discord Quests) | SHIP | SHIP ✓ | 5 | — | value-moment-fit 5 | none |
| neg-autoplay | negative | Auto-plays in the middle of a streaming response (`trigger` of pos-ent-sample) | judge: no-stream-interrupt / explicit-opt-in / no-loss-framing gates | REJECT ✓ | 4.05 | judge | product-integrity 1 | no-loss-framing (judge), no-stream-interrupt (judge) |
| neg-no-decline | negative | The decline option is removed (`offer.decline` of pos-ent-decline) | code: structure gate (no decline) | REVISE ✓ | 4.7 | code + judge | frequency-fatigue 3 | structure (code), free-decline (judge) |
| neg-gift-card | negative | Gift-card (cash-like) reward (`reward.what` of pos-ent-sample) | code: policy-lint gate | REJECT ✓ | — | code | — | policy-lint (code) |
| neg-loss-framing | negative | "Watch or lose your history" loss framing (`offer.body` of pos-ent-tasks) | judge: no-loss-framing gate | REJECT ✓ | 2.7 | judge | product-integrity 1 | no-loss-framing (judge) |
| neg-oversized | negative | Reward far larger than a view is worth (a week of the paid plan per view) (`reward` of pos-ent-sample) | judge: cannibalization (a week of the paid plan per view) [ANTI-4] | REVISE ✓ | 3.55 | judge | cannibalization-safety 1 | none |
| neg-subscribers | negative | Offered to subscribers on every open (`eligibility` of pos-ent-sample) | judge: not-for-subscribers gate, frequency and cannibalization scores | REVISE ✓ | 3.5 | judge | cannibalization-safety 1 | not-for-subscribers (judge) |
| neg-bad-surface | negative | A surface id that does not exist in the model (`surface` of pos-ent-decline) | code: grounding gate | REVISE ✓ | 4.45 | code | feasibility 3 | grounding (code) |
| neg-generic | negative | Generic "watch a video for coins" with no app nouns (`offer` of pos-ent-sample) | judge: specificity and disclosure | REJECT ✓ | 2.95 | judge | specificity 1 | disclosed (judge) |
| neg-entitlement-amount | negative | An entitlement granted as a currency ("+1 <tier>") (`reward` of pos-ent-sample) | code: reward-coherence gate | REVISE ✓ | 3.35 | code + judge | value-moment-fit 2 | reward-coherence (code) |
| neg-account-swap | negative | An account-only feature offered for an ad (an ad in place of signing up) (`reward` of pos-ent-sample) | code: not-for-account-wall gate | REVISE ✓ | 3 | code + judge | product-integrity 1 | not-for-account-wall (code) |

## Counts

- Negatives caught (verdict is not SHIP): **10 / 10** — code only 2, judge only 5, both 3.
- Caught by the layer expected to catch it: 10 / 10.
- Negatives that would SHIP: 0.
- Positives that SHIP: **3 / 3**.
- Not applicable to this model: pos-serial (model lacks reward.amount); pos-music (model lacks reward.amount); pos-duo (model lacks reward.amount); pos-decline (model lacks decline.moment, reward.amount); pos-tasks (model lacks reward.amount).

## Top concern per item

- **pos-ent-sample** (SHIP): Clarify the exact benefits granted (e.g., '30 minutes of advanced services and deep reasoning mode') rather than the upsell action 'Upgrade to Luzia+'.
- **pos-ent-decline** (SHIP): The offer copy 'Not ready yet?' could be perceived as slightly confirmshaming.
- **pos-ent-tasks** (SHIP): 
- **neg-autoplay** (REJECT): The proposal violates core integrity rules by forcing an auto-playing, interruptive ad while the AI is in the middle of streaming a response to the user.
- **neg-no-decline** (REVISE): The proposal lacks an explicit decline option in the offer object, which is a violation of the 'Declining is free' policy.
- **neg-gift-card** (REJECT): Remove cash-like rewards, incentivized clicks, installs or ratings, and 'support us' copy [POL-2] (policy-lint: matched "gift card").
- **neg-loss-framing** (REJECT): The proposal uses manufactured scarcity and hostage framing ('lose your chat history') to force engagement. This is a severe dark pattern that violates product integrity and user trust.
- **neg-oversized** (REVISE): The proposal contains a dangerous contradiction between the 30-minute claim in the offer body and the 7-day subscription grant in the technical metadata; granting a full 7-day subscription for a single ad is unacceptable and would cause immediate cannibalization of the core revenue stream.
- **neg-subscribers** (REVISE): The proposal targets existing subscribers with ads, which risks severe user backlash and violates the policy against showing rewarded ads to paying users who already possess the entitlement.
- **neg-bad-surface** (REVISE): The proposal refers to an invalid screen ID (s99) which prevents direct implementation without correction.
- **neg-generic** (REJECT): The offer copy is generic and actively misleading, promising 'Free coins' for an entitlement reward, which violates disclosure policy and creates poor user trust.
- **neg-entitlement-amount** (REVISE): The reward incorrectly treats the Luzia+ Subscription entitlement as a currency (+1 plan) instead of granting a time-boxed feature entitlement.
- **neg-account-swap** (REVISE): The proposal violates the core rule that an ad never stands in for creating an account or unlocking account-only features (viewing favorite messages), attempting to bypass account walls instead of sampling subscription features.
