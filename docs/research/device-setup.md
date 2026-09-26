# Device setup: running OOC, JanitorAI, Luzia and AOL under automation

Researched 2026-09-25. Target machine: macOS on Apple Silicon.
Companion script: `research/simula-device.sh`. It was tested under bash 3.2 (the macOS default) against a stub `adb`, including dry runs of split selection on the real app bundles. It has not been run against a live emulator yet.

## TL;DR

- **Use Android, not iOS.** The iOS Simulator cannot install App Store apps (section 1). All four apps are on Google Play.
- **Image:** `system-images;android-35;google_apis_playstore;arm64-v8a` (Android 15, Google Play, arm64).
- **AVD:** Pixel 8 profile: 1080×2400 px at 420 dpi, density 2.625, about 411×914 dp.
- **Emulator flags:** `-feature -Vulkan` so named snapshots work, `-no-boot-anim -no-audio`, and a fixed timezone.
- **Accounts:** sign into Play with a **dedicated adult US Google test account**. Install from Play. "Continue with Google" then covers OOC, Janitor, Luzia (optional) and AOL.
- **Prep after every boot:** animations off, stay awake, IME hidden, autofill and spellcheck off, light mode, demo-mode status bar (fixed 09:41, full battery), fixed GPS. Run `./simula-device.sh prep`.
- **Saving state:** do onboarding captures first, then log in, then `snapshot-save simula_ready`. Every exploration run starts from `snapshot-load simula_ready`, which gives a reproducible start state.
- **Verified packages:** `com.newai.ooc`, `com.janitor.ai` (official; watch for the copycat `com.janitoraichat.app`), `co.thewordlab.luzia`, `com.aol.mobile.aolapp`.
- **Frameworks, from static analysis of the actual APKs:**
  - OOC and Janitor: React Native (Hermes, new architecture) with react-native-skia.
  - Luzia: native Kotlin with Jetpack Compose.
  - AOL: native (Yahoo Mail codebase), with WebViews.
  - No Flutter among the four.
- **Biggest automation risks, all mitigated below:**
  1. `uiautomator dump` fails with "could not get idle state" on streaming chat and typing indicators.
  2. Canvases drawn with Skia or in WebViews are missing from the accessibility tree.
  3. Firebase App Check and Play Integrity are present in Luzia and Janitor. If they are enforced, the emulator could be refused. The fallback is a physical Android phone over USB, with identical tooling.
- **Setup time:** about 45–60 minutes, most of it downloads (image about 1.7 GB, emulator about 300 MB, apps about 500 MB). Disk: about 10–15 GB.

---

## 1. Can the iOS Simulator install App Store apps? No.

- **Different binary platform.** The Simulator runs `.app` bundles built for the *iphonesimulator* platform. `xcrun simctl install` only accepts those; it does not take `.ipa` files. App Store IPAs are *device* builds: their Mach-O is tagged with the iOS device platform, not the simulator one.
- **Encryption and no store.** Store binaries are FairPlay-encrypted, and the Simulator has no App Store app. Apple Silicon shares the arm64 instruction set with iPhones, but that does not help: the platform tag and the encryption still block installation. MacinCloud's support article puts it plainly: "you cannot install apps that exist on the App Store onto the iOS Simulator". The Apple developer forums say the same.
- **Workarounds are not viable here.** Decrypting an IPA on a jailbroken phone and patching the platform tag is fragile, legally grey, and not reproducible by reviewers.
- **The real iOS alternatives are both heavier:**
  - A physical iPhone with WebDriverAgent. This needs Xcode and a signed WDA runner (free provisioning expires every 7 days); mobile-mcp supports it.
  - "iPhone & iPad apps on Mac". These run as macOS processes, not in the Simulator. Developers can opt out, and mobile-mcp has no support.
- **Decision: Android emulator.** Nothing is lost, because all four apps ship on Android. OOC and Janitor are React Native, so their Android UI is essentially their iOS UI. Say in the recording that the mocks reflect the Android builds.

## 2. Emulator configuration and why

| Choice | Value | Why |
|---|---|---|
| System image | `system-images;android-35;google_apis_playstore;arm64-v8a` | Play Store images for arm64 exist at API 28–37 (checked in Google's `sys-img2-4.xml` manifest). **API 37:** Google's troubleshooting page (updated 2026-07-30) warns that "unpatched Android 17 virtual devices may fail to log into Google Accounts" since 2026-06-16. The fix is revision 5 or later, but it is not worth the risk in a 48-hour sprint. **API 35:** the most battle-tested with uiautomator and mobile-mcp, and every app supports it (min SDK 24 or 26, target 34–36). **Fallback:** API 34. Skip the `_ps16k` (16 KB page) variants: they add nothing here. |
| Why a Play image | `google_apis_playstore` | Play Store sign-in, Play-installed apps, Google Sign-In through GMS and Credential Manager, and Play Billing sheets. The trade-off: it is a production ("user") build, so **`adb root` is unavailable**. Nothing below needs root. |
| Device profile | `pixel_8` (identical to `pixel_7` for our purposes) | 1080×2400 px at 420 dpi, about 411×914 dp: a typical modern phone viewport. Checked against `nexus.xml` in cmdline-tools 23. |
| RAM / disk | `hw.ramSize=4096`, `disk.dataPartition.size=16G` | Four apps plus Play services updates. The default 6 GB data partition gets tight. |
| Keyboard | `hw.keyboard=yes` plus `show_ime_with_hard_keyboard=0` | Typing through adb still works, and the soft keyboard stops covering half the screen and shifting layouts. Set it to 1 temporarily if you want keyboard-open states for the mock. |
| GPU | `-gpu host -feature -Vulkan` | Hardware rendering through MoltenVK. Google documents that snapshots are unsupported when Vulkan is active. Apps fall back to GLES. On glitches, set `GPU_MODE=swiftshader_indirect`. |
| Boot | quick boot by default, `COLD=1` → `-no-snapshot-load`, `FROM_SNAPSHOT=x` → `-snapshot x -no-snapshot-save` | A cold boot takes 1–3 minutes. Named snapshots restore in seconds, exactly. |
| Tooling versions (Sept 2026) | cmdline-tools 23.0 (`commandlinetools-mac_arm64-16111833_latest.zip`), platform-tools 37.0.1, emulator 37.1.11 (stable) | Taken from `repository2-3.xml`. cmdline-tools 23 also bundles Google's new **Android CLI** (`android`); it helps with idle-state problems (section 5). |

Raw commands, if you want to see or explain each step (the script wraps these):

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
sdkmanager --install "platform-tools" "emulator" "system-images;android-35;google_apis_playstore;arm64-v8a"
avdmanager create avd -n simula_pixel_8_api35 -k "system-images;android-35;google_apis_playstore;arm64-v8a" -d pixel_8 <<< no
emulator -avd simula_pixel_8_api35 -no-snapshot-load -no-boot-anim -no-audio -gpu host -feature -Vulkan -timezone America/Los_Angeles &
adb wait-for-device; until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 2; done
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
adb shell svc power stayon true
adb shell settings put system screen_off_timeout 2147483647
```

## 3. Installing the apps

### 3a. Play Store (preferred)

1. Boot, open the Play Store, and sign in with the **test** Google account. Do not use a personal account: screenshots containing your name, email and avatar go to the LLM and into the deliverables.
2. Wait about 3–5 minutes on first boot for the "Google Play services updating" step. Then run `./simula-device.sh install`. It opens `market://details?id=<pkg>` for each app, waits until you tap Install, grants `POST_NOTIFICATIONS`, and logs the version.
3. **Turn off Play auto-update** (Play Store → profile → Settings → Network preferences → Auto-update apps → Don't auto-update). Versions then stay fixed for the whole take-home. Record them with `./simula-device.sh versions`, which prints JSON lines with versionName, versionCode, installer and API, ready to embed in the product model's provenance.
4. Archive the exact builds with `./simula-device.sh pull-apks ./artifacts/apks`. It runs `adb shell pm path`, then `adb pull` on each split. Git-ignore that folder. The pulled files let you reinstall the same version after a wipe (with `sideload` on the directory), and you can mine them for fonts and assets (section 5).

### 3b. Sideloading (fallback: region blocks, no Play login, or pinning an older version)

- **Split-APK installs.** Most apps now ship as split APKs: a `base.apk` plus config splits for ABI, density and language. Install them together:
  `adb install-multiple -r base.apk split_config.arm64_v8a.apk split_config.xxhdpi.apk split_config.en.apk`
- **XAPK / APKS / APKM bundles.** These are zips of the same splits. APKPure uses the naming `com.x.apk` + `config.*.apk`; APKMirror uses `base.apk` + `split_config.*.apk`. XAPKs may include `Android/obb/<pkg>/`, which goes to `/sdcard/Android/obb/<pkg>/`. `./simula-device.sh sideload <file|dir>` unzips the bundle, keeps the base plus all density and language splits plus **only the device-ABI split**, then runs `install-multiple` and pushes any OBBs.
- **Critical Apple Silicon pitfall.** M-series CPUs cannot execute 32-bit ARM code, so the arm64 image has no `armeabi-v7a` support. Mirrors often serve an armeabi-v7a-only variant. The APKPure XAPKs I downloaded for OOC and Janitor were exactly that. Such a bundle fails with `INSTALL_FAILED_NO_MATCHING_ABIS` or crashes when its native libraries load. The script refuses these bundles with an explanation. Pick the arm64-v8a variant (APKCombo lists it), or pull the splits from a device.
- **Optional install flags.**
  - `GRANT_ALL=1` adds `-g`, which grants every runtime permission. It is off by default: the brief says to record permission prompts and move on, and pre-granting hides them.
  - `SPOOF_INSTALLER=1` adds `-i com.android.vending`, for apps that check that the installer is the Play Store.
- **Mirror trust.** Sideloaded APKs from mirrors keep the developer's signature (Android refuses mismatched updates), but they are third-party files. Prefer Play, or pull from a Play-installed device.

## 4. The four apps: verified facts

Sources:
- **Play listing data:** each listing fetched on 2026-09-25 with `hl=en_US&gl=US`.
- **Framework, SDKs and login methods:** from static analysis of the current APKs downloaded from APKCombo/APKPure. I inspected native libraries, DEX class names, the React Native bundle, and `resources.arsc` strings.
- **Other sources:** Exodus Privacy reports for permissions and trackers.

Static findings show that code *exists*. Confirm the behaviour in the app.

### OOC: The Playable Anime (ooc.ai)

- **Play facts:** `com.newai.ooc`, developer "OOC". 1M+ downloads, 4.2★ (23.7K reviews). Rated Teen. No ads label; the description says "Ad-Free Immersion". In-app purchases $0.99–$599.99 per item. Updated Sep 17 2026, version 0.1.20 (code 531). Min SDK 24, target SDK 36.
- **Framework:** React Native (Hermes, new architecture) with react-native-skia, Reanimated and Nitro IAP. It also ships an **OTA JS updater (hot-updater)**, so the UI can change without a Play version bump.
- **Login:** Google Sign-In and the Facebook Login SDK are present. Apple Sign-In is iOS-only; the bundle contains "Sign in with AppleAuth is not supported on the device".
- **Without an account:** partly. The bundle has guest screens (`GuestStackNavigator`, `GuestCharacterChatScreen`, guest chat models). Signing up gives 500 credits, and a third-party review reports a daily check-in worth about 300. OOC's help center confirms that free credits come from Daily Check-in and Challenges, that they expire after 30 days, and that there is a "Refill Credits Now!" tab behind the credit icon. Credits are consumed per message; the Play "What's new" says "messages still cost Credits". The Basic model in Character Mode is free.
- **Region / notes:** the US listing is live and ranked "#2 top grossing books & reference". Fonts are Inter and Lora, both OFL-licensed Google Fonts.

### Janitor: Interactive Stories (janitorai.com)

- **Play facts:** `com.janitor.ai`, developer "janitorai". **The official app per help.janitorai.com**; ignore the copycat "Janitor AI - AI GirlFriend" (`com.janitoraichat.app`). 1M+ downloads, 4.5★ (17.1K). **Mature 17+.** No ads. In-app purchases $3.99–$59.99. Updated Sep 14 2026, version 2.5.0 (code 136, labelled "beta"). Min SDK 24, target SDK 36.
- **Framework:** React Native (Hermes, new architecture) with react-native-skia, Reanimated and RevenueCat (subscriptions). It includes **Firebase App Check** (with debug-provider classes), the Play Integrity API and **Play Age Signals** (`libplayagerangedeclaration.so`), plus CodePush-style OTA strings.
- **Login:** Google, Discord, Apple, email OTP and passkeys, based on bundle strings (`DiscordSignIn`, `checkEmailOtpSheet`, `VerifyOTP`, `startPasskeyAuthentication`).
- **Without an account:** **browse only.** Guest state exists (`isGuest`, `GUEST_CHARACTER_LOGIN_CONFIG`, `LoginRequired`), and sending a message needs sign-in.
- **Region / notes:**
  - The app runs in Safe Mode; NSFW can only be toggled on the website. Leave it off, since screenshots end up in deliverables.
  - Age Signals may put up an age gate in US states with app-store age laws.
  - Use an adult Google account.
  - It bundles many user-selectable chat fonts.

### Luzia: AI Assistant & Chat (luzia.com)

- **Play facts:** `co.thewordlab.luzia`, developer FACTORIA ELCANO SL. 10M+ downloads, 4.2★ (149K). Rated Everyone. **Contains ads** and in-app purchases ($1.99–$39.99). On iOS the tiers are Luzia+ Weekly $1.99, Monthly $4.99 and Annual $39.99. Updated Sep 18 2026, version 5.44.0 (code 631). Min SDK 26, target SDK 36.
- **Framework:** native Kotlin with **Jetpack Compose**. SDKs include RevenueCat, Google Mobile Ads, CleverTap, Amplitude, AppsFlyer, the Firebase App Check registrar, Play Integrity, and on-device LiteRT models. It registers the Android 14 screenshot-detection callback.
- **Login:** "Continue with Google" or **phone-number sign-up** (SMS code).
- **Without an account:** **yes.** "Continue with limited access", and the listing says "no account needed". Luzia+ requires an account ("To enjoy Luzia+ you need to create an account first").
- **Region / notes:**
  - It is a Spain/LatAm-first product: its phone hint is Brazilian ("(11) 90000-0000"). The US listing is live.
  - Strings show daily, weekly, image and "Bestie" limits, plus "Upgrade to Luzia+ for distraction-free conversations", meaning ads today.
  - It requests location, microphone, camera, notification and Bluetooth permissions, plus "draw over other apps" (`SYSTEM_ALERT_WINDOW`).
  - Font: Plus Jakarta Sans (OFL).
  - Simula's reference slides are Luzia.

### AOL: Email News Weather (aol.com)

- **Play facts:** `com.aol.mobile.aolapp`, developer AOL Media LLC. 10M+ downloads, 4.1★ (186K). Rated Everyone 10+. **Contains ads** and in-app purchases ($1.99–$99.99; AOL Mail Plus and ad-free tiers). Updated Aug 20 2026, version "varies" (7.80.3 to 7.81.0), target SDK 34.
- **Framework:** native, built on the **Yahoo Mail codebase** (`com.yahoo`, `com.oath`) with some Compose. **WebViews** render mail bodies and articles, and Custom Tabs open links. Ad SDKs: AdMob, Prebid, Taboola, IAB OM and Verizon Ads. Play Integrity and the screenshot callback are present.
- **Login:** "Sign in with AOL" or "Sign in with Google". Creating an AOL account on the web usually needs phone verification.
- **Without an account:** **probably not.** It contains "Sign in to use this app", so expect a sign-in wall.
- **Region / notes:**
  - AOL Mail Plus is US-only.
  - **AdMob treats emulators as test devices automatically**, so ad slots will show "Test Ad" creatives or fill differently. Record the *placement*, not the creative.
  - It requests contacts, location, camera, media and notification permissions.
  - Fonts: GT America and Yahoo Sans (commercial fonts, so use look-alikes in mocks).

**Choosing the app to go deep on, seen from the device side:**
- **Luzia is the most automation-friendly.** No login is needed, and native Compose gives a text-rich accessibility tree. It has explicit limits, ads and a subscription, so there are rewarded-ad anchors. Reviewers can also compare it against their own Luzia slides.
- **OOC is the richest rewarded-economics story.** It is credit-based, has daily check-in, and is ad-free today. The costs: Skia canvases and an OTA-updated UI.
- **Janitor and AOL are the breadth runs.** Both need login, and AOL is WebView-heavy.

## 5. Automation pitfalls and mitigations

| Pitfall | What happens | Mitigation |
|---|---|---|
| **`uiautomator dump`: "ERROR: could not get idle state."** | The accessibility dump waits for the UI thread to go idle. Streaming LLM replies, typing dots, Lottie animations and video never idle. mobile-mcp's legacy adb robot only retries on "null root node" and then parses the error text as XML. Upstream issue mobile-next/mobilewright#117 documents exactly this. | (1) Animations off (prep). (2) Retry with `uiautomator dump --compressed`, which works while animating but drops nodes that are not important for accessibility; `./simula-device.sh dump` does this. (3) Google's Android CLI in cmdline-tools 23 offers `android layout --no-idle --full --flat`, which returns JSON without waiting for idle. (4) Always keep the screenshot, so a state is never empty. |
| **Streaming chat never "settles"** (OOC, Janitor, Luzia) | The agent reads a half-written reply as the final state, and diffs are noisy. | Settle detection: poll the dump or a screenshot hash about every 700 ms. "Settled" means two identical consecutive samples, with a 3 s cap after a tap and a 25 s cap after sending a chat message. Mask message-body text when diffing states in the QA loop, because it is nondeterministic. |
| **Animations** | Screens are still mid-transition when captured. | Set all three scales to 0: `adb shell settings put global window_animation_scale 0` (also `transition_animation_scale` and `animator_duration_scale`). React Native Reanimated and Compose animations still run, because they ignore or partly honour the scale, so settle detection is still needed. |
| **Status-bar noise in screenshot diffs** | The clock, battery and notification icons change between runs. | SystemUI demo mode (in prep): fixed 09:41, 100% battery, full Wi-Fi, no notification icons. `demo-off` exits it. |
| **Screen sleeps or locks** | Black screenshots and failed dumps partway through a run. | `svc power stayon true`, a very long `screen_off_timeout`, `locksettings set-disabled true`, `KEYCODE_WAKEUP`, `wm dismiss-keyguard`. |
| **Soft keyboard** | The IME covers content, shifts layout, and Gboard tips pop up. | `hw.keyboard=yes` plus `show_ime_with_hard_keyboard=0`. Type with `adb shell input text` (spaces must be escaped; mobile-mcp handles that for ASCII). **Non-ASCII text** (accents, emoji; relevant for Luzia's Spanish or Portuguese users) needs mobile-next DeviceKit (clipboard paste) or ADBKeyboard. |
| **Autofill and spellcheck popups** | "Save password?" and autofill chips appear over the app UI. | `settings put secure autofill_service null` and `spell_checker_enabled 0`. |
| **Permission dialogs** | A `com.google.android.permissioncontroller` window takes focus. | Pre-grant only notifications: `adb shell pm grant <pkg> android.permission.POST_NOTIFICATIONS` (API 33+), because the first-launch prompt blocks onboarding. Leave the rest to a deterministic guard: when the foreground package is the permission controller, record `{trigger, permission}` and tap "Don't allow". Alternatives: install with `-g` (grant all), `pm grant` or `pm revoke` per permission, and `appops set <pkg> SYSTEM_ALERT_WINDOW allow`. **Never use `pm reset-permissions`**: it resets every app. |
| **Leaving the app** | Camera, pickers, Chrome, Play Billing, the Google account sheet, OS settings. | Check the foreground package after every action (`./simula-device.sh fg`, or mobile-mcp `mobile_get_foreground_app`). Treat these as "external" and record the edge: `com.google.android.permissioncontroller`, `com.google.android.gms` / `com.android.credentialmanager` (account picker, Sign in with Google), `com.android.vending` (billing sheet, in-app review, Play page), `com.android.chrome` (Custom Tabs or browser), `com.google.android.providers.media.module` / `com.google.android.documentsui` (photo and file pickers), `com.android.camera2`, `com.android.settings`, `…nexuslauncher` (the app closed or crashed), and `android` (ANR or crash dialog: tap "Wait" or "Close app" and log it). Recover with BACK, or relaunch through `monkey -p <pkg> -c android.intent.category.LAUNCHER 1`. **Never complete a purchase.** The test account has no payment method, so the billing sheet is a terminal node. |
| **Gesture navigation** | A swipe starting in the bottom ~48 px goes Home; one from the left or right edge triggers Back. | Keep swipe start and end points more than 10% away from the screen edges. Use `input keyevent KEYCODE_BACK` for Back. Optional: switch to three-button navigation with `adb shell cmd overlay enable com.android.internal.systemui.navbar.threebutton`. |
| **React Native accessibility trees** (OOC, Janitor) | `resource-id` is usually empty (only set when developers use `testID`). A tappable card is one `android.view.ViewGroup` whose children's text is merged into `content-desc`. Icon-only buttons often have no label at all. | Build element identity from class + text + content-desc + bounds, never from IDs. Read `content-desc` as seriously as `text`. When unlabeled clickable nodes exist, fall back to vision (a crop of the screenshot at those bounds). |
| **Skia canvases** (both React Native apps ship react-native-skia) | Content drawn on a canvas is invisible in the accessibility tree. | Use vision on the screenshot. `android screen capture --annotate` in cmdline-tools 23 does computer-vision element detection and gives candidate boxes to tap. |
| **Compose trees** (Luzia, parts of AOL) | Merged semantics: a clickable row exposes its merged text. `testTag` is not exposed as `resource-id` unless the app opts in. | Same identity strategy. Compose text is usually rich, so this is the easiest of the four apps. |
| **WebView content** (AOL mail bodies and articles; small WebView use in the others) | The WebView's accessibility subtree may be empty on the first dump and fill in on later ones. Release builds do not enable WebView debugging, so there is no Chrome DevTools access. | Re-dump once if a `WebView` node has no children. Treat the WebView as one "web content" region and describe it from the screenshot. Mock it as static content. |
| **Flutter** (not used by any of the four) | The semantics tree is sparse until accessibility is active, with few IDs. | Not needed here. The same vision fallback applies. |
| **FLAG_SECURE (black screenshots)** | `screencap` returns black for secure windows. | Static check: none of the four bundles a screen-protection library (no expo-screen-capture or screenshot-prevent modules). Luzia and AOL register Android 14 `ScreenCaptureCallback`, which only *detects* screenshots and by design ignores `adb screencap`. If a screen does come back black: first try the host-side capture `adb emu screenrecord screenshot <dir>` (`./simula-device.sh shot-host`), which reads the emulator's own display. This is unverified for secure layers, so test it. Otherwise record the state as tree-only with a `screenshot_unavailable` flag. No root or LSPosed bypasses. |
| **Emulator detection, Play Integrity, App Check** | All four contain emulator heuristics or the Play Integrity client. Specifically: `react-native-device-info` `isEmulator` in OOC and Janitor; AdMob's `ranchu` check in AOL; Firebase App Check in Janitor and Luzia. If a backend *enforces* device integrity, the emulator gets errors (sign-in loops, 401/403, "device not supported"). | Test in the first hour: log in and send one message in each app. Watch `adb logcat` or mobile-mcp `mobile_get_device_logs` for integrity or app-check errors. **Fallback ladder:** (1) try the API 34 image; (2) use a **physical Android phone** with USB debugging on, which works identically with adb, mobile-mcp and these scripts (set `ANDROID_SERIAL`); (3) mark the app as blocked in the trajectory. Do not spoof. |
| **Ads on the emulator** (AOL, Luzia) | AdMob auto-enables test mode on emulators, so creatives are test ads or empty fills. | Model the ad **slot** (position, size, format, frequency), not the creative. Say so in the product model. |
| **OTA JavaScript updates** (OOC hot-updater, Janitor CodePush-style) | The UI can change without a new versionCode. | Store versionName, versionCode and the capture date with every product model. This also matters for Goal 5: re-exploration triggers cannot rely on Play versions alone. |
| **Play auto-update** | The app updates during exploration, so the product model mixes versions. | Turn auto-update off (section 3a) and record `versions`. |
| **Usage limits and credits** | Exploration burns daily limits and credits (Luzia daily and weekly limits, OOC credits). | Hitting the limit is a *goal*, since it is the key monetization state. Snapshot before sending messages, deliberately exhaust the limit once, capture the paywall or limit screens, then restore the snapshot. Cap messages per run otherwise. |
| **Onboarding is only shown once** | After login you cannot see first-run flows again. | Explore onboarding **first**, before logging in. `adb shell pm clear <pkg>` resets an app to first-run later (it logs you out). Keep a `fresh` snapshot. |
| **Two adb binaries** (Homebrew plus the SDK) | "adb server version doesn't match", and the adb server keeps restarting. | Keep only the SDK's platform-tools on PATH. `setup` and `doctor` warn about duplicates. |
| **Multiple devices** | `adb` fails with "more than one device". | `export ANDROID_SERIAL=emulator-5554`. mobile-mcp tools take an explicit `device` argument anyway. |
| **Screenshot size and cost** | A full-resolution 1080×2400 PNG is heavy for the model. mobile-mcp's `mobile_take_screenshot` defaults to a 1024 px-max JPEG at quality 75. | Send the model a downscaled image (for example 540×1200; roughly width×height/750 tokens, so check the current vision docs) and map coordinates back. Keep the **full-resolution PNG** (`adb exec-out screencap -p`, or `mobile_save_screenshot` without `maxSize`) for asset crops, colour sampling and QA diffs. |

**Fonts and assets for mock fidelity.** The pulled APKs contain the real type:
- OOC: Inter and Lora.
- Luzia: Plus Jakarta Sans.
- AOL: GT America and Yahoo Sans.
- Janitor: many chat fonts.

Inter, Lora and Plus Jakarta Sans are free Google Fonts, so use those by name in mocks. Use look-alikes for the commercial fonts; do not redistribute them. Icons and images are best cropped from full-resolution screenshots using node bounds, with pixel sampling for colours. Convert pixels to dp by dividing by 2.625 on this AVD.

## 6. mobile-mcp specifics (v1.0.5, published 2026-09-23)

- **Install and config:** `npx -y @mobilenext/mobile-mcp@1.0.5` (Node 20 or newer). Pin the version. `./simula-device.sh mcp-config` prints:
  `{"mcpServers":{"mobile":{"command":"npx","args":["-y","@mobilenext/mobile-mcp@1.0.5"],"env":{"ANDROID_HOME":"…","MOBILEMCP_DISABLE_TELEMETRY":"1"}}}}`
  `MOBILEMCP_DISABLE_TELEMETRY=1` turns off its PostHog and Scarf pings.
- **Two back-ends.** By default it drives devices through **mobilecli**, a Go binary pulled from npm as `@mobilenext/mobilecli-darwin-arm64`. mobilecli runs a device-side server and falls back to uiautomator. Setting `MOBILEMCP_LEGACY_ROBOT=1` switches to the plain-adb robot (`uiautomator dump`, `screencap`, `input`); that mode has no tap-by-ref.
- **Tools:**
  - Devices: `mobile_list_available_devices`.
  - Apps: `mobile_list_apps`, `mobile_get_foreground_app`, `mobile_launch_app`, `mobile_terminate_app`, `mobile_install_app`, `mobile_uninstall_app`.
  - Screen: `mobile_get_screen_size`, `mobile_list_elements_on_screen` (returns `@eN` refs, text or JSON), `mobile_take_screenshot`, `mobile_save_screenshot`, `mobile_start_screen_recording`, `mobile_stop_screen_recording`.
  - Input: `mobile_click_on_screen_at_coordinates` (x,y or `ref`), `mobile_double_tap_on_screen`, `mobile_long_press_on_screen_at_coordinates`, `mobile_swipe_on_screen`, `mobile_type_keys`, `mobile_press_button` (BACK, HOME, ENTER, …), `mobile_open_url`.
  - Device state: `mobile_set_orientation`, `mobile_get_orientation`, `mobile_set_location`, `mobile_clipboard`, `mobile_get_device_logs`, `mobile_list_crashes`, `mobile_get_crash`.
  - `mobile_batch_commands`.
  - Ignore the `*_remote_*` cloud tools.
- **Gap for this assignment.** `mobile_list_elements_on_screen` returns a flattened, *filtered* list: nodes with text, label, hint, id or checkable, plus bounds. It drops containers and hierarchy, which the mock generator needs.
- **Recommended split, which also answers the brief's "deterministic vs model-driven" question:**
  - **Actions:** the agent calls mobile-mcp tools.
  - **State capture:** a deterministic TypeScript helper that shells out to adb after each action. It takes the full `uiautomator dump`, falls back to `--compressed`, and falls back again to `android layout --no-idle`. It also saves the full-resolution screenshot, the foreground package and activity, and runs the settle check. All of that goes into the product model with a content hash.

## 7. The script

The full file is `research/simula-device.sh`. Copy it to `scripts/device.sh` in the repo and `chmod +x` it. It works with macOS's bash 3.2 and does not delete an existing AVD. Summary:

```bash
./scripts/device.sh setup          # JDK 17+ check (uses Android Studio's bundled JDK if present), cmdline-tools 23,
                                   # platform-tools, emulator, the API 35 Play arm64 image, then creates and tunes the AVD
./scripts/device.sh boot           # emulator with -feature -Vulkan, waits for sys.boot_completed + package manager, then prep
COLD=1 ./scripts/device.sh boot    # cold boot
FROM_SNAPSHOT=simula_ready ./scripts/device.sh boot   # boot straight into the saved state without overwriting it
./scripts/device.sh prep           # animations 0, stay awake, unlock, IME hidden, autofill/spellcheck off, light mode,
                                   # fixed GPS (San Francisco), demo-mode status bar
./scripts/device.sh install        # Play Store page per app, waits for the install, grants notifications, logs versions
./scripts/device.sh sideload X     # .apk/.xapk/.apks/.apkm/dir; keeps arm64 splits only; refuses v7a-only bundles
./scripts/device.sh versions       # JSON-lines provenance
./scripts/device.sh pull-apks      # archive the installed splits to ./artifacts/apks/<pkg>/<version>/
./scripts/device.sh snapshot-save [name] / snapshot-load [name]   # adb emu avd snapshot save|load
./scripts/device.sh fg | dump | shot [f] | shot-host [dir] | demo-off | doctor | mcp-config
```

The core of `setup` and `prep`, if you want to paste it by hand instead:

```bash
#!/usr/bin/env bash
# Save as setup.sh and run: bash setup.sh   (pasting 'set -e' into an interactive zsh closes the terminal on the first error)
set -euo pipefail
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
IMG="system-images;android-35;google_apis_playstore;arm64-v8a"; AVD=simula_pixel_8_api35
java -version >/dev/null 2>&1 || { echo "Install a JDK 17+: brew install --cask temurin@21"; exit 1; }
if [ ! -x "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]; then
  mkdir -p "$ANDROID_HOME/cmdline-tools"; tmp=$(mktemp -d)
  curl -fL -o "$tmp/clt.zip" https://dl.google.com/android/repository/commandlinetools-mac_arm64-16111833_latest.zip
  unzip -q "$tmp/clt.zip" -d "$tmp" && mv "$tmp/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
fi
sdkmanager --licenses < <(yes) >/dev/null || true
sdkmanager --install "platform-tools" "emulator" "$IMG" < <(yes)
avdmanager list avd -c | grep -x "$AVD" >/dev/null || avdmanager create avd -n "$AVD" -k "$IMG" -d pixel_8 <<< no
CFG="$HOME/.android/avd/$AVD.avd/config.ini"
for kv in hw.keyboard=yes hw.ramSize=4096 disk.dataPartition.size=16G hw.gpu.enabled=yes hw.gpu.mode=host; do
  k=${kv%%=*}; { grep -v "^$k=" "$CFG" || true; echo "$kv"; } > "$CFG.tmp" && mv "$CFG.tmp" "$CFG"
done
nohup emulator -avd "$AVD" -no-boot-anim -no-audio -gpu host -feature -Vulkan -timezone America/Los_Angeles >/tmp/emu.log 2>&1 &
until [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ]; do sleep 2; done
for k in window_animation_scale transition_animation_scale animator_duration_scale; do adb shell settings put global $k 0; done
adb shell svc power stayon true; adb shell settings put system screen_off_timeout 2147483647
adb shell locksettings set-disabled true || true; adb shell input keyevent KEYCODE_WAKEUP; adb shell wm dismiss-keyguard || true
adb shell settings put secure show_ime_with_hard_keyboard 0
adb shell settings put secure autofill_service null; adb shell settings put secure spell_checker_enabled 0
adb shell cmd uimode night no; adb emu geo fix -122.4194 37.7749
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
```

## 8. Install and login checklist (do this in the first 1–2 hours)

**Once:**
- [ ] Create a **dedicated Google account**: adult date of birth, US, with a phone attached so sign-in challenges pass. Optionally also a Discord account for Janitor.
- [ ] `./scripts/device.sh setup`, then `boot`. The emulator window appears. Complete any setup prompts.
- [ ] Open the Play Store and sign in with the test account. Let Play services update (about 5 minutes). If sign-in loops, you are probably on an unpatched API 37 image; this setup uses API 35.
- [ ] `./scripts/device.sh install`: tap Install on each of the four pages.
- [ ] Play Store settings → Auto-update apps → **Don't auto-update**.
- [ ] `./scripts/device.sh versions > artifacts/app-versions.jsonl` and `pull-apks`.
- [ ] `./scripts/device.sh snapshot-save fresh`. This is the state with all apps installed and none opened, and it is where onboarding captures start.

**Per app.** Run the explorer on onboarding *before* logging in, then log in:
- [ ] **Luzia** (`co.thewordlab.luzia`). No login needed; choose "Continue with limited access" first. Capture limit and upsell states. Later try "Continue with Google" to see logged-in states and Luzia+ screens. Deny or record the location, microphone and camera prompts.
- [ ] **OOC** (`com.newai.ooc`). Explore guest mode first. Then "Continue with Google" gives 500 credits; note the daily check-in. Record the credit balance before and after one message on a paid model. Leave one Basic-model Character Mode chat as the free path.
- [ ] **Janitor** (`com.janitor.ai`, the official one). Browse as guest, then sign in with Google (or Discord / email OTP). Expect an age or safe-mode gate. Keep NSFW off. If sign-in or chat fails, check logcat for App Check or Integrity errors.
- [ ] **AOL** (`com.aol.mobile.aolapp`). Expect "Sign in to use this app". Use "Sign in with Google", or an AOL account created on the web (phone verification). Deny contacts and location, or record them. Mail bodies and articles are WebViews, and ads are AdMob test fills.
- [ ] After all four are logged in: `./scripts/device.sh snapshot-save simula_ready`.
- [ ] **Smoke test:** `./scripts/device.sh doctor` (animations 0 0 0, Play present, 1 Google account, 4 versions). Then `dump` and `shot` on one screen of each app.
- [ ] **Early go/no-go** (under 2 hours in): in every app, one full action → capture → settle cycle through mobile-mcp works, and no integrity blocks appear. If an app is blocked, switch that app to a physical phone or drop it to a "shallow" run and note it in the trajectory.

**Snapshot caveat.** Snapshots hold auth tokens. After a long gap, a restored snapshot may be logged out because servers rotate refresh tokens; re-login and re-save. Snapshots cost about 4 GB or more each, so keep 2–4 of them.

## 9. Sources

- iOS: [MacinCloud – Installing apps on iOS Simulator](https://support.macincloud.com/support/solutions/articles/8000092700-installing-apps-on-ios-simulator), [Apple Developer Forums – installing .ipa on the simulator](https://developer.apple.com/forums/thread/132853), [Appium discuss – ipa to .app for the simulator](https://discuss.appium.io/t/convert-an-ipa-to-app-for-testing-with-iphone-simulator/41417)
- Emulator: [Google system-image manifest sys-img2-4.xml](https://dl.google.com/android/repository/sys-img/google_apis_playstore/sys-img2-4.xml), [repository2-3.xml](https://dl.google.com/android/repository/repository2-3.xml), [Emulator troubleshooting (API 37 GMS issue, MoltenVK, Vulkan snapshots)](https://developer.android.com/studio/run/emulator-troubleshooting), [Emulator command line](https://developer.android.com/studio/run/emulator-commandline), [Android CLI overview](https://developer.android.com/tools/agents/android-cli), [Emulator screenshots (screenrecord screenshot)](https://developer.android.com/studio/run/emulator-take-screenshots), [Apple Silicon emulator preview (no 32-bit ARM)](https://androidstudio.googleblog.com/2020/12/android-emulator-apple-silicon-preview.html?m=1)
- Apps (Play): [OOC](https://play.google.com/store/apps/details?id=com.newai.ooc&hl=en_US), [Janitor](https://play.google.com/store/apps/details?id=com.janitor.ai&hl=en_US), [Luzia](https://play.google.com/store/apps/details?id=co.thewordlab.luzia&hl=en_US), [AOL](https://play.google.com/store/apps/details?id=com.aol.mobile.aolapp&hl=en_US); [Janitor official-app FAQ](https://help.janitorai.com/en/article/faq-janitorai-app-xam5o9/), [Janitor download FAQ](https://help.janitorai.com/en/article/faq-how-do-i-download-the-janitor-mobile-app-1b3en2c/); [Luzia on the App Store (Luzia+ prices, no registration)](https://apps.apple.com/us/app/luzia-your-ai-assistant/id6472703434); [OOC credits guide (third-party)](https://www.isekaizero.ai/blog/ooc-the-playable-anime); [AOL Mail Plus overview](https://help.aol.com/articles/overview-of-aol-mail-plus); Exodus reports for [OOC](https://reports.exodus-privacy.eu.org/en/reports/com.newai.ooc/latest/), [Luzia](https://reports.exodus-privacy.eu.org/en/reports/co.thewordlab.luzia/latest/), [Janitor](https://reports.exodus-privacy.eu.org/en/reports/com.janitor.ai/latest/), [AOL](https://reports.exodus-privacy.eu.org/en/reports/com.aol.mobile.aolapp/latest/)
- Pitfalls: [mobilewright #117 – uiautomator dump fails on animation, use --compressed](https://github.com/mobile-next/mobilewright/issues/117), [Appium – could not detect idle state](https://github.com/appium/appium/issues/8929), [Android 14 screenshot detection (ignores adb)](https://developer.android.com/about/versions/14/features/screenshot-detection), [Play Integrity overview](https://developer.android.com/google/play/integrity/overview), [Firebase App Check with Play Integrity](https://firebase.google.com/docs/app-check/android/play-integrity-provider), [AdMob test ads (emulators are test devices)](https://developers.google.com/admob/android/test-ads)
- mobile-mcp: npm `@mobilenext/mobile-mcp@1.0.5`. Tool list and behaviour were read from the published `lib/server.js`, `lib/android.js` and `lib/mobilecli.js`.
