/**
 * ScholarBridge desktop — Electron main process.
 *
 * This is not a browser pointed at a website: the app carries the ScholarBridge
 * server and its own PostgreSQL database, starts them on launch, and stops
 * them on quit. The window then talks to 127.0.0.1 over loopback, so the app
 * works with no internet connection at all (the AI features need one, the
 * catalogue, tracking and profile do not).
 *
 * The boot logic lives in boot.mjs so it can be tested under plain Node
 * (scripts/check-desktop-app.mjs). This file only does Electron things:
 * windows, menus, the phone-pairing QR, and shutdown.
 */
import { app, BrowserWindow, clipboard, dialog, Menu, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { lanAddresses, startLocalServer } from "./boot.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const isPackaged = app.isPackaged;
const repoRoot = path.resolve(here, "..");

/** The compiled server: inside the installer, or the repo build in dev. */
const serverDir = isPackaged
  ? path.join(process.resourcesPath, "server")
  : path.join(repoRoot, ".next", "standalone");
const schemaPath = isPackaged
  ? path.join(process.resourcesPath, "schema", "full_schema.sql")
  : path.join(repoRoot, "supabase", "full_schema.sql");

const dataDir = app.getPath("userData");
const logFile = path.join(dataDir, "scholarbridge.log");
const configFile = path.join(dataDir, "desktop-config.json");

/** @type {{allowLan?: boolean, serverUrl?: string}} */
let config = {};
try {
  config = JSON.parse(fs.readFileSync(configFile, "utf8"));
} catch {
  config = {};
}

function saveConfig() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
}

function log(line) {
  const text = `${new Date().toISOString()} ${line}`;
  console.log(text);
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    // Keep the log small: rotate once past ~2 MB.
    if (fs.existsSync(logFile) && fs.statSync(logFile).size > 2 * 1024 * 1024) {
      fs.renameSync(logFile, `${logFile}.1`);
    }
    fs.appendFileSync(logFile, `${text}\n`);
  } catch {
    /* logging must never break startup */
  }
}

/** A hosted deployment can be used instead of the bundled server. */
const remoteUrl = process.env.SCHOLARBRIDGE_SERVER_URL || config.serverUrl || "";

let mainWindow = null;
let splash = null;
let server = null;
let quitting = false;

const STATUS_TEXT = {
  starting: { title: "Starting ScholarBridge", detail: "Preparing the app…" },
  database: { title: "Starting ScholarBridge", detail: "Starting the private database…" },
  schema: { title: "Starting ScholarBridge", detail: "Preparing your data…" },
  server: { title: "Starting ScholarBridge", detail: "Starting the app engine…" },
  waiting: { title: "Almost there", detail: "Waiting for the app to answer…" },
  ready: { title: "Ready", detail: "Opening ScholarBridge…" },
};

function setSplash(state, detail) {
  if (!splash || splash.isDestroyed()) return;
  const text = state === "error" ? { title: "ScholarBridge could not start", detail } : STATUS_TEXT[state] ?? STATUS_TEXT.starting;
  const safe = JSON.stringify(text);
  splash.webContents
    .executeJavaScript(`window.setStatus && window.setStatus(${safe})`)
    .catch(() => {});
}

function createSplash() {
  splash = new BrowserWindow({
    width: 420,
    height: 300,
    resizable: false,
    frame: false,
    show: false,
    backgroundColor: "#1B2A4A",
    icon: path.join(here, "build", "icon.png"),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  splash.loadFile(path.join(here, "splash.html"));
  splash.once("ready-to-show", () => splash?.show());
  splash.on("closed", () => {
    splash = null;
  });
}

function createMainWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 360,
    minHeight: 520,
    show: false,
    backgroundColor: "#1B2A4A",
    title: "ScholarBridge",
    icon: path.join(here, "build", "icon.png"),
    autoHideMenuBar: process.platform !== "darwin",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(here, "preload.cjs"),
      spellcheck: true,
    },
  });

  mainWindow.loadURL(url);
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    if (splash && !splash.isDestroyed()) {
      splash.close();
      splash = null;
    }
  });

  // The app is the window's only origin. Anything else opens in the real
  // browser instead of turning the app into a webview with no address bar.
  const isAppUrl = (target) => {
    try {
      const u = new URL(target);
      return u.origin === new URL(url).origin;
    } catch {
      return false;
    }
  };
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    if (!isAppUrl(target)) {
      shell.openExternal(target).catch(() => {});
      return { action: "deny" };
    }
    return { action: "allow" };
  });
  mainWindow.webContents.on("will-navigate", (event, target) => {
    if (!isAppUrl(target)) {
      event.preventDefault();
      shell.openExternal(target).catch(() => {});
    }
  });

  // If the local server dies, say so instead of showing a browser error page.
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    log(`[window] renderer gone: ${details.reason}`);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function boot() {
  if (remoteUrl) {
    log(`[boot] using hosted server ${remoteUrl}`);
    createMainWindow(remoteUrl);
    return;
  }
  setSplash("starting");
  const allowLan = Boolean(config.allowLan);
  server = await startLocalServer({
    appDir: serverDir,
    dataDir,
    schemaPath,
    host: allowLan ? "0.0.0.0" : "127.0.0.1",
    port: 4310,
    dbPort: 55432,
    log,
    onStatus: (state) => setSplash(state),
  });
  createMainWindow(server.url);
}

/** Restart the bundled server (port, LAN toggle, "try again"). */
async function restartServer() {
  if (server) {
    await server.stop();
    server = null;
  }
  await boot();
}

async function showPhoneWindow() {
  if (!server) {
    dialog.showMessageBox({ message: "The local server is not running.", type: "error" });
    return;
  }
  const port = server.port;
  const addresses = lanAddresses().map((entry) => `http://${entry.address}:${port}`);
  const url = addresses[0] ?? `http://127.0.0.1:${port}`;
  const qr = await QRCode.toDataURL(url, { width: 320, margin: 1, color: { dark: "#1B2A4A", light: "#ffffff" } });

  const win = new BrowserWindow({
    width: 460,
    height: 620,
    title: "Open ScholarBridge on your phone",
    backgroundColor: "#ffffff",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
  <style>
    body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;padding:28px;color:#0f172a;background:#fff}
    h1{font-size:19px;margin:0 0 6px}
    p{color:#475569;font-size:14px;line-height:1.5;margin:0 0 18px}
    img{width:300px;height:300px;display:block;margin:0 auto 18px;border-radius:12px;border:1px solid #e2e8f0}
    code{background:#f1f5f9;padding:3px 7px;border-radius:6px;font-size:13px;word-break:break-all}
    .warn{color:#9a3412;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:10px 12px;font-size:13px;line-height:1.45}
    ul{margin:0;padding-left:18px;color:#475569;font-size:13px;line-height:1.6}
  </style></head><body>
  <h1>Open ScholarBridge on your phone</h1>
  <p>Scan this with the ScholarBridge Android app, or open the address in any phone browser on the same Wi-Fi.</p>
  <img src="${qr}" alt="QR code">
  <p><code>${url}</code></p>
  <div class="warn">Phone access is on. Anyone on this Wi-Fi network can reach the app while it is open — turn it off in the Share menu when you are on public Wi-Fi.</div>
  <p style="margin-top:16px"><strong>If the QR does not work:</strong></p>
  <ul><li>Phone and laptop must be on the same Wi-Fi</li><li>Allow the app through the firewall (private networks)</li><li>Guest/“isolation” Wi-Fi blocks device-to-device traffic</li></ul>
  </body></html>`;
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
      label: "File",
      submenu: [
        {
          label: "Open in browser",
          click: () => server && shell.openExternal(server.url).catch(() => {}),
        },
        {
          label: "Open data folder",
          click: () => shell.openPath(dataDir).catch(() => {}),
        },
        {
          label: "Open error log",
          click: () => shell.openPath(logFile).catch(() => {}),
        },
        { type: "separator" },
        {
          label: "Restart engine",
          click: async () => {
            try {
              await restartServer();
            } catch (err) {
              reportBootError(err);
            }
          },
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(isPackaged ? [] : [{ role: "toggleDevTools" }]),
      ],
    },
    {
      label: "Share",
      submenu: [
        {
          label: "Allow phone on this Wi-Fi",
          type: "checkbox",
          checked: Boolean(config.allowLan),
          click: async (item) => {
            config.allowLan = item.checked;
            saveConfig();
            try {
              await restartServer();
              if (item.checked) await showPhoneWindow();
            } catch (err) {
              reportBootError(err);
            }
          },
        },
        {
          label: "Show phone connection (QR)…",
          enabled: Boolean(server),
          click: () => showPhoneWindow().catch((err) => log(`[share] ${err?.message ?? err}`)),
        },
        { type: "separator" },
        {
          label: "Copy app address",
          click: () => {
            if (server) clipboard.writeText(server.url);
          },
        },
      ],
    },
    {
      role: "help",
      submenu: [
        {
          label: "About ScholarBridge",
          click: () =>
            dialog.showMessageBox({
              type: "info",
              title: "About ScholarBridge",
              message: `ScholarBridge ${app.getVersion()}`,
              detail:
                `Platform: ${process.platform} ${process.arch}\n` +
                `Engine: ${remoteUrl ? remoteUrl : server?.url ?? "not running"}\n` +
                `Data folder: ${dataDir}\n` +
                `Electron ${process.versions.electron} · Chromium ${process.versions.chrome} · Node ${process.versions.node}`,
            }),
        },
        {
          label: "Online documentation",
          click: () =>
            shell
              .openExternal("https://github.com/Hushnudbek-s-organisation/ScholarBridgeAi")
              .catch(() => {}),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function reportBootError(err) {
  const message = err instanceof Error ? err.message : String(err);
  log(`[fatal] ${message}`);
  log(err instanceof Error && err.stack ? err.stack : "");
  setSplash("error", `${message}\n\nDetails are in:\n${logFile}`);

  const hint =
    process.platform === "linux" && /root|initdb|permission/i.test(message)
      ? "\n\nIf you are running as root, PostgreSQL refuses to start — run the app as a normal user."
      : "";

  // The dialog carries the engine's own last lines: asking a student to find
  // and copy a log file is a round trip that a readable message avoids.
  const detail = [];
  if (err && err.logFile) detail.push(`Log: ${err.logFile}`);
  detail.push(`Data folder: ${dataDir}`);
  detail.push("");
  detail.push("Copy these details if you need help:");
  detail.push(message);

  dialog
    .showMessageBox({
      type: "error",
      title: "ScholarBridge could not start",
      message: message.split("\n")[0] + hint,
      detail: detail.join("\n"),
      buttons: ["Copy details", "Open log folder", "Quit"],
      defaultId: 2,
      cancelId: 2,
      noLink: true,
    })
    .then((choice) => {
      if (choice.response === 0) {
        clipboard.writeText(
          [
            `ScholarBridge ${app.getVersion()} — ${process.platform} ${process.arch}`,
            `Electron ${process.versions.electron}, Node ${process.versions.node}`,
            `Data folder: ${dataDir}`,
            "",
            message,
          ].join("\n")
        );
        return reportBootError(err);
      }
      if (choice.response === 1) shell.openPath(dataDir).catch(() => {});
      return app.quit();
    })
    .catch(() => app.quit());
}

// Only one copy may run: a second instance would fight over the port and the
// database folder, so it focuses the window that is already open instead.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    if (process.platform === "win32") app.setAppUserModelId("ai.scholarbridge.app");
    log(`[app] starting ${app.getVersion()} (packaged=${isPackaged})`);
    createSplash();
    buildMenu();
    try {
      await boot();
    } catch (err) {
      reportBootError(err);
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && server) createMainWindow(server.url);
  });

  app.on("window-all-closed", () => {
    app.quit();
  });

  app.on("before-quit", async (event) => {
    if (quitting) return;
    quitting = true;
    event.preventDefault();
    log("[app] shutting down…");
    try {
      await server?.stop();
    } catch (err) {
      log(`[app] shutdown error: ${err?.message ?? err}`);
    }
    app.exit(0);
  });
}
