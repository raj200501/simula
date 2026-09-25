# Local device setup (run by a Claude session on your Mac)

This container can't run an Android emulator, so device setup happens on your Mac. Start a local
session in the repo folder (Claude Desktop app, or `claude remote-control` in a terminal inside
`simula/`) and paste the prompt below. The session does everything except the steps marked **YOU**.

Why Android: the iOS Simulator can't install App Store apps, so OOC/Janitor/Luzia/AOL can't run there.
The Android emulator with a Google Play system image can install them from the Play Store.

---

## Prompt for the local session

> Set up the Android emulator for this repo by following `docs/LOCAL_SETUP.md`, steps 1–6.
> Use `scripts/device.sh` for SDK/AVD/boot/prep. Use adb (or mobile-mcp) to drive the emulator for
> Play Store installs and app onboarding. Never tap purchase buttons, never add a payment method,
> never type passwords yourself — stop and ask me at every **YOU** step. Report the output of
> `scripts/device.sh versions` and `scripts/device.sh doctor` at the end.

---

## Steps

1. **Prerequisites.** Check that `java -version` reports 17 or later. If it doesn't, run `brew install --cask temurin@21`. Also check Node 22 and npm; then run `npm ci` and `npx playwright install chromium`.
2. **SDK and AVD.** Run `bash scripts/device.sh setup`. It downloads about 2 GB and creates the AVD `simula_pixel_8_api35` (Android 15, Google Play, arm64). Then add the two `export` lines it prints to `~/.zshrc`.
3. **Boot.** Run `bash scripts/device.sh boot`. The emulator window opens, and the script turns animations off, keeps the device awake and switches the status bar to demo mode.
4. **Google account on the device.**
   - **YOU:** create a fresh adult Google account in a desktop browser. It needs phone verification. Don't add a payment method.
   - The session opens the Play Store on the emulator and taps through to the sign-in screen.
   - **YOU:** type the email, the password and any 2FA code in the emulator window.
   - The session then turns off Play auto-update: Play Store › profile › Settings › Network preferences › Auto-update apps › Don't auto-update.
5. **Install the 4 apps.** Run `bash scripts/device.sh install`. The script opens each Play page, and the session taps **Install** and waits for it to finish:
   - `com.newai.ooc`
   - `co.thewordlab.luzia`
   - `com.janitor.ai`
   - `com.aol.mobile.aolapp`

   Then run `bash scripts/device.sh versions` and `bash scripts/device.sh pull-apks`, followed by `bash scripts/device.sh snapshot-save fresh`.
6. **Log in to each app.** The session opens the app and taps through onboarding, cookie and consent screens, and "Continue with Google". It dismisses notification-permission prompts with **Don't allow**.

   | App | What the session does | **YOU** |
   |---|---|---|
   | OOC | taps Google sign-in | confirm the Google account picker or consent |
   | Janitor | taps Google sign-in, then makes sure **Safe Mode / restricted content is ON** in settings | confirm the Google account picker or consent |
   | Luzia | continues as guest, or with limited access if offered | nothing |
   | AOL | taps sign-in | enter an AOL or Yahoo account, or skip and stay on the news home |

   Afterwards the session runs `bash scripts/device.sh snapshot-save simula_ready`.
7. **Check.** `npm run doctor` must list the emulator and mobile-mcp's tools. Then:
   - run `npm run probe -- --app ooc` for the go/no-go check;
   - set `ANTHROPIC_API_KEY` in `.env`.

**Rules for the session:**
- Only one thing may talk to the device's accessibility service at a time. Don't run `device.sh dump` while `npm run explore` is running.
- Never act inside Google Play billing (`com.android.vending`) beyond reading prices.
- Never tap ads.
