# Trajectory: janitor

Autonomous decisions: **96**. Human interventions: **2**. Autonomy ratio: **98.0%**.

## Stage runs

| stage | run | start | end | events | failures | stop |
|---|---|---|---|---|---|---|
| probe | pr0925-021422 | 06:14:22 | 06:14:24 | 15 | 0 |  |
| explore | ex0925-144731 | 18:47:31 | 18:52:37 | 797 | 8 | budget_steps |
| understand | un0925-145237 | 18:52:37 | 18:53:03 | 16 | 2 |  |
| mock | mo0925-145303 | 18:53:03 | 18:55:05 | 20 | 3 |  |
| qa | qa0925-145505 | 18:55:05 | 18:56:28 | 23 | 3 | good-enough |
| propose | pr0925-145628 | 18:56:28 | 18:57:31 | 18 | 4 |  |
| judge | ju0925-145731 | 18:57:31 | 18:59:25 | 48 | 12 |  |
| slides | sl0925-145925 | 18:59:25 | 19:01:39 | 15 | 2 |  |
| slides | sl0925-193657 | 19:36:57 | 19:39:14 | 17 | 0 |  |
| slides | sl0925-193947 | 19:39:47 | 19:40:07 | 11 | 0 |  |
| slides | sl0925-205137 | 20:51:37 | 20:51:58 | 11 | 0 |  |
| slides | sl0925-210121 | 21:01:21 | 21:01:42 | 11 | 0 |  |
| propose | pr0926-055629 | 05:56:29 | 05:57:35 | 24 | 4 |  |
| judge | ju0926-055736 | 05:57:36 | 05:59:38 | 44 | 5 | revision stalled: weighted 4.35 -> 4.45 |
| eval-judge | ev0926-055941 | 05:59:41 | 06:00:35 | 22 | 0 |  |
| human | manual | 06:04:11 | 06:31:12 | 2 | 0 |  |
| propose | pr0926-060529 | 06:05:29 | 06:05:29 | 1 | 0 |  |
| propose | pr0926-070903 | 07:09:03 | 07:10:07 | 14 | 1 |  |
| judge | ju0926-071008 | 07:10:08 | 07:12:18 | 36 | 4 | revision stalled: weighted 4.3 -> 4.35 |
| eval-judge | ev0926-071713 | 07:17:13 | 07:18:02 | 23 | 1 |  |
| propose | pr0926-071817 | 07:18:17 | 07:18:17 | 8 | 0 |  |
| judge | ju0926-071818 | 07:18:18 | 07:18:28 | 28 | 0 | revision stalled: weighted 4.3 -> 4.35 |
| eval-judge | ev0926-071917 | 07:19:17 | 07:19:17 | 10 | 0 |  |
| propose | pr0926-072039 | 07:20:39 | 07:20:40 | 8 | 0 |  |
| judge | ju0926-072041 | 07:20:41 | 07:20:41 | 22 | 0 | revision stalled: weighted 4.5 -> 4.15 |
| eval-judge | ev0926-072205 | 07:22:05 | 07:22:05 | 10 | 0 |  |
| slides | sl0926-072306 | 07:23:06 | 07:23:08 | 4 | 0 |  |
| slides | sl0926-072843 | 07:28:43 | 07:28:45 | 4 | 0 |  |

## New states discovered over time

- step 0 (18:47:35): **s01** "Build, Share, Explore"
- step 6 (18:47:44): **s02** "@your_handle"
- step 10 (18:48:03): **s03** "More memory for
long chats."
- step 28 (18:48:53): **s04** "Janitor Plus Paywall"
- step 30 (18:49:10): **s05** "Explore Characters"
- step 36 (18:49:22): **s06** "Search Page"
- step 37 (18:49:28): **s07** "Search Characters"
- step 39 (18:49:42): **s08** "Search Characters"
- step 41 (18:50:01): **s09** "Character Details"
- step 42 (18:50:07): **s10** "Character Detail Page"
- step 45 (18:50:44): **s11** "Search Characters"
- step 46 (18:50:56): **s12** "Search Characters"
- step 48 (18:51:10): **s13** "Notifications Page"
- step 49 (18:51:24): **s14** "Notification Settings"
- step 56 (18:52:19): **s15** "Blocked Content Screen"
- step 60 (18:52:37): **s16** "Block Settings"

## Failures and recoveries

### explore · run ex0925-144731

- 18:47:35 **annotate**: fetch failed
  - recovered: heuristic annotator
- 18:47:39 **annotate**: fetch failed
  - recovered: heuristic annotator
- 18:47:44 **annotate**: fetch failed
  - recovered: heuristic annotator
- 18:48:03 **annotate**: fetch failed
  - recovered: heuristic annotator
- 18:50:13 step 44 **travel:g0041**: expected s09, saw an unknown screen
  - recovered: cold relaunch: travel hop g0041 failed
- 18:51:39 step 54 **travel:g0030**: expected s05, landed on s13
  - recovered: re-planned from s13 (no relaunch)
- 18:51:44 step 54 **travel:g0030**: expected s05, landed on s13
  - recovered: re-planned from s13 (no relaunch)
- 18:51:50 step 54 **travel:g0030**: expected s05, landed on s13
  - recovered: re-planned from s13 (no relaunch)

### understand · run un0925-145237

- 18:52:44 **gemini:synthesize**: 503 on gemini-3-flash-preview (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-2.5-flash (next fallback model)
- 18:52:56 **gemini:synthesize**: 503 on gemini-3.1-flash-lite (attempt 3/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)

### mock · run mo0925-145303

- 18:53:07 **gemini:design-css**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)
- 18:54:08 **mock:validate:s02**: data-node ids used more than once: e9
  - recovered: regenerated once with 1 violation(s); kept the retry (0 left)
- 18:54:10 **gemini:screen-html:s02:retry**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)

### qa · run qa0925-145505

- 18:55:13 **gemini:qa-fix:s01:r1**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)
- 18:55:35 **gemini:qa-fix:s03:r1**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)
- 18:55:49 **gemini:qa-fix:s04:r1**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)

### propose · run pr0925-145628

- 18:56:49 **gemini:breadth-retry**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)
- 18:57:04 **gemini:depth:P1**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)
- 18:57:12 **gemini:depth:P2**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)
- 18:57:16 **gemini:depth:P3**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)

### judge · run ju0925-145731

- 18:57:32 **gemini:judge:P1:v1**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)
- 18:57:37 **gemini:judge:P2:v1**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)
- 18:57:41 **gemini:judge:P3:v1**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)
- 18:57:44 **gemini:revise:P1:r1**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)
- 18:57:53 **gemini:revise:P2:r1**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)
- 18:57:55 **gemini:revise:P3:r1**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)
- 18:58:03 **gemini:judge:P1:v2**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)
- 18:58:13 **gemini:revise:P1:r2**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)
- 18:58:17 **gemini:judge:P3:v2**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)
- 18:58:31 **gemini:revise:P3:r2**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)
- 18:58:31 **gemini:revise:P3:r2**: 429 on gemini-3.5-flash-lite (attempt 2/12): {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this er
  - recovered: all fallback models busy; waiting 29s before another lap
- 18:59:13 **gemini:judge:P3:v3**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)

### slides · run sl0925-145925

- 18:59:28 **gemini:variant:P3:ns1**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)
- 19:00:58 **gemini:variant:P2:ne1**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)

### propose · run pr0926-055629

- 05:56:34 **gemini:breadth**: 503 on gemini-3.8-flash (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.7-flash (next fallback model)
- 05:56:40 **gemini:breadth**: 503 on gemini-3.7-flash (attempt 2/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.6-flash (next fallback model)
- 05:56:44 **gemini:breadth**: 503 on gemini-3.6-flash (attempt 3/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash (next fallback model)
- 05:57:17 **gemini:depth:P2**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)

### judge · run ju0926-055736

- 05:57:41 **gemini:judge:P1:v1**: 503 on gemini-3.6-flash (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash (next fallback model)
- 05:58:01 **gemini:judge:P3:v1**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)
- 05:58:10 **gemini:judge:P2:v1**: 503 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)
- 05:58:38 **propose:revise:P1:r1**: the revision changed the idea (archetype TAX-7 -> TAX-4); asking once more
  - no recovery (continued)
- 05:58:59 **gemini:judge:P1:v2**: 429 on gemini-3.1-flash-lite (attempt 1/12): {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this er
  - recovered: retrying on gemini-3.5-flash-lite (next fallback model)

### propose · run pr0926-070903

- 07:09:26 **gemini:depth:P2**: 503 on gemini-3.8-flash (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.7-flash (next fallback model)

### judge · run ju0926-071008

- 07:10:16 **gemini:judge:P2:v1**: 503 on gemini-3.5-flash (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3-flash-preview (next fallback model)
- 07:10:28 **gemini:judge:P2:v1**: 503 on gemini-3-flash-preview (attempt 2/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-2.5-flash (next fallback model)
- 07:10:42 **gemini:revise:P1:r1**: 503 on gemini-3-flash-preview (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-2.5-flash (next fallback model)
- 07:11:07 **gemini:revise:P2:r1**: 503 on gemini-3-flash-preview (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-2.5-flash (next fallback model)

### eval-judge · run ev0926-071713

- 07:17:55 **gemini:judge-cal:neg-generic**: 503 on gemini-3.8-flash (attempt 1/12): {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again l
  - recovered: retrying on gemini-3.7-flash (next fallback model)


## Human interventions

- 2026-09-26T06:04:11 [human] Logged after the fact: before the 2026-09-25 explore run, a person signed in to Janitor AI on the emulator with Google (apps/janitor.json sets login: manual; the explorer never types credentials). The account handle and join date were then redacted in every artifact: text replaced, screenshots blurred.
- 2026-09-26T06:31:12 [human] Logged after the fact: after reviewing the judged proposals, a person had the proposer and judge rules tightened in code on 2026-09-26 (commit e7d0da6 and the commit that adds this note: no offer beside a sign-up button, no cheaper cost label on revision, the reward's resource sets a floor on its cost class, knowledge-base lines naming the test apps removed), then re-ran propose, judge, eval-judge and slides.

## Key exploration decisions (priority 3)

- step 1: s01 -> a01_1: p3 tap "Limited Only" (monetization)
- step 2: s01 -> a01_2: p3 tap "Limited Only" (monetization)
- step 3: s01 -> a01_3: p3 tap "Hidden Gems" (monetization)
- step 4: s01 -> a01_4: p3 tap "Hidden Gems" (monetization)
- step 7: s02 -> a02_1: p3 tap "Hidden Gems" (monetization)
- step 8: s02 -> a02_2: p3 tap "Hidden Gems" (monetization)
- step 9: s02 -> a02_3: p3 tap "￼Hidden Gems show characters from small…" (monetization)
- step 10: s02 -> a02_4: p3 tap "Upgrade to Janitor Plus" (monetization)
- step 11: s03 -> a03_3: p3 tap "Restore Purchases" (monetization)
- step 12: s03 -> a03_1: p3 tap "Keep more of the story in context, get …" (monetization)
- step 13: s03 -> a03_2: p3 tap "Payment will be charged to your Google …" (monetization)
- step 28: s02 -> a02_5: p3 tap "Upgrade to" (monetization)
- step 29: s04 -> a04_1: p3 tap "Close subscription announcement" (monetization)
- step 31: s05 -> a05_1: p3 Filter by limited only
- step 32: s05 -> a05_2: p3 tap "Limited Only" (monetization)
- step 33: s05 -> a05_3: p3 View hidden gems
- step 34: s05 -> a05_4: p3 tap "Hidden Gems" (monetization)
- step 35: s05 -> a05_5: p3 tap "￼Hidden Gems show characters from small…" (monetization)
- step 36: s05 -> a05_6: p3 tap "🧑‍🎨 OC" (tab: unexplored navigation)
- step 37: s06 -> a06_1: p3 tap "Limited Only" (monetization)
- step 38: s07 -> a07_1: p3 tap "1.9k tokens" (monetization)
- step 42: s09 -> a09_1: p3 Start chatting with the character
- step 45: s05 -> a05_7: p3 tap "📚 Fictional" (tab: unexplored navigation)
- step 46: s11 -> a11_1: p3 tap "Limited Only" (monetization)
- step 47: s12 -> a12_1: p3 tap "1.9k tokens" (monetization)
- step 48: s12 -> a12_2: p3 tap "2.8k tokens" (monetization)
