# ScholarBridge apps — desktop (.exe / .dmg / AppImage) and Android (.apk)

This document describes the two **installed programs** built from this
repository. They are not websites opened in a tab:

| App | What the user gets | Needs the internet? |
| --- | --- | --- |
| **Desktop** (`desktop/`) | A double-clickable program with its own window, its own icon, and its **own private PostgreSQL database** inside the app. One install, then it opens instantly — like Telegram Desktop. | Only for AI features, university images and Telegram. Catalogue, profiles, tracking and applications work offline. |
| **Android** (`mobile/`) | A real `.apk` installed on the phone: home-screen icon, full screen, no address bar. It connects to a ScholarBridge server (the desktop app on the same Wi-Fi, or a hosted deployment) and remembers the address. | Yes — it talks to a server. |

Both are built **from the same codebase and the same database schema** as the
website, so accounts, saved lists, applications and AI quotas behave exactly
the same everywhere. There is no second implementation to keep in sync.

```
            ┌───────────────────────────────────────────────┐
            │  Desktop app (installed program)              │
            │  ┌──────────────┐   ┌───────────────────────┐ │
            │  │ Electron     │──▶│ ScholarBridge server  │ │
            │  │ window       │   │ (Next.js, bundled)    │ │
            │  └──────────────┘   └──────────┬────────────┘ │
            │                                │              │
            │                     ┌──────────▼────────────┐ │
            │                     │ PostgreSQL (private,  │ │
            │                     │ inside the app data)  │ │
            │                     └───────────────────────┘ │
            └───────────────────────┬───────────────────────┘
                                    │  http://192.168.x.x:4310
                       ┌────────────▼─────────────┐
                       │  Android app (.apk)      │
                       │  optional: hosted server │
                       └──────────────────────────┘
```

---

## 1. Download and install

Ready-made builds are attached to the repository's **Releases** page — no
building required:

**➡ https://github.com/Hushnudbek-s-organisation/ScholarBridgeAi/releases/latest**

| Your device | File | Size | Link (always the newest build) |
| --- | --- | --- | --- |
| **Android phone / tablet** | `ScholarBridge.apk` | **4 MB** | `…/releases/latest/download/ScholarBridge.apk` |
| **Windows 10/11 — installer** | `ScholarBridge-Setup.exe` | **145 MB** | `…/releases/latest/download/ScholarBridge-Setup.exe` |
| Windows — no installation | `ScholarBridge-Portable.exe` | 121 MB | `…/releases/latest/download/ScholarBridge-Portable.exe` |
| macOS — Apple Silicon (M1–M4) | `ScholarBridge-arm64.dmg` | 158 MB | `…/releases/latest/download/ScholarBridge-arm64.dmg` |
| macOS — Intel | `ScholarBridge-x64.dmg` | 161 MB | `…/releases/latest/download/ScholarBridge-x64.dmg` |
| Linux — any distribution | `ScholarBridge.AppImage` | 120 MB | `…/releases/latest/download/ScholarBridge.AppImage` |
| Linux — Debian/Ubuntu package | `ScholarBridge.deb` | 116 MB | `…/releases/latest/download/ScholarBridge.deb` |

(Prefix every link with `https://github.com/Hushnudbek-s-organisation/ScholarBridgeAi`;
the sizes are the actual files of release `v1.0.3`.)

### Why the Android app is 4 MB and the desktop app is 145 MB

They do different jobs. The **APK is a client**: a thin installed shell that
talks to a ScholarBridge server, so it carries no database and no web runtime —
hence 4 MB. The **desktop app is the server**: the installer contains the
compiled ScholarBridge server (~110 MB), a complete PostgreSQL (~60 MB
compressed) and the Chromium runtime Electron needs (~120 MB), which is why it
is the size of any Electron app such as Slack, Discord or VS Code.

### Install — Windows

1. Download `ScholarBridge-Setup.exe`.
2. Windows SmartScreen shows *“Windows protected your PC”* (the build is not
   code-signed — see §7): **More info → Run anyway**.
3. Keep the default folder → **Install** → the app opens from the Start menu
   and the desktop shortcut.
4. First launch: 30–60 s (it creates its own database). Later launches: seconds.
5. `ScholarBridge-Portable.exe` does the same without installing anything —
   handy on a USB stick.

### Install — Android

1. Download `ScholarBridge.apk` **on the phone** (or transfer it by USB/Drive).
2. Open it. Android asks to allow installing from this source →
   **Settings → Allow from this source** → back → **Install**.
3. Open the app. It asks for a **server address** the first time:
   * on the laptop open ScholarBridge → **Share → Show phone connection (QR)**,
   * scan that QR with the phone (or type the address it shows), and press
     **Connect**.
4. The address is remembered — next time the app opens straight into your
   account. The laptop app must be running and both devices on the same Wi-Fi
   (or point the app at a hosted deployment, §5).

### Install — macOS and Linux

* **macOS:** open the `.dmg` → drag *ScholarBridge* into *Applications* →
  first launch: right-click the app → **Open** (unsigned build).
* **Linux AppImage:** `chmod +x ScholarBridge.AppImage && ./ScholarBridge.AppImage`
  (install `libfuse2` if your distribution needs it).
* **Linux .deb:** `sudo apt install ./ScholarBridge.deb`, then start
  *ScholarBridge* from your applications menu.

### Prefer to build it yourself?

The same two workflows build these binaries on GitHub's machines; run them
from **Actions → “Desktop app”** / **“Android APK”** and download the artifact.
Building locally is described in §2 (desktop) and §4 (Android).

## 2. Build the desktop app yourself

Requirements: Node.js 20–22. No database is needed for the build (every route
is dynamic and the connection pool is lazy, so `next build` never connects);
the *installed* app creates and starts its own PostgreSQL.

```bash
npm ci                          # app dependencies
cd desktop && npm ci && cd ..   # Electron + embedded PostgreSQL for the app

# build the installer for this OS
DATABASE_URL=postgresql://build:build@127.0.0.1:1/scholarbridge npm run desktop:dist

# (the DATABASE_URL is only a placeholder for the build — see
# scripts/build-desktop.mjs; you may also run `npm run db:dev:init` first if
# you want a real database while developing)
```

Output: `desktop/release/` — `.exe` (+ portable `.exe`) on Windows, `.dmg` on
macOS, `.AppImage`/`.deb` on Linux. Only the current platform is built; use the
GitHub workflow for the other two.

Useful variants:

```bash
npm run desktop:prepare   # only compile the bundled server (fast, no installer)
npm run desktop           # run the app from source (Electron + dev build)
npm run test:desktop-app  # end-to-end test of the boot path (see §8)
```

### What the installer contains

`scripts/build-desktop.mjs` produces Next's *standalone* server
(`NEXT_OUTPUT_STANDALONE=1 next build`), copies `public/` and
`.next/static/` into it, and hands it to electron-builder, which bundles:

```
resources/app/                    ← the app itself (main.mjs, preload, splash, Electron's deps)
resources/server/                 ← the compiled ScholarBridge server + its node_modules
resources/schema/full_schema.sql  ← the schema a new install applies
```

The server bundle is staged first (`desktop/build-resources/server`): Next's
standalone output contains one relative symlink (`pg-<hash> → ../../node_modules/pg`)
that electron-builder cannot archive on Windows, so the build replaces every
link with the real files before packaging.

`app/` and `server/` are deliberately separate: Electron executes whatever is
in `resources/app`, so bundling the server there as well merged two
`package.json` files (the server's has no `main`) and the installed app died
with `Cannot find module …\resources\app\index.js`. `scripts/build-desktop.mjs`
now verifies the packed layout and refuses to produce an installer without
`app/main.mjs`, `server/server.js` and `schema/full_schema.sql`.

so the installed program needs neither Node.js, Docker nor this repository.

### First launch and where data lives

| OS | Data folder |
| --- | --- |
| Windows | `%APPDATA%\ScholarBridge` |
| macOS | `~/Library/Application Support/ScholarBridge` |
| Linux | `~/.config/ScholarBridge` |

The first launch takes 30–60 seconds because the app initialises a PostgreSQL
cluster and applies `supabase/full_schema.sql`; later launches take a couple of
seconds. The catalogue (universities, programmes, scholarships) is filled in the
background right after startup, so the first page that shows lists may take a
bit longer than the ones after it. The folder holds:

* `postgres/` — your database (back this up: it *is* your data),
* `session-secret` — the key that signs your login cookie (per install),
* `desktop-config.json` — settings such as "allow phone on this Wi-Fi",
* `scholarbridge.log` — the app's log (open it from *File → Open error log*).

Uninstalling the program keeps this folder, so reinstalling restores your data.
Delete the folder to start from scratch. **Uninstall does not delete data on
purpose** — that is the only copy of it.

### The app's menu

* **File** — open in browser, open data folder, open error log, restart engine.
* **View** — reload, zoom, full screen.
* **Share** — *Allow phone on this Wi-Fi* (starts sharing and shows a QR code),
  *Show phone connection (QR)*, copy app address.
* **Help** — About (engine address, data folder, versions).

---

## 3. Put it on your phone

### 3a. The Android app (recommended)

Build/obtain `app-debug.apk` (§1 or §4), copy it to the phone (USB, Google
Drive, or any link) and open it. Android asks once for permission to install
apps from this source (*Settings → Install unknown apps*).

On first launch the app asks for the **server address** — type the address the
desktop app shows, or open *Share → Show phone connection (QR)* on the laptop
and scan it. The address is remembered, so the app opens straight onto your
account next time.

> **Same Wi-Fi required** for the "laptop as server" setup, and the laptop app
> must be running. Guest Wi-Fi and some routers isolate devices from each other
> — use your normal home network, or a hosted deployment (§5).

### 3b. Nothing to install: the phone browser

With *Allow phone on this Wi-Fi* on, the QR code also opens the full site in the
phone's browser. It is already mobile-first, and *Add to Home screen* gives it an
icon and a full-screen window (the app ships a web app manifest and icons).

---

## 4. Build the Android app yourself

Quickest: **open `mobile/android` in Android Studio** (*Open project*) → let
Gradle sync → *Run* on a device, or *Build → Build Bundle(s)/APK(s) → Build
APK(s)*. The project is committed complete (Gradle wrapper, manifest, icons,
splash screen) — nothing has to be generated first.

Command line (needs JDK 21 + Android SDK, `ANDROID_HOME` set or
`mobile/android/local.properties` with `sdk.dir=...`):

```bash
cd mobile && npm install && cd ..
npm run mobile:apk           # debug APK  → mobile/android/app/build/outputs/apk/debug/
npm run mobile:apk:release   # release APK (see signing below)
```

`npm run mobile:prepare` (icons + `capacitor sync` only) is handy after editing
`mobile/www/`.

**Bake in a server address** so the app never asks on first launch — useful when
you distribute builds for a hosted deployment:

```bash
SCHOLARBRIDGE_DEFAULT_SERVER=https://app.your-domain.com npm run mobile:apk
```

**Release signing** (only needed for the Play Store or a stable upgrade path):
create a keystore once and put it next to the project —

```bash
keytool -genkey -v -keystore mobile/android/sb-release.jks \
  -alias scholarbridge -keyalg RSA -keysize 2048 -validity 10000
cat > mobile/android/keystore.properties <<'EOF'
storeFile=sb-release.jks
storePassword=…
keyAlias=scholarbridge
keyPassword=…
EOF
```

`keystore.properties`, `*.jks` and `*.keystore` are git-ignored. Without them the
release build is signed with the local debug key, which installs fine for
private distribution but cannot be published on Google Play.

Icons and the launch screen are generated from the app's real logo —
`mobile/scripts/generate-icons.mjs` (pure JavaScript, no `sharp`/native
toolchain) rewrites every density of `ic_launcher`, the adaptive-icon
foregrounds and the splash screens from `public/icon-512.png`.

---

## 5. Using a hosted server instead

Both apps can talk to a hosted deployment (Render/Supabase, see
[`DEPLOYMENT.md`](../DEPLOYMENT.md)) instead of the bundled one:

* **Android** — enter the https address on first launch, or bake it in with
  `SCHOLARBRIDGE_DEFAULT_SERVER`.
* **Desktop** — either enter nothing and keep the local install, or start the
  app pointed at the server:

  ```bash
  SCHOLARBRIDGE_SERVER_URL=https://app.your-domain.com  # Windows: set SCHOLARBRIDGE_SERVER_URL=…
  ```

  (or write `{"serverUrl": "https://…"}` into `desktop-config.json`). The
  window then loads the hosted app and the bundled database is not started.

Accounts do **not** sync between a local install and a hosted deployment: they
are separate databases. Pick one as your source of truth.

---

## 6. Environment variables that only the apps use

| Variable | Where | Meaning |
| --- | --- | --- |
| `APP_PLAIN_HTTP` | set by the desktop launcher (`=1`) | The app is served over plain `http://` on the user's machine or LAN: the session cookie is not marked `Secure` (the browser would drop it), and the CSP does not `upgrade-insecure-requests` (it would break the app's own assets). Never set this on a public deployment. |
| `SCHOLARBRIDGE_SERVER_URL` | desktop | Use a hosted deployment instead of the bundled server. |
| `SCHOLARBRIDGE_DEFAULT_SERVER` | mobile build | Default address baked into the APK; empty = ask on first launch. |
| `SEED_ON_REQUEST` | set by the desktop launcher (`=on`) | A single-user self-hosted install may fill the catalogue on the first page load (see `src/lib/db/requestSeeding.ts`). |
| `GOOGLE_API_KEY`, `GEMINI_API_KEY`, … | optional | AI features are off until a provider key is configured, in both apps; everything else works. Provider keys are **not** shipped in the installers. |

A local install is a normal deployment, so the usual rules still apply: strong
`SESSION_SECRET` (generated per install), no secrets in the renderer, and the
database bound to loopback.

---

## 7. Security notes

* **Unsigned builds.** No code-signing certificate is included. Windows shows
  SmartScreen, macOS needs right-click → *Open*. Signing is a paid certificate;
  when you have one, set `CSC_LINK`/`CSC_KEY_PASSWORD` (Windows/macOS) for
  electron-builder.
* **Phone access is opt-in and temporary.** Sharing starts only when you tick
  *Allow phone on this Wi-Fi*, stops when you untick it or quit the app, and
  binds the server to the LAN only while it is on. Treat any Wi-Fi you do not
  control as hostile: turn sharing off on public networks. Server-side
  protections (rate limits, CSRF origin checks, CSP, HttpOnly session cookies)
  are unchanged — the same code that protects the hosted deployment runs here.
* **The database is loopback-only** (`listen_addresses=127.0.0.1`) with a
  random password generated per install. It is never reachable from the phone or
  the network; only the web server is, and only when you enable sharing.
* **The Android app is a WebView shell with no privileged API.** It exposes no
  Node.js/Android bridge, opens external links in the real browser, and stores
  one thing: the server address. `usesCleartextTraffic` is enabled because the
  supported local setup is plain HTTP on your own Wi-Fi; with a hosted https
  server everything travels over TLS.
* **Keep the app updated** when the schema changes: a new build re-applies
  `full_schema.sql` on launch (idempotent — it only adds what is missing).

---

## 8. Tests and CI

| Command | What it proves |
| --- | --- |
| `npm run test:desktop-app` | Boots the *real* desktop engine end to end with a throwaway data folder: private PostgreSQL → `full_schema.sql` → standalone server → `/api/health` → the landing page renders with the plain-HTTP header policy, static assets and catalogue API work, and shutdown releases the port. |
| `npm run test:security` | Includes the `APP_PLAIN_HTTP` rules: no `Secure` cookie on `http://`, no `upgrade-insecure-requests`, no HSTS — and unchanged behaviour when the flag is off. |
| `node scripts/build-desktop.mjs --verify-only` | Inspects an already packed application (`desktop/release/*-unpacked` / `*.app`): the entry Electron runs is `app/main.mjs`, `server/server.js` and `schema/full_schema.sql` are present, and the server was not merged into `app/`. Runs automatically after every packaging, and the build fails instead of uploading a broken installer. |
| `npm run typecheck`, `npm run lint` | The shared codebase still compiles and lints. |

Prepare the build first (`npm run desktop:prepare`), then run
`npm run test:desktop-app`. The workflow files
`.github/workflows/desktop-app.yml` and `.github/workflows/android-apk.yml`
build the real installers on GitHub's machines.

---

## 9. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Windows: *“A JavaScript error occurred in the main process — Cannot find module …\resources\app\index.js”* | The installed build predates 1.0.4, where the compiled server was bundled into `resources/app` and replaced the app's `package.json`. Install the current build (uninstall first is not needed — the installer overwrites the program, your data stays). |
| Desktop: "could not start" on first launch | Look at *File → Open error log*. Most common: the port range 4310–4335 is busy (close the other copy — only one instance may run), or PostgreSQL cannot run as **root** on Linux (run the app as a normal user). |
| Desktop: window shows a browser error | The bundled server died. *File → Restart engine*. If it repeats, the log names the failing step (database, schema, server). |
| Desktop: works, but no AI answers | No AI provider key is configured in that install. Add one to the deployment env (or use a hosted deployment) — the rest of the app is unaffected. |
| Phone: "Could not reach …" | Phone and laptop on different networks; sharing off; firewall blocking port 4310 (allow the app on *private* networks); guest Wi-Fi isolating devices; laptop asleep. |
| Phone: app opens but shows the connect screen again | The address was unreachable, so it was not saved. Check the laptop's *Share → Show phone connection*. |
| Android build: `SDK location not found` | Set `ANDROID_HOME`, or create `mobile/android/local.properties` with `sdk.dir=/path/to/Android/Sdk`. |
| Android build: Gradle download fails | First build needs internet for Gradle + Android dependencies. In mainland networks configure a mirror, or build with the GitHub workflow. |
| macOS: "app is damaged" | Unsigned build, quarantine attribute: `xattr -dr com.apple.quarantine /Applications/ScholarBridge.app`. |
| Linux: `.AppImage` will not run | Make it executable: `chmod +x ScholarBridge-1.0.0.AppImage`, and install `libfuse2` if your distribution needs it. |

---

## 10. File map

```
desktop/
  package.json          Electron app manifest (deps: electron, electron-builder, embedded-postgres, pg, qrcode)
  main.mjs              Electron main process: window, menu, QR, lifecycle (thin — no business logic)
  boot.mjs              Database + schema + server startup (testable under plain Node)
  preload.cjs           Exposes only { isDesktopApp, platform, arch, chrome } to the page
  splash.html           Branded startup screen with live status
  electron-builder.mjs  Installer configuration for Windows/macOS/Linux
  build/icon.png        App icon (generated from public/icon-512.png)
mobile/
  package.json          Capacitor app manifest
  capacitor.config.json App id, name, web dir
  www/                  The app shell: server address + connection screen
  scripts/generate-icons.mjs   Launcher icons + splash screens from the real logo
  android/              Complete Android Studio / Gradle project (committed)
scripts/
  build-desktop.mjs     Standalone server + installer build
  build-mobile.mjs      Icons + Capacitor sync + Gradle APK build
  check-desktop-app.mjs End-to-end boot test
.github/workflows/
  desktop-app.yml       Windows / macOS / Linux installers
  android-apk.yml       Android APK
```

## 11. Not done (deliberately)

* **iOS** — a Capacitor iOS target needs macOS + Xcode and an Apple developer
  account; the same `mobile/www` shell applies, ask for it if you need it.
* **Play Store / Microsoft Store publishing** — requires accounts, review and
  signing; the builds here are for direct distribution.
* **In-app purchases on mobile** — Premium checkout is a website flow; store
  billing policies would forbid reusing it inside a store-distributed app.
* **Offline AI** — AI calls go to a provider, so they need the internet in both
  apps. Everything else in the catalogue works offline.
