# Telegram channel publisher

An autonomous publisher that posts scholarships **from our own database** to a
Telegram channel, rotating post kinds and polls and learning from poll answers
and clicks. Channel text is Uzbek (Latin); code, comments and documentation are
English. No paid AI: everything is rule- and template-based.

> **Status.** The publisher is connected and controllable from **Admin →
> Kanal**: 14 tables, the rich and weekly renderers, the sanitizer, short links
> (`/go/<code>`, with `/r/<code>` as an alias), a sender, a cron tick
> (`/api/cron/channel`) and the full admin panel (connection, plan, links,
> content, countries, short links, queue, audit). It ships **off**: nothing is
> sent until an admin switches the mode to dry run and then live.

---

## 1. Configuration (environment only, never admin input)

| Variable | Default | Meaning |
| --- | --- | --- |
| `CHANNEL_AUTOPOST` | *unset* | **Ceiling, not a switch.** Unset → the admin panel decides. `off` → deployment-level kill switch (nothing leaves the app, panel ignored). `dryrun` → the panel cannot reach live, everything goes to `TELEGRAM_ADMIN_CHAT_ID`. `on` → the panel decides freely |
| `TELEGRAM_CHANNEL_ID` | — | `-100…` id or `@username`; the bot must be a channel admin |
| `TELEGRAM_ADMIN_CHAT_ID` | — | private chat for dryrun output and failure alerts |
| `CHANNEL_SITE_URL` | `APP_URL` | origin used in post links (`/go/<code>`); the admin panel value wins |
| `CHANNEL_DISCUSSION_ENABLED` | off | enables the `qa` kind and the "ask in the comments" line |
| `CHANNEL_APPROVAL_TTL_HOURS` | 6 | how long a preview waits in approval mode before it is retired (1–48) |
| `CHANNEL_TICK_MINUTES` | 15 | how often the in-process publisher loop ticks (5–120) |
| `CHANNEL_AUTOPILOT` | — | `off` stops the loop (host with its own cron); `on` also allows it in `next dev` |
| `TELEGRAM_BOT_TOKEN` | — | already used by the bot (env or Admin → Telegram bot) |
| `CRON_SECRET` | — | Bearer secret for `/api/cron/*` (Phase 2) |

`channelBlockReason()` refuses to run when a value is missing or malformed: a
half-configured deployment stays silent rather than posting to a stranger's
chat. `dryrun` never resolves to the channel id, even when one is configured.

### 1a. What goes into Render → Environment (and where each value comes from)

Only **one** variable is really needed for the channel; everything else is
already editable in the panel. Render: *service → Environment → Add Environment
Variable → Save* (a redeploy starts automatically).

| Variable | Needed? | Where to get it |
| --- | --- | --- |
| `CHANNEL_AUTOPOST` | **optional now.** Leave it out and the panel decides. Set `off` only to silence a deployment, `dryrun` to keep staging harmless | Typed by hand. A typo (`ture`) behaves like `off` |
| `TELEGRAM_CHANNEL_ID` | optional (panel value wins) | Your channel: the `@username`, or the numeric `-100…` id. To see the id: open the channel in Telegram Web, open any post → *Copy link* → `t.me/c/1234567890/45` ⇒ the id is `-1001234567890` |
| `TELEGRAM_ADMIN_CHAT_ID` | optional (panel value wins) | Your own Telegram id: write `/id` to the bot in a private chat, or use `@userinfobot` |
| `CHANNEL_SITE_URL` | optional, falls back to `APP_URL` | The public site origin, e.g. `https://example.org` (protocol + host, no path) |
| `APP_URL` | usually already set | The same origin; used for links and the bot's Mini App |
| `CHANNEL_DISCUSSION_ENABLED` | optional | `1` to show the "ask in the comments" line |
| `TELEGRAM_BOT_TOKEN` | optional but recommended in production | BotFather → `/mybots` → your bot → **API Token**. The panel stores it encrypted anyway; the env copy keeps the bot answering during a database outage |
| `CRON_SECRET` | needed for timed publishing | Any long random string: `openssl rand -hex 32`. The same value must be in the cron caller's `Authorization: Bearer …` |
| `DATABASE_URL`, `SESSION_SECRET` | required | Already set for the app itself (see `docs/AVAILABILITY.md`) |

`Admin → Kanal → Ulash` now lists exactly these keys with a **set / not set /
invalid** badge and one line of "where from" text, read live from the server's
environment (`GET /api/admin/channel` → `env.checklist`). The panel cannot write
the environment — no host exposes that — so it shows the verdict and the fix.

**Order of operations:** connect the channel + admin chat in the panel, press
*Check connection*, send a test, then set the panel mode to *Dry run*, build
today's plan, and only then switch to *Live*. Publication itself is started by
the cron tick (`/api/cron/channel`), so `CRON_SECRET` must be set before live
posting can run unattended.

## 2. What may be published

```
publishable(row) =
      isActive
  AND verificationStatus = "verified"
  AND lastVerifiedAt is set and at most 60 calendar days old (Asia/Tashkent)
  AND title and provider are non-empty
  AND the row is open to Uzbekistan (or says nothing about eligible countries)
  AND the deadline is not "unknown"
```

- `eligible_countries` empty ⇒ **open**; a list naming Uzbekistan ⇒
  `uz_eligible` (the only case where the post says "O'zbekistonliklar uchun
  ochiq"); a list without Uzbekistan ⇒ not published at all.
- A missing field is dropped from the post. There are no placeholders, no
  "n/a", and nothing is inferred from the legacy free-text `deadline` column.

## 3. Deadline quality

| Data | Quality | Used for |
| --- | --- | --- |
| `deadline_date` (or the nearest future round in `rounds`) | **exact** | single, fully funded, urgency rungs, digest, spotlight, weekly |
| `deadline_type = range` + future range end | **estimated** ("taxminan …") | digest, spotlight, evergreen kinds — never urgency |
| `rolling` | **evergreen** | evergreen kinds |
| `not_announced` / `recurring` | **estimated**, no date shown | evergreen kinds |
| nothing usable, or the date has passed | **unknown** | not published |

`expected_deadline_period` is free English prose in production data, so it is
never printed inside an Uzbek post.

## 4. Post kinds

`scholarship_rich` (authored Uzbek copy — see §4b), `scholarship_single`,
`fully_funded`, `urgency` (rungs 30/14/7/3 plus a last-day variant),
`deadline_digest` (Thursday, optional), `country_spotlight`, `tip`, `checklist`,
`weekly_deadlines` (Sunday — see §4c), `qa` (only with
`CHANNEL_DISCUSSION_ENABLED`), `story` (only from `channel_stories` rows with
`approved = true`). Polls are their own message (`channel_plan.kind = "poll"`)
and default to a 14-day cadence.

### 4b. Rich post

Used when `scholarship_channel_content` holds a tagline, a funding label and at
least one body section (`isRichContent`). The section order is fixed:

```
{flag} <b>{title}</b> — {tagline}
Moliyalashtirish: {funding_type_uz}
Til talabi: {language_req_uz}

<b>Kimlar uchun</b>
➡️ {eligibility_uz…}

<b>Foydali tomonlari</b>
➡️ {benefits_uz…}

<b>Dastur haqida</b>
{about_uz}

🕓Oxirgi muddat: 15-dekabr, 2026      (exact)
🕓Taxminiy muddat: …                  (estimated — never called a deadline)
🕓Muddat: rasmiy sahifada ko'rsatilgan (rolling)
➡️Batafsil: <a href="SITE/go/CODE">SITE/go/CODE</a>

{hashtags — kind + country + level + editor extras, deduped, max 5}
💼 {Kanal} | {Bot}
```

An empty section disappears **with its heading and its blank line**. Length
policy: at 1800 visible characters the `about` block is trimmed at a word
boundary (`…`); at 4096 it is dropped; then each bullet list is cut to four; if
it still does not fit the post is skipped rather than truncated. Eligibility,
benefits and about are **never** generated or translated by anything: they come
from the admin form or not at all.

### 4c. Weekly deadlines post

`weekly_deadlines` is Sunday-only. Scope comes from the planner: open, verified
and **exact** deadline from today through today+7 Tashkent days; previously
announced programmes stay in, because this post is a reminder list. Sorted by
deadline, then by country. Fewer than `plan.weeklyMinItems` items (default 2)
means no post at all.

```
⏳ Kelayotgan hafta muddati tugaydigan dasturlar

🇩🇪 {title} — {tagline} [25-oktabr Yakshanba]
👉 <a href="SITE/go/CODE">SITE/go/CODE</a>

…

🤖 Barcha imkoniyatlar: @bot
#haftalik_eslatmalar #reminders
💼 {configured social links}
```

A long list is split at block boundaries into `1/2`, `2/2`; every part after the
first opens with `⏳ Davomi (2/2)`, and only the last part carries the closing
lines. Pinning is `plan.weeklyPin` (default off).

**Fully funded** is derived only from an explicit provider statement we store:
`award_basis = full_tuition`, or a coverage label of `Full Funding` /
`Full Tuition` / `Full Tuition + Stipend`. An explicit partial or need-based
basis always disqualifies the row. There is no dedicated boolean column, so the
kind simply produces no posts for rows that do not qualify.

## 5. Daily plan (deterministic)

`buildDailyPlan()` takes the plan date, the publishable candidates, history and
preferences, and returns the day's messages. Same inputs → same plan.

- **One quiet day a week**: the weekday is `isoWeekNumber % 7`, so it rotates.
- **At most three messages a day**, never two of the same kind. The first slot
  goes to an exact deadline within 3 days if one exists; otherwise the
  best-scored single. The second covers money/collections/spotlights; the third
  is Monday's recap, an approved story, Q&A (if the discussion is on) or an
  evergreen tip/checklist.
- **Send windows** (Asia/Tashkent): one message 09:00–11:00; the rest share
  18:30–21:00 in equal, disjoint slices. Jitter is seeded by the plan date.
- **Lanes**: `urgent` (rung ≤ 3), `weekly` (Sunday), `editorial`
  (single/rich/fully funded/digest/spotlight/story), `evergreen`
  (tip/checklist/QA) and `engagement` (polls). Each day's messages are drawn
  from lanes in that order, and a rich post wins ties **inside its own lane
  only** (×1.08).
- **Cooldowns**: same scholarship 30 days (45 for fully-funded, 7 for digest
  membership, 14 for a spotlight on the same country), tips 21, checklists 30,
  Q&A 14, stories 90, poll cadence `max(2, settings.pollCadenceDays)` (14).
- **Windows from settings**: first item morning, the rest across the evening
  window; `sendAt` never decreases and is rounded to five minutes.
- Every item carries `dedupe_key = kind|scholarship|rung|date|slot`; the column
  is `NOT NULL UNIQUE`, so a second (or concurrent) planning run inserts nothing.

## 6. Preference weights

```
next   = clamp(0.7 × weight + 0.3 × (share × optionCount), 0.5, 2.0)   // vote
weekly = clamp(0.8 × weight + 0.2 × clickScore,           0.5, 2.0)   // clicks
budget = 0.8 … 1.4
```

Poll answers are read as **aggregates** from `stopPoll` (channel polls are
always anonymous); no per-user vote is stored. We never read channel view
counts.

## 7. Checks

```bash
npm run test:channel     # schema drift, gating, templates, banks, polls, plan
npx tsc --noEmit && npm run lint && npm run check:i18n && npm run test:security
```

`test:channel` renders every template × every variant × six data shapes
(complete, minimal, estimated, hostile input, very long title, no site URL) and
fails on any lint issue: forbidden wording, unbalanced tags, unescaped data,
leftover placeholders, or 4096+ characters.

Wording that must never appear: `kafolat`, `100%`, `albatta olasiz`,
`hech qanday talab yo'q`, any admission or win promise, and `shoshiling`
outside the last-day post.

## 8. Uzbek copy to proofread

All channel text is checked in, so a native speaker can review it without
touching code:

| File | Contains |
| --- | --- |
| `src/lib/channel/templates/templates.uz.ts` | compact kind frames, deadline labels, "taxminan …" wording, disclaimers |
| `src/lib/channel/templates/rich.uz.ts` | rich post: headlines, section headings, length-policy wording |
| `src/lib/channel/templates/weekly.uz.ts` | Sunday list: headers, block layout, "Davomi (n/m)", closing lines |
| `src/lib/channel/templates/format.ts` | month names, countdown phrases, coverage/degree/country label tables |
| `src/lib/channel/templates/tips.uz.ts` | tip bank (7 entries) |
| `src/lib/channel/templates/checklist.uz.ts` | checklist bank (6 entries) |
| `src/lib/channel/templates/qa.uz.ts` | Q&A bank (6 entries) |
| `src/lib/channel/templates/polls.uz.ts` | poll deck: 8 types, questions and options, quiz explanations |

Proofreading notes: keep the informal "siz" register, keep "taxminan" in every
estimated deadline, and do not add absolute claims — the lint test fails on
`kafolat`, `100%`, `albatta olasiz` and "shoshiling" outside the last-day post.


---

## 9. Connecting the channel (what the operator does)

Everything below happens in **Admin → Kanal → Ulash**; no redeploy is needed.

1. **Create the bot** with @BotFather, copy the token and paste it in
   **Admin → Telegram**. The token is stored there (or in `TELEGRAM_BOT_TOKEN`)
   and is never shown or accepted in the channel panel.
2. **Add the bot to the channel** as an administrator and grant
   “Post messages”.
3. **Fill in the channel**: its `@username` for a public channel, or the
   `-100…` id for a private one.
4. **Fill in the admin chat**: open the bot in your own Telegram chat, press
   `/start` (or `/id`), and use that numeric chat id — the bot replies with the
   number. Dry-run posts and failure alerts go there. It must be a private chat
   with the bot: the bot deliberately ignores commands from groups and channels.
   The same id can always be read from `@userinfobot`, or from
   `https://api.telegram.org/bot<TOKEN>/getUpdates` after a fresh message — but
   never paste the token anywhere public.
5. **Set the site URL** — post links are built from it.
6. Press **Check connection** (getMe + getChat + getChatMember). The four-step
   checklist turns green only when the bot can actually post.
7. Press **Send test message**, then switch the mode to **Dry run**, build
   today's plan and read the queue. When the previews look right, switch to
   **Live**.
8. **Pause** any time by setting a date in “Pause until”, or turn the mode off.

`CHANNEL_AUTOPOST=off` in the environment overrides all of this: a deployment
can always be silenced from the environment, never the other way round. Leaving
the variable **unset** is the normal case — the panel then owns the mode, and the
panel itself starts at `off`. `dryrun` in the environment caps a panel `on` at
dry run, which is the safe way to run a staging deployment.

> If the panel says *"CHANNEL_AUTOPOST is off in the environment: posting stays
> disabled until it changes"*, the host has that variable set to `off`. Either
> remove it or set it to `on` (or `dryrun`) in the host's environment, then
> redeploy — the panel cannot override it, by design.

### Modes

| Mode | What happens |
| --- | --- |
| Off | Nothing is planned out and nothing is sent |
| Dry run | The plan is built and posts go **only** to the admin chat |
| Approval | The plan is built; each post is sent to the admin chat with **Approve / Reject / Edit**, and reaches the channel only after an admin approves it |
| Live | Posts go to the channel |

`CHANNEL_AUTOPOST` keeps its meaning in every mode: `off` kills approval mode
too, and `dryrun` in the environment still caps the panel at previews.

### 9. Connecting the channel starts it — no extra setup

The most common question was "I connected the channel, why is nothing
happening?". Nothing was scheduled: the publisher only ran when an external
cron called `/api/cron/channel`, which is a second thing to configure (and
easy to forget). Now saving the **Ulash** tab does two things at once.

**1. One kick, immediately.** If the save makes the publisher runnable (mode
not off, channel id + admin chat + site URL set, not paused) and this is a
*change* — we were off/unconnected/paused before, or another channel, chat or
mode was chosen — the server runs the publisher once, right away:

* one welcome message in the admin chat: the mode, the channel, the site, how
  often the loop runs, and anything the connection check already knows is
  wrong (bot not a channel administrator, admin chat unreachable, no site URL);
* then **one** post — the first that is due today, or the first still planned
  when nothing is due yet. One, not three: connecting should not dump a batch
  into the chat.

In approval mode that first post is a preview with the three buttons; in live
mode it goes to the channel. Saving the same values again sends nothing.

**2. A loop afterwards.** The server ticks the publisher every
`CHANNEL_TICK_MINUTES` minutes (default **15**, clamped 5–120), starting one
minute after boot. Each tick builds today's plan if it is missing and sends
what is due, exactly as the cron endpoint does — same daily cap, same windows,
same quiet day, same approval step. Nothing is published twice: the plan is
idempotent and a post row is reserved before it is sent.

So a deployment with no cron at all now posts by itself. An external cron is
still supported (and still recommended on hosts that sleep when idle — the loop
sleeps with the process):

| Variable | Default | What it does |
| --- | --- | --- |
| `CHANNEL_TICK_MINUTES` | 15 | tick interval, 5–120 |
| `CHANNEL_AUTOPILOT` | — | `off` stops the loop; in `next dev` the loop stays off unless it is `on` |

The panel says all of this too: the connection card carries the line
"Saqlashingiz bilan kanal ulanadi…", and the toast after saving reports whether
the kick ran, how many posts are waiting, or why it could not run yet.

### 9a. Approval mode — read every post before it goes public

Between "dry run" and "live" there used to be nothing: an operator who wanted
to check each post had to keep the publisher off and paste posts by hand.
`Approval` is that step.

**How it works**

1. The cron tick renders the post exactly as it would be published and stores
   the body on `channel_posts` (`status = awaiting_approval`).
2. The admin chat receives a header ("🔔 Tasdiqlash kerak", the kind, the
   number of parts, the deadline), then the post itself. The **last** part
   carries the buttons:

   | Button | What happens |
   | --- | --- |
   | ✅ Tasdiqlash | The **stored** body is published to the channel immediately. It is never re-rendered, so what you read is what the channel gets — "70 kun qoldi" cannot become "69" between the preview and the press |
   | ❌ Rad etish | Nothing is published; the post is `rejected` and the plan row is `skipped` |
   | ✏️ Tahrirlash | The bot asks for the new text; the next message (private chat, no command) becomes the body. It goes through the same HTML sanitizer as a template post, the preview message is rewritten, and the buttons appear again |

3. Only an **admin** may press: the Telegram account must be linked to a
   profile with `is_admin`. Anyone else gets "⛔ Faqat admin tasdiqlay oladi"
   and nothing changes. A press from a group or channel is refused outright.
4. Every preview expires after `CHANNEL_APPROVAL_TTL_HOURS` (default **6**,
   1–48). An expired post never publishes, and the same plan identity is not
   offered again — approving it the next morning would publish yesterday's
   deadline under today's date.
5. Double presses are safe: the row is claimed with a conditional `UPDATE`, so
   five presses publish once.

**Where to see it**

* In Telegram: the previews arrive in `TELEGRAM_ADMIN_CHAT_ID`.
* In the panel: **Admin → Kanal**, the "Tasdiqlash kutilmoqda" box above the
  tabs (approve / reject / rewrite, no Telegram needed). It is above the tabs
  on purpose — while the mode is *Approval* these are the only posts that can
  reach the channel, and they expire.

**Polls** are previewed as text and become a real Telegram poll on approval.

**Code map**

| File | Role |
| --- | --- |
| `src/lib/channel/approval.ts` | Rules only (statuses, callback format, texts, expiry window). No database, no network |
| `src/lib/channel/approvalStore.ts` | The queries those rules need (who is an admin, what is pending, expiry) |
| `src/lib/channel/send.ts` | `sendPlanRowForApproval`, `approveApproval`, `rejectApproval`, `applyApprovalEdit` |
| `src/lib/telegram/approval.ts` | Authorises the button press and routes the edit reply |

`src/lib/telegram/bot.ts` is deliberately untouched: its callback whitelist is
scoped to a *linked student's* session, while an approval button is an
operator action. Keeping them apart means a malformed `ch:` value can never
fall through into a student command.

## 10. Admin panel

| Tab | Controls |
| --- | --- |
| Ulash | Bot/channel/admin-chat wiring, mode, pause, connection check, test message, build plan, run now, short-link refresh |
| Reja | Posts per day (cap 3), budget range, morning/evening windows, quiet day, weekly list minimum, weekly pin, Thursday digest, poll cadence, 14-day preview |
| Linklar | Main footer (Kanal/Bot defaults), social footer, hashtags per kind/level/weekly, link-preview switches |
| Kontent | Search a scholarship, write its Uzbek copy, completeness badge, live rich preview |
| Davlatlar | Flag, Uzbek name, locative form, hashtag, aliases |
| Havolalar | Short links, 7/30-day clicks, CSV export, create/disable/delete |
| Navbat | Today's queue with the exact rendered text, send now, test, skip, postpone, pin, text override |
| So'rovlar | Every poll sent, its aggregate results, a manual close |
| Qiziqish | Learned topic weights (from poll shares), hand-correctable, reset-all |
| Hikoyalar | Admin-written stories; only approved rows are postable |
| Jurnal | Append-only `channel_audit` trail of every mutation |

Every mutation passes `guardAdmin` (admin session + rate limit), the global CSRF
proxy and is written to `channel_audit`. The bot token never appears in any
response.

## 11. Sending and the cron tick

`/api/cron/channel` (GET or POST, `Authorization: Bearer $CRON_SECRET`) does one
tick: build today's plan if it is missing, then send whatever is due. It is
idempotent — the post row is inserted before the network call with the plan
identity as its key, so a duplicate tick sends nothing twice. Call it every
10–30 minutes from Render Cron / cron-job.org.

`mode = off`, a pause, or an unconfigured channel makes the tick return
`{"skipped": true}` without touching Telegram.

## 12. Short links

`/go/<code>` is the only redirect: the destination is read from
`channel_links` and never from the request (no open redirect). `site` links must
match the configured origin; external links must be public HTTPS URLs. Clicks
are aggregated per `(code, day)` — no IP, no user agent, no per-visitor row —
and Telegram's crawler plus `HEAD` probes are ignored. `/r/<code>` is an alias
for links already shared.


## 13. Polls

A poll is a **post kind**, not a message: it goes out with `sendPoll`, has no
HTML body and cannot be multi-part. The deck (`templates/polls.uz.ts`, eight
types, 28-day cooldown) is code, so a plan row only stores the deck key and can
always be replayed.

*Anonymous by construction.* `is_anonymous` is hard-coded, the question is
posted with `open_period` (3 days) so it closes itself, and the row stores
**per-option counters only**. There is no row, column or log line anywhere that
could name a voter — the publisher reads `stopPoll` / the `poll` update, both of
which are aggregates.

- **Live** send → a `channel_polls` row is created with the poll id.
- **Dry run** send → the poll appears in the admin chat and **no**
  `channel_polls` row is created (a dry-run poll could never collect a vote).
- Telegram posts a `poll` update when the poll closes (`/api/telegram/webhook`);
  **Close poll** in Admin → Kanal → So'rovlar calls `stopPoll` for an immediate
  aggregate. Either path ends in the same place.
- If Telegram refuses to stop the poll (bot removed, already closed), the row is
  still closed locally and the reason is audited — the panel never lies about
  state.

## 14. Interest weights (`channel_prefs`)

Only `pref` polls teach the planner. When a poll closes with votes:

```
weight = clamp(0.7 × current + 0.3 × (share × optionCount), 0.5 … 2.0)
```

`share × optionCount` normalises across poll sizes, so 1-of-2 and 1-of-5 are not
treated as the same signal. A topic key is `family:option` (`country:mixed` +
`canada` → `country:canada`), which is exactly what `topicKeys()` produces from a
scholarship. Multi-answer, quiz and this-or-that polls are engagement, not
preferences, and never move a weight; a poll with zero votes changes nothing.
The blend happens **once per poll** (guarded by the row leaving `open`), so a
duplicate Telegram update cannot double-count.

Admin → Qiziqish shows every weight with its sample count, allows a manual
correction (0.5–2.0 only) and a reset-all back to neutral 1.0.

## 15. Stories (`channel_stories`)

Stories are the only editorial content in the publisher, and they are strictly
admin-authored: there is no generator, no import and no model call. A story is
invisible to the planner until an admin presses **Approve**; unapproving hides it
again, and deleting removes it. The planner respects a 90-day cooldown per story
and only picks from approved rows.

## 16. Local development against the Telegram mock

```
node scripts/telegram-mock.mjs           # http://127.0.0.1:8099
TELEGRAM_API_BASE=http://127.0.0.1:8099  # in .env, then restart `next dev`
TELEGRAM_BOT_TOKEN=8099000001:AAH…       # any token that matches 123:AA… (≥30 chars)
```

The mock now answers `getMe`, `getChat`, `getChatMember`, `getChatMemberCount`,
`sendMessage`, `sendPoll` and `stopPoll`, so **Check connection**, a test
message and a full poll round-trip work offline:

```
curl -X POST localhost:8099/_vote -d '{"pollId":"poll_2","votes":{"0":30,"1":10}}'
```

Verified end to end in this repository: connection check green → dry-run poll to
the admin chat (no results row) → live poll to the channel → votes → **Close
poll** → weights learned (`country:canada` 1.4 → 1.58).
