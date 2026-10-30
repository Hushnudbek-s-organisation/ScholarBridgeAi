/**
 * Minimal tar.gz reader/writer (ustar) — no dependencies.
 *
 * The compiled server ships as ONE `engine.tar.gz` instead of ~2400 loose
 * files. That matters on Windows: a per-file installer extraction can drop
 * files (antivirus quarantine, interrupted write), which surfaced as
 * `MODULE_NOT_FOUND` at engine start-up even though the same package booted
 * fine on CI. One archive written and unpacked by the app itself cannot be
 * half-installed, and it is smaller on disk.
 *
 * Only what this project needs: regular files and directories, ustar headers
 * with a 155-byte `prefix` (Next's paths exceed the 100-byte name field),
 * gzip compression.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const BLOCK = 512;

function octal(value, length) {
  // ustar numeric fields: octal, NUL-terminated (space-padded is also legal).
  return String(value.toString(8)).padStart(length - 1, "0") + "\0";
}

function writeString(buffer, offset, value, length) {
  const bytes = Buffer.from(value, "utf8");
  if (bytes.length > length) throw new Error(`tar field overflow: ${value}`);
  bytes.copy(buffer, offset, 0, bytes.length);
}

/** Split a long path into the fixed 100-byte name and 155-byte prefix fields. */
function splitName(relativePath) {
  const encoded = Buffer.byteLength(relativePath, "utf8");
  if (encoded <= 100) return { name: relativePath, prefix: "" };
  // Split at a directory boundary so the name part fits in 100 bytes.
  const parts = relativePath.split("/");
  let name = "";
  let index = parts.length;
  while (index > 0) {
    const candidate = parts.slice(index - 1).join("/");
    if (Buffer.byteLength(candidate, "utf8") > 100) break;
    name = candidate;
    index -= 1;
  }
  const prefix = parts.slice(0, index).join("/");
  if (Buffer.byteLength(prefix, "utf8") > 155 || !name) {
    throw new Error(`path too long for ustar: ${relativePath}`);
  }
  return { name, prefix };
}

function header(relativePath, size, mode, typeflag, mtime) {
  const block = Buffer.alloc(BLOCK, 0);
  const { name, prefix } = splitName(relativePath);
  writeString(block, 0, name, 100);
  writeString(block, 100, octal(mode, 8), 8);
  writeString(block, 108, octal(0, 8), 8); // uid
  writeString(block, 116, octal(0, 8), 8); // gid
  writeString(block, 124, octal(size, 12), 12);
  writeString(block, 136, octal(mtime, 12), 12);
  block.write("        ", 148, 8, "ascii"); // checksum placeholder
  block.write(typeflag, 156, 1, "ascii");
  writeString(block, 257, "ustar\0", 6);
  writeString(block, 263, "00", 2);
  writeString(block, 345, prefix, 155);

  let sum = 0;
  for (let i = 0; i < BLOCK; i += 1) sum += block[i];
  block.write(`${String(sum.toString(8)).padStart(6, "0")}\0 `, 148, 8, "ascii");
  return block;
}

/** Write `sourceDir` as a gzipped tar at `targetFile`. Returns the file size. */
export function writeTarGz(sourceDir, targetFile) {
  const chunks = [];
  const mtime = Math.floor(Date.now() / 1000);

  const visit = (dir, relative) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = relative ? `${relative}/${entry.name}` : entry.name;
      const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink()) {
        // Links were materialised before staging; anything left is a mistake.
        throw new Error(`refusing to archive a symlink: ${rel}`);
      }
      if (entry.isDirectory()) {
        chunks.push(header(`${rel}/`, 0, 0o755, "5", mtime));
        visit(full, rel);
      } else if (entry.isFile()) {
        const data = fs.readFileSync(full);
        const mode = stat.mode & 0o111 ? 0o755 : 0o644;
        chunks.push(header(rel, data.length, mode, "0", mtime), data);
        const padding = (BLOCK - (data.length % BLOCK)) % BLOCK;
        if (padding) chunks.push(Buffer.alloc(padding, 0));
      }
    }
  };

  visit(sourceDir, "");
  chunks.push(Buffer.alloc(BLOCK * 2, 0)); // end-of-archive marker
  const tar = Buffer.concat(chunks);
  const gz = zlib.gzipSync(tar, { level: 9 });
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.writeFileSync(targetFile, gz);
  return gz.length;
}

function readString(block, offset, length) {
  const slice = block.subarray(offset, offset + length);
  const end = slice.indexOf(0);
  return slice.subarray(0, end === -1 ? slice.length : end).toString("utf8");
}

function readOctal(block, offset, length) {
  const raw = readString(block, offset, length).trim();
  return raw ? parseInt(raw, 8) : 0;
}

/**
 * Extract a gzipped tar into `targetDir`.
 *
 * Returns the number of files written. Paths are validated: anything that
 * would escape the target directory is refused, so a corrupted archive cannot
 * write outside the app's own folder.
 */
export function extractTarGz(archiveFile, targetDir) {
  const tar = zlib.gunzipSync(fs.readFileSync(archiveFile));
  const root = path.resolve(targetDir);
  fs.mkdirSync(root, { recursive: true });

  let offset = 0;
  let files = 0;
  while (offset + BLOCK <= tar.length) {
    const block = tar.subarray(offset, offset + BLOCK);
    if (block.every((byte) => byte === 0)) break; // end of archive

    const name = readString(block, 0, 100);
    const prefix = readString(block, 345, 155);
    const type = readString(block, 156, 1) || "0";
    const size = readOctal(block, 124, 12);
    offset += BLOCK;

    const relative = prefix ? `${prefix}/${name}` : name;
    const destination = path.resolve(root, relative);
    if (destination !== root && !destination.startsWith(`${root}${path.sep}`)) {
      throw new Error(`archive entry escapes the target directory: ${relative}`);
    }

    if (type === "5") {
      fs.mkdirSync(destination, { recursive: true });
    } else if (type === "0" || type === "") {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, tar.subarray(offset, offset + size));
      files += 1;
    }
    offset += Math.ceil(size / BLOCK) * BLOCK;
  }
  return files;
}

/** Recursive size in bytes (used for logs). */
export function directorySize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? directorySize(full) : fs.statSync(full).size;
  }
  return total;
}
