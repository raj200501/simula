# CreditChat fixture

A small, credit-metered chat app in plain HTML/JS (`index.html`, `app.js`, `style.css`). It has no framework and makes no network calls, and it runs from `file://`. The explorer crawls it through `WebDevice` (Playwright at 411×914 dp, 2.625 px/dp), exactly as it crawls a real app through mobile-mcp. `apps/fixture.json` points here.

## Screens

| Screen | Contents |
|---|---|
| Home (tab) | Balance chip "450 credits" (`#balance_chip`, opens Store), story feed with cards of varying height, a **Sponsored** card (`data-ad`) |
| Story detail | Hero, blurb, **Start chat**, "More like this" rows |
| Chat | Mode chip **Basic · 10** or **Premium · 30** (opens a sheet), bubbles, composer. The bot replies after 1.2 s |
| Out of credits sheet | "Out of credits", **Refill now** (goes to Store), **Not now** |
| Daily check-in dialog | "+300 credits", **Claim**. Shown on the first Home open of each day |
| Store (tab) | 1,000 credits $1.39 · 2,000 $2.89 · 5,000 $7.09. Each opens an external billing card (`data-external="billing"`) |
| Profile (tab) | Notifications switch, Language, **Rate us** (external `browser`), **Terms** (page), **Log out** |

## Traps (why the fixture is adversarial)

- **Balance only on Home.** The chat never shows the counter. The drain probe has to travel back to Home to measure the cost of a send.
- **Send only after typing.** The composer shows a mic ("Voice input", which opens a permission prompt, `data-external="permission"`) until the field has text. The explorer must re-read the screen after typing. ENTER inserts a newline; it does not send.
- **Picking a mode drops keyboard focus.** The explorer has to tap the field again before it types.
- **Chat bubbles vary in width.** User bubbles are right-aligned and bot bubbles left-aligned, so they never share an x and a width.
- **A fake Sponsored card sits in the feed.** Tapping it counts as an ad tap and opens an external browser card.
- **One row is half hidden under the 48 dp navigation bar.** This is the last "More like this" row on Story detail, which is edge to edge. The nav bar swallows taps, so tapping the row's centre does nothing; scroll it into view first.
- **Log out is destructive with one tap.** It wipes the account (balance back to 450, check-in shown again).
- **External surfaces:** billing, browser, and the permission prompt. BACK closes each one.

## Hooks

- `?reset=1` wipes the saved state on load. The flag is then removed from the URL.
- `window.__appBack()` is the Android BACK key. It closes an external card, then a sheet or dialog, then pops the screen stack. On a tab root it goes to Home, and on Home it does nothing.
- `window.__fixture.{state(), audit(), screen()}` is read-only and meant for tests. `audit()` counts `logouts`, `adTaps` and `purchasesAttempted`, all of which the explorer must keep at 0. The explorer never calls these hooks.

State that a real app would keep server-side (balance, mode, chats, check-in day) lives in `localStorage`. Navigation lives in memory, so a cold launch starts on Home. The fixture deliberately has no `data-node` attributes: the explorer has to discover everything from the screen, as it would on a device.
