# Status

## 2026-09-25 09:00 UTC: go-signal for the Mac run

State at this commit:
- `npm test`: 253/253 passing
- `npx tsc --noEmit`: clean

What the Mac run should do, in order:
1. Re-explore Luzia with `npm run explore -- --app luzia`, then run `npm run understand -- --app luzia`. The drain probe now spends the free guest messages until it hits the cap and records "limit after N sends". Buttons marked "consume" (Generate, Claim) are tapped instead of typed into.
2. Run the Luzia stages in order: mock, qa, propose, judge, eval-judge, slides.
3. Run `npm run all` for janitor, then for aol. Transfer apps skip eval-judge.
4. Add the OOC note, run `npm run report`, then commit and push.

Gemini free tier:
- Each model allows about 20 requests a day. Calls move along the fallback chain (`src/core/llm.ts`), and a stage falls back to its marked stub only when every model is exhausted.
- Quotas reset at midnight Pacific. Any stage that ran on stubs can be re-run the next day; cached calls replay for free.
