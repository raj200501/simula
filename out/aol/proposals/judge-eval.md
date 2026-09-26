# Judge calibration: AOL

Single-fault confusion table. 0 positives adapted from the KB precedents that fit this app's economy, grounded in its ids; each negative changes exactly one field of a positive. Every item is judged once: code gates, then one judge (stub heuristic, no LLM) call (skipped when a policy gate already failed). No revision rounds, no Batch API.

n = 0: no KB precedent fits this app's economy, so there is no known-good proposal to break here. The list under Counts says what each item needs.

## Confusion table

| item | kind | fault (field changed) | expected catch | verdict | weighted | caught by | lowest criterion | failed gates |
|---|---|---|---|---|---|---|---|---|

## Counts

- Negatives caught (verdict is not SHIP): **0 / 0** — code only 0, judge only 0, both 0.
- Caught by the layer expected to catch it: 0 / 0.
- Negatives that would SHIP: 0.
- Positives that SHIP: **0 / 0**.
- Not applicable to this model: pos-serial (model lacks res.id, reward.amount); pos-music (model lacks res.id, reward.amount); pos-duo (model lacks res.id, reward.amount); pos-decline (model lacks res.id, decline.moment, reward.amount); pos-tasks (model lacks res.id, reward.amount); pos-ent-sample (model lacks gated.feature, gated.useScreen); pos-ent-decline (model lacks gated.feature, gated.declineMoment, gated.declineTo); pos-ent-tasks (model lacks gated.feature); neg-autoplay (base pos-serial not available; base pos-ent-sample not available); neg-no-decline (base pos-decline not available; base pos-ent-decline not available); neg-gift-card (base pos-duo not available; base pos-ent-sample not available); neg-loss-framing (base pos-tasks not available; base pos-ent-tasks not available); neg-oversized (base pos-serial not available; base pos-ent-sample not available); neg-subscribers (base pos-duo not available; base pos-ent-sample not available); neg-bad-surface (base pos-decline not available; base pos-ent-decline not available); neg-generic (base pos-music not available; base pos-ent-sample not available); neg-entitlement-amount (base pos-ent-sample not available); neg-account-swap (base pos-ent-sample not available).

## Top concern per item

