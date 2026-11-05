# Site audit — 4 November 2026

Branch: `arena/6db82aa0-scholarbridgeai`.

## Scope and evidence

This is a repository/static audit plus isolated production-build browser and
integration testing. It is **not** a certification that every file was manually
reviewed, every rendered button was clicked, every external fact was verified,
or every possible account/provider combination was exercised.

- Starting checkout: 1,407 tracked files, 13 page routes, 157 API route files.
- The durable file inventory records each tracked/non-ignored working file's
  path, size, SHA-256 and actual check category. Source/JSON/YAML syntax checks
  are distinguished from files that were only inventoried.
- Static JSX analysis examines literal internal links and button declarations
  for narrowly identifiable incomplete actions. Dynamic URLs, indirect event
  handlers and business correctness need other checks.
- Browser testing uses real production email/password sign-in and signed
  HttpOnly cookies against a fresh embedded PostgreSQL database. No real
  customer data, production migrations, purchases, paid AI calls or channel
  publishing were used.

Durable machine-readable evidence:

- `data/site-audit/2026-11-04-file-inventory.json`
- `data/site-audit/2026-11-04-results.json`

Full local logs, Playwright JSON, failure traces and coverage attachments live
under ignored `test-results/`. They are not silently presented as committed
artefacts. CI now uploads its own browser/inventory evidence for seven days.

## Defects fixed

1. **Telegram Mini App hydration mismatch.** A warm server-side translation
   registry could render Uzbek while a fresh browser initially rendered English.
   The first render is now deterministic; the requested dictionary is selected
   after mount. Public locale tests detect unhandled hydration errors.
2. **Certificate percent-sign crash.** Next already decodes route parameters.
   Decoding a second time threw on a literal `%`, leaving verification stuck in
   loading. The component now trims the decoded parameter without decoding it
   again; the browser audit includes `/certificates/%25`.
3. **Isolated test credential leakage.** The server environment re-merged the
   unsanitized parent after deleting provider keys. That merge is removed.
   Provider keys are now blanked rather than deleted, including key names from
   `.env*`, preventing Next/dotenv from restoring them. Fake-canary tests verify
   dotenv non-restoration and preservation of the parent's environment.
4. **47 design-system findings.** Account-management controls now use the shared
   Button component and consistent touch sizes, semantic colors, radii and
   readable typography. Small admissions/chancing/sample copy was corrected.
   The existing design-system gate was not weakened.
5. **Outdated schema-repair expectations.** The old 96-table/119-FK magic counts
   were stale. Expected tables and FK identities now come from the actual
   Drizzle schema. The repair test checks exact table names and source/reference
   FK columns, not just totals; data-preservation checks remain in place.
6. **Misleading legal-page copy and timestamps.** The last-updated date is stable
   instead of changing on each render. Privacy copy distinguishes the HttpOnly
   session cookie from localStorage hints and describes pseudonymous analytics
   without promising that cookie blocking disables visit counting. English-only
   legal content is explicitly marked `lang="en"`.
7. **Browser test runtime and selectors.** Missing NSS/NSPR can be supplied from
   the installed package without another download. Video is opt-in, avoiding an
   undeclared ffmpeg requirement. Multi-context Chromium no longer runs in
   Lambda single-process mode or with web-security bypasses. Country selection,
   duplicate deadline titles, phone sign-in and recovery alert selectors match
   the actual UI rather than hiding errors with retries.
8. **Misleading anonymous-API audit output.** An empty-body 400 is no longer
   described as a 401/403 authorization success. Public reset/image routes have
   explicit classifications. Disposable-only follow-up probes supply plausible
   fixture inputs to validation-first private handlers; unresolved statuses
   remain visible for review rather than being silently certified.
9. **Regression coverage and CI drift.** Added repository completeness,
   isolation/source-contract, browser and disposable-stack gates. The active CI
   workflow and its previously stale portable mirror are aligned and checked
   for semantic equality.

## Test results

Final local results:

| Check | Result |
| --- | --- |
| Working-file inventory | 1,414 files; 806 source, 26 JSON, 8 YAML syntax checks |
| Static UI/link inventory | 710 button declarations; 42 literal internal links; no findings in the narrow checks |
| Production browser suite | **11 passed**, 0 failed/skipped/retries; 45 public route/locale cases |
| Student navigation | 37 destination/pane views at each of 1440 px and 390 px |
| Administrator navigation | 25 read-only sections |
| Mobile utility menu | 4 account destinations and signed-cookie logout |
| Anonymous API surface | 280 handlers / 157 files + 49 fixture follow-ups; no private 2xx responses |
| Remaining API classifications | 4 expected/missing-resource 404 responses; not claimed as auth verdicts |
| Schema repair | 18 passed; 113 exact tables / 130 exact FK identities |
| Isolation regression | 15 fake-canary environment assertions; 27 audit source contracts |
| Telegram rehearsal / provenance | 21 mock-channel assertions passed; provenance PASS |
| Typecheck / lint / i18n / build | PASS; lint 0 errors and 0 warnings |
| Performance budget | 9 passed; landing 1,269 KB, shared shell 1,025 KB uncompressed JS |
| Dependency audit | 0 high/critical; 19 moderate remain |

The machine-readable manifest includes per-test details and coverage attachments.
Relevant commands:

```sh
npm run typecheck
npm run lint:baseline
npm run check:i18n
npm run audit:check
npm run audit:ui
npm run test:site-completeness
npm run test:audit-safety
npm run test:isolated-env
npm run test:schema-repair
npm run build
npm run test:perf
E2E_NEXT_MODE=start npm run test:e2e
npm run test:stack-integration
npm run test:api-security:isolated
```

The broad baseline executed 91 checks: 86 passed immediately. Design-system and
schema-repair failures were fixed and rerun; provenance and channel checks were
rerun successfully with their missing disposable database/app prerequisites.
The desktop packaged-auth check still requires a separately prepared standalone
bundle and is not reported as a website regression pass. This is not an
unqualified “91/91 green” claim.

Browser coverage includes:

- 15 public/error URLs × 3 locales at 390 px: catalogue/detail pages, features,
  recovery/legal/Telegram pages, invalid certificate/parent links, literal `%`
  certificate input and a genuine 404; intended status, recovery alerts,
  horizontal overflow and unhandled errors.
- 14 student destinations and their pane buttons at 1440 px and 390 px;
  selected tabs, visible nonempty panels, overflow and boundary/server errors.
- Read-only traversal of all 25 administrator sections.
- Phone account menu: Premium, Telegram/alerts, rewards, parents and real logout.
- Theme/locale persistence, reset-link recovery, catalogue search/country
  filtering, profile-scoped dashboard/saved awards/deadlines and vault isolation.

These are **render/navigation and selected workflow checks**, not a click-through
of every control inside every pane. The admin traversal deliberately never
presses send, publish, charge, reset or delete.

## Remaining work and limitations

- Real payment, live AI, delivery-provider, production cron/publishing and
  administrative mutation workflows were not exercised against real services.
  The local Telegram rehearsal uses a mock; this is not proof of live delivery.
- Anonymous API probes do not prove every valid/adversarial payload is protected.
  Non-auth response classifications, including intentionally hidden diagnostics
  and missing disposable resource rows, are preserved in the results manifest.
- The live catalogue's duplicate/deadline/scholarship-detail integrity scripts
  were not aimed at production. Passing empty fixture queries would not verify
  production content, so no such catalogue-coverage claim is made.
- Authoritative source review remains incomplete. The prior evidence reports
  retain the backlog of 1,150 programmes/requirements, 313 rankings, 197
  unreviewed chancing institutions and 49 non-practice visa rows not freshly
  reviewed. Missing facts were not filled with invented values. Benchmark
  records are not equivalent to verified CDS datasets or calibrated personal
  admission probabilities.
- Privacy/terms remain English-only and are not legal advice or a legal review.
  Translated navigation does not imply translated legal paragraphs.
- Dependency audit still reports 19 moderate findings, with no high/critical
  findings at the configured audit threshold. Breaking dependency upgrades were
  not applied blindly to obtain a misleading all-clear.
- Desktop installers/native wrappers, every account role, external-link
  reachability, assistive-technology use and all visual/device combinations
  require additional targeted verification.
- These are local results. No production deployment, new pull request, commit,
  push or live database mutation was performed during this audit. CI changes
  have not been claimed as an executed GitHub Actions run.

See `docs/phase12-e2e.md` for reproducible runtime, isolation and evidence details.
