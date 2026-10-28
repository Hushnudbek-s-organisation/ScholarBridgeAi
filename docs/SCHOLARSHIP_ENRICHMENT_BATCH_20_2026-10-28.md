# Scholarship Enrichment Batch 20 — Denmark state-scheme institutions (2026-10-28)

Rejim: Pass 113 dan keyin navbatdagi qo'shish bosqichi. Ikkala sxema ham Pass-113 (Daniya) tadqiqotidan tug'ildi: Danish davlat stipendiya oilasini boshqa universitetlar o'z qoidalaribilan boshqaradi — katalogda Aarhus (413), UCPH (733) va DTU (487) bor edi, ammo **Roskilde** va **SDU** yo'q edi. Ikkalasi ham 2026-10-28 kuni rasmiy sahifalardan birinchi qo'ldan o'qildi, reliability 10.

**Natija:** +2 yozuv (972–973) → faol **543**, nafaqadagi **178**, faol reliability-4 **28**, kelgusi deadline'lar **191**.

---

## 1. Danish State Tuition Fee Waivers and Scholarships — Roskilde University — id 972

Rasmiy manbalar: RUC "Step 5" (sxema) va "Step 1: Application Deadlines" sahifalari (source 3106).

- **Shakli**: tuition waiver + **oyiga DKK 7,800** yashash stipendiyasi, ikkalasi birgalikda maksimum **22 oy** (faqat sentyabr qabuli, yiliga bir marta). Saqlab qolish uchun o'quv rejasidan orqada qolmaslik shart.
- **Farqi**: Aarhusdagi kabi **avtomatik emas** — motivatsiya xati + CV qabul arizasi bilan **bir vaqtda** yuklanishi shart, bo'lmasa ko'rib chiqilmaydi. Reyting: akademik ko'rsatkich + xat + ish tajribasi (ijtimoiy kelib chiqish hisobga olinmaydi). Ro'yxatga olingan talaba keyingi semestrda qayta topshira olmaydi.
- Dasturlar ro'yxati har raund oldidan tanlanadi (2026: Media & Communication, Environmental Science, Nordic Urban Planning, Computer Science; 2027 ro'yxati 15-dekabr 2026 da raund ochilishi oldidan chiqadi).
- **Kodlash**: deadline **2027-01-15**/fixed (non-EU to'lovchilar muddati), `upcoming` (portal 15-dekabrda ochiladi); `7800 DKK/month/fixed`. Universitet yozuvi bazada yo'q → `university_id` NULL (kelgusi vazifa).

## 2. Danish Government Scholarship — University of Southern Denmark — id 973

Rasmiy manba: SDU "Scholarships" sahifasi (source 3107).

- **Shakli**: standart davomiylik uchun **to'liq tuition waiver** (MSc 2 yil / BSc 3 yil), semestriga 30 ECTS qamraydi; ushlab qolish uchun har semestr 30 ECTS topshirish kerak. **SU ga haqli bo'lganlar** bu stipendiyani ola olmaydi.
- Faqat **nomlangan dasturlar**: 2027-gacha Sønderborgdagi 5 ta muhandislik MSc + Vejledagi 4 ta BSc; 2028-dan Vejlega 4 ta MSc qo'shiladi, BSc ro'yxati 2 taga qisqaradi (ro'yxatlar oldindan e'lon qilingan).
- **Tanlov ikki xil**: alohida ariza yo'q. Bakalavr — ariza **15 mart**gacha, uniTEST + onlayn suhbat (iyun boshi). Magistr — ariza **1 fevral**gacha barcha hujjatlar bilan (rezidentlik ruxsati bo'lsa ham), dastur **eng yuqori ustuvorlik** bo'lishi shart; tanlov bakalavr GPA + suhbat (19–27 fevral).
- **Eslatma (halol yozuv)**: SDU ning eski sahifasida DKK 3,000/oy granti tilga olingan edi — joriy kanonik sahifa sxemani faqat waiver deb ta'riflaydi, shuning uchun grant yozuvga kiritilmadi.
- **Kodlash**: deadline **2027-02-01**/fixed (magistr darvozasi; bakalavr 15-mart matn/rounds'da), `upcoming`; NULL `DKK/year/variable`. Universitet yozuvi yo'q → NULL.

---

## Yon yozuvlar va tekshiruvlar

- Manbalar: 3106 (RUC), 3107 (SDU); bog'lanmalar 972→3106, 973→3107; ketma-ketliklar yangilandi (max ID: stipendiyalar 973, manbalar 3107, us 699 — us yozuvi kiritilmadi).
- Supabase read-back: 972 rel 10 (`DKK 7,800/month`, deadline `2027-01-15`), 973 rel 10 (deadline `2027-02-01`).
- Hisoblagichlar: faol **543**, nafaqadagi **178**, faol reliability-4 **28**, kelgusi deadline **191**.
- Mahalliy: `typecheck` ✅, `check:i18n` ✅, `test:render` ✅ 337/337.
- Uydirma miqdor/deadline kiritilmadi (SDU dagi eskirgan 3,000 DKK ham ataylab tashlandi).

**Keyingi qadam:** Pass 114 — Gonkong SAR klasteri (3 ta rel-4).
