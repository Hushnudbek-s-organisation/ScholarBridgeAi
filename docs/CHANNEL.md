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
<b>Moliyalashtirish:</b> {funding_type_uz}
<b>Til talabi:</b> {language_req_uz}

<b>Kimlar uchun</b>
➡️ {eligibility_uz…}

<b>Foydali tomonlari</b>
➡️ {benefits_uz…}

<b>Dastur haqida</b>
➡️ {about_uz}

⏰️<b>Oxirgi muddat:</b> 15-dekabr, 2026      (exact)
⏰️<b>Taxminiy muddat:</b> …                  (estimated — never called a deadline)
⏰️<b>Muddat:</b> rasmiy sahifada ko'rsatilgan (rolling)
➡️Batafsil: <a href="SITE/go/CODE">SITE/go/CODE</a>

{hashtags — kind + country + funding + level + editor extras, deduped, max 5}
💼 {Kanal} | {Bot}
```

### 4b-2. Standard card (`scholarship_single`, `fully_funded`)

Same shape, built from **structured facts** instead of authored copy, so the
500+ awards without Uzbek copy still post in the published format:

```
{flag} <b>{title}</b>[ — {tagline, only if authored}]
🏛 {provider}

<b>Moliyalashtirish:</b> To'liq          (fully funded)
<b>Moliyalashtirish:</b> Kontraktning bir qismi   (partial: the Uzbek coverage label)
<b>Til talabi:</b> IELTS 6.5+           (only when min_ielts is stored, or authored)

<b>Kimlar uchun</b>
➡️ Magistratura                          (degree_levels → Uzbek)
➡️ Iqtisod, statistika                   (eligible_majors)
➡️ GPA 3.0+                              (min_gpa)
➡️ 🇺🇿 O'zbekistonliklar uchun ochiq      (only when eligible_countries names Uzbekistan)

<b>Foydali tomonlari</b>
➡️ To'liq moliyalashtirish               (fully funded rows only — never repeats a partial header)
➡️ Yashash uchun to'lov: $1,400          (living_allowance, when > 0)
➡️ Yo'l xarajatlari: $500                (travel_allowance, when > 0)

⏰️<b>Oxirgi muddat:</b> 27-yanvar, 2027 · 90 kun qoldi
🏛 Rasmiy manba: <a href="{application_url|website_url}">havola</a>
➡️Batafsil: <a href="SITE/go/CODE">SITE/go/CODE</a>

#grant #toliq_moliyalashtiriladi #magistratura
💼 {Kanal} | {Bot}
```

Rules, enforced by `scripts/check-channel.ts`:

* **Uzbek only.** `description`, `requirements`, `english_requirements`,
  `tuition_coverage` and `expected_deadline_period` are English prose in
  production data and are never printed as they are; the card is built from the
  already-translated structured fields, or from the *facts* those English
  fields state — see §4b-3.
* **No invented period.** A stored allowance is printed as a bare amount. The
  row does not record whether it is monthly or yearly, so the card never says.
* **No repetition.** The header already states the coverage, so a partial award
  gets no coverage bullet — only amounts, or no section at all.
* **Authored copy wins.** When `scholarship_channel_content` has the Uzbek
  fields for that award, its bullets replace the structured ones (that is the
  rich post's content, in the same card layout).
* **Funding hashtag** is data-driven: `#toliq_moliyalashtiriladi` only on an
  award `isFullyFunded` accepts. Editable in settings (`hashtags.funding`).

An empty section disappears **with its heading and its blank line**. Length
policy: at 1800 visible characters the `about` block is trimmed at a word
boundary (`…`); at 4096 it is dropped; then each bullet list is cut to four; if
it still does not fit the post is skipped rather than truncated.

### 4b-2a. One card for every award, fully in Uzbek (2026-10-29, kechqurun)

The operator's reference post was reproduced field by field, and three things
were still wrong in the live output:

| Was | Now |
| --- | --- |
| `eligible_majors` printed as stored English (`Computer Science`) or, on 300 rows, as a whole English sentence | `fields.uz.ts` — a curated field vocabulary (`kompyuter fanlari`). An unknown name or a sentence is **dropped**, never printed |
| `Dastur haqida` existed only when an admin had typed Uzbek copy — i.e. on almost no award | composed from stored columns (`Ushbu dastur {locative}da {degrees} bosqichini {funding} asosida…`) plus up to one sentence *read* out of `description` (`Ta'lim ingliz tilida olib boriladi.`, `Dastur muddati 2 yil.`) |
| `urgency` (the kind readers see most often) was a 5-line nudge with no sections, no hashtags, no footer | the same card as every other award, with `⏰️ Muddat yaqin: N kun qoldi` on top; the countdown is printed once |
| Country names outside the seeded 22 printed in English, with no flag and no locative form | `CHANNEL_COUNTRIES` covers all 58 values the catalogue stores, and `loadChannelCountries()` now inserts **missing** keys (not only seeds an empty table) |
| A missing `coverage_type` label silently removed the `Moliyalashtirish:` line | the label table covers every value in the column (`Full Tuition Waiver`, `Tuition Credit`, `Full Ride`, …) |

The headline now ends with a one-liner built from stored facts, the same way the
reference post does:

```
🇳🇿 <b>University of Waikato Doctoral Scholarship</b> — Yangi Zelandiyada doktorantura (PhD) uchun to'liq kontrakt va stipendiya grant
```

Authored `tagline_uz` in Admin → Kanal → Kontent still wins over it. A country
the table does not know produces no place clause at all — the sentence never
writes a plain name where Uzbek needs `-da`.

**The footer is the operator's.** `Admin → Kanal → Linklar → Post oxiridagi
qator` holds the `💼 Label | Label | Label` line, in order, exactly as typed —
that is where the social networks go (Instagram, Telegram, YouTube, …). It now
prints on **every** kind including urgency; leave it empty to fall back to the
channel and bot links. Nothing is generated there, and no third-party brand name
is ever a default.

### 4b-3. English prose is read, never printed

547 active awards carry their prose in English (`requirements` alone has 3,009
sentences, 2,766 of them distinct), so a sentence dictionary cannot cover them.
Instead `src/lib/channel/templates/translate.uz.ts` **reads the facts out of the
English** with a fixed set of patterns and says them in fixed Uzbek lines. No
per-post model call, no free text, nothing to review at send time.

| What it reads | Example source | Line it produces |
|---|---|---|
| Test scores | `IELTS 6.5 or equivalent` | `IELTS 6.5+ yoki ekvivalent imtihon` |
| | `IELTS 6.5 / TOEFL 92` | `IELTS 6.5+ · TOEFL 92+` |
| CEFR levels | `B2 Italian` | `Italyan tili B2 darajasi` |
| Score-less wording | `sets no single score; each host…` | `Yagona til balli yo'q — talab tanlangan dasturga bog'liq` |
| Degree levels | `Master's or PhD` | `Magistratura · Doktorantura` |
| Grade | `GPA of 3.2`, `70 per cent` | `GPA 3.2+`, `O'rtacha ball 70%+` |
| Citizenship | `citizen of a partner country` | `Hamkor davlatlar fuqarolari uchun` |
| Exclusivity | `hold no other scholarship` | `Boshqa stipendiya olmaslik sharti` |
| Nomination | `be nominated by the ministry` | `Universitet yoki vazirlik tavsiyasi (nominatsiya) kerak` |
| Age | `under 28 for master` | `Yosh chegarasi: 28 yoshgacha` |
| Documents | `motivation letter, CV, interview` | `Motivatsion xat \| CV \| Suhbat (intervju)` |
| Coverage | `Between 50% and 100%…` | `Kontraktning 50%idan to'liq qismigacha qoplanadi` |
| Amount | `stipend of HK$344,400 a year` | `Stipendiya: HK$344,400 (yiliga)` |

Guarantees, each one asserted in `scripts/check-channel.ts`:

* **Fixed lines only.** Output is a bank of Uzbek strings; unknown English is
  **dropped**, never rendered word-by-word (a half-English bullet is worse than
  no bullet).
* **No invented number.** Every digit in a produced line already exists in the
  source sentence; the check fails otherwise.
* **No English leftover** — `the`, `must`, `required`, `applicants` may not
  survive into a card.
* **`100%` is never printed**: the lint (§6) treats it as an absolute promise
  and the sender would refuse the post, so a range that reaches the full fee is
  worded out loud.
* **The header wins.** A stated percentage or amount replaces the generic
  `To'liq moliyalashtirish` bullet; the generic bullet appears only when the
  award is fully funded and no finer figure exists.
* **Authored copy still wins** over every translated line, and
  `description` has **no** translator: it is either the admin's Uzbek or it is
  omitted.
* Coverage measured against 15 real rows: `Til talabi` 13/15, `Kimlar uchun`
  14/15, `Foydali tomonlari` 10/15; the remainder omit the section.

### 4b-4. The academic dictionary (12 732 terms, in the database)

The patterns above cover the *shapes* a requirement sentence takes; they cannot
name every term inside it. For that the channel ships the operator's own
dictionary — the 606-page *ScholarBridgeAI akademik tarjima lug'ati* (12 467
units) — as data:

| Where | What |
|---|---|
| `scripts/import/lexicon/extract_pdf.py` | reads the PDF's table rules and emits the term list; `--pdf`, `--out`, optional `--raw` |
| `src/lib/channel/lexicon/lexicon.uz.json` | 12 732 EN→UZ headwords (plus the RU gloss where the source had one), 1 949 of them slash aliases |
| `src/lib/channel/lexicon/index.ts` | `lookup`, `translateFragment`, `translateList`, `phraseScan` |
| `src/lib/channel/lexicon/store.ts` | installs the same rows into `translation_lexicon` and loads admin edits |
| `translation_lexicon` / `translation_lexicon_meta` | the database copy + which version is installed |

**It is in the database.** `ensureChannelTables()` installs the dictionary
(versioned, chunked, ~13 statements once). A fresh environment therefore needs
no extra step, and `npm run lexicon:seed` does it on demand (`-- --status` only
reports). Rows created by the bootstrap are covered by the same RLS lockdown as
the other channel tables.

**An operator's gloss wins.** Editing a row to `source = 'admin'` makes it
override the bundled copy at render time; the publisher reloads those rows once
per tick (`refreshOverlay`). Re-importing a newer PDF deletes only
`source = 'pdf'` rows, so a correction is never silently undone.

Two ways a term becomes a bullet in `Kimlar uchun` (`dictionaryLine`):

1. a requirement **list** whose fragments all resolve —
   `bachelor's degree, motivation letter` → `Bakalavr darajasi · Motivatsion xat`;
2. otherwise the **terms** the sentence contains — `strong academic record,
   English proficiency` → `Akademik ma'lumotlar · Ingliz tili darajasi`.

Both are gated:

* `translateFragment` returns `null` unless **every** word is a known term, a
  number, an allow-listed acronym (IELTS, GPA, CV, PhD…) or one of a dozen
  connectors (`and`, `or`, `at least`…). One unknown word cancels the fragment —
  a dictionary cannot conjugate a verb, so "candidates must have submitted" is
  refused by design rather than half-translated.
* A gloss that reads as two senses is refused inside a bullet, anything the
  patterns already said is dropped, and the bullet is capped at 120 characters.
* No English may survive: a gloss carrying `the/and/must/students` is rejected.

**Correcting a gloss is a panel job, not a deploy.** Admin → Kanal → **Lug'at**
(`/api/admin/channel/lexicon`) searches the table by headword or gloss, saves a
correction, restores the original, or re-imports the bundled list:

| Action | What it does | What it cannot do |
|---|---|---|
| `search` | matches `en` or `uz`, operator-edited rows first | — |
| `save` | upserts the row with `source = 'admin'` | add English (the gloss is validated by `checkGloss`, the renderer's own rule) or set `source` itself |
| `reset` | puts the dictionary's own gloss back (`bundledGloss`), and only deletes a row the operator added themselves | lose a term: a headword the bundle knows keeps its row, with its original gloss |
| `install` | re-imports the bundled list if the version changed | touch operator rows |

Every change is written to `channel_audit` (`lexicon_save` / `lexicon_reset` /
`lexicon_install`) and takes effect on the next post, because the save reloads
the overlay. Measured against a real Postgres, through the HTTP endpoint
with an admin session: correcting `tuition` made the row `source = admin` (1
edited, 12 732 rows) and changed the very next render to the operator's wording;
`reset` restored the printed gloss **and kept the row** (it is a `pdf` row
again); a word the dictionary lacks (`colloquium`) produced **no bullet at
all**, then one once added, then none again after removal; an English gloss and
an empty one were refused with `bad_gloss_english` / `bad_gloss_empty`; an
unknown action with `bad_action`; and `install` on a current copy reported
`installed: false` without rewriting anything.

Two known edges, both measured:

* **Uzbek apostrophes.** JavaScript counts `'` as a word boundary, so a plain
  `/\bor\b/` reads `ilg'or` as English — it was silently dropping 74 legitimate
  glosses, every "advanced …" phrase among them. The leftover rule now has an
  apostrophe lookbehind (`looksEnglish`), which is the single definition used by
  the renderer, the fragment gate and the admin validator alike.
* **207 rows still carry English** in the supplied PDF itself (provider names
  such as *American University of Beirut*, or *U of T*): those are refused by
  the same rule rather than printed, and an operator can correct any of them in
  the panel. The dictionary is 12 732 headwords; ~1.6% of its glosses are not
  clean Uzbek as printed, and none of them can reach a post.

**What the dictionary may not say.** Rendering the live queue (below) showed two
bullets that came from real prose and were both wrong:

| Chip | Why it was refused |
|---|---|
| `Yangi Zelandiya` | a *place*, not a requirement — the country is already in the header. `isCountryName()` knows the names in both languages |
| `Minimal GPA` | a floor with **no value**: the dictionary's gloss for "minimum GPA", printed next to no number. A chip that starts with *minimal/maksimal/kamida* and carries no digit is dropped |

The second one was hiding a fact instead of inventing one: the Waikato row says
"a minimum GPA of **A-** on the qualification used for entry", which has no
digit, so the numeric GPA reader skipped it. A letter grade is now read too —
`Minimal GPA: A-` — and the bare chip disappears because the real line covers it.

Measured on eight real awards, shape 2 puts Uzbek term chips on 4 of them; the
other four are prose with no dictionary term in them, and stay as short as they
were. That is the honest size of the gain — the dictionary names vocabulary, it
does not translate sentences, and nothing here is ever guessed.

**Reminder posts read the same facts.** `urgency` (`⏳ Muddat yaqinlashmoqda` and
its three siblings) is the kind that actually fires on a busy day, and it used
to be a title, a date and one funding word — nothing a reader could act on, and
the second variant did not even say who the award is for. All four variants now
print `🔤 Til talabi` and a `🎓 Kimlar uchun` block of up to three ➡️ bullets,
taken from **the same** `languageLabel()` / `eligibilityBullets()` the card uses,
so the two renderers can never disagree. Escaping, the six-bullet cap and the
"no English prose" rule are shared, not re-implemented.

### 4b-5. Checked against the live queue

The renderer is pure, so the live queue can be rendered from a copy of the
production rows without touching Telegram. Done on 2026-10-29 14:05 Tashkent,
against plan row 4 (`urgency_v4`, University of Waikato Doctoral Scholarship,
due 20:35 the same day):

```
⏳ University of Waikato Doctoral Scholarship

• Muddat: 31-oktabr, 2026 · 2 kun qoldi
• Tashkilot: University of Waikato
• Davlat: Yangi Zelandiya
• Moliyalashtirish: To'liq kontrakt va stipendiya
• Til talabi: Yagona til balli yo'q — talab tanlangan dasturga bog'liq

🎓 Kimlar uchun
➡️ Doktorantura (PhD)
➡️ Minimal GPA: A-
➡️ Xalqaro talabalar uchun

📌 2 kun qoldi. Hujjatlarni oldindan tayyorlab qo'ying.

➡️To'liq ma'lumot: {SITE}/go/2fc3yu
```

553 characters, `lintText` clean, no English left, no `100%`. The three
nearest-deadline rows (37 and 771 at 2026-10-30, 437 at 2026-10-31) render the
same way: 570–669 characters, all lint-clean, `Foydali tomonlari` present only
where the row states something checkable.

### 4b-6. The publishing rehearsal

`check-channel.ts` proves the *text*. `scripts/rehearse-channel.ts`
(`npm run channel:rehearse`) proves the *pipeline*: it starts the local Bot API
mock (`scripts/telegram-mock.mjs`), points `TELEGRAM_API_BASE` at it, and runs
the same `runDuePosts` the cron calls, against a real Postgres — no network, no
live channel.

| It asserts | Why it matters |
|---|---|
| mode `on`, one due row → **one** `sendMessage` to the channel chat, post row `sent`, plan row `sent` | the whole chain: render → link → reserve → send → store |
| a second tick sends nothing | the dedupe key is what stops a double post |
| a row whose `send_at` passed hours ago is still published | `duePlanRows` asks `send_at <= now`, so a tick *after* the window is enough — this is exactly the case that used to end in silence |
| a row from **yesterday** is retired (`skip_reason = date_passed`), not posted late | the other half of the same rule: no stale news under today's date |
| mode `approval` → preview only to the admin chat, `awaiting_approval`, channel untouched | the approval gate is real, not a UI label |
| the preview carries exactly `ch:ok`, `ch:no`, `ch:ed` for one post | "exactly three actions" |
| `approveApproval` publishes the **stored** text to the channel | what the operator approved is what goes out |
| every message the mock received lints clean | the same rules the sender applies |

It refuses a non-local `DATABASE_URL` (it writes rows), and restores the settings
it touched and deletes every row it created — two consecutive runs pass, so it
is safe to keep in a loop. Measured: 14 checks, 14 pass.

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

### 9b. "Ulanishni tekshirish" — what each step means

The Verify button runs three real Telegram calls and reports five verdicts. Each
one is a **code** the panel translates (uz/ru/en), so the message names the
thing to fix instead of saying "something is wrong":

| Step | Code | What it means |
| --- | --- | --- |
| Token | `token_missing` / `token_invalid` | no bot token anywhere, or Telegram answered 401 |
| Channel | `channel_missing` / `channel_invalid` / `channel_not_found` / `channel_wrong_type` | nothing entered, an invite link, the bot cannot see it, or that id is a group/private chat |
| Permission | `bot_not_admin` / `no_post_permission` | the bot is in the channel but is not an administrator, or "Post messages" is off — the message names the bot's `@username` |
| Admin chat | `admin_chat_missing` / `admin_chat_unreachable` | no id, or the bot was never started in that chat |
| Site | `site_missing` / `site_not_public` | no origin, or a local one (`http://localhost:3000`): Telegram drops links to it |

A successful Verify also **pins the numeric id** Telegram resolved
(`@name` → `-100…`), because a username can be renamed and a numeric id cannot.
Only that explicit action writes.

### 9c. A post is never lost to formatting

Telegram rejects a whole message for two reasons that are not about the
content, and both used to lose the post:

* **`BUTTON_URL_INVALID` / "wrong HTTP URL"** — an inline button whose URL is
  not a public https URL (typically a deployment configured with the dev
  origin). Every button is validated *before* the request (`channel/recover.ts`),
  unusable ones are dropped, and if the API still refuses the keyboard the
  message is re-sent without it.
* **"can't parse entities"** — markup Telegram cannot parse. The message is
  re-sent as plain text (`plainText()` keeps it readable), and the keyboard
  stays.

That is at most two retries, in `sendMessageWithRecovery` — the only place that
calls `sendMessage`, so no send path can skip it. A real failure (bot blocked,
chat deleted) is still reported, not retried.

### 9d. The bot finds the channel by itself

Typing an id or a username was the last step that could go wrong, so the bot
now watches for the channel and reports it.

`src/lib/channel/discovery.ts` (pure rules) and
`src/lib/telegram/channelDiscovery.ts` (DB + Telegram) recognise three things:

| Update | When it arrives | Wrong-rights warning |
|---|---|---|
| `my_chat_member` with `status` `administrator`/`creator` and `chat.type = channel` | the bot is added to a channel or promoted | — the bot does have rights |
| `channel_post` | any post in a channel the bot manages | — |
| private `message` with `forward_from_chat` or `forward_origin.type = "channel"` | an admin forwards a post from any channel | **yes** — a forward proves nothing about administer rights |

Discovery runs **before** every other branch in
`src/lib/telegram/service.ts`, because a forwarded post is an ordinary private
message and would otherwise be answered with the command list. A `channel_post`
carries no sender, so it can only *store* a candidate, never connect a channel
on a stranger's behalf.

The rules:

1. Only an admin (`resolveChannelApprover`) triggers anything, and the reply
   always goes to a private chat — never into the channel.
2. If no channel is configured, the discovered one is adopted immediately and
   the mode is chosen explicitly: `approval` when an admin chat exists,
   otherwise the mode is left as is. Nothing is adopted silently over an
   existing connection: swapping the live channel because someone forwarded a
   post would be worse than not adopting at all.
3. The candidate is saved to `channel_settings.connection.discoveredChannel`
   (`{id, title, username, at}`, numeric id only) so the panel can offer it.
4. The reply is Uzbek and comes from `DISCOVERY_TEXTS`: title, `@username`,
   `<code>id</code>`, the mode the operator now has, and — for forwards — the
   reminder that the bot still needs **Post messages**.
5. The panel shows an indigo "Aniqlangan kanal" banner above the connect form
   with one button; the mode goes `off → approval` when adopted that way.

`allowed_updates` in the setWebhook call now requests `message`,
`callback_query`, `my_chat_member`, `channel_post`, `poll` and `poll_answer`.
Without `channel_post` in that list Telegram simply never delivers the second
row of the table.

### 9e. Approval mode that cannot reach a chat still works

Approval mode needs an admin chat to show the preview in. When it has none the
publisher used to do nothing at all: the post was neither sent nor queued, and
it vanished until its TTL.

Now the post is stored as `awaiting_approval` **with no chat and no message id**
and appears in Admin → Kanal → "Tasdiqlash kutilmoqda". The row carries an
Uzbek note (`APPROVAL_TEXTS.panelOnly`) instead of a failure, so nothing is
marked `failed` — `failed` is not in that inbox. Approving it from the panel
publishes the stored text, exactly like the Telegram button
(`approveApproval` is the one publishing path for both).

Two related rules keep "Send now" honest:

* **Send now (Hozir yuborish)** publishes to the channel even in approval mode —
  the operator is pressing Send on a row they are looking at. If that post is
  already waiting for approval, the same press publishes the stored text
  instead of answering "waiting for approval".
* **Test post** still goes to the admin chat only, in every mode.

A preview whose header or body fails to send is left `awaiting_approval` with a
`preview_not_delivered: …` note rather than `failed`, for the same reason.

### 9f. Quick connect: one field, parsed as you type

The top of Admin → Kanal → **Ulash** is now a single field and one button.

The field is parsed **client-side, on every keystroke**, with
`normalizeChannelIdentifier` — the same function the API uses. That is
deliberate: a second implementation in the UI would drift, and the preview would
start promising something the server refuses.

| Pasted | Shown immediately |
|---|---|
| `https://t.me/kanal`, `t.me/kanal`, `kanal`, `@kanal`, `https://t.me/s/kanal` | `@kanal`, plus a `t.me/kanal` link to open it and a note that Connect pins the numeric id |
| `-1001234567890`, `1234567890`, `t.me/c/1234567890/42` | the `-100…` id, described as the form that never changes |
| `https://t.me/+AbCdEf` | **red**: an invite link carries no id — forward a post to the bot or paste the `-100…` id |
| `hello world` | **red**: not a channel address, with the three accepted shapes |

**Ulash va tekshirish** then does the whole flow in one press: save the
normalised value (the `@username` also goes into the brand block so the bot link
can be built), run the five-step check, and leave the verdict on screen.

* A connection in mode `off` is switched to **approval** — connecting should not
  start publishing unread, and it must not look connected while nothing can ever
  be sent.
* Every failing step is repeated under the field in red, in the operator's
  language, with `@bot_username` interpolated. For example, with the bot demoted
  to a plain member in the mock:

  > **Ulanish tugamadi. Buni tuzating:**
  > @ScholarBridgeTestBot kanalda administrator emas. Telegramda kanal →
  > Administratorlar → botni qo'shib, «Post messages» ruxsatini bering.

* **Sinov xabari** sits next to it and still goes to the admin chat only.

The full form below is unchanged for the operator who wants every knob. The
local mock gained `POST /_member {status, canPost}` (`status` is a real Telegram
status: `creator | administrator | member | ...`) so both red screens can be
exercised offline.

### 9g. "Nega post ketmayapti?" — and what actually orders the posts

Two things were true at once and neither was visible: a long chain of conditions
can silently stop the publisher, and the order it picks scholarships in was not
the order an applicant cares about.

#### The diagnosis

`src/lib/channel/why.ts` (pure) + `src/lib/channel/whyStore.ts` (reads) answer
"why is nothing arriving?" with one verdict and a checklist, in the operator's
language:

| Verdict | Meaning | Fix |
|---|---|---|
| `token_missing` | no bot token | Admin → Telegram |
| `env_off` | `CHANNEL_AUTOPOST=off` on the server | hosting env |
| `mode_off` | the panel switch says Off | **the default after install** |
| `paused` | the pause date has not passed | clear the date |
| `channel_missing` / `channel_unreachable` / `channel_wrong_type` | bad or unknown id | the quick-connect field |
| `bot_not_admin` / `no_post_permission` | the bot cannot post | Channel → Administrators |
| `admin_chat_missing` / `admin_chat_unreachable` | approval has nowhere to go | send `/start` to the bot |
| `catalogue_empty` / `catalogue_stale` | nothing publishable | **Admin → Programmes** |
| `cron_stale` (warning) | nothing has ticked for a while | the monitor URL below |

It also reports what is *not* blocking but explains a quiet channel: a quiet day,
a post that is simply not due yet, a thin catalogue, and the last real error
verbatim. The catalogue line is the answer to "is the data the problem?":

> Baza: **2** ta e'lon yuborishga tayyor (14 tadan, 4 tasdiqlangan, 2 tasida aniq
> muddat).

With the list of rows that are in the table but cannot be published, each with
the reason (`verification_stale`, `no_reliable_deadline`, `not_open_to_uzbekistan`, …).

That is the honest answer for a thin deployment: a verified row older than
`VERIFICATION_MAX_AGE_DAYS` (60) is not publishable, so a catalogue that is
never re-verified runs dry, and the channel degrades into tips and checklists.
The fix is data, not code.

#### The order

`editorialRank()` in `select.ts` decides which scholarship the editorial lane
picks, in this order:

1. **deadline tier** — ≤7, ≤14, ≤30, ≤60, ≤120 days, then estimated, then
   evergreen;
2. **exact days left** — inside a band, tomorrow beats next week. This is the
   half that was missing: the country order used to come first *within* a band,
   so a 7-day award in a favourite country could be announced before a 1-day
   one somewhere else;
3. **country priority** — `plan.priorityCountries`, an operator-editable list
   (default: United States, United Kingdom, Germany, South Korea, Japan, …).
   Among awards that close on the **same day**, the countries this audience
   actually applies to win. The urgent lane uses the same tie-break, so a
   same-day favourite gets the urgency post rather than an unrelated country
   that happened to be next in the rotation;
4. the learned preference score (from polls);
5. the row id, so the plan is reproducible.

**The country order never worked until 2026-10-29.** `editorialRank` passed
`facts.country` — the *Uzbek* label the templates print (`Yaponiya`, `AQSh`) —
into `countryPriority`, which matches English names. Every country therefore
scored `priorities.length`, i.e. "not in the list", and the operator's list had
exactly no effect on the plan. It now reads `facts.countryRaw` (the stored
value), and the alias table also knows the Uzbek spellings, so a label that
slips through still resolves instead of silently sorting last.

Country matching goes through an alias table (`USA`/`US`/`United States of
America` → United States, `UK`/`Britain` → United Kingdom, `Korea` → South
Korea, `Germaniya` → Germany, …), because the column is free text.

#### §4d. Checked against the live catalogue

`scripts/fixtures/catalogue-slice.json` is a 45-row excerpt of the production
catalogue (2026-10-29): every active, verified award with a deadline in the next
45 days, nearest first. `check-channel.ts` plans it and asserts that the plan is
non-decreasing in days-left and that the first post targets the nearest
deadline — real data, not invented numbers. Regenerate with:

```sql
select id, country, deadline_date, deadline_type, coverage_type, left(title, 42)
from scholarships
where is_active and verification_status = 'verified'
  and deadline_date between current_date and current_date + 45
order by deadline_date, id limit 45;
```

Planned from that slice on 2026-10-29 (no history, default settings):

| Day | slot 0 | slot 1 |
|---|---|---|
| 29-oktabr | urgency · 1 kun · Australia (UNSW Scientia) | poll |
| 30-oktabr | urgency · 0 kun · Australia (UNSW Scientia) | single · 0 kun · Australia (Global University Award) |
| 31-oktabr | urgency · 0 kun · **Japan** (Honjo) | single · 0 kun · China (CLEC) |
| 1-noyabr | weekly · 12 ta | single · 5 kun · Canada (Toronto Pearson) |
| 2-noyabr | urgency · 0 kun · United Kingdom (Imperial) | single · 1 kun · India (IIT Kanpur) |

On 31 October six awards close on the same day; Japan (priority 4) takes the
urgency slot ahead of China (12) and the four unlisted countries, which is the
tie-break doing its job.

The list is a **preference, not a statistic**: nothing in the panel or the posts
claims how many students go anywhere. University-level relevance is expressed
the same way — a programme is matched by its country, and the topic weights
learn the rest from poll answers.

The weekly list and the digest are sorted by date regardless; only the
"which one do we feature today" decision changed.

#### Keeping it running on a host that sleeps

The in-process loop (`boot.ts`) only ticks while a Node process is alive. On a
free/sleeping host it sleeps too — which looks exactly like "it is broken".
`/api/cron/channel` now accepts the secret in the query string as well as a
Bearer header, so an uptime monitor can drive it:

```
https://your-site/api/cron/channel?secret=$CRON_SECRET    every 5 minutes
```

One monitor does both jobs: it keeps the site awake **and** runs the tick. The
endpoint answers `200` for a deliberate switch (`skipped: true`, with the code)
so a monitor does not turn red over a paused publisher, `401` for a wrong
secret, and `500` only for a real failure. Every tick — from cron or from the
internal loop — writes a heartbeat to `channel_audit`, which is what makes
`cron_stale` detectable at all.

`/api/health` stays the cheap liveness probe (database ping + commit); it never
posts anything.

## 10. Admin panel

| Tab | Controls |
| --- | --- |
| Ulash | Bot/channel/admin-chat wiring, mode, pause, connection check, test message, build plan, run now, short-link refresh, dictionary state, **bot webhook** state |
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

**Lug'at card (Ulash tab).** Next to "Nega post ketmayapti?" the panel shows the
translation dictionary's state: how many terms are in *this* database, which
version is installed, how many rows an operator edited by hand, and — when it is
not ready — one **Import qilish** button. Four states, all computed on the server
(`src/lib/channel/selfcheck.ts`):

| State | Meaning | Advice |
| --- | --- | --- |
| `installed` | The DB copy matches the version this build bundles | nothing to do |
| `pending` | The tables exist, the import has not run yet (fresh deployment) | the first tick installs it, or press the button |
| `stale` | A different version is installed (the bundled dictionary changed) | re-import; admin edits are kept |
| `unavailable` | The table could not be read at all | check the database connection/grants |

An import only ever deletes `source = 'pdf'` rows, so an operator's corrections
(`source = 'admin'`) survive a re-import — that is asserted in
`npm run test:integration`. An explicit **repair** (`forceChannelRepair`) also
installs the dictionary: creating the tables and leaving the dictionary empty was
one silent failure mode too many.

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

### 11a-2. 2026-10-29 (kechqurun) — deploy tekshirildi: nima ishladi, nima ishlamadi

PR #116 `b560af6` bilan main'ga qo'shildi. O'sha kuni kechqurun live Supabase
o'qib chiqildi (read-only), va ikkita fakt aniqlandi:

**Ishladi — lug'at o'zi o'rnatildi.** Merge 16:40:29 UTC, lug'at esa
**16:44:10** da bazada edi:

```
translation_lexicon        12 732 satr   (admin: 0)
translation_lexicon_meta   version = pdf-12732-1949
```

Ya'ni hech kim hech narsa qo'lda kiritmagan — birinchi tick `ensureChannelTables`
→ `installLexicon` zanjirini o'zi ishga tushirgan. §11 dagi «birinchi tick
o'rnatadi» degan da'vo endi deployda isbotlangan, faqat testda emas.

**Ishlamadi — webhook o'zini tuzatish hech qachon ishga tushmagan.**
`channel_audit` dagi barcha heartbeat satrlari `entity_id = "loop"`. Birorta
`cron` satri yo'q. Ya'ni O bosqichida yozilgan o'z-o'zini tuzatish **faqat
`/api/cron/channel` ichida** edi, uni esa bu deployment'da hech kim chaqirmaydi
(UptimeRobot hali sozlanmagan). In-process loop — yagona ishlab turgan tick —
webhook'ni umuman tekshirmagan. Natija: buzuq webhook buzuq qoladi, tugma o'lik
qoladi, va buni aytadigan hech qanday satr yozilmaydi.

**Tuzatildi (shu bosqich).**

1. `maintainPublisherTransport()` — tick shaklidagi yagona chaqiruv: hech qachon
   throw qilmaydi, audit uchun bitta qisqa satr qaytaradi.
2. **Loop ham, cron ham** shu funksiyani chaqiradi (`boot.ts`, `cron/channel`).
   Loop heartbeat'i endi `webhook: "ok"` / `"missing>repaired"` kabi maydonni
   olib yuradi — panel "tick ishlayapti, lekin webhook o'lik" holatini ajratadi.
3. **Preview yuborishdan oldin** (`send.ts`) transport tekshiriladi: operator
   tugmani ko'rganda u **allaqachon** ishlaydi. Buzuq tugma bosilganda hech
   qanday iz qolmasligi — 2026-10-29 dagi asosiy muammo edi.
4. **Tuzatilganda admin chatga bitta xabar** ketadi
   (`APPROVAL_TEXTS.webhookRepaired`): "Bot qayta ulandi, tugmalar endi
   ishlaydi, kutilayotgan postni yana tasdiqlang." Busiz oxirgi bosishi
   muvaffaqiyatsiz bo'lgan operator qayta bosishga sabab ko'rmaydi.

**Shu sababli qoida:** yangi tick-bosqichi qo'shsangiz, u **ikkala** yo'lda ham
(`boot.ts` loop va `/api/cron/channel`) bo'lishi shart. `scripts/check-channel.ts`
buni matn darajasida qulflaydi ("BOTH tick paths verify and repair the webhook"),
`npm run channel:rehearse` esa mock Telegram bilan 21 tekshiruvda isbotlaydi.

### 11a-1. 2026-10-29 — "Approve tugmasi hech narsa qilmayapti"

**Report.** The admin chat received the preview with three buttons. Pressing
**Tasdiqlash** did nothing: no post in `@grantlar_bridge`, no error anywhere.

**What the database proved.** The press never reached this application:

| Evidence | Reading |
| --- | --- |
| `channel_posts` id 1: `awaiting_approval`, `error` empty, `sent_at` null | the approval code never claimed it |
| `channel_audit`: no `approval_approve` and no `approval_blocked` row | no decision was recorded at all |
| `telegram_updates`: zero rows, 7 inserts ever | almost no update from Telegram has ever arrived |
| `channel_audit`: a `tick` every 15 minutes, still healthy | the app itself is fine — only *incoming* updates are missing |

**Why.** Approve/Reject/Edit are inline buttons. Telegram delivers a press as a
`callback_query` **to the webhook of the bot that sent the message**. If that
webhook is missing, still points at an old deployment, or rejects the secret
(rotated `SESSION_SECRET`), the button is dead — and Telegram shows the operator
nothing. A dedicated publisher bot made this worse: only the DM bot's webhook
was ever registered, so a `TELEGRAM_CHANNEL_BOT_TOKEN` bot's buttons could never
work.

**What changed (this phase).**

1. `src/lib/channel/webhook.ts` — the rules: expected URL, allowed updates, and
   a five-state verdict (`ok` / `missing` / `wrong_url` / `error` / `unknown`).
   `unknown` is never "repaired" on a guess.
2. `src/lib/channel/webhookStore.ts` — asks Telegram
   (`getWebhookInfo`) and re-registers (`setWebhook`) **only** when the verdict
   is definite. A healthy answer is memoised for 10 minutes, a failure is not.
3. **Self-heal on the tick**: `/api/cron/channel` calls
   `ensurePublisherWebhook()` before planning. A deployment that lost its
   webhook repairs itself within one tick (~15 minutes) with no operator action.
   A failure there never fails the tick.
4. **The panel tells the truth**: Ulash tab → *Bot webhook* card, showing the
   state, the registered URL, the queue length and the last Telegram error, with
   one **Ulash / tuzatish** button (`POST {action:"webhook"}` — forced, and
   audited as `webhook_repaired`).
5. **Dedicated publisher bots work**: the webhook route now authenticates the
   publisher bot's secret as well, and hands its updates to
   `handlePublisherUpdate`, which can do exactly two things (approval buttons,
   the parked edit text) and nothing else. It deliberately never claims
   `telegram_updates` — update ids are numbered per bot.
6. **A refused press is recorded**: `approval_blocked` audit rows with a code
   (`not_admin`, `tables_unavailable`, `skipped`, `send_failed`,
   `already_closed`) and Telegram's own reason. The toast lasts three seconds;
   the row does not.

**Operating rule that follows from this.** If an approval button does nothing,
check *Bot webhook* first — the card names the fault. The admin panel's own
**Tasdiqlash** button in the approval inbox does not depend on Telegram at all,
so it is always the fallback that publishes.

### 11a. 2026-10-29 — why the live channel had not posted, verified from the database

The deployed instance (Render, `main`) was audited read-only through the live
Supabase project. Every fact below is a row, not an assumption:

| Fact | Evidence |
| --- | --- |
| The scheduler runs | `channel_audit`: a `tick` row every 15 minutes, `posts_run` alongside it |
| It attempts nothing | `posts_run` reports `attempted: 0` on every tick — no plan row was due yet |
| The mode is **approval** | `channel_settings.connection.mode = "approval"`, set by the operator on 2026-10-28 15:36 (`channel_audit` id 108, before → `on`, after → `approval`) |
| Posts were never sent | `channel_posts` = 0 rows |
| Three older plan rows are gone | retired with reason `date_passed` (audit id 93) — a fully missed day is closed, not sent late |
| One post is scheduled | `channel_plan` id 4: 2026-10-29, `send_at 20:35`, kind `urgency`, scholarship 437, status `planned` |

So the publisher is healthy and the channel is *waiting*: at 20:35 Tashkent the
tick turns that row into a preview in the admin chat, and nothing reaches the
channel until the admin presses **Approve**. That is approval mode working as
designed, not a bug.

**The dictionary is not in the live database yet** — `information_schema` lists
the thirteen `channel_*` tables and no `translation_lexicon*` tables. The reason
is deployment, not code: the dictionary ships in PR #116, which is not merged, so
the running build has no code that creates the table. The moment that build is
deployed the first tick installs it by itself; `npm run test:integration` proves
the claim on a fresh database ("the first bootstrap installs the whole dictionary
into a fresh database", 12 732 terms, version `pdf-12732-1949`).

## 11b. The public path: from a post to the product (2026-10-29)

Every channel post ends in `/go/<code>` → `/scholarships/<id>`. Before this
section existed, that page was the whole of a visitor's experience: no link to
the product, no explanation of what the site does, and the app itself behind an
account. The operator's question was exactly that — *"the site's features are
never visible; find a way."*

### What is public (no account, no session)

| Page | What it proves |
| --- | --- |
| `/scholarships`, `/scholarships/<id>` | the award, its requirements, the official link |
| `/universities`, `/universities/<id>` | the institution, programmes, costs |
| **`/features`** (new) | what the platform does beyond one award |

`/features` is a server component: it reads only bundled copy, needs no session
and no client fetch, and it is in the sitemap. The Telegram bot link on it is
printed **only** when the deployment has a configured bot (`getTelegramSettings`),
never hardcoded.

### The three entry points, all on every public page

1. the header's third navigation item (`Imkoniyatlar` / `Возможности` /
   `Features`) — added to `PublicCatalogHeader`, so it exists on every catalogue
   page by construction;
2. a promo strip at the end of each catalogue page
   (`PublicFeaturePromo`): `Bu sahifa — saytning faqat bir qismi` + two buttons;
3. the bottom of every channel-linked award page, i.e. exactly where a reader
   from Telegram finishes reading.

### One click to a real account

`/?start=1` opens the onboarding wizard directly for a visitor with no session
(the parameter is removed from the URL afterwards so Back/Forward and bookmarks
behave). A signed-in student is never hijacked: the session restore wins.

### What the page says, and what it refuses to say

Browsing is free and account-free; an account is **only** for saving, deadline
reminders and the AI assistant. The eight feature cards describe shipped
functionality (fit score, admission chance, deadline plan, documents and essays,
AI assistant, visa/departure, cost plan, Telegram bot) — no numbers, no
testimonials, no promises, consistent with §4b and docs/CHANNEL.md §6.

The catalogue pages now also pass the **server-resolved dictionary** to
`LocaleProvider`. The promo is a client component, so without it the strip
painted English for an Uzbek visitor until hydration finished.

Checks: `npm run test:render` §14 (9 checks — the page exists and reads no
session, the header links it, every catalogue page carries the strip, `start=1`
opens the wizard, the bot link is conditional, and the copy is complete in all
three languages).

## 11c. The new-account prompt: connect the bot, for ten days (2026-10-29)

The operator's instruction: *after creating an account, when the student comes
back within ten days, ask them to connect the Telegram bot so they can use the
site fully — and one account may have one Telegram, never more.*

### What was already true (said plainly)

**One account = one Telegram was already enforced**, in three layers, and no
code changed for it in this phase:

| Layer | Where | What it refuses |
| --- | --- | --- |
| website | `startRequest()` → `getLinkByProfile` | a second link attempt on an account that already has one → `already_linked` (409) |
| bot | `confirmLinkAttempt()` transaction | a Telegram id already on another account → `linked_elsewhere`; an account that already has another Telegram → `account_has_other` |
| database | `telegram_links` | `profile_id … unique` **and** `telegram_user_id … unique` — a race cannot create a second row |

`npm run test:telegram` now asserts all three, and
`npm run test:telegram-integration` already drove cases A/B/C through the real
bot and the real database.

### What was wrong with the reminder

`TelegramNudge` existed, but:

* it was rendered **only on the dashboard tab**, so a student who opened
  Projects/Deadlines/anything else never saw it;
* its dismissal was one permanent flag (`scholarbridge_tg_nudge_dismissed = "1"`):
  a single tap on day one silenced it **for the life of the account**;
* nothing knew the account's age, so there was no ten-day window at all — the
  card could appear on a two-year-old account or never.

### Now

`src/lib/telegram/nudge.ts` (pure, no database):

```
visible ⟺ bot configured ∧ not linked ∧ account age ≤ 10 days ∧ not dismissed today
```

* The verdict is computed **on the server** (`GET /api/telegram/me` →
  `nudge: { show, reason, daysLeft }`, `account: { ageDays, nudgeWindowDays: 10 }`)
  from `student_profiles.created_at`. The browser cannot invent a window; it only
  knows whether *today's* banner was dismissed.
* Dismissal is keyed `scholarbridge_tg_nudge_<profileId>_<local day>`, so "Later"
  means today, and the reminder returns tomorrow while the account is still new.
  Older keys are pruned on write. Day 10 is inside the window, day 11 is not.
* An unknown creation date is `too_old` — never a reason to nag.
* The card renders in the **app shell**, above the tab content, so it greets the
  student on whatever screen they open in those first days.
* The permanent connect card in *Settings → Telegram* is untouched: nothing is
  lost after day ten, and unlinking later does not resurrect the reminder.

Copy (uz/ru/en): `telegram.nudgeTitle` = *"Saytdan to'liq foydalanish uchun
Telegram botni ulang"*, `nudgeBody`, `nudgeDaysLeft` (`… yana {days} kun …`),
`nudgeCta`, `dismiss` = *"Keyinroq"*.

Verified live on a real `next start` against the dev database: a fresh account
with a configured bot → `show: true, daysLeft: 10`; a 15-day-old account →
`show: false, reason: "too_old"`; a linked account → `reason: "linked"`.

## 11d. The catalogue in Uzbek: names translated, prose labelled (2026-10-30)

Phase Q fixed the *channel* copy. This section is the same rule applied to the
**website catalogue**, where 3030 active programmes and 547 scholarships are
stored in English and rendered into uz / ru at request time.

### What the live data actually contains (measured, not assumed)

| Table | Rows | Distinct text |
|---|---|---|
| `programs` (active) | 3030 | 1138 programme names, **67** `field` values |
| `scholarships` (active) | 547 | 446 distinct `tuition_coverage` strings, plus `description`, `requirements`, `english_requirements` |

Two different problems hide in that.

**Names are finite.** They are built from a small grammar — a degree token
(`BSc`, `LLM`, `MB BChir`, `Master of Engineering`) plus a field, often a
`(Hons)` / `(English-taught)` marker and sometimes a business school in
parentheses. A dictionary plus a parser covers them completely.

**Prose is not.** `"No scholarship-specific English score is published;
applicants must meet the host university's English language requirement…"` has
446 siblings. It cannot be dictionary-translated, and machine translation is
not used in this project. The product owner's ruling (2026-10-30) is: **the text
stays where it is, with an explicit "Manba tili: inglizcha" label directly
above it.** Nothing is silently dropped, nothing is machine-mangled, and a
student never mistakes English for a broken Uzbek translation.

### What was wrong before this phase (verified in the code, not guessed)

1. **67 field labels → 12 were not translated at all** and several were
   machine-hybrids that read as typos: `Life fanlari`, `Applied matematika`,
   `Information fan`, `Earth fanlari`, `Financial muhandislik`, `Sports fan`.
2. **Programme names fell straight through the parser.** `LLB Law`,
   `Bachelor of Design in Animation` → `of dizayn in Animation bo'yicha
   bakalavr`, `Master of Engineering` → `of muhandislik bo'yicha magistr`,
   `Master of Laws (LLM) in Environmental Law` → `of Laws (LLM) in ekologik
   huquq bo'yicha magistr`. Half-translated titles were the norm, not the
   exception.
3. **`tuition_coverage`, `english_requirements`, `description` and
   `requirements` were printed as raw English with no label at all** on the
   uz/ru detail page.

### The rule now

* **Clean or verbatim.** `localizeMajorOrField` returns the original label when
  any English word survives the alias pass — a half-translated label reads worse
  than the source. `isUntranslatedLabel()` is the exported probe the gate uses.
* **Names are parsed, not word-swapped.** Degree tokens (30+ forms, longest
  first) → field → composition, with `(Hons)` → *imtiyozli*, `(English-taught)`
  → *ingliz tilida*, and institution parentheticals kept verbatim because they
  are proper nouns (`MBA — Edinburgh Business School`).
* **Prose is labelled.** `localizeProse()` runs the deterministic translator and
  then asks `needsSourceLanguageLabel()`; `SourceLanguageProse` renders the
  label plus `<p lang="en">`. Text that IS translated (test scores, the common
  coverage phrasings) gets no label.
* **The funding cell never holds a sentence.** A long English `funding_type`
  falls back to the localized coverage type instead of dumping prose into a
  table cell.

### Verified

* `npm run test:catalogue-language` — **17/17**, against
  `scripts/fixtures/live-catalogue-vocab.json` (all 67 live field values, 146
  live programme titles, 12 synthetic degree shapes). 67/67 fields translated,
  **157 of 158** titles fully localized, the one holdout a real institution
  string returned verbatim.
* `npm run test:render` — **354/0**, including the new section *14b*: the label
  appears for English prose, disappears for translated copy, and `lang="en"` is
  set only in the labelled case.

Regenerate the fixture with:

```sql
-- fields
select field, count(*) from programs where is_active group by 1 order by 2 desc;
-- a name sample that covers every shape
select distinct name from programs where is_active order by md5(name) limit 150;
```

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
