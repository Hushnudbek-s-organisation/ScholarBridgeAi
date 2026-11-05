# Browser and disposable-stack audits

```sh
npm ci
npm run build
E2E_NEXT_MODE=start npm run test:e2e
npm run test:stack-integration
npm run test:api-security:isolated
```

For development-server testing, omit `E2E_NEXT_MODE=start`. Production mode
requires a successful build first; `npm run typecheck` is a separate gate because
the production build intentionally does not run TypeScript checks.

## Runtime and isolation

Use compatible Node.js/npm on Linux x86_64, with enough disk/memory for embedded
PostgreSQL, Next.js and headless Chromium. Browser and database packages are
pinned in the lockfile. If NSS/NSPR libraries are absent, the runner extracts the
already installed Chromium package's `al2023.tar.br` into a unique temporary
folder, rechecks the executable, and cleans up afterward. Other missing system
libraries still need to be installed by the runner administrator. There is no
runtime browser download or system-browser requirement.

Two free loopback ports, a temporary PostgreSQL cluster and a unique database
are allocated. Only this disposable database receives the current Drizzle
schema and deterministic student/admin/catalogue/document fixtures. Never aim
these tests at production or reapply catalogue migrations to support them.

Provider credentials are blanked in the service environment, including matching
keys discovered in `.env*` files so Next/dotenv cannot restore them. Sanitized
values are not merged back with the parent's unsanitized environment. Database,
session and app URL are then assigned local-only values. The parent environment
is preserved. `npm run test:isolated-env` checks this with fake canary values and
an actual dotenv reload; it never reads real credentials in its test fixtures.

Sign-in uses the real email/password route and normal signed HttpOnly cookie,
not an authentication bypass. Plain-HTTP cookies are enabled **only for this
local test server**, including production-mode testing. The disposable database,
server and temporary files are cleaned up on completion or failure.

Chromium runs without Lambda's unstable `--single-process` mode, and without
`--disable-web-security` or insecure-content overrides. Tests use one worker and
no retries; failures are not hidden by automatic retries.

## Coverage and its limits

- Public routes in English, Uzbek and Russian at a phone viewport, intended
  response statuses, certificate/parent-link errors, horizontal overflow and
  unhandled browser errors. A literal percent-sign certificate code must not
  crash the page through double URL decoding.
- Student destination/pane navigation at desktop and phone widths; tab selection,
  nonempty visible panels, boundary failures and server errors.
- Read-only administrator section navigation. No publish, delete, reset, send or
  payment action is pressed by this traversal.
- Locale persistence, theme switching and missing reset-link recovery.
- Catalogue search/filter disclosure, profile-owned dashboards, saved awards,
  deadlines and document-vault isolation.

A mounted panel is **not** proof that every control inside it works. Tests do
not certify every account role, translated paragraph, external link, source
fact, real purchase, live AI answer, delivery provider, desktop installer or
mobile-native wrapper. The repository inventory checks are likewise static,
not additional browser interactions.

`npm run test:stack-integration` reuses the disposable stack for the public
provenance check and Telegram publishing/approval rehearsal. The latter uses a
local Telegram mock, never a real bot/channel. `test:api-security:isolated`
probes the route surface anonymously and retries validation-first private
handlers with plausible disposable fixture inputs. Such mutation-shaped
retries require explicit disposable mode and loopback; ordinary
`test:api-security` does not enable them. Remaining non-auth response statuses
are reported honestly rather than described as 401/403 successes.

## Evidence and CI

Playwright writes `test-results/e2e-report.json`, route/pane coverage attachments,
and failure traces/screenshots under ignored `test-results/`. Video is off by
default; opt in with `npx playwright install ffmpeg` followed by
`E2E_VIDEO=1 E2E_NEXT_MODE=start npm run test:e2e`.

CI runs the production browser suite and disposable-stack rehearsal after a
successful build, plus repository completeness, isolation, design-system and
schema-repair checks. `.github/workflows/ci.yml` is the active workflow;
`ci/security-ci.yml` is its portable mirror. Editing these files locally is not
evidence that a GitHub Actions run has passed.
