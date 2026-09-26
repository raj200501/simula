# mobile-mcp research report (ground truth from source, Sept 25 2026)

**Sources.** I ran `npm pack @mobilenext/mobile-mcp@latest` and read every file in `package/lib/*.js`. I installed it and ran it live over stdio with `@modelcontextprotocol/sdk@1.30.1`, which returned 32 tools; the full schemas are saved in `research/mobile-mcp/install/tools.json`. I also ran the bundled `mobilecli` binary (`--help` and its error paths), pulled strings from the `mobilecli.dex` embedded in that binary, and read the mobilecli Go sources at tag `1.0.13` (raw.githubusercontent.com).

**Not checked.** This container has no emulator, so I observed nothing on a real device. Anything marked *(inferred)* comes from reading code, not from running it.

Local files:
- `research/mobile-mcp/package/` holds the unpacked npm package.
- `research/mobile-mcp/install/` holds a working install, `smoke.mts`, `smoke2.mts` and `tools.json`.
- The typed client wrapper prototyped here became `src/device/mcp.ts`.

---

## 0. The facts that most affect our design

1. **Version 1.0.5 does not call adb/uiautomator itself by default.** Every device operation goes through **`mobilecli`**, a Go binary (v1.0.13) installed as an npm dependency. mobilecli talks to a **background daemon** (`~/.mobilecli/daemon.sock`). On Android that daemon pushes `/data/local/tmp/mobilecli.dex` and runs an **on-device JSON-RPC server** (`app_process`, class `com.mobilenext.mobilecli.DeviceServer`, which uses `UiAutomation`). If that server fails it falls back to `adb exec-out uiautomator dump /dev/tty` and `adb exec-out screencap -p`. Setting `MOBILEMCP_LEGACY_ROBOT=1` switches to the old pure-adb robot, which has fewer features (see §3.4).
2. **Android coordinates are device pixels everywhere:** element rects, taps, swipes and `mobile_get_screen_size` (= `adb shell wm size`, scale is always 1). **Screenshots are not 1:1.** `mobile_take_screenshot` defaults to **JPEG q75 with the longest side ≤ 1024 px**. It returns a text line with the multiplier before the image.
3. **Some failures do not set `isError`.** "Actionable" errors come back as plain text ending in `". Please fix the issue and try again."` with no `isError` flag. Only unexpected exceptions and zod validation errors set `isError: true`. `mobile_batch_commands` also never sets `isError` when individual steps fail. Our wrapper must parse the text.
4. **Element refs (`@e12`) are positional.** A tap by ref re-dumps the UI, renumbers it depth-first (pre-order) and taps the centre of whatever element has that number now. Nothing checks whether the screen changed. It also costs a second UI dump. **Tap by coordinates (rect centre) that we compute ourselves.**
5. **The element list is flattened and lossy.** mobile-mcp drops the tree structure (`children`), drops `placeholder` (Android hint text, e.g. "Message…") and never had `package`, `scrollable`, `clickable`, `password` or `visible`. It keeps `type`, `text`, `label`, `identifier`, `rect`, `focused`, `selected`, `checked` and `enabled:false`. For a richer layout tree, the same binary offers `mobilecli dump ui --format raw --device <id>` outside MCP.
6. **The server blocks.** It calls mobilecli with `execFileSync`, so one server handles one call at a time, and a hung call freezes the whole server. Only screenshots have a 30 s timeout; `dump ui`, tap and the rest have none. Set client-side request timeouts, and on timeout kill and respawn the server (and possibly `mobilecli daemon stop`).
7. **Deep links need `MOBILEMCP_ALLOW_UNSAFE_URLS=1`.** Without it, only `http(s)://` is accepted.
8. **`mobile_save_screenshot` path rule.** It only writes under the **server process's cwd** or `os.tmpdir()` (plus `/tmp` and `/private/tmp` on macOS). Set `cwd` when spawning.
9. **`StdioClientTransport` only passes `HOME, LOGNAME, PATH, SHELL, TERM, USER` by default.** Pass `ANDROID_HOME` explicitly if the SDK is not at `~/Library/Android/sdk`, and add `MOBILEMCP_DISABLE_TELEMETRY=1`. Telemetry (PostHog plus a scarf.sh pixel) is on by default.

---

## 1. Package, launch, transport, dependencies, env

| Item | Value |
|---|---|
| Package / version | `@mobilenext/mobile-mcp` **1.0.5** (npm `latest`, published 2026-09-23). Apache-2.0. `engines.node >=20`. |
| Bin | `mcp-server-mobile` → `lib/index.js` (CommonJS, compiled TS) |
| Server SDK | `@modelcontextprotocol/server` **2.0.0** (the new split v2 packages). It logs `mobile-mcp 1.0.5 (mcp sdk 2.0.0) server running on stdio`. It works with v1 **and** v2 clients; I tested both. |
| Launch (stdio, default) | `npx -y @mobilenext/mobile-mcp@latest` (optionally with `--stdio`). **Recommended:** pin it (`npm i @mobilenext/mobile-mcp@1.0.5`) and spawn `node <require.resolve("@mobilenext/mobile-mcp/lib/index.js")> --stdio`. This skips npx resolution on every run; the dependency tree is about 133 MB because `mobilewright` pulls in the `playwright` package, though no browsers are downloaded. |
| Other CLI flags | `--listen [host:]port` starts a **stateless Streamable HTTP** server on `/mcp` (POST only; GET and DELETE return 405; `/sse` returns 410). `--version`. |
| Transport | stdio by default. JSON-RPC goes to stdout; logs go to **stderr**, including every call's args and its full text response (`Invoking X with args…`, `=> …`). |
| mobilecli dependency | `mobile-mcp` → `mobilewright@0.0.60` → `@mobilewright/driver-mobilecli` → `mobilecli@1.0.13` → optional dependency `@mobilenext/mobilecli-darwin-arm64` (the binary). The path is resolved from `node_modules/@mobilenext/mobilecli-<os>-<arch>/…`. **Use npm, not pnpm** (pnpm's strict layout breaks the lookup), or set `MOBILECLI_PATH`. |
| Host dependencies, Android | Android SDK **platform-tools (`adb`)** and a running emulator that shows as `device` in `adb devices`. mobilecli finds adb via `$ANDROID_HOME/platform-tools/adb`, then `~/Library/Android/sdk/platform-tools/adb` on macOS, then `adb` on PATH. Offline AVDs are not returned by the list tool, so boot the emulator yourself (`emulator -avd X`, or `mobilecli device boot --device <avd>`). |
| Host dependencies, iOS | Xcode plus a booted simulator. For simulators, mobile-mcp runs `mobilecli agent status` and then `mobilecli agent install` automatically; this is mobilecli's own agent, not a manual WDA setup. Real iPhones need `mobilecli agent install --provisioning-profile`. In legacy mode, WDA must be listening on `localhost:8100`, plus go-ios for real devices. |
| mobilecli daemon | Started automatically by the first mobilecli command; socket, pid and log live in `~/.mobilecli/` (`daemon.sock`, `daemon.pid`, `daemon.log`). Device commands run inside the daemon. *(Inferred)* The daemon keeps the environment it was started with (for example `ANDROID_HOME`) and is reused across mobile-mcp restarts; reset it with `<mobilecli> daemon stop`. `daemon status` prints pid, socket and version. |

**Environment variables read by mobile-mcp**

| Var | Effect |
|---|---|
| `MOBILEMCP_DISABLE_TELEMETRY` (any non-empty value) | Turns off PostHog events (`launch`, `tool_invoked`, `tool_failed`) and the scarf.sh pixel. |
| `MOBILEMCP_ALLOW_UNSAFE_URLS=1` | Lets `mobile_open_url` accept non-http(s) schemes (deep links). |
| `MOBILEMCP_LEGACY_ROBOT=1` | Uses the legacy adb (`android.js`) and WDA robots for Android and real iOS. iOS simulators still use mobilecli. |
| `MOBILEMCP_AUTH` | Bearer token for `--listen` mode. |
| `MOBILECLI_PATH` | Overrides the mobilecli binary path. |
| `LOG_FILE` | Also appends the logs to this file. |
| `ANDROID_HOME` | Read by mobilecli, via the daemon, to locate adb. |

mobilecli also recognises `MOBILECLI_TOKEN`, `MOBILECLI_FLEET_URL` and `MOBILECLI_REMOTE_ONLY`; these are for the remote device fleet and we don't need them.

---

## 2. The 32 MCP tools (exact names, params, returns)

Every device tool needs `device: string`, the id from `mobile_list_available_devices` (e.g. `emulator-5554`). There is no implicit current device. Unless noted otherwise, results are **one text block** `{content:[{type:"text",text}]}`. Numbers use `z.coerce.number()`, so numeric strings are accepted. Taps round to integers.

| # | Tool | Params (`?` = optional) | Returns (text unless noted) |
|---|---|---|---|
| 1 | `mobile_list_available_devices` | – | JSON string `{"devices":[{id,name,platform:"android"\|"ios",type:"emulator"\|"simulator"\|"real",version,state:"online",…}]}`. Online devices only. |
| 2 | `mobile_login_to_cloud_provider` | – | Remote fleet; ignore. |
| 3 | `mobile_list_remote_devices` | – | Remote fleet; ignore. |
| 4 | `mobile_allocate_remote_device` | `platform`, `name?`, `version?[]`, `type?:"real"`, `wait?`, `timeoutSeconds?` | Remote fleet; ignore. |
| 5 | `mobile_release_remote_device` | `device` | Remote fleet; ignore. |
| 6 | `mobile_list_apps` | `device` | `"Found these apps on device: App Name (com.pkg), …"`. On Android, launchable apps only (MAIN/LAUNCHER). |
| 7 | `mobile_get_foreground_app` | `device` | `"Foreground app: App Name (com.pkg)"`. Android retries `dumpsys` focus for 5 s. Not available in legacy mode. |
| 8 | `mobile_launch_app` | `device`, `packageName`, `locale?` (e.g. `"fr-FR,en-GB"`) | `"Launched app <pkg>"`. Android resolves the launcher activity, then `am start --display 0 -n <component>`. |
| 9 | `mobile_terminate_app` | `device`, `packageName` | `"Terminated app <pkg>"`. Android uses `am force-stop`. |
| 10 | `mobile_install_app` | `device`, `path` (must be `.apk`/`.ipa`/`.zip`/`.app` and exist) | `"Installed app from <path>"`. Single APK only, no `.apks`/`.xapk`, so install the test apps from the Play Store on a Google Play emulator image. |
| 11 | `mobile_uninstall_app` | `device`, `bundle_id` | `"Uninstalled app <id>"` |
| 12 | `mobile_get_screen_size` | `device` | `"Screen size is 1080x2400 pixels"`. On Android this is `wm size` (the override size if one is set); on iOS it is in points. |
| 13 | `mobile_click_on_screen_at_coordinates` | `device`, `x?`≥0, `y?`≥0, `ref?` (`"@e5"`; takes precedence over x,y) | `"Clicked on screen at coordinates: x, y"` or `"Clicked on element @e5"`. Taps by ref are not supported in legacy mode. |
| 14 | `mobile_double_tap_on_screen` | `device`, `x`, `y` | Two separate `io tap` process calls. The gap may be too long to register as a double tap. |
| 15 | `mobile_long_press_on_screen_at_coordinates` | `device`, `x`, `y`, `duration?` ms 1–10000 (default 500) | text |
| 16 | `mobile_list_elements_on_screen` | `device`, `format?: "text"\|"json"` (default `"text"`) | See §2.1. |
| 17 | `mobile_press_button` | `device`, `button` (free string) | `"Pressed the button: X"`. Android keymap: `HOME, BACK, VOLUME_UP, VOLUME_DOWN, ENTER, DPAD_CENTER, DPAD_UP/DOWN/LEFT/RIGHT, BACKSPACE, APP_SWITCH, POWER`. `BACK` is Android only. |
| 18 | `mobile_open_url` | `device`, `url` | `"Opened URL: …"`. Android runs `am start --display 0 -a android.intent.action.VIEW -d <url>`. Non-http schemes need `MOBILEMCP_ALLOW_UNSAFE_URLS=1`. |
| 19 | `mobile_swipe_on_screen` | `device`, `direction: "up"\|"down"\|"left"\|"right"`, `x?`, `y?`, `distance?` px | See §4. `up` means the finger moves up, so content scrolls toward what is below. |
| 20 | `mobile_type_keys` | `device`, `text`, `submit: boolean` (**required**) | `"Typed text: …"`. Types into the **focused** field (tap it first). `submit` then presses `ENTER`. |
| 21 | `mobile_save_screenshot` | `device`, `saveTo` (`.png`/`.jpg`/`.jpeg`, under server cwd or tmpdir), `maxSize?` int, `scale?` (0–1] | `"Screenshot saved to: …"`. **Full resolution when `maxSize` and `scale` are omitted.** PNG is lossless; JPEG uses the mobilecli default quality of 90. |
| 22 | `mobile_take_screenshot` | `device`, `maxSize?` int (default **1024**), `scale?` (0–1], ignored if `maxSize` is set | **Content = `[ {type:"text", text: mapping}, {type:"image", data: base64, mimeType:"image/jpeg"} ]`.** JPEG q75. The text block is omitted if the screen size is unknown. |
| 23 | `mobile_set_orientation` | `device`, `orientation: "portrait"\|"landscape"` | Android turns off auto-rotate and sets `user_rotation`. |
| 24 | `mobile_get_orientation` | `device` | `"Current device orientation is portrait"` |
| 25 | `mobile_set_location` | `device`, `latitude?`, `longitude?` (omit both to clear) | text |
| 26 | `mobile_clipboard` | `device`, `text?` (omit to read) | Clipboard text, or `"Clipboard updated"` |
| 27 | `mobile_get_device_logs` | `device`, `limit?` 1–10000 (default 100), `filter?: string[]` (`key=value`/`key!=value`; keys `pid,process,tag,level,subsystem,category,message`), `saveTo?` (`.log/.txt/.jsonl`) | One JSON object per line (logcat), or `"Saved N log entries to: …"`. Only captures logs from after the call starts. Stops after `limit` entries or **30 s of silence**. |
| 28 | `mobile_start_screen_recording` | `device`, `output?` `.mp4`, `timeLimit?` s | `"Screen recording started. Output will be saved to: <path>"`. Useful for trajectory evidence. |
| 29 | `mobile_stop_screen_recording` | `device` | `"Recording stopped. File: <path> (X MB, ~Ns)"` |
| 30 | `mobile_list_crashes` | `device` | JSON |
| 31 | `mobile_get_crash` | `device`, `id` | text |
| 32 | `mobile_batch_commands` | `device`, `steps: [{name, arguments}]` (≥1), `stopOnError?` (default true), `listElementsAtEnd?` (default false) | Lines `"Step i (tool): <output>"` or `"Step i (tool) failed: <msg>"`. **No `isError` when steps fail.** `mobile_take_screenshot` and nested batches are rejected (use `mobile_save_screenshot`). With `listElementsAtEnd`, the **text-format** element list is appended. |

Server instructions sent at `initialize` (924 chars) tell the model to prefer the element list over screenshots, prefer taps by ref, batch known sequences, and prefer `mobile_open_url`/`mobile_launch_app` over UI navigation.

### 2.1 Element listing format

`format:"json"` returns text of the form `"Found these elements on screen: " + JSON.stringify(array)`. **Strip that prefix before `JSON.parse`.** Each item:
```ts
{ ref: "@e12",                 // positional, DFS pre-order over mobilecli's tree (flattened in the same order)
  type: "android.widget.TextView", // Android: node class; "text" if class empty. iOS: XCUIElementType…
  text?: string,              // Android: node text; usually present even when "" (Go always sets it)
  label?: string,             // Android: content-desc   (iOS: accessibility label)
  name?: string, value?: string, // iOS only
  identifier?: string,        // Android: resource-id "com.pkg:id/foo" (Compose: testTag if exposed)
  coordinates: { x, y, width, height },  // top-left + size; Android = device px (getBoundsInScreen); iOS = points
  focused?: true, selected?: true, checked?: true, enabled?: false }   // only non-default states are emitted
```
Real formatter output for a synthetic Android dump (the EditText had the hint "Message", which was **dropped**):
```
One element per line: @ref Type text= label= name= value= id= at=x,y size=WxH [focused] [selected] [checked] [disabled]
@e1 FrameLayout id="com.example:id/toolbar" at=0,63 size=1080x147
@e2 TextView text="Chats" at=42,100 size=200x70
@e3 ImageButton label="Settings" at=960,95 size=84x84
@e4 EditText id="com.example:id/input" at=30,2200 size=880x120 focused
@e5 View at=930,2210 size=110x110 disabled
```
```
Found these elements on screen: [{"ref":"@e1","type":"android.widget.FrameLayout","text":"","identifier":"com.example:id/toolbar","coordinates":{"x":0,"y":63,"width":1080,"height":147}},{"ref":"@e2","type":"android.widget.TextView","text":"Chats",...},{"ref":"@e3","type":"android.widget.ImageButton","text":"","label":"Settings",...},{"ref":"@e4",...,"focused":true},{"ref":"@e5","type":"android.view.View","text":"",...,"enabled":false}]
```
The text format shortens `type` to the last segment after the final `.`.

---

## 3. How Android state is captured (default mobilecli path)

### 3.1 UI hierarchy (`mobilecli dump ui` → `AndroidDevice.DumpSource`)
The dump tries three sources in order:
1. **Flutter:** if the foreground app is a *debuggable* Flutter app, it reads the render tree over the Dart VM service. Release apps skip this.
2. **On-device server** (`device.dump.ui` JSON-RPC). The server is `CLASSPATH=/data/local/tmp/mobilecli.dex nohup app_process / com.mobilenext.mobilecli.DeviceServer`, reached through `adb forward tcp:<free port> localabstract:mobilecli-server`. It must start within 5 s, polling every 100 ms; otherwise you get `"device server did not start within 5s"`. If adb forward says "cannot bind", it retries 3 times. The server uses `UiAutomation` with window retrieval:
   - clears the accessibility node cache (warning if that fails: "could not clear the accessibility cache; the dump may be stale");
   - **waits for idle: `waitForIdle(500 ms quiet, 2000 ms max)`**. On timeout it logs "UI not idle within …ms; dumping current state" and **dumps anyway**, so there is no error, but animated screens cost about 2 s per dump and may be captured mid-animation;
   - serializes **all windows from `getWindows()`**. IME (soft keyboard) windows are skipped unless `--full` is passed, which mobile-mcp never does. Windows with a null root are skipped, with `getRootInActiveWindow()` as the fallback. *(Inferred)* The status bar and navigation bar windows (package `com.android.systemui`) are therefore included; filter them by `identifier` prefix `com.android.systemui:` or by position;
   - per node it emits `index, class, package, text, hint, content-desc, resource-id, checkable, checked, clickable, enabled, focusable, focused, scrollable, long-clickable, password, selected, visible, rect(getBoundsInScreen → px), children`. **No visibility filtering** happens during serialization.
3. **Fallback:** `adb -s <id> exec-out uiautomator dump /dev/tty`. It retries up to 10 times on `"null root node returned by UiTestAutomationBridge"`. Other errors are `"no XML content found in uiautomator dump"` (this is what uiautomator's own `ERROR: could not get idle state.` turns into), `"failed to get UIAutomator XML after 10 tries"` and `"failed to parse uiautomator XML: …"`. Bounds `[l,t][r,b]` are converted to x, y, w, h in pixels.

**Which nodes become elements** (same rule for both sources, `androidNodeAttrs.isScreenElement`): a node is kept if (it has a non-empty `text`, `content-desc`, `hint` or `resource-id`, **or** it is `clickable` or `checkable`) **and** `width > 0 && height > 0`. When a node fails the test, its children move up to its parent. Hint goes to `placeholder`, **which mobile-mcp then drops**. `visible` is not used for filtering, so partly or fully off-screen nodes can appear: clamp or filter against the screen rect. Refs are assigned `@e1…@eN` in depth-first pre-order.

The legacy `android.js` robot (`MOBILEMCP_LEGACY_ROBOT=1`) uses the same uiautomator command. Its rule is text, content-desc, hint, resource-id or checkable (clickable is *not* enough), `label = content-desc || hint`, and it produces no refs. If uiautomator returns "could not get idle state", legacy mode parses garbage and throws a `TypeError`.

### 3.2 Screenshots
- Android default path: the device server's `device.screenshot` uses `UiAutomation.takeScreenshot`, scales on the device (`createScaledBitmap`) and encodes PNG or JPEG there. If that fails: `adb exec-out screencap -p [-d <displayId>]` (multi-display aware), then scaled and encoded on the host.
- **`mobile_take_screenshot`** sends `format=jpeg, quality=75, maxSize=1024` unless you pass `maxSize` or `scale`. `scale:1` means full size, still JPEG. It then calls `device info` for the screen size and adds the text line: `"Screenshot is 461x1024. Screen coordinates are 1080x2400. To tap something you see in this screenshot, multiply its x by 2.343 and y by 2.344."`, or `"… and its coordinates match the screen."` when the sizes are equal.
- **`mobile_save_screenshot`**: PNG or JPEG chosen by file extension, **full native resolution by default**. This is the one to use for asset and colour extraction and for pixel diffs in QA. mobilecli also has `screenshot --clip x,y,w,h` (crop in screen points) and `--quality`, but mobile-mcp doesn't expose either. Crop locally instead.
- Status bar and navigation bar are included. *(Inferred, standard Android behaviour)* `FLAG_SECURE` windows (some paywalls or payment sheets) come out black.
- Legacy robots always return full-size PNG. Asking for JPEG via `save_screenshot` in legacy mode raises an actionable error.

### 3.3 Coordinate systems
| | Element rects | Tap/swipe input | `get_screen_size` | Full-size screenshot | Default `take_screenshot` |
|---|---|---|---|---|---|
| Android | device **px** | device **px** | px (`wm size`), scale=1 | px (matches) | ≤1024 px on the long side (e.g. 461×1024 for 1080×2400, a factor of ~2.343) |
| iOS | **points** | **points** | points (e.g. 393×852, scale 3) | **pixels** (e.g. 1179×2556) | ≤1024 on the long side (e.g. 472×1024, a factor of ~0.833) |

For vision grounding, map with `tapX = imgX * (screenW / imgW)` (the multipliers in the text block). The element-list coordinates never need mapping. On Claude, keep the 1024 default: images are resized to ≤1568 px on the long edge anyway, and 461×1024 is about 630 image tokens compared with about 1.5k at full size.

### 3.4 Legacy mode loses these features
Tap by ref, `get_foreground_app`, `set_location`, `clipboard`, `get_device_logs`, JPEG screenshots and screenshot scaling (always full-size PNG). Non-ASCII typing needs DeviceKit installed. **Don't use legacy mode.**

---

## 4. Supported operations (Android, default path)

| Capability | Supported? | How / caveats |
|---|---|---|
| Launch app by package | ✅ `mobile_launch_app` | Resolves the launcher activity, then `am start -n`. Fails if the package has no launcher activity. `locale` uses `cmd locale set-app-locales` (Android 13+). mobilecli also supports `--activity`, but mobile-mcp does not expose it. |
| Terminate app | ✅ `mobile_terminate_app` | `am force-stop` (cold start next time) |
| List installed apps | ✅ `mobile_list_apps` | Launchable only, as `Name (pkg)` text |
| Install app | ✅ `mobile_install_app` | Single `.apk` only |
| Clear app data | ❌ in MCP | Available as `mobilecli apps clear <pkg> --device <id>` or `adb shell pm clear` |
| Open URL / deep link | ✅ `mobile_open_url` | VIEW intent. Custom schemes need `MOBILEMCP_ALLOW_UNSAFE_URLS=1` |
| BACK / HOME | ✅ `mobile_press_button` `"BACK"`, `"HOME"` | Also ENTER, BACKSPACE, APP_SWITCH, POWER, VOLUME_*, DPAD_* |
| Swipe (direction) | ✅ `mobile_swipe_on_screen {direction}` | **Default path: from screen centre, fixed 400 px** (the "30% on Android" in the description applies only to legacy mode). That is about 1/6 of a 2400 px screen, a short scroll. Android swipe duration defaults to 1000 ms (slow, little fling), which suits deterministic scrolling. |
| Swipe (coordinates) | ✅ `{direction, x, y, distance?}` | Moves `distance` (default 400) px from (x, y) in that direction. **The end point is not clamped**, so clamp it yourself to stay on screen. Arbitrary x1,y1→x2,y2 and custom duration exist in mobilecli (`io swipe x1,y1,x2,y2 --duration`) but are not exposed. |
| Long press | ✅ | Default 500 ms, up to 10 s |
| Double tap | ⚠️ | Two sequential taps (separate process calls) |
| Type text | ✅ `mobile_type_keys` | ASCII goes through the device server's `device.io.text` (possible error: "text has characters the keyboard cannot type"). Non-ASCII and emoji go through clipboard plus `KEYCODE_PASTE`, and the clipboard is cleared afterwards. Needs a focused field, so tap it first. |
| Submit | ✅ `submit:true` | Presses **ENTER** after typing. Chat apps often treat ENTER as a newline, so prefer tapping the Send button. |
| Hide keyboard | ⚠️ | Not exposed (the dex has `device.io.keyboard.hide`). Use `BACK`. The keyboard is also absent from element lists. |
| Orientation get/set | ✅ | |
| Screen size | ✅ | Text; parse with `/(\d+)x(\d+)/` |
| Save screenshot to file | ✅ `mobile_save_screenshot` | Path must be under server cwd or tmpdir |
| Screen recording | ✅ start/stop | mp4 |
| Logs | ✅ `mobile_get_device_logs` | logcat via the device server |
| Disable animations | ❌ in MCP | Run in the setup script: `mobilecli device settings apply --animations=off --device <id>`, or `adb shell settings put global {window_animation_scale,transition_animation_scale,animator_duration_scale} 0`. Strongly recommended: dumps idle sooner and screenshots settle. |
| Batch | ✅ `mobile_batch_commands` | Saves round trips. Parse `"failed:"` lines. |

---

## 5. Failure modes we must handle

**Response shapes**
- **ActionableError, without `isError`**: `"<msg>. Please fix the issue and try again."`. Examples seen live or in code:
  - `Device "X" not found. Use the mobile_list_available_devices tool to see available devices.`
  - `mobilecli is not available or not working properly…`
  - `Only http:// and https:// URLs are allowed. Set MOBILEMCP_ALLOW_UNSAFE_URLS=1…`
  - `"<dir>" is not in the list of allowed directories…`
  - `save_screenshot requires a .png, .jpg, .jpeg file extension…`
  - `App file not found: …`
  - `Either ref or both x and y must be provided`
  - `Clicking by ref is not supported in legacy robot mode`
  - `Failed to parse JSON response from mobilecli <args>`
  - `Screenshot is invalid. Please try again.`
  - `mobile_take_screenshot returns an image and cannot be used in a batch…`
  - `This device only supports png screenshots…`
- **Real exception, with `isError: true`**: `"Error: <message>"`. mobilecli failures come through as `Error: Command failed: <mobilecli path> <args> --device X\n<mobilecli stderr>`. mobilecli exits 1 and writes the error both to stderr (plain text) and to stdout (`{"status":"error","error":"…"}`). mobilecli error strings include:
  - `error finding device: device not found: X`
  - `ref @e7 not found on current screen; refs come from the latest 'dump ui'`
  - `failed to dump UI to resolve ref …`
  - `failed to get view tree dump: …`
  - `device server did not start within 5s`
  - `adb forward …`
  - `failed to take screenshot: …`
  - `failed to launch app …`
  - `AndroidDevice: unsupported button key: X`
  - `x and y coordinates must be non-negative…`
  - `Failed running 'adb devices', is ANDROID_HOME set correctly?`
- **Zod validation, with `isError`**: `"Input validation error: Invalid arguments for tool …: x: Too small: expected number to be >=0"`.
- **Batch**: the result is a normal text result even when steps fail; look for `/^Step \d+ \(.+\) failed: /m`.

**Timeouts and hangs**
- Only screenshot `execFileSync` calls have a timeout (30 s, 8 MB maxBuffer). **Every other mobilecli call has no timeout** and blocks the server's event loop.
- The MCP client's default request timeout is 60 s (v1 SDK `DEFAULT_REQUEST_TIMEOUT_MSEC`); it throws `McpError` code `-32001 RequestTimeout`. On timeout: close the transport (which kills the child), respawn, and if it keeps happening run `mobilecli daemon stop` and `adb kill-server`/`start-server`.

**Timing costs**
- UI dump idle wait: up to about 2 s on animated screens (streaming chat text, Lottie, video, shimmer loaders).
- Tap by ref costs a full extra dump and **can hit the wrong element** if the tree changed. Tap by coordinates.
- `mobile_take_screenshot` makes a second mobilecli call (`device info`) every time. Cache the screen size and use `mobile_save_screenshot` or `take_screenshot` as needed.
- The first call per device also runs `mobilecli --version` and `mobilecli devices`; the robot is cached after that.

**Screen and device behaviour**
- Stale or partial trees: dumps taken mid-transition. Mitigations: animations off, a short settle delay after actions (500–1000 ms), and dumping twice until the fingerprint is stable.
- Elements outside the viewport or in system UI: filter out rects not inside `[0,0,W,H]` and ids starting `com.android.systemui:`.
- WebViews and React Native: content usually appears through accessibility (UiAutomation turns WebView accessibility on). Canvas, game and custom-drawn views produce "clickable View with no text" elements, so fall back to vision on the screenshot.
- Only one UiAutomation connection per device. Don't run `adb shell uiautomator dump`, Appium UiAutomator2 or Maestro against the same emulator at the same time.
- Keyboard: IME is omitted from the list, but it covers the lower part of the screen in screenshots, and taps there land on keys. Press BACK before tapping near the bottom.
- `list_available_devices` returns `{"devices":[]}` (a success) when no emulator is booted. Treat that as a precondition failure.
- `open_url` with http(s) may open Chrome (the assignment says not to use websites), so use it only for deep links.

---

## 6. Minimal TypeScript client (tested against the live server)

**SDKs on npm today.**
- `@modelcontextprotocol/sdk` **1.30.1** (the v1 line, ESM and CJS, node ≥18). Imports: `@modelcontextprotocol/sdk/client/index.js` (`Client`) and `@modelcontextprotocol/sdk/client/stdio.js` (`StdioClientTransport`, `getDefaultEnvironment`, `StdioServerParameters`). **Recommended.**
- The v2 split packages also work (tested): `@modelcontextprotocol/client` **2.1.0**, with `import { Client } from "@modelcontextprotocol/client"` and `import { StdioClientTransport } from "@modelcontextprotocol/client/stdio"`, the same API shape. mobile-mcp itself runs `@modelcontextprotocol/server` 2.0.0.
- In v1, `client.callTool(params, resultSchema?, { timeout })` takes a per-call timeout.

**Project setup.** `package.json` needs `"type": "module"`. Run with `tsx`, or Node 22 native type stripping, which forbids parameter properties and enums (so use `--erasableSyntaxOnly` in tsconfig).

```ts
// npm i @modelcontextprotocol/sdk@1.30.1 @mobilenext/mobile-mcp@1.0.5
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport, getDefaultEnvironment } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [require.resolve("@mobilenext/mobile-mcp/lib/index.js"), "--stdio"],   // or: command "npx", args ["-y","@mobilenext/mobile-mcp@1.0.5"]
  cwd: process.cwd(),                              // mobile_save_screenshot may only write under this dir or os.tmpdir()
  env: { ...getDefaultEnvironment(), MOBILEMCP_DISABLE_TELEMETRY: "1", MOBILEMCP_ALLOW_UNSAFE_URLS: "1",
         ...(process.env.ANDROID_HOME ? { ANDROID_HOME: process.env.ANDROID_HOME } : {}) },
  stderr: "pipe",                                  // server logs every call to stderr
});
const client = new Client({ name: "simula-explorer", version: "0.1.0" });
await client.connect(transport);

async function call(name: string, args: Record<string, unknown>, timeout = 90_000) {
  const r = await client.callTool({ name, arguments: args }, undefined, { timeout });
  const content = r.content as Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  const text = content.filter(c => c.type === "text").map(c => c.text).join("\n");
  if (r.isError || /Please fix the issue and try again\.$/.test(text) || /^Error: /.test(text)) throw new Error(`${name}: ${text}`);
  return { content, text };
}

const { devices } = JSON.parse((await call("mobile_list_available_devices", {})).text);
const device: string = devices.find((d: any) => d.platform === "android")?.id ?? devices[0]?.id;

// screenshot: [text mapping?, image(jpeg base64)]
const shot = await call("mobile_take_screenshot", { device });            // maxSize defaults to 1024
const image = shot.content.find(c => c.type === "image")!;               // image.data (base64), image.mimeType
const m = /multiply its x by ([\d.]+) and y by ([\d.]+)/.exec(shot.text);
const [sx, sy] = m ? [+m[1], +m[2]] : [1, 1];                            // screenshot px -> tap coords

// lossless full-res copy for assets / QA diffs
await call("mobile_save_screenshot", { device, saveTo: `${process.cwd()}/runs/screen-001.png` });

// element list (JSON)
const raw = (await call("mobile_list_elements_on_screen", { device, format: "json" })).text;
const elements = JSON.parse(raw.replace(/^Found these elements on screen: /, "")) as Array<{
  ref?: string; type: string; text?: string; label?: string; identifier?: string;
  coordinates: { x: number; y: number; width: number; height: number };
  focused?: true; selected?: true; checked?: true; enabled?: false }>;

// tap an element by its rect centre (px on Android)
const el = elements.find(e => e.enabled !== false && (e.text || e.label))!;
const { x, y, width, height } = el.coordinates;
await call("mobile_click_on_screen_at_coordinates", { device, x: Math.round(x + width / 2), y: Math.round(y + height / 2) });
// alternatives: { device, ref: el.ref }  |  vision-grounded: { device, x: Math.round(imgX * sx), y: Math.round(imgY * sy) }

// other verified call shapes
await call("mobile_launch_app", { device, packageName: "com.example.app" });
await call("mobile_press_button", { device, button: "BACK" });
await call("mobile_swipe_on_screen", { device, direction: "up", x: 540, y: 1800, distance: 1000 });
await call("mobile_type_keys", { device, text: "hello", submit: false });
await call("mobile_open_url", { device, url: "myapp://path" });           // needs MOBILEMCP_ALLOW_UNSAFE_URLS=1
await client.close();
```
A fuller typed wrapper with the same logic (the `MobileMcp` class: `listDevices`, `screenSize`, `screenshot`, `saveScreenshotPng`, `elements`, `tapElement`, `tap`, `tapRef`) was prototyped during research; its successor is `src/device/mcp.ts`.

---

## 7. What this means for the explorer

- **State = element list (JSON) + a 1024 px JPEG for the LLM + a lossless full-res PNG saved to disk.** Build the screen fingerprint from the element list: the sorted multiset of `type|text|label|identifier`, with dynamic text such as times and counters normalised, system UI removed, and rects bucketed. Keep a perceptual hash of the screenshot as a secondary signal for canvas or WebView screens.
- **Act by coordinates** from our own stored element list, and keep the `ref` only for logging. After each action, wait for the screen to settle (fingerprint stable across two dumps, or a timeout).
- **One mobile-mcp process per device, calls in sequence.** Wrap every call in a timeout, retry once, and respawn the server on a hang. Log every tool call and its result to the trajectory.
- **Deterministic setup script outside MCP:** `adb` checks, animations off, optional `pm clear` or force-stop. The exploration itself goes through MCP, as the brief requires.
- **For layout fidelity (the recreate step):** the MCP list loses the tree structure and placeholders. Options: (a) derive the layout from rects and the screenshot with a vision model; (b) optionally also capture `mobilecli dump ui --format raw --device <id>` (same binary: `node_modules/@mobilenext/mobilecli-darwin-arm64/mobilecli-darwin-arm64`), which gives the full JSON tree with hint, scrollable, password, visible and children. Assets and colours come from cropping the full-res PNG at element rects.
