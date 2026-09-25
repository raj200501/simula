# Submission kit

## Where to submit

- **Deliverable form:** https://app.notion.com/p/3e1af70f6f0d8025a82fed7bf06b84ce (linked from the take-home page, "Submit your Deliverable here →")
- **Then email Yizhen** to say you're done (draft below). Put Athreya in CC; the page names both as contacts.

## Pre-flight checklist (15 minutes before submitting)

- [ ] `git pull`, then `npm ci && npx playwright install chromium && npm test`: all green
- [ ] `npm run demo` works from a clean clone (no device, no key) and `out/index.html` opens
- [ ] Every app has output under `out/<app>/`:
  - Luzia (deep): model, mock, QA, proposals, judgments, judge-eval, slides
  - Janitor and AOL: transfer
  - OOC: recorded as blocked, with its note
- [ ] `out/index.html` shows the transfer scorecard across all apps
- [ ] No keys or personal data in the repo:
  - [ ] `git grep -nE "AIza|AQ\.[A-Za-z0-9_-]{20,}|sk-ant-"` returns nothing
  - [ ] `.env` is not committed
  - [ ] you've looked through the screenshots in `out/*/model/screens/`
- [ ] Recording (10–15 min) uploaded, with the link pasted below. Script: `docs/RECORDING_SCRIPT.md`
- [ ] Repo access for the reviewers: either keep it public or, if private, add Yizhen and Athreya as collaborators
- [ ] Merge the branch into `main` with **Squash and merge**, deleting the "Co-authored-by" lines GitHub pre-fills. Alternatively, submit the branch link as is.

## Email draft

> **Subject:** Simula take-home: App Monetization Agent (submitted)
>
> Hi Yizhen (cc Athreya),
>
> I've submitted the take-home through the Notion form. Quick links:
> - Repo: https://github.com/raj200501/simula (README → quickstart; `npm run demo` runs the whole pipeline on a bundled fixture app with no device or key)
> - Recording (13 min): <LINK>
> - Results page: `out/index.html` in the repo (scorecard across the four apps, mock + QA evidence, judged proposals, slide decks)
>
> Short version:
> - **Luzia is the deep app.** OOC closes itself about 0.8 s after launch on the Google Play emulator: its AppSecurity module logs `Kill Process … [D11001]`. I documented that rather than bypass it.
> - **Janitor and AOL** show the same system transferring, with no app-specific code.
> - **Economics are computed in code.** Everything runs on the free Gemini tier, so model spend was $0; token counts are in each app's `cost.jsonl`.
>
> Happy to walk through anything or run it live.
>
> Thanks,
> Raj
