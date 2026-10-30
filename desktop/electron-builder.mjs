/**
 * Every file electron-builder needs to turn `desktop/` into an installer.
 *
 * The important part is `extraResources`: the compiled ScholarBridge server
 * (Next.js "standalone" output) and the canonical SQL schema are shipped
 * INSIDE the app under `resources/`, so an installed copy has no dependency on
 * the repository, on Node.js, or on Docker. The app starts its own server on
 * 127.0.0.1 and its own PostgreSQL instance in the user's data folder.
 */
const config = {
  appId: "ai.scholarbridge.app",
  productName: "ScholarBridge",
  copyright: "Copyright © ScholarBridgeAI",
  directories: {
    // `npm start` in desktop/ uses the repo's standalone build; `npm run dist`
    // copies nothing by hand — scripts/build-desktop.mjs has already put the
    // server where this expects it.
    output: "release",
    buildResources: "build",
  },
  // No asar: the app spawns PostgreSQL binaries out of node_modules and reads
  // the schema SQL from disk. Keeping the files real avoids the whole class of
  // "works in dev, ENOENT inside the installer" bugs for ~40 MB of extra disk.
  asar: false,
  // Smaller installer, same app: LZMA instead of the default normal
  // compression, and only the Chromium UI locales this audience can use
  // (every other language pack is ~0.5 MB of dead weight each).
  compression: "maximum",
  electronLanguages: ["en-US", "ru"],
  files: [
    "main.mjs",
    "boot.mjs",
    "preload.cjs",
    "splash.html",
    "build/icon.png",
    "package.json",
    // Documentation and source maps are not needed at runtime.
    "!**/*.map",
    "!**/*.md",
  ],
  // `resources/server` — NOT `resources/app`. Electron loads the program from
  // `resources/app`, so copying the compiled server there merged two bundles in
  // one folder: the server's package.json (which has no `main`) replaced the
  // app's, and Electron then looked for `resources/app/index.js` and died with
  // "Cannot find module". Keep the two trees strictly apart.
  // `desktop/build-resources/server` is a symlink-free copy of the standalone
  // build (scripts/build-desktop.mjs stages it): electron-builder's archiver
  // cannot follow Next's `pg-<hash>` relative symlink on Windows.
  extraResources: [
    { from: "build-resources/server", to: "server", filter: ["**/*"] },
    // The official Node.js runtime the engine runs on (see
    // scripts/build-desktop.mjs → stageNodeRuntime). Optional: when the folder
    // is empty the app falls back to Electron's built-in Node.
    { from: "build-resources/node", to: "node", filter: ["**/*"] },
    { from: "../supabase/full_schema.sql", to: "schema/full_schema.sql" },
  ],
  extraMetadata: {
    main: "main.mjs",
  },
  win: {
    target: [
      { target: "nsis", arch: ["x64"] },
      { target: "portable", arch: ["x64"] },
    ],
    icon: "build/icon.png",
    // No code-signing certificate in this project: Windows SmartScreen will
    // show "unrecognised app" on first run and the user picks "More info →
    // Run anyway". Documented in APP.md rather than silently bypassed.
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "ScholarBridge",
    uninstallDisplayName: "ScholarBridge",
    deleteAppDataOnUninstall: false,
  },
  mac: {
    target: [{ target: "dmg", arch: ["arm64", "x64"] }],
    category: "public.app-category.education",
    icon: "build/icon.png",
    hardenedRuntime: true,
  },
  linux: {
    target: [
      { target: "AppImage", arch: ["x64"] },
      { target: "deb", arch: ["x64"] },
    ],
    category: "Education",
    icon: "build/icon.png",
    maintainer: "ScholarBridgeAI <maintainers@scholarbridge.ai>",
    synopsis: "Study abroad: universities, scholarships and applications",
  },
};

export default config;
