#!/usr/bin/env bash
# simula-device.sh: Android emulator setup and device helpers for the Simula take-home.
# Target: macOS on Apple Silicon. Also compatible with /bin/bash 3.2, the version macOS ships.
#
#   ./simula-device.sh setup          one-time: JDK check, SDK cmdline-tools, platform-tools, emulator, system image, AVD
#   ./simula-device.sh boot           start the AVD (COLD=1 cold boot, FROM_SNAPSHOT=name, HEADLESS=1), wait, then prep
#   ./simula-device.sh prep           re-apply automation settings (animations off, awake, demo status bar, ...)
#   ./simula-device.sh install [pkg]  open the Play Store page for each test app, wait for the install, grant notifications
#   ./simula-device.sh sideload FILE  install .apk / .xapk / .apks / .apkm / dir of splits (arm64 split only)
#   ./simula-device.sh versions       JSON lines with versionName/versionCode/installer for the 4 apps (provenance)
#   ./simula-device.sh pull-apks [D]  archive the exact installed APK splits to D (default ./artifacts/apks)
#   ./simula-device.sh snapshot-save [name] | snapshot-load [name]   (default name: simula_ready)
#   ./simula-device.sh fg | dump | shot [file] | shot-host [dir]     debug helpers
#   ./simula-device.sh doctor         sanity checks
#   ./simula-device.sh mcp-config     print an MCP server config for mobile-mcp
#
# Env overrides: API (35), DEVICE_PROFILE (pixel_8), AVD_NAME, SNAPSHOT, TZ_DEVICE, ANDROID_HOME, ANDROID_SERIAL,
#                GRANT_ALL=1 (sideload with -g), SPOOF_INSTALLER=1 (sideload with -i com.android.vending), DRY_RUN=1
set -euo pipefail

API="${API:-35}"
DEVICE_PROFILE="${DEVICE_PROFILE:-pixel_8}"
AVD_NAME="${AVD_NAME:-simula_${DEVICE_PROFILE}_api${API}}"
IMG="system-images;android-${API};google_apis_playstore;arm64-v8a"
SNAPSHOT="${SNAPSHOT:-simula_ready}"
TZ_DEVICE="${TZ_DEVICE:-America/Los_Angeles}"
# cmdline-tools 23.0 (Sept 2026), from https://dl.google.com/android/repository/repository2-3.xml
CLT_URL="${CLT_URL:-https://dl.google.com/android/repository/commandlinetools-mac_arm64-16111833_latest.zip}"
APPS=(com.newai.ooc com.janitor.ai co.thewordlab.luzia com.aol.mobile.aolapp)

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
AVD_HOME="${ANDROID_AVD_HOME:-$HOME/.android/avd}"

log()  { printf '\033[1;34m[device]\033[0m %s\n' "$*" >&2; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }
run()  { if [[ -n "${DRY_RUN:-}" ]]; then printf '+'; printf ' %q' "$@"; printf '\n'; else "$@"; fi; }
sh_()  { adb shell "$@" 2>/dev/null | tr -d '\r' || true; }   # adb shell, CRs stripped, never fails

# ---------------------------------------------------------------- setup
ensure_java() {
  if ! java -version >/dev/null 2>&1; then
    local jbr="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
    if [[ -d "$jbr" ]]; then export JAVA_HOME="$jbr" PATH="$jbr/bin:$PATH"
    else die "No JDK found. Install one (JDK 17+):  brew install --cask temurin@21   (or install Android Studio)"; fi
  fi
  local major
  major="$(java -version 2>&1 | awk -F'"' '/version/ {print $2; exit}' | cut -d. -f1)"
  [[ "${major:-0}" -ge 17 ]] || die "sdkmanager needs JDK 17+, found: $(java -version 2>&1 | head -1)"
}

set_cfg() {  # set_cfg <config.ini> <key> <value>, replacing or adding the key
  local f="$1" k="$2" v="$3"
  { grep -v "^${k}=" "$f" || true; printf '%s=%s\n' "$k" "$v"; } > "$f.tmp" && mv "$f.tmp" "$f"
}

tune_avd() {
  local cfg="$AVD_HOME/$AVD_NAME.avd/config.ini"
  [[ -f "$cfg" ]] || die "AVD config not found: $cfg"
  set_cfg "$cfg" hw.keyboard yes                # typing through adb works; the IME stays hidden (see prep)
  set_cfg "$cfg" hw.ramSize 4096
  set_cfg "$cfg" disk.dataPartition.size 16G    # 4 apps + Play services updates + caches
  set_cfg "$cfg" hw.gpu.enabled yes
  set_cfg "$cfg" hw.gpu.mode host
  set_cfg "$cfg" hw.camera.back emulated
  set_cfg "$cfg" hw.camera.front emulated
  set_cfg "$cfg" showDeviceFrame no
  log "Tuned $cfg"
}

cmd_setup() {
  [[ "$(uname -s)" == Darwin && "$(uname -m)" == arm64 ]] || warn "Written for macOS on Apple Silicon; continuing anyway."
  ensure_java
  if [[ ! -x "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]]; then
    log "Installing Android command-line tools into $ANDROID_HOME"
    mkdir -p "$ANDROID_HOME/cmdline-tools"
    local tmp; tmp="$(mktemp -d)"
    curl -fL --retry 3 -o "$tmp/clt.zip" "$CLT_URL"
    unzip -q "$tmp/clt.zip" -d "$tmp"
    mv "$tmp/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
  fi
  sdkmanager --licenses < <(yes) >/dev/null || true
  log "Installing platform-tools, emulator, $IMG (~2 GB on first run)"
  sdkmanager --install "platform-tools" "emulator" "$IMG" < <(yes)
  if avdmanager list avd -c 2>/dev/null | grep -x "$AVD_NAME" >/dev/null; then
    log "AVD $AVD_NAME already exists; leaving it alone because it may hold your logins. To recreate: avdmanager delete avd -n $AVD_NAME"
  else
    log "Creating AVD $AVD_NAME ($DEVICE_PROFILE, API $API, Google Play, arm64)"
    avdmanager create avd -n "$AVD_NAME" -k "$IMG" -d "$DEVICE_PROFILE" <<< "no"
    tune_avd
  fi
  local adbs; adbs="$( { which -a adb 2>/dev/null || true; } | sort -u | wc -l | tr -d ' ')"
  [[ "$adbs" -le 1 ]] || warn "Multiple adb binaries on PATH ($(which -a adb | tr '\n' ' ')). Keep only the SDK one to avoid 'adb server version doesn't match' restarts."
  cat >&2 <<EOF

Add this to ~/.zshrc so adb, emulator and mobile-mcp find the SDK:
  export ANDROID_HOME="$ANDROID_HOME"
  export PATH="\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/emulator:\$ANDROID_HOME/cmdline-tools/latest/bin:\$PATH"

Next:  $0 boot   then   $0 install
EOF
}

# ---------------------------------------------------------------- boot / prep
emulator_running() { adb devices 2>/dev/null | grep -E '^emulator-[0-9]+[[:space:]]+device' >/dev/null; }

wait_boot() {
  local i=0
  log "Waiting for boot..."
  until [[ "$(sh_ getprop sys.boot_completed)" == 1 ]]; do
    if (( ++i > 150 )); then die "Boot timed out (5 min). See ${TMPDIR:-/tmp}/simula-emulator.log"; fi
    sleep 2
  done
  i=0
  until adb shell pm path android >/dev/null 2>&1; do
    if (( ++i > 60 )); then die "Package manager not ready"; fi
    sleep 2
  done
  log "Booted: $(sh_ getprop ro.product.model), Android $(sh_ getprop ro.build.version.release) (API $(sh_ getprop ro.build.version.sdk)), ABI $(sh_ getprop ro.product.cpu.abilist)"
}

cmd_boot() {
  if emulator_running; then
    log "An emulator is already running: $(adb devices | awk '/^emulator-/{print $1}' | tr '\n' ' ')"
  else
    # -feature -Vulkan: the emulator cannot snapshot Vulkan state (Google's troubleshooting guide), and named
    #   snapshots are the plan for reproducible runs. Apps still render through GLES.
    # If you see graphical glitches, use GPU_MODE=swiftshader_indirect (software rendering, slower).
    local args=(-avd "$AVD_NAME" -no-boot-anim -no-audio -timezone "$TZ_DEVICE" -gpu "${GPU_MODE:-host}" -feature -Vulkan)
    if [[ "${COLD:-0}" == 1 ]]; then args+=(-no-snapshot-load); fi
    if [[ -n "${FROM_SNAPSHOT:-}" ]]; then args+=(-snapshot "$FROM_SNAPSHOT" -no-snapshot-save); fi
    if [[ "${HEADLESS:-0}" == 1 ]]; then args+=(-no-window); fi
    log "emulator ${args[*]}"
    nohup emulator "${args[@]}" > "${TMPDIR:-/tmp}/simula-emulator.log" 2>&1 &
    sleep 3
  fi
  wait_boot
  # SystemUI may still be starting right after boot, and then the demo-mode status bar broadcast is
  # ignored. Wait until it is running, then give it a moment.
  local k=0
  until sh_ pidof com.android.systemui >/dev/null && [[ -n "$(sh_ pidof com.android.systemui)" ]]; do
    (( ++k > 30 )) && break
    sleep 1
  done
  sleep 4
  cmd_prep
}

demo_mode() {  # deterministic status bar (fixed clock, full battery and wifi, no notification icons) for screenshot diffs
  local c
  if [[ "${1:-on}" == on ]]; then
    adb shell settings put global sysui_demo_allowed 1
    for c in "enter" "clock -e hhmm 0941" "battery -e level 100 -e plugged false" \
             "network -e wifi show -e level 4 -e mobile show -e datatype none -e level 4" \
             "notifications -e visible false"; do
      # shellcheck disable=SC2086  # word splitting of $c is intended
      adb shell am broadcast -a com.android.systemui.demo -e command $c >/dev/null
    done
  else
    adb shell am broadcast -a com.android.systemui.demo -e command exit >/dev/null
  fi
}

cmd_prep() {
  log "Applying automation settings"
  # 1. No animations: fewer 'could not get idle state' dumps, and screens settle right after an action.
  adb shell settings put global window_animation_scale 0
  adb shell settings put global transition_animation_scale 0
  adb shell settings put global animator_duration_scale 0
  # 2. Keep the device awake and unlocked.
  adb shell svc power stayon true
  adb shell settings put system screen_off_timeout 2147483647
  adb shell locksettings set-disabled true >/dev/null 2>&1 || true
  adb shell input keyevent KEYCODE_WAKEUP
  adb shell wm dismiss-keyguard >/dev/null 2>&1 || true
  # 3. Keep system UI out of the app's screens: no soft keyboard over content, no autofill or spellcheck popups,
  #    no 'viewing full screen' toast.
  adb shell settings put secure show_ime_with_hard_keyboard 0
  adb shell settings put secure autofill_service null
  adb shell settings put secure spell_checker_enabled 0
  adb shell settings put secure immersive_mode_confirmations confirmed
  # 4. Deterministic look: light theme, fixed location (San Francisco), demo-mode status bar.
  adb shell cmd uimode night no >/dev/null
  adb emu geo fix -122.4194 37.7749 >/dev/null 2>&1 || true
  demo_mode on
  log "Screen: $(sh_ wm size | tail -1), $(sh_ wm density | tail -1)"
}

# ---------------------------------------------------------------- apps
is_installed() { sh_ pm list packages "$1" | grep -x "package:$1" >/dev/null; }

version_field() {  # version_field <pkg> <versionName|versionCode>
  local d; d="$(sh_ dumpsys package "$1")"
  grep -m1 -oE "$2=[^ ]+" <<< "$d" | cut -d= -f2 || true
}

cmd_install() {
  local pkgs=() pkg i
  if [[ $# -gt 0 ]]; then pkgs=("$@"); else pkgs=("${APPS[@]}"); fi
  for pkg in "${pkgs[@]}"; do
    if is_installed "$pkg"; then
      log "$pkg already installed"
    else
      log "Opening the Play Store for $pkg. Tap Install in the emulator window (sign in to Play first)."
      adb shell am start -a android.intent.action.VIEW -d "market://details?id=$pkg" >/dev/null
      i=0
      until is_installed "$pkg"; do
        if (( ++i > 200 )); then warn "Timed out waiting for $pkg; skipping"; continue 2; fi
        sleep 3
      done
    fi
    # Pre-grant only notifications: the first-launch prompt would block onboarding. Camera, mic and location
    # prompts stay; the explorer records them and taps "Don't allow".
    adb shell pm grant "$pkg" android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true
    log "$pkg versionName=$(version_field "$pkg" versionName) versionCode=$(version_field "$pkg" versionCode)"
  done
  warn "Now turn off Play auto-updates (Play Store > profile > Settings > Network preferences > Auto-update apps > Don't auto-update) so app versions stay fixed during the take-home."
}

device_abi() { if [[ -n "${DRY_RUN:-}" ]]; then echo "${ABI:-arm64-v8a}"; else sh_ getprop ro.product.cpu.abi; fi; }

cmd_sideload() {
  local src="${1:-}" dir abi abi_tag f b has_abi=0 has_match=0
  [[ -n "$src" ]] || die "usage: sideload <file.apk|.xapk|.apks|.apkm|dir-of-splits>"
  case "$src" in
    *.apk)  run adb install -r "$src"; return ;;
    *.xapk|*.apks|*.apkm|*.zip)
            dir="$(mktemp -d)"
            unzip -q -o "$src" -d "$dir" || die "unzip failed; .apkm files may be encrypted. Pull the splits from a device instead (see pull-apks)." ;;
    *)      [[ -d "$src" ]] || die "unsupported input: $src"; dir="$src" ;;
  esac
  abi="$(device_abi)"; abi_tag="${abi//-/_}"         # arm64-v8a becomes arm64_v8a
  local files=()
  while IFS= read -r -d '' f; do
    b="$(basename "$f")"
    if [[ "$b" =~ (arm64_v8a|armeabi_v7a|armeabi|x86_64|x86|mips64|mips)\.apk$ ]]; then
      has_abi=1
      [[ "${BASH_REMATCH[1]}" == "$abi_tag" ]] || continue   # skip ABI splits for other CPUs
      has_match=1
    fi
    files+=("$f")                                            # base plus density and language splits
  done < <(find "$dir" -maxdepth 2 -name '*.apk' -print0)
  [[ ${#files[@]} -gt 0 ]] || die "no .apk files in $src"
  if [[ $has_abi == 1 && $has_match == 0 ]]; then
    die "Bundle has no ${abi} split. Apple Silicon Macs cannot execute 32-bit ARM code, so an armeabi-v7a-only download will not run. Get the arm64-v8a variant."
  fi
  local extra=()
  if [[ "${GRANT_ALL:-0}" == 1 ]]; then extra+=(-g); fi
  if [[ "${SPOOF_INSTALLER:-0}" == 1 ]]; then extra+=(-i com.android.vending); fi
  run adb install-multiple -r ${extra[@]+"${extra[@]}"} "${files[@]}"
  if [[ -d "$dir/Android/obb" ]]; then                       # XAPKs may carry OBB expansion files
    for f in "$dir"/Android/obb/*/; do
      b="$(basename "$f")"
      run adb shell mkdir -p "/sdcard/Android/obb/$b"
      run adb push "$f." "/sdcard/Android/obb/$b/"
    done
  fi
}

cmd_versions() {
  local pkg inst
  for pkg in "${APPS[@]}"; do
    if ! is_installed "$pkg"; then printf '{"package":"%s","installed":false}\n' "$pkg"; continue; fi
    inst="$(sh_ pm list packages -i "$pkg" | grep -m1 "package:$pkg " | sed -E 's/.*installer=//' || true)"
    printf '{"package":"%s","installed":true,"versionName":"%s","versionCode":"%s","installer":"%s","device":"%s","api":"%s"}\n' \
      "$pkg" "$(version_field "$pkg" versionName)" "$(version_field "$pkg" versionCode)" "$inst" \
      "$(sh_ getprop ro.product.model)" "$(sh_ getprop ro.build.version.sdk)"
  done
}

cmd_pull_apks() {
  local root="${1:-./artifacts/apks}" pkg out p
  for pkg in "${APPS[@]}"; do
    is_installed "$pkg" || { warn "$pkg not installed"; continue; }
    out="$root/$pkg/$(version_field "$pkg" versionName)"
    mkdir -p "$out"
    for p in $(sh_ pm path "$pkg" | sed 's/^package://'); do adb pull "$p" "$out/" >/dev/null; done
    log "$pkg: $(ls "$out" | wc -l | tr -d ' ') split(s) in $out (do not commit APKs; add artifacts/apks to .gitignore)"
  done
}

# ---------------------------------------------------------------- snapshots and debug helpers
cmd_snapshot_save() { local n="${1:-$SNAPSHOT}"; adb emu avd snapshot save "$n"; log "Saved snapshot '$n'"; }
cmd_snapshot_load() { local n="${1:-$SNAPSHOT}"; adb emu avd snapshot load "$n"; wait_boot; cmd_prep; }

cmd_fg() {  # foreground package/activity: the explorer's 'did we leave the app?' check
  local d; d="$(sh_ dumpsys activity activities)"
  grep -m1 -E 'topResumedActivity|mResumedActivity' <<< "$d" | grep -oE '[A-Za-z0-9_.]+/[A-Za-z0-9_.$]+' | head -1 || true
}

cmd_dump() {  # full accessibility hierarchy XML; falls back to --compressed when the screen never idles
  local x
  x="$(adb exec-out uiautomator dump /dev/tty 2>/dev/null || true)"
  if [[ "$x" != *"<?xml"* ]]; then
    warn "full dump failed (${x:0:80}); retrying with --compressed"
    x="$(adb exec-out uiautomator dump --compressed /dev/tty 2>/dev/null || true)"
  fi
  [[ "$x" == *"<?xml"* ]] || die "uiautomator dump failed: ${x:0:200}. Try: android layout --no-idle --full"
  x="${x#*"<?xml"}"; x="<?xml${x%"</hierarchy>"*}</hierarchy>"
  printf '%s\n' "$x"
}

cmd_shot() { local f="${1:-shot_$(date +%Y%m%d_%H%M%S).png}"; adb exec-out screencap -p > "$f"; log "$f"; }
cmd_shot_host() { local d="${1:-.}"; mkdir -p "$d"; adb emu screenrecord screenshot "$(cd "$d" && pwd)"; log "host-side screenshot in $d (try this if screencap is black because of FLAG_SECURE)"; }

cmd_doctor() {
  local ok='\033[32mOK\033[0m' bad='\033[31m!!\033[0m'
  java -version >/dev/null 2>&1 && printf "$ok java: %s\n" "$(java -version 2>&1 | awk '/version/ {print; exit}')" || printf "$bad java missing\n"
  [[ -x "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]] && printf "$ok sdk: %s\n" "$ANDROID_HOME" || printf "$bad cmdline-tools missing\n"
  printf "   adb on PATH: %s\n" "$(which -a adb 2>/dev/null | sort -u | tr '\n' ' ')"
  emulator_running || { printf "$bad no running emulator (run: $0 boot)\n"; return 0; }
  printf "$ok device: %s API %s abi=%s\n" "$(sh_ getprop ro.product.model)" "$(sh_ getprop ro.build.version.sdk)" "$(sh_ getprop ro.product.cpu.abilist)"
  printf "   animations: %s %s %s (want 0 0 0)\n" "$(sh_ settings get global window_animation_scale)" "$(sh_ settings get global transition_animation_scale)" "$(sh_ settings get global animator_duration_scale)"
  is_installed com.android.vending && printf "$ok Play Store present\n" || printf "$bad no Play Store (wrong system image?)\n"
  printf "   Google accounts on device: %s\n" "$(sh_ dumpsys account | grep -c 'Account {name=' || true)"
  printf "   foreground: %s\n" "$(cmd_fg)"
  cmd_versions
}

cmd_mcp_config() {
  cat <<EOF
{
  "mcpServers": {
    "mobile": {
      "command": "npx",
      "args": ["-y", "@mobilenext/mobile-mcp@1.0.5"],
      "env": { "ANDROID_HOME": "$ANDROID_HOME", "MOBILEMCP_DISABLE_TELEMETRY": "1" }
    }
  }
}
EOF
}

usage() { sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; }

main() {
  local cmd="${1:-help}"; [[ $# -gt 0 ]] && shift
  case "$cmd" in
    setup) cmd_setup ;;
    boot) cmd_boot ;;
    prep) cmd_prep ;;
    install) cmd_install ${1+"$@"} ;;
    sideload) cmd_sideload ${1+"$@"} ;;
    versions) cmd_versions ;;
    pull-apks) cmd_pull_apks ${1+"$@"} ;;
    snapshot-save) cmd_snapshot_save ${1+"$@"} ;;
    snapshot-load) cmd_snapshot_load ${1+"$@"} ;;
    fg) cmd_fg ;;
    dump) cmd_dump ;;
    shot) cmd_shot ${1+"$@"} ;;
    shot-host) cmd_shot_host ${1+"$@"} ;;
    demo-off) demo_mode off ;;
    doctor) cmd_doctor ;;
    mcp-config) cmd_mcp_config ;;
    all) cmd_setup; cmd_boot; cmd_install ;;
    help|-h|--help) usage ;;
    *) usage; exit 1 ;;
  esac
}
main ${1+"$@"}
