# Trajectory: luzia

Autonomous decisions: **4**. Human interventions: **1**. Autonomy ratio: **80.0%**.

## Stage runs

| stage | run | start | end | events | failures | stop |
|---|---|---|---|---|---|---|
| probe | pr0925-021334 | 06:13:34 | 06:13:38 | 15 | 0 |  |
| probe | pr0925-021401 | 06:14:01 | 06:14:03 | 15 | 0 |  |
| explore | ex0925-021459 | 06:14:59 | 06:20:09 | 83 | 5 | frontier_empty |

## New states discovered over time

- step 0 (06:15:04): **s01** "Chat Home"
- step 1 (06:15:10): **s02** "Character Profile Settings"
- step 2 (06:15:15): **s03** "Login Screen"

## Failures and recoveries

- [explore] 06:15:30 **gemini:gap:r1**: 503 {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNA
  - recovered by: waited 4s and retried (attempt 1)
- [explore] 06:18:16 **gemini:gap:r1**: 503 {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNA
  - recovered by: waited 16s and retried (attempt 3)
- [explore] 06:18:34 **gemini:gap:r1**: 503 {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNA
  - recovered by: waited 32s and retried (attempt 4)
- [explore] 06:19:06 **gemini:gap:r1**: 503 {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNA
  - recovered by: waited 60s and retried (attempt 5)
- [explore] 06:20:09 **gap-check**: {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}
  - recovered by: skipped the gap check

## Human interventions

- 2026-09-25T06:15:15 [explore] "Login Screen" (s03) needs a human: sign in or pass the phone check / CAPTCHA on the device (the explorer never types passwords, codes or phone numbers).

## Key exploration decisions (priority 3)

- step 2: s02 -> a02_1: p3 Sign up to adjust response style
