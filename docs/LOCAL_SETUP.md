# Local device setup (run by a Claude session on your Mac)

This container can't run an Android emulator, so device setup happens on your Mac. Start a local
session in the repo folder (Claude Desktop app, or `claude remote-control` in a terminal inside
`simula/`) and paste the prompt below. The session does everything except the **HAND BACK** steps.

Why Android: the iOS Simulator can't install App Store apps, so OOC/Janitor/Luzia/AOL can't run there.
The Android emulator with a Google Play system image installs them from the Play Store.

---

## Prompt for the local session

> Set up the Android emulator for this repo by following `docs/LOCAL_SETUP.md` exactly, starting at
> step 0 (preflight). Use `scripts/device.sh` for SDK/AVD/boot/prep, and adb (or mobile-mcp) to drive
> the emulator. Open every Play listing by package ID with a `market://details?id=<pkg>` intent — never
> by searching the Play Store. HAND BACK to me (stop, tell me what's on screen, wait) for the Google
> sign-up phone verification or CAPTCHA, whenever a password field appears, and for any personal detail
> (name, birthday, username). Never type a password, never tap purchase buttons, never add a payment
> method, never tap an ad. At the end report `scripts/device.sh versions` and `scripts/device.sh doctor`.

---

## Hand-back rules (non-negotiable)

The session must stop and hand control to you whenever any of these happens:

| Trigger | What you do |
|---|---|
| Google sign-up reaches **phone verification** or a **CAPTCHA** | complete it in the emulator window |
| **Any password field** appears (Google, AOL/Yahoo, app logins) or a 2FA prompt | type it yourself |
| A **personal detail** is needed: name, birthday, gender, username choice | tell the session, or type it yourself |
| A purchase, payment method or subscription screen appears | the session backs out; nothing to do |
| An unexpected Google security screen appears ("Verify it's you") | handle it yourself |

When the session hands back, it says what is on screen and which step it will resume at. It waits for you to reply "done".

---

## Steps

### 0. Preflight: confirm before running setup

Run these checks and report their output. **Do not run `setup` until all of them pass.**

```bash
grep -nE '^API=|^IMG=|^APPS=|sdkmanager --install|avdmanager create avd|market://details' scripts/device.sh
echo "API override: ${API:-unset}"      # must be unset or 35
uname -sm                                 # expect: Darwin arm64
java -version 2>&1 | head -1              # must be 17+ (else: brew install --cask temurin@21)
node -v; npm -v                           # Node 22+
```

The expected output shows all of the following:
- `API="${API:-35}"`
- `IMG="system-images;android-${API};google_apis_playstore;arm64-v8a"`. It resolves to **`system-images;android-35;google_apis_playstore;arm64-v8a`**.
- `sdkmanager --install "platform-tools" "emulator" "$IMG"`
- `avdmanager create avd ... -k "$IMG"`
- `APPS=(com.newai.ooc com.janitor.ai co.thewordlab.luzia com.aol.mobile.aolapp)`
- `adb shell am start -a android.intent.action.VIEW -d "market://details?id=$pkg"`

If any of these differ, stop and hand back. Otherwise run `npm ci` and `npx playwright install chromium`.

### 1. SDK and AVD

1. Run `bash scripts/device.sh setup`. It downloads about 2 GB and creates the AVD `simula_pixel_8_api35` (Android 15, Google Play, arm64).
2. Confirm the image was installed: `sdkmanager --list_installed | grep 'android-35;google_apis_playstore;arm64-v8a'`.
3. Add the two `export` lines that `setup` prints to `~/.zshrc`, then run `source ~/.zshrc`.

### 2. Boot

Run `bash scripts/device.sh boot`. The emulator window opens, and the script:
- turns animations off;
- keeps the device awake;
- sets a demo-mode status bar (09:41).

### 3. Google account (sign-up and Play Store sign-in, on the emulator)

1. Open the Play Store: `adb shell am start -a android.intent.action.VIEW -d "market://details?id=com.newai.ooc"`. It lands on the sign-in screen.
2. Tap **Sign in**, then **Create account**, then **For my personal use**.
3. **HAND BACK** for name, birthday, gender and username. Don't invent them.
4. **HAND BACK** for the **password**.
5. **HAND BACK** for **phone verification** and any **CAPTCHA**.
6. Accept the terms. **Skip** or decline these:
   - the payment method: "Skip" / "Not now";
   - backup;
   - "Add phone number" upsells;
   - Google Play Points.
7. Turn off Play auto-update: Play Store › profile › Settings › Network preferences › Auto-update apps › **Don't auto-update apps**.

If you already have a spare Google account, the session instead taps **Sign in** and **HANDS BACK** for the email, password and 2FA.

### 4. Install the 4 apps: always by package ID with `market://details`

Either run `bash scripts/device.sh install`, which loops over the IDs, or open each listing by hand:

```bash
for pkg in com.newai.ooc co.thewordlab.luzia com.janitor.ai com.aol.mobile.aolapp; do
  adb shell am start -a android.intent.action.VIEW -d "market://details?id=$pkg"
  # session: confirm the listing title matches, tap "Install", wait until `adb shell pm list packages $pkg` shows it
done
```

Expected listing titles:

| Package | Title |
|---|---|
| `com.newai.ooc` | OOC: The Playable Anime |
| `co.thewordlab.luzia` | Luzia: AI Assistant & Chat |
| `com.janitor.ai` | Janitor: Interactive Stories |
| `com.aol.mobile.aolapp` | AOL: Email News Weather |

If a listing says "not available in your country/device", stop and hand back. The fallback is `scripts/device.sh sideload`, which needs your decision.

After installing, run:

```bash
bash scripts/device.sh versions
bash scripts/device.sh pull-apks
bash scripts/device.sh snapshot-save fresh
```

### 5. Log in to each app

The session opens each app and taps through onboarding, cookie and consent screens, and "Continue with Google". It dismisses notification-permission prompts with **Don't allow**.

| App | What the session does | HAND BACK |
|---|---|---|
| OOC | taps Google sign-in | the Google account picker or consent, if it asks for a password or confirmation |
| Janitor | taps Google sign-in, then turns **Safe Mode / restricted content ON** in settings | the same as OOC; age prompts |
| Luzia | continues as a guest, or with limited access if offered | nothing, unless a phone number is required |
| AOL | taps sign-in | the AOL/Yahoo credentials and any password. You can also choose to skip and stay on the news home. |

Then run `bash scripts/device.sh snapshot-save simula_ready`.

### 6. Check

1. `npm run doctor` must list the emulator and mobile-mcp's tools.
2. Set `ANTHROPIC_API_KEY` in `.env`.
3. Run `npm run probe -- --app ooc` for the go/no-go check.

---

**Rules for the session:**
- Only one thing may talk to the device's accessibility service at a time. Don't run `device.sh dump` while `npm run explore` is running.
- Never act inside Google Play billing (`com.android.vending`) beyond reading prices.
- Never tap ads.
