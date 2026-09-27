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

## Telegram bot (sign-in codes + notifications)

Students can sign in with a one-time code sent by the ScholarBridge Telegram
bot, and in-app notifications (deadlines, scholarships, forum replies, sign-in
alerts) are mirrored to their Telegram chat.

**Setup (admin, 2 minutes):**

1. In Telegram open **@BotFather** → `/newbot` → copy the token.
2. Admin panel → *System* → **Telegram bot** → paste the token → *Check & save*
   (or set `TELEGRAM_BOT_TOKEN` on the server).
3. Enter the public https site address → **Connect webhook**. Done — the
   *Telegram* tab appears in the sign-in window.

Everything else (who may sign in, auto-signup, admin sign-in, which
notification types are sent, broadcast, linked users, delivery log) is in the
same admin section. Students manage their link and mute types under
**Telegram & alerts**; the bot also understands `/status`, `/stop`, `/on`,
`/unlink`.

**How the code flow stays safe:** the browser keeps a secret nonce, Telegram
only sees a public start token; the 6-digit code is valid only with that nonce,
expires after 5 minutes, allows 5 attempts, and only its HMAC is stored. The
webhook checks Telegram's secret header, codes are never written to the log,
and the placeholder e-mail domain of Telegram-only accounts is reserved.

**Local testing without Telegram:** `node scripts/telegram-mock.mjs` starts a
fake Bot API on :8099 (set `TELEGRAM_API_BASE=http://127.0.0.1:8099`, and
`TG_MOCK_FORWARD_TO=http://127.0.0.1:3000` so it delivers updates to the local
webhook). Helpers: `GET /_messages`, `POST /_press {text,userId}`,
`POST /_block`, `POST /_reset`. Tests: `npm run test:telegram`.

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
