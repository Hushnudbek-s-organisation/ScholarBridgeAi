# GitHub ↔ Supabase ulanishi (holat va ulash yo'riqnomasi)

**Sana:** 2026-10-17 · **Repo:** `Hushnudbek-s-organisation/ScholarBridgeAi`

## 1. Qisqa javob

| Ulanish | Holat | Izoh |
| --- | --- | --- |
| GitHub → **Render.com** (avto-deploy) | ✅ **Ulangan** | `render[bot]` deployment'lari bor, oxirgisi 2026-10-16 15:51 → `https://scholarbridge-ai.onrender.com` (status: `success`). `main`ga push bo'lsa avtomatik deploy. |
| Ilova → **Supabase** (runtime) | ✅ **Env orqali** | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — **Render dashboard**ida. |
| GitHub Actions → **Supabase** (jonli tekshiruv) | ✅ **Ulangan (2026-10-17 tasdiqlandi)** | `SUPABASE_DB_URL` secret'i qo'yildi, `Supabase schema verify` workflow'i jonli bazaga ulanib, autentifikatsiyadan o'tdi va 95 jadvalni tekshirdi. Host: `aws-0-ap-northeast-2.pooler.supabase.com:5432` (Session pooler). |
| Supabase GitHub App (branching/migration) | ❌ **Yo'q (on'iy)** | `supabase/config.toml` yo'q, CLI `link` qilinmagan. Loyiha qoidasi: schema o'zgarishi — qo'lda qaror (§4, Qadam 3). |

### Tekshiruv tarixi (2026-10-17)

| Run | Exit | Natija |
| --- | --- | --- |
| 39018546591 | 2 | Secret bor, lekin `password authentication failed for user "postgres"` (28P01) — pooler uchun username `postgres.<ref>` bo'lishi kerak edi |
| 39019343675 | 1 | ✅ **Autentifikatsiya o'tdi**, baza o'qildi — 9 ta ustun jonli bazada yo'q (schema drift) |
| 39019477424 | 1 | Drift ro'yxati to'liq chiqdi (quyida, §1.1) |
| 39020218458 | 0 | ✅ **PASSED** — ikkala patch qo'llangach, 95 jadval va barcha ustunlar jonli bazada mavjud |

### 1.1 Topilgan drift: 9 ustun jonli bazada yo'q edi — **2026-10-17 tuzatildi** ✅

Repo'dagi ikkita **additive** patch qo'llanilmagan edi (endi SQL Editor'da ishga tushirilgan,
run 39020218458 `PASSED`):

| Jadval | Ustun | Patch fayli |
| --- | --- | --- |
| `payments` | `provider_created_at`, `performed_at`, `cancelled_at`, `cancel_reason` | `supabase/add_payment_provider_lifecycle.sql` |
| `ai_usage` | `cost_status`, `cached_prompt_tokens`, `attempts`, `fallback_used`, `error_category` | `supabase/add_ai_cost_accounting.sql` |

**Oqibati (kod bu ustunlarni yozadi/o'qiydi):**
`src/lib/payments.ts` (`.set({ cancelledAt, cancelReason })`, `.set({ performedAt })`) va
`src/lib/ai/costReport.ts` (`fallback_used`, `cached_prompt_tokens`, `error_category`) — jonli bazada
bu so'rovlar `column ... does not exist` bilan xato beradi: Payme lifecycle (bekor qilish/TTL) va
AI xarajat hisoboti ishlamaydi.

**Tuzatish (bajarildi; keyingi safar ham shu tartib):** ikkala faylni Supabase → **SQL Editor**da ishga tushiring (ikkalasi ham
`IF NOT EXISTS`, qayta ishga tushirish xavfsiz). `add_payment_provider_lifecycle.sql` boshidagi
read-only preflight SELECT'lar takroriy qator qaytarsa, avval ularni qo'lda hal qiling — aks holda
`CREATE UNIQUE INDEX` ma'lumotni buzmasdan **xato berib** to'xtaydi.
Butun `full_schema.sql`ni "blindly" ishga tushirmang: u RLS va `anon`/`authenticated` grant'larini
ham o'zgartiradi.

Ya'ni: **GitHub o'zi Supabase bilan bevosita bog'lanmagan.** Zanjir shunday:
`GitHub (push) → Render (build + deploy) → Render env vars → Supabase PostgreSQL/Storage`.

## 2. Tekshiruvda ko'rilgan dalillar

```bash
gh api repos/<org>/<repo>/actions/workflows   # faqat 1 ta: "CI" (.github/workflows/ci.yml)
gh api repos/<org>/<repo>/deployments         # creator: render[bot]
gh api repos/<org>/<repo>/environments        # "main - scholarbridge-ai", "...-gu5y", "scholarbridge-db"
ls supabase/                                  # faqat *.sql fayllar — config.toml / .temp YO'Q
grep -rn "supabase" .github/workflows/        # hech narsa topilmadi
```

Muhim xulosa: `supabase/config.toml` yo'qligi = **Supabase CLI hech qachon `supabase link` qilinmagan**,
demak GitHub'dan migration/branching avtomatik yurmaydi. Schema hozir **qo'lda** qo'llaniladi
(`supabase/full_schema.sql` → Supabase SQL Editor, yoki `npm run db:apply-full-schema`).

## 3. Nima qilindi (ushbu branch'da)

1. **`.github/workflows/supabase-verify.yml`** (nusxasi `ci/supabase-verify.yml`) — yangi workflow:
   `main`ga har push'da va qo'lda (`workflow_dispatch`) `npm run db:verify` ni **jonli Supabase**
   bazasiga qarshi ishga tushiradi. Bu **faqat o'qish**: bitta
   `SELECT ... FROM information_schema.columns`, keyin `src/db/schema.ts` bilan taqqoslash.
   Hech qanday DDL/write/migration CI'dan yurmaydi (loyihaning "Supabase — source of truth" qoidasi buzilmaydi).
   Secret yo'q bo'lsa job **fail emas, skip** bo'ladi — deploy'ni to'sib qo'ymaydi.
2. **`render.yaml`** — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`,
   `SUPABASE_BRANDING_BUCKET` env kalitlari qo'shildi (`sync: false`, qiymat dashboard'dan).
   Bundan tashqari `DATABASE_URL` yoniga izoh: blueprint sukut bo'yicha **Render Postgres**ni
   ulaydi, Supabase'ni tanlasangiz — mapping'ni almashtirish kerak (quyida, §5).

## 4. Ulash: 3 qadam (faqat siz qila olasiz — menda Supabase va GitHub Secrets ruxsati yo'q)

### Qadam 1 — Supabase connection string'ni oling
Supabase dashboard → **Project Settings → Database → Connection string → URI**,
**Session pooler** rejimi:

```
postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@aws-0-<REGION>.pooler.supabase.com:5432/postgres?sslmode=require
```

### Qadam 2 — GitHub Actions secret qo'shing
Repo → **Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
| --- | --- |
| `SUPABASE_DB_URL` | yuqoridagi connection string |

Shundan so'ng **Actions → "Supabase schema verify" → Run workflow** bosing — natija `PASSED`
bo'lsa, GitHub'dan Supabase bazasiga haqiqiy ulanish bor.

> Eslatma: Arena'dagi GitHub token'i `Actions secrets` uchun **403 (Resource not accessible by
> integration)** qaytardi, shuning uchun secret'ni agent qo'sha olmadi — bu qadamni qo'lda qilish kerak.

### Qadam 3 (ixtiyoriy) — rasmiy Supabase GitHub integratsiyasi
Agar Supabase'ning o'z integratsiyasini xohlasangiz (preview branching / migration'lar PR bilan):
Supabase dashboard → **Project Settings → Integrations → GitHub → Connect** → ushbu repo'ni tanlang.
Bu **faqat Supabase dashboard orqali** qilinadi ( menda Supabase'ga kirish yo'q ) va u
`supabase/migrations/` papkasini talab qiladi — hozir repo'da migration'lar `supabase/add_*.sql`
ko'rinishida, shuning uchun avval `supabase link` + `supabase db push` tartibiga o'tish kerak.
Loyihaning amaldagi qoidasi ("schema o'zgarishi — qo'lda qaror") bilan zid kelmasligi uchun
buni **faqat jamoa qarori bilan** yoqing.

## 5. Diqqat: ikkita ma'lumotlar bazasi xavfi

`render.yaml` blueprint'i **Render'ning o'z Postgres**ini (`scholarbridge-db`) yaratadi va
`DATABASE_URL`ni shunga ulaydi; hujjatlar esa **Supabase**ni source of truth deydi.
Ikkalasi bir vaqtda yursa, ma'lumot ikki joyda bo'linib qoladi.

Render dashboard → `scholarbridge-ai` → **Environment** da `DATABASE_URL` nimani ko'rsatayotganini
tekshiring:

- `...supabase.com...` → yaxshi, ilova Supabase'da. §4 dagi secret'ni ham shu string'dan qo'ying.
- `...render.com...` / `dpg-...` → ilova Render Postgres'da; Supabase'ga o'tish uchun
  `render.yaml`dagi `fromDatabase` mapping'ini olib tashlab, `sync: false` qiling va Supabase
  string'ini dashboard'da bering, so'ng `supabase/full_schema.sql` ni Supabase'da bir marta ishga
  tushiring (`npm run db:apply-full-schema` ham mumkin) va `npm run db:verify` bilan tekshiring.

## 6. Xavfsizlik

- Connection string — **maxfiy**: uni hech qachon commit qilmang, `.env.local` yoki
  host dashboard'ida saqlang (`.gitignore` `.env*` ni qamrab oladi).
- CI'da secret faqat `DATABASE_URL` sifatida ishlatiladi va log'ga chiqmaydi (GitHub uni maskalaydi);
  workflow faqat `information_schema` o'qiydi.
- Supabase'da `anon`/`authenticated` rollari `supabase/full_schema.sql` tomonidan cheklangan
  (faqat `universities`/`scholarships` katalogi uchun read-only). Tekshirish: `npm run test:portability`.
