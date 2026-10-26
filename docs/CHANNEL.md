# Telegram channel publisher

An autonomous publisher that posts scholarships **from our own database** to a
Telegram channel, rotating post kinds and polls and learning from poll answers
and clicks. Channel text is Uzbek (Latin); code, comments and documentation are
English. No paid AI: everything is rule- and template-based.

> **Status (Patch 3, Phase 1 done).** Tables (14), the country/content tables,
> the rich and weekly renderers, the sanitizer, short-link helpers, the
> settings reader and the lane-based planner are in place. Nothing is sent:
> there is no sender and no cron route yet, and `CHANNEL_AUTOPOST` defaults to
> `off`. Short links (`/go/<code>`), the admin panel and the sender follow in
> phases 2–4.

---

## 1. Configuration (environment only, never admin input)

| Variable | Default | Meaning |
| --- | --- | --- |
| `CHANNEL_AUTOPOST` | `off` | `off` → nothing leaves the app; `dryrun` → posts go **only** to `TELEGRAM_ADMIN_CHAT_ID`; `on` → posts go to the channel |
| `TELEGRAM_CHANNEL_ID` | — | `-100…` id or `@username`; the bot must be a channel admin |
| `TELEGRAM_ADMIN_CHAT_ID` | — | private chat for dryrun output and failure alerts |
| `CHANNEL_SITE_URL` | `APP_URL` | origin used in post links (`/go/<code>`) |
| `CHANNEL_DISCUSSION_ENABLED` | off | enables the `qa` kind and the "ask in the comments" line |
| `TELEGRAM_BOT_TOKEN` | — | already used by the bot (env or Admin → Telegram bot) |
| `CRON_SECRET` | — | Bearer secret for `/api/cron/*` (Phase 2) |

`channelBlockReason()` refuses to run when a value is missing or malformed: a
half-configured deployment stays silent rather than posting to a stranger's
chat. `dryrun` never resolves to the channel id, even when one is configured.

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
