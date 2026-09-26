# Judge calibration: Janitor

Single-fault confusion table. 2 positives adapted from the KB precedents that fit this app's economy, grounded in its ids; each negative changes exactly one field of a positive. Every item is judged once: code gates, then one LLM judge (gemini-3.1-flash-lite) call (skipped when a policy gate already failed). No revision rounds, no Batch API.

n = 8 items from one run: this shows what each layer catches; it is not a statistical estimate of judge accuracy.

## Confusion table

| item | kind | fault (field changed) | expected catch | verdict | weighted | caught by | lowest criterion | failed gates |
|---|---|---|---|---|---|---|---|---|
| pos-ent-sample | positive | EX-MUSIC: Intent-triggered sample of a paid feature (Pandora Premium Access: the missing premium capability, small and expiring) | SHIP | SHIP ✓ | 4.9 | — | reach 4 | none |
| pos-ent-decline | positive | TAX-10: Decline fallback for a gated feature: one small sample, only after the paid (or sign-up) path was declined | SHIP | SHIP ✓ | 5 | — | value-moment-fit 5 | none |
| neg-autoplay | negative | Auto-plays in the middle of a streaming response (`trigger` of pos-ent-sample) | judge: no-stream-interrupt / explicit-opt-in / no-loss-framing gates | REJECT ✓ | 2.6 | judge | value-moment-fit 1 | no-loss-framing (judge), explicit-opt-in (judge), disclosed (judge), free-decline (judge), no-stream-interrupt (judge) |
| neg-no-decline | negative | The decline option is removed (`offer.decline` of pos-ent-decline) | code: structure gate (no decline) | REVISE ✓ | 4.6 | code + judge | product-integrity 4 | structure (code), free-decline (judge) |
| neg-gift-card | negative | Gift-card (cash-like) reward (`reward.what` of pos-ent-sample) | code: policy-lint gate | REJECT ✓ | — | code | — | policy-lint (code) |
| neg-subscribers | negative | Offered to subscribers on every open (`eligibility` of pos-ent-sample) | judge: not-for-subscribers gate, frequency and cannibalization scores | REJECT ✓ | 3.85 | judge | cannibalization-safety 1 | sfw (judge), not-for-subscribers (judge) |
| neg-bad-surface | negative | A surface id that does not exist in the model (`surface` of pos-ent-decline) | code: grounding gate | REVISE ✓ | 4.45 | code + judge | feasibility 2 | grounding (code) |
| neg-generic | negative | Generic "watch a video for coins" with no app nouns (`offer` of pos-ent-sample) | judge: specificity and disclosure | REVISE ✓ | 3.2 | judge | value-moment-fit 1 | disclosed (judge) |

## Counts

- Negatives caught (verdict is not SHIP): **6 / 6** — code only 1, judge only 3, both 2.
- Caught by the layer expected to catch it: 6 / 6.
- Negatives that would SHIP: 0.
- Positives that SHIP: **2 / 2**.
- Not applicable to this model: pos-serial (model lacks res.id, reward.amount); pos-music (model lacks res.id, reward.amount); pos-duo (model lacks res.id, hub.moment, reward.amount); pos-decline (model lacks res.id, reward.amount); pos-tasks (model lacks res.id, hub.moment, reward.amount); pos-ent-tasks (model lacks hub.moment); neg-loss-framing (base pos-tasks not available; base pos-ent-tasks not available); neg-oversized (base pos-serial not available; pos-ent-sample: model lacks gated.resource); neg-entitlement-amount (pos-ent-sample: model lacks gated.unit, gated.resource); neg-account-swap (pos-ent-sample: model lacks account.feature).

## Top concern per item

- **pos-ent-sample** (SHIP): None.
- **pos-ent-decline** (SHIP): None; this is a highly optimized, safe, and native rewarded ad pattern (TAX-10) for a subscription-gated AI app.
- **neg-autoplay** (REJECT): The proposal mandates auto-playing ads mid-response, which violates the fundamental rewarded ads policy requiring explicit user consent, flow preservation, and non-interruption of AI responses.
- **neg-no-decline** (REVISE): The decline option is missing in the JSON configuration, which violates the requirement for an equally legible decline path.
- **neg-gift-card** (REJECT): Remove cash-like rewards, incentivized clicks, installs or ratings, and 'support us' copy [POL-2] (policy-lint: matched "gift card").
- **neg-subscribers** (REJECT): The proposal includes subscribers in the eligibility and triggers on 'every app open', which destroys subscription value and causes excessive user fatigue; ads should be restricted to non-paying users only on the paywall boundary.
- **neg-bad-surface** (REVISE): The proposal uses a non-existent screen ID ('s99') as the designated surface, which creates a critical discrepancy with the actual product model and the provided patch.
- **neg-generic** (REVISE): The offer copy is generic and misleadingly promises 'coins' when the reward is a '5x context' entitlement, violating disclosure policies and creating a poor user experience.
