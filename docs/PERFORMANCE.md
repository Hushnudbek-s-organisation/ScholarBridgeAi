# Landing page performance

The report was: *"the landing page freezes / feels very slow"* (`juda qotib`).
This file records what was actually wrong, what changed, and how to keep it
fixed.

## What the numbers were (measured on a production build, 2026-10-27)

| Metric | Before | After |
| --- | --- | --- |
| First-load JavaScript, `/` | **2 214 KB** raw (688 KB gzip) | **1 221 KB** raw (~418 KB gzip) |
| Translation JSON in that bundle | 1 407 KB (all three languages) | 397 KB (English only) |
| HTML | 167 KB (19 KB gzip) | 167 KB (19 KB gzip) |
| Server render (TTFB, local) | ~30 ms | ~28 ms |

## The cause

`src/i18n/messages.ts` exported a `dictionaries` object built from **three**
static JSON imports (en 397 KB, uz 421 KB, ru 612 KB). It was imported by
`LocaleProvider` — a `"use client"` module — so every visitor downloaded and
**parsed 1.4 MB of JSON before the landing page could respond**, in a phone's
main thread. That is the "freeze": nothing is wrong with the network, the
browser is simply chewing a megabyte of strings it will never display.

Two further details made it worse:

* the same module was imported by client helpers (`AppNote`, `MiniApp`,
  `journey/ui`), so the dictionaries were pulled in by more than one chunk;
* `next build` was also type-checking the app a second time (see
  `docs/GITHUB_SUPABASE.md`), so every deploy died with an out-of-memory kill
  and the fixes above could not reach production.

## What changed

1. **One language per visitor.**
   `src/i18n/messages.ts` now bundles English only (it is the fallback for every
   missing key) and loads **uz/ru on demand** as their own chunk
   (`loadMessages()`). Both the initial locale and later switches go through it.
2. **The server decides the language, and sends just that one.**
   `src/app/page.tsx` resolves the locale from the cookie and passes
   `clientMessagesFor(locale)` to `Home`. English costs nothing extra (already
   bundled) and never travels twice; Uzbek/Russian arrive once, in the RSC
   payload, so hydration matches the server HTML exactly — a language switch
   later fetches the other chunk.
3. **A server-only module for the server's needs.**
   `src/i18n/messages.server.ts` keeps all three dictionaries for route
   handlers and Server Components, which read `dictionaries[locale]`
   synchronously. `src/i18n/messages.ts` is now safe for the browser: it is a
   client-boundary rule, enforced by a test.
4. **`registerMessages()`** lets purely synchronous helpers (date labels, the
   Telegram mini app, error screens) read the active locale without a hook.
   `MiniApp`'s module-level copy table became lazy getters for the same reason.
5. **A budget in CI.** `npm run test:perf` fails if `/` exceeds 1.4 MB of
   first-load JavaScript, if the shared shell exceeds 1.2 MB, if anybody makes
   uz/ru static imports again, or if a client module imports
   `messages.server.ts`.

## What was deliberately left alone

* **framer-motion (~76 KB gzip)** — the landing hero and `Reveal` animation
  layer use it; replacing it with CSS is a visual change, not a performance
  necessity, and it is no longer the biggest cost.
* **`force-dynamic` on the root layout** — the per-request CSP nonce requires a
  request-time render (`src/proxy.ts`). Static prerendering would need inline
  scripts to be allowed again; that trade was rejected.
* **Images** — already `loading="lazy"`, sized, `fetchPriority`-tiered, with
  Wikimedia thumbnails at the rendered width.

## How to verify after a change

```bash
npm run build                       # writes .next/diagnostics/route-bundle-stats.json
npm run test:perf                   # budgets + import rules
```

```bash
# What the browser actually gets for `/`:
curl -s https://<site>/ > /tmp/home.html
grep -o 'src="/_next/static/chunks/[^"]*"' /tmp/home.html | sort -u | wc -l
# uz/ru chunks must NOT appear here — they load only on a language switch.
```

If the landing is slow again, check in this order: bundle stats first (the
budget test above), then `curl -i https://<site>/api/health` for a sleeping
instance (`docs/AVAILABILITY.md` — a cold Render instance answers in ~30 s
regardless of JavaScript).

---

# Phase 2 — the shell after the landing page

The landing page was fixed first (above). This pass is about everything the app
loads **after** a student clicks into the product.

## 1. Hub panes are chunks, not one bundle

`src/components/hubs/index.tsx` statically imported **31** feature components —
the explorer, the scholarship finder, the deadline centre, the goal planner, the
document vault, the arrival plan, the fee-waiver studio… — so opening *one* tab
downloaded all of them. Every pane is now a `next/dynamic` chunk that arrives when
its tab is opened, with the existing `PanelSkeleton` as the placeholder.

Measured on a clean production build (client chunks):

| | Before | After |
| --- | --- | --- |
| Client chunks | 71 | 107 |
| Largest pane chunk (gz) | **357 KB / 80 KB gz** | **229 KB / 72 KB gz** |
| Landing first-load JS | 1 221 KB | 1 221 KB (unchanged) |

The total JS *on disk* grows (~+200 KB gzip across **all** chunks) because each
split chunk repeats a little module boilerplate; a visitor never downloads all of
them. What a visitor pays for opening a hub went down.

Allowed to stay static: `PremiumGate` (tiny, rendered three times) and
`@/components/journey/ui` (the shell's own UI kit). `npm run test:perf` enforces
the rule.

## 2. One boot request instead of three

The shell asked for `/api/config/branding`, `/api/config/nav` and
`/api/config/guide` from three different components — three round trips and three
`app_config` reads before the sidebar knew what to hide.

* new `GET /api/config/boot` returns `{ branding, nav, guide }`, publicly
  cacheable (`s-maxage=300`, see `docs/BACKEND_PERFORMANCE.md`);
* new `src/lib/bootConfig.ts` holds **one** shared promise, so `Navbar`,
  `SectionIntro` and `BrandingImage` share the same document; the admin save
  events clear it;
* the three original routes stay (public reads; the admin screens refresh one
  thing at a time).

## 3. Smaller items

* `SiteTracker` beacon deferred from 1.8 s to **3 s** of idle time — analytics
  must not compete with the session/catalogue requests that follow the first
  paint.
* `/api/image` (the Wikimedia photo proxy) now answers
  `public, max-age=31536000, immutable`: the bytes behind a Commons URL never
  change, so a year is safe and the photo is not re-fetched on every visit.
* The remaining `<img>` tags without a loading hint got `loading="lazy"
  decoding="async"` (the mini-app detail sheet, the logo); the university-detail
  hero intentionally stays eager.

## 4. i18n — already done in Phase 1 of this programme

The brief asked for "one locale per request, −65 % translation payload". That
shipped with the landing-page work: English only in the bundle, uz/ru as separate
chunks fetched on switch, the server sending just the visitor's dictionary
(1 407 KB → 397 KB, **−72 %**). Nothing was left to do here; `npm run test:perf`
guards it.

## 5. Verify

```bash
npm run build && npm run test:perf     # budgets, lazy panes, one boot request, 3 s beacon
npm run check:i18n && npm run test:render && npm run test:responsive
```

---

# Phase 3 — catalogue localization and match scores

Every catalogue response is translated on the way out (`uz`, `ru`), and every
list item gets a fit score and (on the dashboard/chancing screens) a chance
score. Both steps are pure functions of data that rarely changes, so both are now
memoized. Nothing about *what* the API returns changed — only how often the same
work is redone.

## 1. Localization memo (`src/lib/localizeMemo.ts`)

* key: `locale | kind | id | updatedAt | digest(localizable fields)` — the digest
  is over the translatable fields only, so two responses that carry different
  per-request numbers (match score, saved flag) still share **one** translation
  entry, and a cache hit can never leak another request's numbers;
* only the translated **strings** are cached; the caller always receives a fresh
  `{ ...row, ...translated }`;
* bounds: `LOCALIZE_MEMO_MAX` (4 000 entries, LRU) and `LOCALIZE_MEMO_TTL_MS`
  (10 min); `invalidateLocalizeMemo()` runs from `invalidateCatalogCache()`, so
  an admin edit is never served stale;
* rows whose localizable text is under 96 characters skip the memo — hashing them
  costs as much as translating them. Real prose is far above that line;
* long free text (descriptions, requirement bodies) goes through
  `memoizedText()`, keyed by translator name + locale + the input itself.

Measured with the catalogue loaded from the seeded database (per row, warm):

| description length | translate every time | memo hit |
| --- | --- | --- |
| 101 chars (unverified disclaimer) | 14.0 µs | 4.8 µs |
| 300 chars | 10.3 µs | 4.1 µs |
| 1 200 chars | 20.2 µs | 7.3 µs |
| 3 600 chars | 33.4 µs | 16.3 µs |

`GET /api/universities` and `GET /api/scholarships` also localize **only the
page they return**: with `?page=1` that is 24 rows out of 3 220 instead of the
whole catalogue. On a 3 220-row synthetic catalogue the paginated response was
4.4 ms against 13.0 ms for the full list.

## 2. Score memo (`src/lib/matchMemo.ts`)

* key: `kind | profileFingerprint | entityId | digest(entity scoring fields)`;
  kinds in use are `fit`, `chance` and `scholarship-fit`;
* the profile fingerprint is derived from the profile fields that actually feed
  the scorer, so editing a profile re-scores and viewing the same profile twice
  does not;
* bounds: `MATCH_MEMO_MAX` (20 000) and `MATCH_MEMO_TTL_MS` (5 min);
  `invalidateProfileMatchCache()` (profile edits) and admin catalogue writes call
  `invalidateMatchMemo()`;
* `loadSavedActivities()` is memoized for 15 s (`ACTIVITIES_MEMO_TTL_MS`), so the
  four scoring routes no longer each query the activity table.

## 3. Coverage gaps closed

The imported catalogue carried study fields, degree levels, study modes and
programme languages that the uz/ru dictionaries did not know, so those rows fell
back to English mid-sentence. All of them are translated now (Information
Systems, Interdisciplinary, Arts, Humanities, Veterinary, the degree ladder from
Foundation to Doctorate, Arabic/Portuguese/Nordic/Central-European languages, the
"not source-verified" disclaimers), and `npm run test:localization` reads the real
`data/*.csv` files so a future import cannot silently reintroduce the gaps.

## 4. Verify

```bash
npm run test:localization    # uz/ru coverage + memo correctness + memo speed
npm run test:perf            # client bundle budgets, lazy panes, boot request
npm run check:i18n           # every message key used by every locale
```
