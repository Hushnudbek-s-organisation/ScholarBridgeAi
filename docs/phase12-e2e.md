# Phase 12 browser E2E

Run the browser tests locally with:

```sh
npm ci
npm run test:e2e
```

Requirements: Node.js/npm compatible with this repository, Linux x86_64 with the runtime libraries needed by `embedded-postgres` and packaged headless Chromium, and enough free disk/memory for a temporary PostgreSQL cluster and a Next.js dev server. On Debian/Ubuntu, install the Chromium system dependencies first (at minimum `libnspr4` and `libnss3`; other base image packages may also be required): `sudo apt-get update && sudo apt-get install -y libnspr4 libnss3`. No system browser, externally managed database, Supabase project, `.env.local`, production credentials, or paid AI provider is needed. The project pins Playwright and a Chromium binary in the lockfile.

The runner allocates two loopback ports, refuses to start if either is already occupied, creates a temporary embedded PostgreSQL cluster and a uniquely named database, pushes only the app's current Drizzle schema to that disposable database, and seeds deterministic isolated profiles/university/scholarship/document fixtures via the app schema and password hasher. It starts the real Next.js development server against that database, waits for `/api/health`, and runs Playwright against the app. The app receives a local-only session secret; environment variables likely to contain external API/provider credentials are removed from the server environment. Fixtures and database files are removed when the Playwright run ends, including on a setup/test failure. The test signs in through the production email/password route and relies on the normal signed HttpOnly session; there is no test-auth endpoint or authentication bypass.

Scenarios exercise the public catalogue's verification-aware numeric disclosure, real authenticated university search/country filtering, profile-owned dashboard and saved scholarship/deadline state, and ownership of the document vault. These browser tests are separate from the repository's source-level responsive audit and Node integration scripts. Playwright traces/screenshots/videos on failures are stored under the ignored `test-results/` directory.

The runner is deliberately for local Linux disposable testing only; it does not configure CI. CI should only be added once a runner with a reproducible compatible embedded-Postgres/Chromium runtime is provisioned. Do not point it at staging or production, and do not run any catalog/integrity migration as part of E2E.
