# Deploying ScholarBridge AI to Render.com

This project is configured for one-click deployment via a **Render blueprint**
(`render.yaml`). It provisions a managed PostgreSQL database and a Node web
service.

## Option A — Blueprint (recommended)

1. Push this repository to GitHub (already done on branch
   `arena/019feb0b-scholarbridgeai`).
2. In the Render dashboard click **New → Blueprint** and connect the
   `jamijomi344as-jpg/ScholarBridgeAi` repository.
3. Render reads `render.yaml`, creates:
   - `scholarbridge-db` (managed PostgreSQL, free)
   - `scholarbridge-ai` (web service)
4. During the first build Render runs:
   `npm install && npm run build`
   - **IMPORTANT:** `db:push` is NOT run automatically. The Supabase database
     is the source of truth — the app adapts to it and never modifies it.
     If you ever decide to change the schema, run `npm run db:push` manually
     and only after reviewing what it will change.
5. After the first deploy, set the **secret** env vars in the web service's
   **Environment** tab:
   - `GROQ_API_KEY` — required for AI features (Groq, default model `openai/gpt-oss-120b`)
   - `GROQ_MODEL` — optional. Set to `openai/gpt-oss-120b` or delete it so the
     code default applies. Do **not** leave `llama-3.3-70b-versatile`: Groq
     removed that model on 2026-08-16 and requests 404.
   - `NEXT_PUBLIC_APP_URL` — your public app URL (e.g.
     `https://scholarbridge-ai.onrender.com`)
   - Optional payment keys if you configure real Payme/Click:
     `PAYME_MERCHANT_ID`, `PAYME_KEY`, `PAYME_PASSWORD`,
     `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_MERCHANT_USER_ID`,
     `CLICK_SECRET_KEY`
6. Save and Render will redeploy with the secrets.

## Option B — Manual web service

1. In Render, click **New → Web Service** and connect the repository.
2. **Name:** `scholarbridge-ai` · **Runtime:** Node
3. **Build Command:** `npm install && npm run build`
4. **Start Command:** `npm start`
5. **Health Check Path:** `/api/health`
6. Add a managed PostgreSQL database (`New → PostgreSQL`) and copy its
   **Internal Database URL** into the web service's `DATABASE_URL` env var.
7. Add the secret env vars listed above.
8. Deploy.

## Environment variables

| Variable                     | Required | Purpose                                   |
| ---------------------------- | :------: | ----------------------------------------- |
| `DATABASE_URL`               |   Yes    | Postgres connection (auto-set by blueprint) |
| `GROQ_API_KEY`               |   Yes    | Groq (`openai/gpt-oss-120b`) for all AI features |
| `GROQ_MODEL`                 |    No    | Model override; default `openai/gpt-oss-120b` |
| `NEXT_PUBLIC_APP_URL`        |   No     | Public URL used for referral links        |
| `PAYME_MERCHANT_ID`/`KEY`/`PASSWORD` | No | Real Payme merchant creds         |
| `CLICK_SERVICE_ID`/`MERCHANT_ID`/`MERCHANT_USER_ID`/`SECRET_KEY` | No | Real Click creds |

> **Note:** The first time you open the app, visiting routes such as
> `/api/universities` or `/api/courses` runs the seeders, which populate demo
> universities, scholarships, a student profile, forum categories, courses, and
> gamification levels/badges.

> **SSL note:** If the app can't connect to Postgres, append `?sslmode=require`
> to the `DATABASE_URL` (or use the Internal URL Render provides).

## Admin → Analytics (statistika)

The admin panel opens on the **Analytics** tab: visitors, page/section views,
signups, premium users, revenue, content inventory, engagement and the latest
activity, for a 7 / 30 / 90 day window (CSV export included).

Traffic is counted in one extra table, `site_visits` (anonymous `sb_vid`
cookie — no IP address is stored):

- The app creates it automatically on the first tracked visit
  (`CREATE TABLE IF NOT EXISTS`, additive only — no existing table is ever
  altered or dropped).
- If your database user is not allowed to create tables, run
  `supabase/add_analytics.sql` in the Supabase SQL Editor once. The dashboard
  then shows an amber banner until the table exists; every other metric keeps
  working.

Endpoint: `GET /api/admin/analytics?adminProfileId=<id>&days=30&fresh=1`
(admin-only, server-side, read-only, cached ~45s). Beacon: `POST /api/track`.
