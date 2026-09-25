# START HERE: step by step (Mac with Apple chip)

You'll copy and paste everything. Wherever it says **paste**, copy the grey box exactly, paste it into Terminal and press **Return**.

**Time:** about 20 minutes of your hands, plus waiting while things download and run.

> 🔒 Your Gemini key goes in a file called `.env`, and **only** there. That file is never uploaded to GitHub. Don't paste the key into code, GitHub or chats.

---

## Part A: install 4 things (one time, about 15 min)

### A1. Open Terminal
Press **⌘ Command + Space**, type **Terminal** and press **Return**. A window with text opens. This is where you paste commands.

### A2. Install Node.js (runs the project)
1. Open **https://nodejs.org/en/download**.
2. Click **macOS Installer (.pkg)**, the LTS version.
3. Open the downloaded file and click **Continue → Agree → Install**.
4. Type your **Mac login password** when asked.

### A3. Install Java (needed by Android's tools)
1. Open **https://adoptium.net/temurin/releases/?os=mac&arch=aarch64&package=jdk&version=21**.
2. Download the **.pkg**.
3. Open it and click **Continue → Install**, then type your Mac password.

### A4. Install Claude on your Mac (uses your normal Claude subscription; no key needed)
Paste:
```
curl -fsSL https://claude.ai/install.sh | bash
```
When it finishes, **quit Terminal** (⌘ Command + Q), open it again (A1), and paste:
```
claude --version
```
You should see a version number.

If it says `command not found`, paste this, then try `claude --version` again:
```
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

### A5. Make sure git works (downloads the code)
Paste:
```
git --version
```
If a popup asks to install **"command line developer tools"**, click **Install**, wait until it's done (about 5 min), then paste the command again.

---

## Part B: get the project (2 min)

Paste these three lines. Terminal runs them one after another.
```
cd ~
git clone https://github.com/raj200501/simula.git
cd simula && git checkout claude/serene-brahmagupta-owzz1n
```
You now have a folder called **simula** in your home folder.

---

## Part C: put your Gemini key in (1 min)

Paste:
```
cd ~/simula && cp .env.example .env && open -e .env
```
TextEdit opens a small file. Find the line `GEMINI_API_KEY=` and click right after the `=`. Paste your key **with no spaces and no quotes**, so the line looks like `GEMINI_API_KEY=AQ.xxxxxxxx`. Press **⌘ Command + S** to save, then close TextEdit.

---

## Part D: start Claude on your Mac (2 min)

Paste:
```
cd ~/simula && claude
```
1. A browser opens. **Log in with your Claude account** and click **Authorize**.
2. Go back to Terminal and press **Return** if it asks you to.
3. If it asks **"Do you trust the files in this folder?"**, choose **Yes**.

You're now chatting with a Claude that can control your Mac, just like this chat but local.

> Prefer chatting from the Claude app? Type `/exit`, then paste `claude remote-control`. Then open the Claude app, go to **Code**, and pick the session with the green dot.

Claude will sometimes ask **"Allow this command?"**. For anything in this guide it's safe to choose **Yes**, or **"Yes, don't ask again"** for that command.

---

## Part E: paste Prompt #1 into Claude (sets up the phone emulator, about 45 min, mostly waiting)

Copy the whole box below and paste it into the Claude you started in Part D:

```
Set up the Android emulator for this repo by following docs/LOCAL_SETUP.md exactly, starting at step 0 (preflight). Use scripts/device.sh for SDK/AVD/boot/prep, and adb (or mobile-mcp) to drive the emulator. Open every Play listing by package ID with a market://details?id=<pkg> intent — never by searching the Play Store. HAND BACK to me (stop, tell me what's on screen, wait) for the Google sign-up phone verification or CAPTCHA, whenever a password field appears (including my Mac password for installers), and for any personal detail (name, birthday, username). Never type a password, never tap purchase buttons, never add a payment method, never tap an ad. My LLM key is a Gemini key already saved in .env (GEMINI_API_KEY) — do not print it. At the end report `bash scripts/device.sh versions` and `npm run doctor`.
```

**What happens:**
- It downloads Android tools (about 2 GB).
- A **phone appears on your screen**. That's the emulator, and it's normal.
- It opens the Play Store in that phone.

**When it stops and asks you for something, this is what you do:**

| It says… | You do… |
|---|---|
| "Sign in to Google" | In the phone window, type your Google email and password. Your normal account is fine. |
| "Create an account / phone verification / CAPTCHA" | Type your phone number and the code Google texts you, or solve the CAPTCHA. |
| "Enter your password" (Mac or app) | Type it. In Terminal the password stays invisible while you type; that's normal. Press Return. |
| "Continue with Google" consent inside OOC or Janitor | Tap your account in the phone window, then **Allow** or **Continue**. |
| AOL login | Just tell it **"skip AOL login"**. |

Then reply **done** in the Claude chat and it continues.

**Don't click inside the phone window unless it asks you to.**

---

## Part F: paste Prompt #2 (runs the whole system on the 4 apps, about 2–3 hours, mostly waiting)

Keep your Mac **plugged in** and don't close the lid. Then paste:

```
Read README.md and docs/BUILD_SPEC.md. Then, in order:
1) npm ci && npx playwright install chromium && npm test && npm run demo   (report the results; fix only genuine generic bugs).
2) Luzia is the deep app. Under `caffeinate -i`, run each stage, one at a time:
   npm run probe -- --app luzia
   npm run explore -- --app luzia
   npm run understand -- --app luzia
   npm run mock -- --app luzia
   npm run qa -- --app luzia
   npm run propose -- --app luzia
   npm run judge -- --app luzia
   npm run eval:judge -- --app luzia
   npm run slides -- --app luzia
   After each stage, read its outputs and out/luzia/trace.jsonl for failures. Fix only generic problems (never app-specific code in src/; the boundary test enforces this), re-run the stage, and log every manual step or fix with: npm run note -- --app luzia "<what you did>".
3) Transfer: npm run all -- --app janitor, then npm run all -- --app aol.
4) OOC closes itself about 0.8 s after launch on the Google Play emulator (logcat: AppSecurity "Kill Process ... [D11001]"). Do NOT try to bypass it. Record it as blocked:
   npm run note -- --app ooc "OOC closes itself ~0.8 s after launch on the Google Play emulator (AppSecurity Kill Process D11001); recorded as blocked, not bypassed"
5) npm run report, then open out/index.html and check that every app has a row.
6) Set up GitHub pushing: install the GitHub CLI and run `gh auth login` (HAND BACK to me for the browser authorization and any password). Check `git grep -nE "AIza[0-9A-Za-z_-]{30}|AQ\.[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9]"` finds nothing. Then commit everything under out/ except raw explorer screenshots (.gitignore already skips out/*/explore/*/obs/). Author: Raj Kashikar <65059626+raj200501@users.noreply.github.com>, no Co-Authored-By line. Push to branch claude/serene-brahmagupta-owzz1n.
Free Gemini tier: about 20 requests per day per Flash model. If a stage reports a DAILY quota, stop and tell me. Tomorrow, re-run the same command: finished calls are cached and not repeated.
Stop and ask me before anything that spends money or touches purchases. Never tap ads.
```

**What happens:**
- It checks that everything works on the built-in demo app first.
- It explores Luzia by itself; you'll see the phone tapping around. It sends chat messages until Luzia's free limit appears. That's on purpose: it measures the limit.
- It builds the product model, the mock, the QA report, the proposals, the judge scores and the slides.
- It does a shorter run on Janitor and AOL.
- It writes OOC down as blocked (OOC closes itself on the emulator).
- It uploads everything to GitHub. It hands back once so you can click **Authorize** in your browser.

When it's done, paste this to see the results page:
```
open ~/simula/out/index.html
```

---

## Part G: the recording (10–15 min video)

Simula says they care about this most. `docs/RECORDING_SCRIPT.md` is a script to read from, with what to click and what to say. Record your screen with **⌘ Command + Shift + 5**, then **Record Entire Screen**, or with Loom.

---

## Part H: next morning, re-run what the free quota cut short (about 30 min)

Gemini's free quota resets at **midnight Pacific time** (07:00 UTC). If yesterday's run ran out, some stages used simple built-in fallbacks ("stubs") instead of the AI. Finished AI answers are saved, so a re-run only asks the AI for what's missing.

Open Terminal, paste `cd ~/simula && claude`, then paste this prompt:

```
git pull. Run `npm run report`, then read out/<app>/NUMBERS.md for every app. For each app whose card starts with a "⚠ Produced by deterministic stubs" line, re-run from the earliest stubbed stage (model → understand, proposals → propose, judge → judge) with `npm run all -- --app <app> --from <stage>`; do luzia first. Never re-run explore. If every model reports a DAILY quota, stop and tell me. Then check out/README.md shows each app's flow slides and QA screenshots, run the key check from Part F step 6, commit out/ as Raj Kashikar <65059626+raj200501@users.noreply.github.com> with no Co-Authored-By line, and push to claude/serene-brahmagupta-owzz1n.
```

---

## If something goes wrong

| Problem | Fix |
|---|---|
| `command not found: npm` | Redo A2, then quit and reopen Terminal. |
| `command not found: claude` | Redo the last box in A4. |
| The emulator is black or frozen | Tell Claude "the emulator is frozen, cold boot it". It runs `COLD=1 bash scripts/device.sh boot`. |
| Gemini says quota or "high demand" | Nothing to do. It waits, retries, and switches to another free model by itself. If it says **DAILY** quota on every model, continue tomorrow by re-running the same command; finished calls are cached and aren't redone. |
| An app refuses to run on the emulator | Tell Claude to switch the deep app to Luzia. If all apps are blocked, email Yizhen and Athreya (the assignment says to ask when blocked). |
| You accidentally pasted your key somewhere public | Go to https://aistudio.google.com/apikey, delete that key and make a new one. Put the new one in `.env`. |
