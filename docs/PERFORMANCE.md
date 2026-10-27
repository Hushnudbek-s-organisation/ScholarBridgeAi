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
