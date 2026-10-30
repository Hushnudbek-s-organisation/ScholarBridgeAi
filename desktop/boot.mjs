/**
 * Everything the desktop app needs to turn itself into a standalone program —
 * kept separate from Electron so it can be tested (and reused) under plain
 * Node:
 *
 *   1. a private PostgreSQL instance in the user's data folder
 *      (`embedded-postgres`, no Docker, no system Postgres, no admin rights),
 *   2. the canonical schema from `supabase/full_schema.sql`,
 *   3. the compiled ScholarBridge server (Next.js "standalone" output) running
 *      on 127.0.0.1 with a per-install session secret.
 *
 * Nothing here talks to Electron APIs, so `scripts/check-desktop-app.mjs`
 * exercises the real boot path end to end.
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

/** A port nobody else is listening on, starting at `start`. */
export async function findFreePort(start, span = 25, host = "127.0.0.1") {
  for (let port = start; port < start + span; port += 1) {
    if (await isPortFree(port, host)) return port;
  }
  throw new Error(`No free port in ${start}–${start + span - 1}`);
}

export function isPortFree(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const done = (free) => {
      socket.destroy();
      resolve(free);
    };
    socket.setTimeout(600);
    socket.once("connect", () => done(false)); // something answers there
    socket.once("timeout", () => done(true));
    socket.once("error", () => done(true));
  });
}

/**
 * The session signing key lives next to the database, is generated on first
 * run and never leaves the machine. Losing it only signs existing users out.
 */
export function ensureSessionSecret(dataDir) {
  const file = path.join(dataDir, "session-secret");
  if (fs.existsSync(file)) {
    const existing = fs.readFileSync(file, "utf8").trim();
    if (existing.length >= 32) return existing;
  }
  fs.mkdirSync(dataDir, { recursive: true });
  const secret = randomBytes(32).toString("hex");
  fs.writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

/**
 * Password of the private database's `scholarbridge` role.
 *
 * It MUST be stable: PostgreSQL stores the password hash when the cluster is
 * initialised, so a freshly generated password on every launch fails with
 * `password authentication failed for user "scholarbridge"` (28P01) from the
 * second start onwards. It is generated once, kept next to the cluster
 * (0600) and reused.
 */
export function ensureDbPassword(dataDir) {
  const file = path.join(dataDir, "db-password");
  if (fs.existsSync(file)) {
    const existing = fs.readFileSync(file, "utf8").trim();
    if (existing.length >= 16) return existing;
  }
  fs.mkdirSync(dataDir, { recursive: true });
  const password = randomBytes(24).toString("hex");
  fs.writeFileSync(file, password, { mode: 0o600 });
  return password;
}

/**
 * Reset the password of an existing cluster whose password was lost.
 *
 * This is the repair path for installs created before the password was
 * persisted (their cluster holds a hash of a password nobody kept): the
 * cluster is stopped, `pg_hba.conf` is replaced for one boot by a loopback-only
 * `trust` policy, the password is reset with `ALTER ROLE`, and the original
 * authentication rules are restored before the app continues. No data is
 * touched, so an existing install is fixed instead of having to be deleted.
 */
async function resetDatabasePassword(instance, dataDir, databaseUrl, log) {
  const hba = path.join(dataDir, "postgres", "pg_hba.conf");
  const backup = `${hba}.scholarbridge-backup`;
  if (!fs.existsSync(hba)) throw new Error("pg_hba.conf is missing; cannot repair the database password.");

  log("[db] the cluster's password is not the one on disk — resetting it (data is kept)");
  await instance.stop();
  fs.copyFileSync(hba, backup);
  try {
    // Only loopback may connect, and only while the server has no known
    // password: this window exists for milliseconds and the port stays on
    // 127.0.0.1.
    fs.writeFileSync(
      hba,
      ["local all all trust", "host all all 127.0.0.1/32 trust", "host all all ::1/128 trust", ""].join("\n")
    );
    await instance.start();
    const { Client } = await import("pg");
    const url = new URL(databaseUrl);
    const password = decodeURIComponent(url.password);
    const client = new Client({
      host: "127.0.0.1",
      port: Number(url.port),
      user: decodeURIComponent(url.username),
      database: "postgres",
    });
    await client.connect();
    try {
      await client.query(`ALTER ROLE "${url.username}" WITH PASSWORD '${password.replace(/'/g, "''")}'`);
    } finally {
      await client.end().catch(() => {});
    }
    log("[db] password reset");
  } finally {
    await instance.stop();
    fs.copyFileSync(backup, hba);
    fs.rmSync(backup, { force: true });
    await instance.start();
  }
}

/** `server_encoding` of the cluster behind `databaseUrl` (e.g. UTF8, WIN1251). */
async function serverEncoding(databaseUrl) {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: databaseUrl.replace(/\/[^/]*$/, "/postgres") });
  await client.connect();
  try {
    const { rows } = await client.query("show server_encoding");
    return String(rows[0].server_encoding || "");
  } finally {
    await client.end().catch(() => {});
  }
}

/** Does the app's own database exist and already hold tables? */
async function appDatabaseHasTables(databaseUrl) {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    const { rows } = await client.query(
      "select count(*)::int as n from information_schema.tables where table_schema = 'public'"
    );
    return rows[0].n > 0;
  } catch {
    // 3D000: the database does not exist — i.e. nothing has been created yet.
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

/** True when PostgreSQL rejected the credentials (SQLSTATE 28P01). */
function isAuthFailure(error) {
  const code = error && typeof error === "object" ? error.code : undefined;
  if (code === "28P01") return true;
  return /password authentication failed|28P01/i.test(String(error && error.message ? error.message : error));
}

/**
 * Apply `full_schema.sql` to a fresh database (and re-apply it when the file
 * changes, e.g. after an app update). The script is written to be idempotent —
 * it creates what is missing and never drops data — so a re-run is safe.
 */
export async function applySchema(connectionString, schemaPath, dataDir, log = () => {}) {
  const sql = fs.readFileSync(schemaPath, "utf8");
  const hash = createHash("sha256").update(sql).digest("hex");
  const stampFile = path.join(dataDir, "schema-hash.txt");

  const { Client } = await import("pg");
  const client = new Client({ connectionString, connectionTimeoutMillis: 15_000 });
  await client.connect();
  try {
    const existing = await client.query(
      "select count(*)::int as n from information_schema.tables where table_schema = 'public'"
    );
    const marker = fs.existsSync(stampFile) ? fs.readFileSync(stampFile, "utf8").trim() : "";
    // A fresh database, or a new schema shipped by an app update.
    if (existing.rows[0].n === 0 || marker !== hash) {
      log(`[schema] applying (${existing.rows[0].n === 0 ? "fresh database" : "updated schema"})…`);
      await client.query(sql);
      fs.writeFileSync(stampFile, hash);
      const after = await client.query(
        "select count(*)::int as n from information_schema.tables where table_schema = 'public'"
      );
      log(`[schema] ready — ${after.rows[0].n} tables`);
    } else {
      log("[schema] up to date");
    }
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * The runtime the engine runs on.
 *
 * Preferred: the official Node.js shipped inside the app (`resources/node`).
 * Fallback: Electron itself in "run as node" mode. The fallback is what older
 * builds used exclusively, and on Windows the child exited immediately with
 * code 1, which surfaced to the student as "the server stopped while starting".
 */
export function resolveRuntime(serverDir) {
  const binary = process.platform === "win32" ? "node.exe" : "node";
  const packaged = path.resolve(serverDir, "..", "node", binary);
  if (fs.existsSync(packaged)) {
    const check = spawnSync(packaged, ["--version"], { encoding: "utf8", timeout: 15_000 });
    const version = String(check.stdout || "").trim();
    if (check.status === 0 && version.startsWith("v")) {
      return { command: packaged, env: {}, label: `bundled Node ${version}` };
    }
  }
  return {
    command: process.execPath,
    // Electron only behaves as Node when this is set.
    env: process.versions.electron ? { ELECTRON_RUN_AS_NODE: "1" } : {},
    label: process.versions.electron ? `Electron ${process.versions.electron} (as node)` : `Node ${process.version}`,
  };
}

/** Local IPv4 addresses a phone on the same Wi-Fi could use. */
export function lanAddresses() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const entry of list ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      out.push({ name, address: entry.address });
    }
  }
  return out;
}

function waitForExit(child, ms) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve(true);
      }
    };
    child.once("exit", finish);
    setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, ms);
  });
}

/**
 * Start the database + server and resolve once `/api/health` answers.
 *
 * Every failure path throws with a human sentence, because the Electron splash
 * shows it verbatim to the student instead of a stack trace.
 */
export async function startLocalServer(options) {
  const {
    appDir: appDirInput,
    dataDir,
    schemaPath,
    host = "127.0.0.1",
    port = 4310,
    dbPort = 55432,
    log = () => {},
    onStatus = () => {},
    serverTimeoutMs = 180_000,
    // Warm the catalogue in the background after the server answers (a fresh
    // install has an empty database that the request path seeds).
    warmUp = true,
  } = options;

  // Absolute paths: the server is spawned with this folder as its cwd, so a
  // relative path would resolve twice (…/.next/standalone/.next/standalone).
  const appDir = path.resolve(appDirInput);
  if (!fs.existsSync(path.join(appDir, "server.js"))) {
    throw new Error(
      `The bundled server is missing (${appDir}). Build it first: npm run desktop:prepare`
    );
  }
  fs.mkdirSync(dataDir, { recursive: true });

  let pg;
  let child;

  const stop = async () => {
    if (child && child.exitCode === null) {
      child.kill("SIGTERM");
      const exited = await waitForExit(child, 8_000);
      if (!exited) child.kill("SIGKILL");
    }
    child = undefined;
    if (pg) {
      const instance = pg;
      pg = undefined;
      await instance.stop().catch((err) => log(`[db] stop failed: ${err?.message ?? err}`));
    }
  };

  try {
    onStatus("database");
    log("[db] starting private PostgreSQL…");
    const { default: EmbeddedPostgres } = await import("embedded-postgres");
    const chosenDbPort = await findFreePort(dbPort, 25);
    const dbPassword = ensureDbPassword(dataDir);

    // `--encoding=UTF8` is not optional: without it initdb picks the encoding
    // from the locale, and on Windows that follows the OS code page — a Russian
    // install produced a WIN1251 cluster, where the catalogue's emoji and part
    // of the UZB/RU text cannot be stored at all:
    //   character with byte sequence 0xf0 0x9f 0x8c 0x90 … has no equivalent
    //   in encoding "WIN1251"
    // `--locale=C` keeps that choice independent of the user's regional
    // settings (the hosted deployment runs en_US.UTF-8; ordering here is done
    // in application code, not by the collation).
    const clusterDir = path.join(dataDir, "postgres");
    const createCluster = () =>
      new EmbeddedPostgres({
        databaseDir: clusterDir,
        user: "scholarbridge",
        password: dbPassword,
        port: chosenDbPort,
        persistent: true,
        // Loopback only: the database is never exposed to the local network,
        // even when the web server is shared with a phone.
        postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
        initdbFlags: ["--encoding=UTF8", "--locale=C"],
        onLog: (message) => log(`[db] ${message}`),
        onError: (message) => log(`[db] ${message instanceof Error ? message.message : message}`),
      });

    pg = createCluster();
    if (!fs.existsSync(path.join(clusterDir, "PG_VERSION"))) {
      log("[db] initialising the data folder (first run only)…");
      await pg.initialise();
    }
    await pg.start();
    log(`[db] listening on 127.0.0.1:${chosenDbPort}`);

    const dbUrl = `postgresql://scholarbridge:${dbPassword}@127.0.0.1:${chosenDbPort}/scholarbridge`;

    // Prove the stored password is the one this cluster knows. Installs made
    // before the password was persisted hold a hash of a password that was
    // never kept, and every launch after the first used to die here.
    const probe = async () => {
      const { Client } = await import("pg");
      const client = new Client({ connectionString: dbUrl.replace(/\/[^/]*$/, "/postgres") });
      await client.connect();
      await client.end().catch(() => {});
    };
    try {
      await probe();
    } catch (error) {
      if (!isAuthFailure(error)) throw error;
      await resetDatabasePassword(pg, dataDir, dbUrl, log);
      await probe();
    }

    // Clusters created by an earlier build on Windows may not be UTF-8. They
    // cannot hold the schema at all, so they are empty by definition: rebuild
    // rather than leave the user with an install that never starts.
    const encoding = await serverEncoding(dbUrl);
    if (encoding.toUpperCase() !== "UTF8") {
      if (await appDatabaseHasTables(dbUrl)) {
        throw new Error(
          `The private database was created with the "${encoding}" encoding, which cannot store ` +
            "the catalogue. Move the folder\n" +
            path.join(dataDir, "postgres") +
            "\nelsewhere and start ScholarBridge again — the app then creates a correct one."
        );
      }
      log(`[db] the existing cluster uses ${encoding}; rebuilding it as UTF-8 (it is still empty)`);
      await pg.stop();
      const stale = `${clusterDir}-${encoding.toLowerCase()}-${Date.now()}`;
      fs.renameSync(clusterDir, stale);
      fs.rmSync(stale, { recursive: true, force: true });
      fs.rmSync(path.join(dataDir, "schema-hash.txt"), { force: true });
      pg = createCluster();
      await pg.initialise();
      await pg.start();
      log("[db] recreated as UTF-8");
    }

    await pg.createDatabase("scholarbridge").catch(() => {
      /* already exists — the normal case on every run after the first */
    });

    onStatus("schema");
    await applySchema(dbUrl, schemaPath, dataDir, log);

    onStatus("server");
    const secret = ensureSessionSecret(dataDir);
    const serverPort = await findFreePort(port, 25, "127.0.0.1");
    const appUrl = `http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${serverPort}`;
    log(`[server] starting on ${host}:${serverPort}`);

    const runtime = resolveRuntime(appDir);
    log(`[server] runtime: ${runtime.label}`);

    child = spawn(runtime.command, [path.join(appDir, "server.js")], {
      cwd: appDir,
      env: {
        ...process.env,
        ...runtime.env,
        NODE_ENV: "production",
        NEXT_TELEMETRY_DISABLED: "1",
        PORT: String(serverPort),
        HOSTNAME: host,
        DATABASE_URL: dbUrl,
        SESSION_SECRET: secret,
        // Served over http:// on the user's own machine / Wi-Fi: without this
        // the session cookie would be Secure (and dropped), and the CSP would
        // rewrite asset URLs to https. See src/lib/security.ts.
        APP_PLAIN_HTTP: "1",
        APP_URL: appUrl,
        // A self-hosted single-user install is exactly the case the seeding
        // policy describes: fill the catalogue on the first page load.
        SEED_ON_REQUEST: "on",
        SCHEMA_AUTO_REPAIR: "auto",
        PG_POOL_MAX: "5",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Keep the engine's own output: when it dies, these lines are the only
    // useful explanation, and the student can copy them from the dialog.
    const engineLog = [];
    const remember = (line) => {
      engineLog.push(line);
      if (engineLog.length > 40) engineLog.shift();
    };
    const pipe = (stream, tag) => {
      let buffer = "";
      stream.setEncoding("utf8");
      stream.on("data", (chunk) => {
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          remember(line);
          log(`[${tag}] ${line}`);
        }
      });
    };
    pipe(child.stdout, "server");
    pipe(child.stderr, "server");

    let exitInfo = null;
    child.once("exit", (code, signal) => {
      exitInfo = { code, signal };
      log(`[server] exited (code=${code}, signal=${signal})`);
    });

    onStatus("waiting");
    const deadline = Date.now() + serverTimeoutMs;
    let healthy = false;
    while (Date.now() < deadline) {
      if (exitInfo) {
        const tail = engineLog.slice(-12).join("\n");
        const error = new Error(
          `The ScholarBridge engine stopped while starting (code ${exitInfo.code}).` +
            (tail ? `\n\n${tail}` : "")
        );
        error.engineOutput = tail;
        error.logFile = path.join(dataDir, "scholarbridge.log");
        throw error;
      }
      try {
        const res = await fetch(`${appUrl}/api/health`, { signal: AbortSignal.timeout(3_000) });
        if (res.ok) {
          healthy = true;
          break;
        }
      } catch {
        /* not up yet */
      }
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
    if (!healthy) {
      const tail = engineLog.slice(-12).join("\n");
      const error = new Error(
        "The ScholarBridge engine did not answer in time." + (tail ? `\n\n${tail}` : "")
      );
      error.engineOutput = tail;
      error.logFile = path.join(dataDir, "scholarbridge.log");
      throw error;
    }

    // First run only: the empty database is filled by the catalogue routes
    // (SEED_ON_REQUEST=on). Kick that off in the background *now* so the
    // student's first page load is not the one waiting for the catalogue.
    if (warmUp) {
      const clients = [
        fetch(`${appUrl}/api/universities?limit=1`).catch(() => {}),
        fetch(`${appUrl}/api/scholarships?limit=1`).catch(() => {}),
      ];
      void Promise.all(clients);
    }

    log("[server] ready");
    onStatus("ready");
    return {
      url: appUrl,
      port: serverPort,
      dbPort: chosenDbPort,
      process: () => child,
      stop,
    };
  } catch (err) {
    await stop();
    throw err;
  }
}
