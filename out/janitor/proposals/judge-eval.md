# Judge calibration: Janitor

Single-fault confusion table. 5 positives adapted from KB precedents, grounded in this app's ids; each negative changes exactly one field of a positive. Every item is judged once: code gates, then one LLM judge (gemini-3.1-flash-lite) call (skipped when a policy gate already failed). No revision rounds, no Batch API.

n = 8 items from one run: this shows what each layer catches; it is not a statistical estimate of judge accuracy.

## Confusion table

| item | kind | fault (field changed) | expected catch | verdict | weighted | caught by | lowest criterion | failed gates |
|---|---|---|---|---|---|---|---|---|
| pos-ent-sample | positive | EX-MUSIC: Intent-triggered sample of a paid feature (Pandora Premium Access: the missing premium capability, small and expiring) | SHIP | SHIP ✓ | 4.8 | — | reach 3 | none |
| pos-ent-decline | positive | TAX-10: Decline fallback for a gated feature: one small sample, only after the paid (or sign-up) path was declined | SHIP | SHIP ✓ | 4.45 | — | reach 3 | none |
| neg-autoplay | negative | Auto-plays in the middle of a streaming response (`trigger` of pos-ent-sample) | judge: no-stream-interrupt / explicit-opt-in / no-loss-framing gates | REVISE ✓ | 3.45 | judge | product-integrity 1 | explicit-opt-in (judge), free-decline (judge), no-stream-interrupt (judge) |
| neg-no-decline | negative | The decline option is removed (`offer.decline` of pos-ent-decline) | code: structure gate (no decline) | REVISE ✓ | 4.6 | code + judge | reach 3 | structure (code), free-decline (judge) |
| neg-gift-card | negative | Gift-card (cash-like) reward (`reward.what` of pos-ent-sample) | code: policy-lint gate | REJECT ✓ | — | code | — | policy-lint (code) |
| neg-subscribers | negative | Offered to subscribers on every open (`eligibility` of pos-ent-sample) | judge: not-for-subscribers gate, frequency and cannibalization scores | REVISE ✓ | 3.75 | judge | cannibalization-safety 2 | not-for-subscribers (judge) |
| neg-bad-surface | negative | A surface id that does not exist in the model (`surface` of pos-ent-decline) | code: grounding gate | REVISE ✓ | 4.6 | code + judge | feasibility 2 | grounding (code) |
| neg-generic | negative | Generic "watch a video for coins" with no app nouns (`offer` of pos-ent-sample) | judge: specificity and disclosure | REVISE ✓ | 3.55 | judge | value-moment-fit 2 | disclosed (judge) |

## Counts

- Negatives caught (verdict is not SHIP): **6 / 6** — code only 1, judge only 3, both 2.
- Caught by the layer expected to catch it: 6 / 6.
- Negatives that would SHIP: 0.
- Positives that SHIP: **2 / 2**.
- Not applicable to this model: pos-serial (model lacks res.id, reward.amount); pos-music (model lacks res.id, reward.amount); pos-duo (model lacks res.id, hub.moment, reward.amount); pos-decline (model lacks res.id, reward.amount); pos-tasks (model lacks res.id, hub.moment, reward.amount); pos-ent-tasks (model lacks hub.moment); neg-loss-framing (base pos-tasks not available; base pos-ent-tasks not available); neg-oversized (base pos-serial not available; pos-ent-sample: model lacks gated.resource); neg-entitlement-amount (pos-ent-sample: model lacks gated.unit, gated.resource); neg-account-swap (pos-ent-sample: model lacks account.feature).

## Top concern per item

- **pos-ent-sample** (SHIP): None; the proposal is well-scoped and adheres to all policies.
- **pos-ent-decline** (SHIP): The 10-minute time-box for an entitlement like '5x context for better memory' is too short to be useful or perceptible to the user, as memory context builds up over the course of a longer roleplay. A 30-minute session or a message-count based trial would be better.
- **neg-autoplay** (REVISE): The auto-play trigger mid-response is a catastrophic violation of user experience, policy, and chat integrity that will immediately destroy user trust and lead to high churn.
- **neg-no-decline** (REVISE): The proposal lacks a decline option, which is a mandatory requirement under AdMob and Unity policies to ensure the ad experience is strictly voluntary and does not interfere with app usage.
- **neg-gift-card** (REJECT): Remove cash-like rewards, incentivized clicks, installs or ratings, and 'support us' copy [POL-2] (policy-lint: matched "gift card").
- **neg-subscribers** (REVISE): The proposal offers an ad to subscribers for a feature they are already paying for, which creates a negative user experience and devalues the Janitor Plus subscription.
- **neg-bad-surface** (REVISE): The proposal contains a grounding error in the metadata (referencing an undefined surface 's99'), creating a discrepancy between the narrative and the technical patch.
- **neg-generic** (REVISE): The offer copy is generic ('Free coins!') and misrepresents the actual reward, failing to communicate the value of the 5x context sample and confusing the user.
