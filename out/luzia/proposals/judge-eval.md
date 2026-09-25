# Judge calibration: Luzia

Single-fault confusion table. 5 positives adapted from KB precedents, grounded in this app's ids; each negative changes exactly one field of a positive. Every item is judged once: code gates, then one LLM judge (gemini-3.1-flash-lite, gemini-3.5-flash-lite) call (skipped when a policy gate already failed). No revision rounds, no Batch API.

n = 13 items from one run: this shows what each layer catches; it is not a statistical estimate of judge accuracy.

## Confusion table

| item | kind | fault (field changed) | expected catch | verdict | weighted | caught by | lowest criterion | failed gates |
|---|---|---|---|---|---|---|---|---|
| pos-ent-sample | positive | EX-MUSIC: Intent-triggered sample of a paid feature (Pandora Premium Access: the missing premium capability, small and expiring) | SHIP | SHIP ✓ | 4.05 | — | value-moment-fit 3 | none |
| pos-ent-decline | positive | TAX-10: Decline fallback for a gated feature: one small sample, only after the paid (or sign-up) path was declined | SHIP | REVISE ✗ | 3.65 | false alarm | value-moment-fit 2 | none |
| pos-ent-tasks | positive | TAX-9: Sponsored daily tasks whose completed set unlocks one use of a paid feature (Character.AI Charms, Discord Quests) | SHIP | SHIP ✓ | 4.55 | — | value-moment-fit 4 | none |
| neg-autoplay | negative | Auto-plays in the middle of a streaming response (`trigger` of pos-ent-sample) | judge: no-stream-interrupt / explicit-opt-in / no-loss-framing gates | REVISE ✓ | 3.05 | judge | product-integrity 1 | explicit-opt-in (judge), no-stream-interrupt (judge) |
| neg-no-decline | negative | The decline option is removed (`offer.decline` of pos-ent-decline) | code: structure gate (no decline) | REVISE ✓ | 4.4 | code + judge | frequency-fatigue 2 | structure (code), free-decline (judge) |
| neg-gift-card | negative | Gift-card (cash-like) reward (`reward.what` of pos-ent-sample) | code: policy-lint gate | REJECT ✓ | — | code | — | policy-lint (code) |
| neg-loss-framing | negative | "Watch or lose your history" loss framing (`offer.body` of pos-ent-tasks) | judge: no-loss-framing gate | REJECT ✓ | 3.5 | judge | product-integrity 1 | no-loss-framing (judge) |
| neg-oversized | negative | Reward far larger than a view is worth (a week of the paid plan per view) (`reward` of pos-ent-sample) | judge: cannibalization (a week of the paid plan per view) [ANTI-4] | REVISE ✓ | 3 | judge | cannibalization-safety 1 | none |
| neg-subscribers | negative | Offered to subscribers on every open (`eligibility` of pos-ent-sample) | judge: not-for-subscribers gate, frequency and cannibalization scores | REVISE ✓ | 4.05 | judge | cannibalization-safety 1 | not-for-subscribers (judge) |
| neg-bad-surface | negative | A surface id that does not exist in the model (`surface` of pos-ent-decline) | code: grounding gate | REVISE ✓ | 4.45 | code | feasibility 3 | grounding (code) |
| neg-generic | negative | Generic "watch a video for coins" with no app nouns (`offer` of pos-ent-sample) | judge: specificity and disclosure | REVISE ✓ | 3.05 | judge | specificity 1 | disclosed (judge) |
| neg-entitlement-amount | negative | An entitlement granted as a currency ("+1 <tier>") (`reward` of pos-ent-sample) | code: reward-coherence gate | REVISE ✓ | 4.6 | code | product-integrity 3 | reward-coherence (code) |
| neg-account-swap | negative | An account-only feature offered for an ad (an ad in place of signing up) (`reward` of pos-ent-sample) | code: not-for-account-wall gate | REJECT ✓ | 2.4 | code + judge | value-moment-fit 1 | not-for-account-wall (code) |

## Counts

- Negatives caught (verdict is not SHIP): **10 / 10** — code only 3, judge only 5, both 2.
- Caught by the layer expected to catch it: 10 / 10.
- Negatives that would SHIP: 0.
- Positives that SHIP: **2 / 3**; pos-ent-decline got REVISE (value-moment-fit scored 2 (< 3); weighted 3.65 < 3.8).
- Not applicable to this model: pos-serial (model lacks reward.amount); pos-music (model lacks reward.amount); pos-duo (model lacks reward.amount); pos-decline (model lacks decline.moment, reward.amount); pos-tasks (model lacks reward.amount).

## Top concern per item

- **pos-ent-sample** (SHIP): The proposal refers to the reward as '30 minutes of Upgrade to Luzia+', which conflates the subscription tier name with the functionality, violating the guideline that entitlements should be defined by their features, not the plan name.
- **pos-ent-decline** (REVISE): The proposal grants the 'Upgrade to Luzia+' subscription itself as a reward bucket, which devalues the paid offering and triggers the 'entitlements are not currencies' policy penalty; it must instead sample specific, metered features.
- **pos-ent-tasks** (SHIP): None; the proposal is shippable as designed.
- **neg-autoplay** (REVISE): The auto-play, mid-stream interruption is a severe violation of UX and brand safety policies, and directly contradicts [ANTI-5].
- **neg-no-decline** (REVISE): The proposal lacks a mandatory, working decline option (as indicated by the empty string in the offer definition), which violates mandatory policy and creates a negative user experience.
- **neg-gift-card** (REJECT): Remove cash-like rewards, incentivized clicks, installs or ratings, and 'support us' copy [POL-2] (policy-lint: matched "gift card").
- **neg-loss-framing** (REJECT): The use of loss framing ('lose your chat history') to force engagement is a severe dark pattern that violates basic trust principles and will lead to user churn and negative reviews.
- **neg-oversized** (REVISE): The proposal contains a dangerous contradiction where the reward object grants '7 days of Luzia+ Subscription', which would completely destroy subscription revenue by allowing users to obtain unlimited free weeks of premium access via ad views.
- **neg-subscribers** (REVISE): Offering rewarded ad trials to existing subscribers violates core subscriber protection rules and creates severe subscription cannibalization risk.
- **neg-bad-surface** (REVISE): Surface ID mismatch where proposal specifies non-existent screen 's99' instead of 's06'.
- **neg-generic** (REVISE): The proposal uses generic template copy ('Free coins!') that completely misrepresents the actual reward (30 minutes of Luzia+ subscription access), failing disclosure requirements and app specificity.
- **neg-entitlement-amount** (REVISE): The proposal metadata incorrectly defines the reward as granting the full 'Luzia+ Subscription' plan (r1), which violates policy. The reward must be strictly defined as a time-limited feature access (a time-box) rather than an entitlement/plan subscription.
- **neg-account-swap** (REJECT): The proposal attempts to use a rewarded ad to bypass account creation and access account-only features (View Favorite messages), violating the rule that ads can never stand in for signing up or account creation.
