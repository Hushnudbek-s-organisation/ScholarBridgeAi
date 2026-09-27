# ScholarBridgeAi

## Local development

```bash
npm install
npm run db:dev:init   # first time: starts a local Postgres (port 5433), pushes the schema, seeds
npm run db:dev        # later runs: just start the local Postgres
npm run dev           # in another terminal
```

Put `DATABASE_URL=postgresql://sb:sb@127.0.0.1:5433/scholarbridge` and a
`SESSION_SECRET` in `.env.local` (see `.env.example`). No Docker needed —
the database comes from the `embedded-postgres` dev dependency.

## Telegram bot + Mini App

The ScholarBridge Telegram bot is a second front door to the **same** account,
data and rules as the website — it calls the website's own API routes, so
search, saved lists, applications, next actions, the AI advisor (same quotas)
and Premium checks behave identically. The Mini App (`/tg`) is a compact
version of the site inside Telegram.

**Setup (admin):**

1. In Telegram open **@BotFather** → `/newbot` → copy the token.
2. Admin panel → *System* → **Telegram bot** → paste the token → *Check & save*
   (or set `TELEGRAM_BOT_TOKEN` on the server).
3. Enter the public **https** site address → **Connect webhook**. This also
   registers the command menu and the *ScholarBridge* menu button that opens
   the Mini App (`<site>/tg`, or `TELEGRAM_MINI_APP_URL`).
4. Optional: point an external scheduler at `GET /api/cron/notifications`
   with `Authorization: Bearer $CRON_SECRET` (the app also sweeps by itself
   every `NOTIFICATION_SWEEP_HOURS`).

**Connecting an account** (students, under **Telegram & alerts**): press
*Connect Telegram* → Telegram opens with a one-time link → the bot asks
"Connect to *Name* (a•••@mail.com)?" → press **✅ Connect**. The link token is
128-bit, single-use, valid 10 minutes and stored only as a SHA-256 hash; the
bot never creates accounts (new users sign up on the website first). One
Telegram per account and one account per Telegram, enforced by UNIQUE
constraints; conflicting or concurrent attempts are refused, not merged.
Disconnect from the website, the Mini App, the bot (`/unlink`) or the admin
panel — every link/unlink is audited.

**Bot commands:** `/start` `/help` `/account` `/profile` `/universities [q]`
`/scholarships [q]` `/saved` `/applications` `/deadlines` (Premium) `/next`
`/advisor <question>` `/settings` `/website` `/unlink`. In groups the bot only
answers "private chat only" — account data is never shown where others read.

**Sign-in with a code:** accounts that connected Telegram can sign in with a
6-digit code from the bot (bound to the browser's secret nonce, 5 minutes,
5 attempts, stored as an HMAC, never logged).

**Mini App security:** the page sends Telegram's signed `initData` to
`POST /api/telegram/miniapp/auth`; the server verifies the HMAC with the bot
token and `auth_date` freshness, then issues a 1-hour bearer session kept in
page memory only. It cannot reach admin routes and dies when Telegram is
disconnected. `/tg` may be framed by `https://web.telegram.org` only.

**Reminders:** per-account offsets (default 30/14/7/3/1/0 days before a saved
scholarship deadline or task due date, in `REMINDER_TIMEZONE`), one message
per deadline+offset, nothing for unsaved scholarships, completed tasks or
passed dates; failed deliveries are retried up to 3 times within 24 h, and
stop when the user blocks the bot. Sweeps are serialised with Postgres
advisory locks, so overlapping instances never double-send.

**Webhook:** Telegram's secret header is checked (constant time) before the
body is read; every `update_id` is claimed once in `telegram_updates`, so
re-deliveries are ignored.

**Local testing without Telegram:** `node scripts/telegram-mock.mjs` starts a
fake Bot API on :8099 (set `TELEGRAM_API_BASE=http://127.0.0.1:8099`, and
`TG_MOCK_FORWARD_TO=http://127.0.0.1:3000` so it delivers updates to the local
webhook). Helpers: `GET /_messages`, `POST /_press {text,userId}`,
`POST /_block`, `POST /_reset`. Tests: `npm run test:telegram` (static/unit)
and `npm run test:telegram-integration` (real Postgres, stubbed Bot API).

Tables are created automatically on first use; `supabase/add_telegram.sql`
holds the same DDL for manual runs.

## Theming & motion

- **Dark mode** — a light / system / dark switch lives in the sidebar (desktop),
  the header (mobile) and the landing page. The choice is saved in
  `localStorage` and applied by a small inline script before first paint, so the
  page never flashes the wrong theme. Implementation: `src/app/globals.css`
  remaps Tailwind's colour variables under `.dark`, so existing components are
  themed without per-element `dark:` classes. See the comment block at the top
  of that file before adding new colours.
- **Animations** — Framer Motion. Shared primitives live in
  `src/components/motion` (`PageTransition`, `Reveal`, `RevealGroup`,
  `AnimatedNumber`, `AnimatedBar`, `AnimatedRing`, shared variants). Every
  animation respects the OS "reduce motion" setting via `MotionProvider`.

## Static UI prototypes (no build step)

Two standalone pages built with plain HTML, Tailwind CSS (Play CDN) and vanilla
JavaScript live in `public/`, so they are served as-is by the Next.js app
(`npm run dev`) and require no build:

- `/landing.html` — public marketing landing page (hero, "One Profile" steps,
  dark feature grid, fit-vs-chance explainer, roadmap section, CTA, footer).
- `/dashboard.html` — signed-in student dashboard.

Quick local preview of just the static files:

```bash
npx serve public      # then open /landing.html or /dashboard.html
```

### Dashboard UI (static prototype)

A fully responsive, interactive dashboard prototype for the ScholarBridge
educational platform lives at [`public/dashboard.html`](public/dashboard.html).
It is built with plain HTML, Tailwind CSS (Play CDN) and vanilla JavaScript —
no build step required.

- **Open locally:** open the file directly in a browser, or run any static
  server (`npx serve public`). With the Next.js app running (`npm run dev`),
  it is also served at `/dashboard.html`.
- **Layout:** dark sidebar + light content area, indigo (`#6366F1`) accent,
  Inter font.
- **Responsive breakpoints:**
  - Mobile — sidebar hidden behind a burger button (slide-in animation),
    single-column content.
  - Tablet — narrow icon-only sidebar, 2×2 stat grid, stacked bottom sections.
  - Desktop — fixed 250px sidebar, 4-column stat grid, 2/3 + 1/3 bottom split.
- **Interactions:** hover lift on cards, scaling buttons, progress bars that
  animate from 0% on load, staggered fade-in-up entrance animations, working
  checkboxes, sidebar AI Tools accordion, language switcher, and a floating
  help button.
