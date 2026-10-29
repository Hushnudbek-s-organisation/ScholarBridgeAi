/**
 * Generate the Android launcher icons, adaptive-icon foregrounds and launch
 * screens from the app's real logo (`public/icon-512.png`).
 *
 *   node mobile/scripts/generate-icons.mjs
 *
 * Written with `pngjs` (pure JavaScript) on purpose: no native image toolchain
 * has to exist on the machine that builds the APK, which is what made
 * `@capacitor/assets`/sharp fragile on minimal CI runners.
 *
 * Every target keeps the dimensions the Capacitor template already uses, so
 * Android's density selection and the splash theme keep working unchanged.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const mobileDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resDir = path.join(mobileDir, "android", "app", "src", "main", "res");
const sourcePath = path.join(mobileDir, "..", "public", "icon-512.png");

const source = PNG.sync.read(fs.readFileSync(sourcePath));

/** Bilinear resample of an RGBA buffer. */
function resize(image, width, height) {
  const out = new PNG({ width, height });
  const xRatio = image.width / width;
  const yRatio = image.height / height;
  for (let y = 0; y < height; y += 1) {
    const sy = Math.min(image.height - 1, (y + 0.5) * yRatio - 0.5);
    const y0 = Math.max(0, Math.floor(sy));
    const y1 = Math.min(image.height - 1, y0 + 1);
    const wy = sy - y0;
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(image.width - 1, (x + 0.5) * xRatio - 0.5);
      const x0 = Math.max(0, Math.floor(sx));
      const x1 = Math.min(image.width - 1, x0 + 1);
      const wx = sx - x0;
      for (let c = 0; c < 4; c += 1) {
        const p00 = image.data[(y0 * image.width + x0) * 4 + c];
        const p10 = image.data[(y0 * image.width + x1) * 4 + c];
        const p01 = image.data[(y1 * image.width + x0) * 4 + c];
        const p11 = image.data[(y1 * image.width + x1) * 4 + c];
        const top = p00 + (p10 - p00) * wx;
        const bottom = p01 + (p11 - p01) * wx;
        out.data[(y * width + x) * 4 + c] = Math.round(top + (bottom - top) * wy);
      }
    }
  }
  return out;
}

/** Background colour of the logo, so splashes match it exactly. */
const background = {
  r: source.data[0],
  g: source.data[1],
  b: source.data[2],
  a: 255,
};

function canvas(width, height, color) {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i += 1) {
    png.data[i * 4] = color.r;
    png.data[i * 4 + 1] = color.g;
    png.data[i * 4 + 2] = color.b;
    png.data[i * 4 + 3] = color.a;
  }
  return png;
}

/** Draw `logo` centred on `target`, with an optional mask. */
function pasteCentered(target, logo, mask) {
  const offsetX = Math.round((target.width - logo.width) / 2);
  const offsetY = Math.round((target.height - logo.height) / 2);
  const cx = logo.width / 2;
  const cy = logo.height / 2;
  for (let y = 0; y < logo.height; y += 1) {
    for (let x = 0; x < logo.width; x += 1) {
      const alpha = mask ? mask(x, y, logo.width, logo.height, cx, cy) : 1;
      if (alpha <= 0) continue;
      const tx = offsetX + x;
      const ty = offsetY + y;
      if (tx < 0 || ty < 0 || tx >= target.width || ty >= target.height) continue;
      const from = (y * logo.width + x) * 4;
      const to = (ty * target.width + tx) * 4;
      target.data[to] = logo.data[from];
      target.data[to + 1] = logo.data[from + 1];
      target.data[to + 2] = logo.data[from + 2];
      target.data[to + 3] = Math.round(logo.data[from + 3] * alpha);
    }
  }
  return target;
}

/** Anti-aliased circle mask. */
function circleMask(x, y, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 0.5;
  const distance = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
  return Math.max(0, Math.min(1, radius - distance + 0.5));
}

/** Anti-aliased rounded-rectangle mask (Android's squircle-ish legacy icon). */
function roundedMask(x, y, width, height) {
  const radius = Math.min(width, height) * 0.225;
  const dx = Math.max(radius - (x + 0.5), 0, x + 0.5 - (width - radius));
  const dy = Math.max(radius - (y + 0.5), 0, y + 0.5 - (height - radius));
  const distance = Math.hypot(dx, dy);
  return Math.max(0, Math.min(1, radius - distance + 0.5));
}

const written = [];
function write(file, png) {
  fs.writeFileSync(file, PNG.sync.write(png));
  written.push(`${path.relative(resDir, file)} (${png.width}×${png.height})`);
}

/** Every existing PNG we own is regenerated at its current size. */
function regenerate(kind) {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(".png")) found.push(full);
    }
  };
  walk(resDir);

  for (const file of found) {
    const existing = PNG.sync.read(fs.readFileSync(file));
    const { width, height } = existing;
    const isForeground = /ic_launcher_foreground/.test(file);
    const isRound = /ic_launcher_round/.test(file);
    const isLauncher = /ic_launcher\.png$/.test(file);
    const isSplash = /splash\.png$/.test(file);

    if (kind === "launcher" && (isForeground || isSplash)) continue;
    if (kind === "splash" && !isSplash) continue;
    if (kind === "launcher" && !isLauncher && !isRound) continue;

    if (isForeground) {
      // Adaptive icon foreground: the system masks a 72dp circle out of a
      // 108dp canvas, so the mark must sit inside the safe zone.
      const size = Math.round(Math.min(width, height) * 0.62);
      const logo = resize(source, size, size);
      write(file, pasteCentered(canvas(width, height, { r: 0, g: 0, b: 0, a: 0 }), logo));
    } else if (isRound) {
      const logo = resize(source, width, height);
      write(file, pasteCentered(canvas(width, height, { r: 0, g: 0, b: 0, a: 0 }), logo, circleMask));
    } else if (isLauncher) {
      const logo = resize(source, width, height);
      write(file, pasteCentered(canvas(width, height, background), logo, roundedMask));
    } else if (isSplash) {
      const target = canvas(width, height, background);
      const logoSize = Math.round(Math.min(width, height) * 0.34);
      const logo = resize(source, logoSize, logoSize);
      write(file, pasteCentered(target, logo, roundedMask));
    }
  }
}

if (!fs.existsSync(resDir)) {
  console.error("✖ The Android project is missing. Run `npx cap add android` in mobile/ first.");
  process.exit(1);
}

regenerate("launcher");
regenerate("splash");

console.log(`Generated ${written.length} Android images from public/icon-512.png:`);
for (const line of written.slice(0, 6)) console.log(`  ${line}`);
if (written.length > 6) console.log(`  … and ${written.length - 6} more`);
