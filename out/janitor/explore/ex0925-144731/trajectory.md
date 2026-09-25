# Trajectory: janitor

Autonomous decisions: **60**. Human interventions: **0**. Autonomy ratio: **100.0%**.

## Stage runs

| stage | run | start | end | events | failures | stop |
|---|---|---|---|---|---|---|
| probe | pr0925-021422 | 06:14:22 | 06:14:24 | 15 | 0 |  |
| explore | ex0925-144731 | 18:47:31 | 18:52:37 | 796 | 8 | budget_steps |

## New states discovered over time

- step 0 (18:47:35): **s01** "Build, Share, Explore"
- step 6 (18:47:44): **s02** "@8iyiyiyiy"
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


## Human interventions

None recorded.

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
