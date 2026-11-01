# Scholarship Rewrite Pass 122 — Argentina (400) + Braziliya (401) pensiyalari

**Sana:** 2026-10-28
**Natija:** 400 («UBA Doctoral Fellowship CONICET Track») va 401 («USP Talented Student Scholarship International Track») pensiyaga chiqarildi — ikkalasi ham uydirma importer nomlari.

## Klaster xaritasi

- **400** — UBA Doctoral Fellowship CONICET Track (rel 4, uni 168, us 611, manba 2637); oldingi uydirma: USD 14,000 + «August 11 annually».
- **693** — pensiyada (rel 7, pass 48 audit): UBA bakalavriati chet elliklar uchun ham bepul; xalqaro stipendiya yo'q; bekalar — outbound.
- **401** — USP Talented Student Scholarship International Track (rel 4, uni 185, us 618, manba 2680); oldingi uydirma: USD 16,000 + «March 31 annually».
- **777** — pensiyada (rel 8, pass 48 audit): USP — ommaviy va bepul muassasa; chet elliklardan to'lov olmaydi va stipendiya bermaydi.
- **730** — CAPES / CNPq / FAPESP graduate scholarships (rel 8, aktiv) — Braziliya uchun real omon qolgan yozuv, tegilmadi.

## Tekshirilgan rasmiy sahifalar (birinchi qo'ldan fetch qilindi)

1. **CONICET Convocatorias 2026** — `convocatorias.conicet.gov.ar/becas/convocatoria-vigente/` (yangi manba **3135**). Real milliy instrument to'liq ko'rindi:
   - **Becas Internas Doctorales**: 2026-davri arizalar 27-iyul – 21-avgust 2026 (SIGEVA orqali); **1,000 ta** beka; **60 oy**, 2027-yil 1-apreldan; 70% ustuvor mavzular/hududlar, 30% merit tartibi.
   - Finalización de Doctorado: 300 ta, 24 oy; Postdoctorales: 800 ta (davri 2027-yil 18-fev – 5-mar, 36 oy); korxona bilan kofinanslanadigan liniya — yiliga 2 oyna.
2. **USP PRPG** chet ellik talabalar sahifasini qayta ochish urinildi: sahifa sites.usp.br → prpg.usp.br migratsiyasidan keyin **404** beradi (ingliz va oddiy sluglarda ham); PRPG qidiruvi o'rniga sahifa topmadi. Bu fakt yozuvda halol qayd etildi; institutsional holat (bepul davlat universiteti) o'zgarmagan.

## Qarorlar

### 400 — PENSIYA (uydirma kompozit nom)

- Nom UBA + CONICET ni «Track» sifatida yopishtirib yasalgan; bunday mukofot yo'q. Real kanal — CONICET milliy konkursi (universitetga bog'liq emas: ish rejasi + rahbar + Argentinadagi ish joyi bilan milliy tanlov).
- Konkurs **Bases**i (chet elliklar huquqi, summa, shartlar) bu passda o'qilmadi — hech qanday shart da'vo qilinmadi; CONICET Beca Interna Doctoral alohida nom bilan kelajakdagi qo'shimchalar nomzodi sifatida navbatga qo'yildi (ANID avval shunday qilingan edi).
- `is_active=false`, rel 9; us **611** o'chirildi («Fully Funded» importer da'volari bilan); manba 2637 saqlandi + (400, 3135).

### 401 — PENSIYA (uydirma nom)

- USP da «Talented Student Scholarship» ham, «International Track» ham yo'q; universitet to'lov olmaydi — waiver qilinadigan to'lovning o'zi yo'q, o'z stipendiyasi ham yo'q (777 auditi, PRPG sahifasi iqtibosi bilan).
- Real kanal: CAPES/CNPq/FAPESP agentlik kvotalari — aktiv yozuv **730** (rel 8; keyingi uplift nomzodi, PEC-PG qamrovi tekshiriladi).
- `is_active=false`, rel 9; us **618** o'chirildi; manba 2680 audit uchun saqlandi.

## Tasdiqlangan hisoblagichlar

- **550 active / 188 retired / 9 active rel-4 / 199 future-dated**; max idlar: scholarships 990, sources 3135, us 711.
- Rel-4 qoldig'i (9): Kolumbiya 403, Chexiya 876, Indoneziya 398, Malayziya 339, Rossiya 466, Sloveniya 404, Janubiy Afrika 503, Tayvan 342, Tailand 502.
- Lokal tekshiruvlar: typecheck / i18n / render — **337/337**.

## Qoidaga muvofiqlik

- Uydirma miqdor/deadline kiritilmadi; CONICET sanalari/kvotalari (1,000; 60 oy; 27-iyul–21-avgust 2026) fetch qilingan rasmiy sahifadan; Bases o'qilmagani uchun chet elliklar sharti va stipendiya summasi da'vo qilinmadi.
- USP bo'yicha o'lgan (404) manba sahifasi yashirilmadi — migratsiya faktining o'zi yozuvga kiritildi.

## Replay

`supabase/scholarship_rewrite_pass122_argentina_brazil_2026-10-28.sql` — amalda bajarilgan barcha bayonotlar.

## Keyingisi

- **Batch 29** — boyitish/qo'shimchalar: nomzodlar — CONICET Beca Interna Doctoral (Bases fetch bilan), ANID Magíster Nacional, 730 uplift (PEC-PG tekshiruvi bilan), Chalmers 421 (sahifa yangilansa).
- Pass 123 nomzodlari: qolgan 9 rel-4 dan juftlik (masalan, Kolumbiya 403 + Sloveniya 404 — ketma-ket importer seriyasi).
