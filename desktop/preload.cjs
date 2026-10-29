/**
 * Preload for the ScholarBridge desktop window.
 *
 * Deliberately tiny: the renderer runs the same, unmodified ScholarBridge web
 * app, so it gets no Node.js access and no privileged API beyond the two
 * harmless facts below. Anything the web app needs, it already does over HTTP.
 */
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("scholarbridgeDesktop", {
  isDesktopApp: true,
  platform: process.platform,
  arch: process.arch,
  chrome: process.versions.chrome,
});
