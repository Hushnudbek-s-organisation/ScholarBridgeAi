# Owner handover checklist

ScholarBridge separates **app ownership** (who controls the platform inside
the app) from **infrastructure and third-party accounts** (hosting, database,
domain, Telegram bot, AI and payment vendors). The app can only move the
first part. Everything else is a manual step at the provider — the app never
pretends otherwise.

The same checklist is shown in **Admin → Ownership** (`HANDOVER_CHECKLIST` in
`src/lib/ownership/state.ts`).

## 1. Transfer the platform owner role (in the app)

Prerequisites: the new owner has an account with a password and is already
an admin. The current owner grants admin in **Admin → Ownership → Administrators**.

1. **Current owner** → Admin → Ownership → *Start transfer*: enter the new
   owner's email, type `TRANSFER`, enter your password, choose whether to
   keep admin access afterwards.
2. **New owner** receives an in-app (and, if linked, Telegram) security
   notice → Admin → Ownership → *Accept* (password required) or *Reject*.
3. **Current owner** → *Confirm transfer* (password required). Only now does the
   owner change, atomically, in one database transaction.

Rules enforced on the server:

- States: `pending → accepted → completed`, or `rejected` / `cancelled` /
  `expired`. Terminal states never change; a completed transfer cannot be
  reopened or replayed.
- One open transfer at a time; it expires after
  `OWNERSHIP_TRANSFER_TTL_HOURS` (default 72).
- Parties are derived from the session, never from client-supplied ids.
- The owner cannot be deleted or have admin revoked while owner.
- Every step is written to the audit log and both parties are notified.
- After completion the seed never re-promotes `ADMIN_EMAIL`; update or
  remove `ADMIN_EMAIL` / `ADMIN_PASSWORD` in the host environment anyway.

## 2. Accounts outside the app (manual)

| # | Item | What to do |
| - | --- | --- |
| 1 | **AI provider accounts & billing** | Keys in Admin → AI Settings belong to the previous owner's vendor accounts. The new owner creates their own keys, saves them in the panel, runs *Test connection*, then the old keys are revoked at the vendor. |
| 2 | **Telegram bot** | Manual Telegram ownership transfer may be required: @BotFather → `/mybots` → *Bot Settings* → *Transfer Ownership* (Telegram's own requirements apply, e.g. 2-step verification). Alternative: create a new bot, paste its token in Admin → Telegram bot, *Connect webhook*. Users then relink. |
| 3 | **Hosting** (Render or other) | Transfer the service/project to the new owner's account, or redeploy under it and copy every environment variable (see `DEPLOYMENT.md` → *Moving to another host*). |
| 4 | **Database / Supabase project** | Transfer the project to the new owner's organisation, or dump and restore into their database and update `DATABASE_URL`. Re-run `supabase/enable_rls.sql` on a new Supabase project. |
| 5 | **Domain & DNS** | Move the registrar account or update DNS; set `APP_URL`; press *Connect webhook* in Admin → Telegram bot. |
| 6 | **Payments** (Payme / Click) | Merchant contracts are legal agreements with the provider; the app does not transfer them. Replace `PAYME_*` / `CLICK_*` with the new merchant's credentials and update callback URLs. |
| 7 | **Secrets** | Rotate `SESSION_SECRET` (signs everyone out), `CRON_SECRET`, `TELEGRAM_WEBHOOK_SECRET`. For `AI_KEYS_ENCRYPTION_SECRET` keep the old value in `AI_KEYS_ENCRYPTION_SECRET_PREVIOUS`, press *Re-encrypt keys* in Admin → AI Settings, then remove the old value. |
| 8 | **Google Search Console** | Add the new owner as an owner of the property. Verification: the file `public/googleddb3ece94dc2926a.html` belongs to the current property — replace it with the new owner's file or set `GOOGLE_SITE_VERIFICATION` to their meta-tag token. |
| 9 | **GitHub repository** | Transfer the repository or add the new owner as admin; reconnect the host's auto-deploy. |

## 3. Settings

Admin → Settings → *Export (JSON)* gives the new owner a copy of the
non-secret configuration (prices, limits, AI provider/model choices,
navigation, guide texts). It never contains keys, tokens or passwords.
