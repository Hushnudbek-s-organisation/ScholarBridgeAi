# Stipendiya katalogini boyitish — Batch 9 — 2026-10-26

## Xulosa

Tozalash/qo'shimcha navbati bo'yicha Pass 102'dan keyingi qo'shimchalar qadami. Batch 9'ga Batch 8'da keyinga qoldirilgan **MOE Taiwan Scholarship** (kanal tekshiruvi bilan) va Pass 102 pensionatsiyalarida aniqlangan 3 ta Kanada nomzodi kirdi. Har biri alohida rasmiy sahifa auditidan o'tkazildi; **4 tasi ham qabul qilindi** va yangi yozuvlar sifatida qo'shildi:

| ID | Dastur | Ishonchlilik | Holat |
|---|---|---|---|
| 939 | MOE Taiwan Scholarship | 10 | `closed` (2026 sikl yopilgan), dedlayn NULL/not_published |
| 940 | University of Manitoba Graduate Fellowship (UMGF) | 10 | `upcoming` (bo'lim sikllari) |
| 941 | University of Ottawa Admission Scholarship (Doctorate) | 10 | `upcoming` (qabulga bog'liq) |
| 942 | SFU Graduate Fellowship (GF) | 9 | `upcoming` (birlik sikllari) |

Manbalar **3077–3080** yaratilib bog'landi (941→3077, 940→3078, 942→3079, 939→3080); `university_scholarships`ga **675** (uOttawa 178 ↔ 941) qo'shildi. Sanoglar: faol **531 → 535**, pensionatsiya 156, faol rel4 80, kelajak dedlaynlar 166. Parallel insert natijalari `RETURNING id, title` bilan aniqlandi va qayta SELECT bilan tasdiqlandi (idlar 939–942; 936–938 — yozuvsiz sequence uzilishi, tekshirildi). Uydirma miqdor yoki dedlayn kiritilmadi.

## 939 — MOE Taiwan Scholarship (kanal tekshiruvi o'tkazildi)

**Dalil (2026-10-26 fetch):** (a) Ta'lim vazirligining rasmiy inglizcha dastur sahifasi — semestriga **NTD 40,000** ga tuition+misc; oylik **15,000** (bakalavr) / **20,000** (magistr/doktorant) yashash nafaqasi; davomiylik 4/2/4 yil (jami ≤5 yil); boshqa Taiwan davlat stipendiyasi bilan birga egallab bo'lmaydi. (b) **Taypey–Moskva iqtisodiy va madaniy muvofiqlashtirish komissiyasining Moskvadagi vakolatxonasi** (tmeccc.org, 2026-02-20 yangilangan) 2026–2027 e'loni — Rossiya, Qozog'iston, **O'zbekiston （烏茲別克）**, Turkmaniston, Qirg'iziston, Tojikiston, Gruziya, Ozarbayjon, Armaniston, Belarus va Moldova talabalari taklif etiladi; **14 o'rin**; onlayn ariza 2026-02-02 — 03-31, qog'oz hujjatlar Moskvaga 2026-04-10 gacha (kuryer qabul qilinadi, e-mail emas).

**Xulosa:** O'zbekiston uchun kanal rasman faol — bu Batch 8'da rad etilgan ICDF va MOFA'dan farqli holat (ularda O'zbekiston yaroqli emas edi). `award_amount NULL` (darajaga bog'liq ikki stipendiya + semestr kap); `min_gpa/min_ielts NULL` (TOCFL Band B yoki TOEFL/ingliz tili dalili talab qilinadi, IELTS raqami e'lon qilinmagan); `deadline_date NULL` + rounds JSON (2026 sikl yopilgan).

## 940 — University of Manitoba Graduate Fellowship (UMGF)

**Dalil:** FGPS rasmiy UMGF sahifasi to'liq fetch qilindi: **$20,000/yil Master's** (12/24 oy, ≤$40k), **$25,000/yil PhD** (12–48 oy, ≤$100k); *barcha fuqaroliklar*; dastur Tri-Agency'ga yaroqli bo'lishi kerak; min. admission GPA 3.0 (UM shkalasi, bo'limlar balandroq talab qilishi mumkin); umumiy UMGF yordami ≤4 yil; egallash shartlari (GPA 3.0, C+ dan past baho yo'q, teng/katta yagona mukofot taqiqi, dastur/bo'lim almashtirish taqiqi); bo'lim tavsiyasi + bo'lim dedlaynlari. `award_amount NULL` (ikki darajali qiymat); `university_id NULL` (Manitoba yozuvi jadvalda yo'q — Pass 102 dagi kataloglashtirish vazifasi). Pensionatsiya qilingan 391 (MGS) boshqa, e'lon qilinmaydigan mukofot nomi edi — UMGF yangi yozuv sifatida qo'shildi, 391'ga retarget qilinmadi.

## 941 — University of Ottawa Admission Scholarship (Doctorate)

**Dalil:** ikkita rasmiy sahifa — GPS "Admission scholarship" (doctorate bo'limi: international talabalar yaroqli; qabul o'rtacha ≥8.0/10; minimum **$72,000/4 yil** = $9,000/yil stipendiya ($3,000/term × 12 term) + ≥$9,000/yil birlik assistentligi; 12 term uzluksiz to'liq vaqt; tashqi mukofot qoidalari) va Muhandislik fakulteti sahifasi ("You don't have to apply"). Qamrov ataylab **doctorate** — master's admission scholarship domesstic-only ekani rasmiy sahifada ko'rsatilgan. `award_amount = 9000 CAD/yil` — faqat stipendiya komponenti; assistentlik daromadi stipendiya summasi sifatida ko'rsatilmadi, kompozit minimum matnda. `university_id = 178`; us row **675** qo'shildi.

*Aniqlangan, lekin qo'shilmagan:* uOttawa **International Doctoral Scholarship** ($45,000/5 yil) — alohida mukofot, kelgusi batch nomzodi.

## 942 — SFU Graduate Fellowship (GF)

**Dalil:** rasmiy REM sahifasi fetch qilindi — bir terminlik mukofot, **$1,000–$7,000** (to'liq GF $7,000), GPA ≥3.5, REM'da faqat nominatsiya; boshqa birliklar GA3 tanlovi o'tkazadi (qidiruvda tasdiqlangan: Education, MBB, Biology, FHS va b.). Markaziy yagona mukofot sahifasi yo'q — shartlar birliklar bo'yicha e'lon qilingani uchun rel **9**; manba sifatida Graduate Studies ichki mukofotlar indeksi bog'landi. `award_amount NULL` (flexible diapazon); `university_id NULL` (Simon Fraser yozuvi yo'q). Pensionatsiya qilingan 380 ushbu fellowship'ni bakalavr entrance mukofoti bilan aralashtirgan edi — yangi yozuv faqat graduate fellowship'ni qamrab oladi.

## Rad etilganlar

Bu batchda rad etilgan nomzod yo'q. MOE Taiwan kanal tekshiruvi ijobiy chiqdi (yuqoriga qarang); ICDF/MOFA rad etilishlari (Batch 8) o'zgarishsiz qoladi.

## Yon jadvallar va sanoglar

- `sources` 3077 (uottawa.ca), 3078 (umanitoba.ca), 3079 (sfu.ca), 3080 (english.moe.gov.tw) — bitta INSERT, `RETURNING id,url`.
- `scholarship_sources`: 941→3077, 940→3078, 942→3079, 939→3080 (tekshirildi: 4/4 da 1 link).
- `university_scholarships` 675 = uOttawa (178) ↔ 941.
- Sanoglar: faol **535**, pensionatsiya **156**, faol rel4 **80**, kelajak dedlaynlar **166**.
- Tekshiruvlar: `tsc --noEmit` ✅, `check:i18n` ✅, `test:render` **337/337** ✅.

Bajarilgan SQL: `supabase/scholarship_enrichment_batch9_2026-10-26.sql`.
