# Scholarship Rewrite Pass 121 — Chili klasteri (UC Chile 467 + 879 pensiyasi)

**Sana:** 2026-10-28
**Natija:** 467 («International Excellence Scholarship» — uydirma nom) va 879 (faqat almashinuv talabalari uchun) pensiyaga chiqarildi. Chili uchun yagona aktiv yozuv — 710 (Universidad de Chile, rel 9) qoldi.

## Klaster xaritasi

- **467** — «Pontificia Universidad Católica de Chile (UC Chile) International Excellence Scholarship» (rel 4, uni 89, us 490, manba 954)
- **879** — «UC Tuition Scholarship for Exchange Students (CINDA & Latin American Catholic Universities)» (rel 4, uni 89, us 460, manba havolasi yo'q)
- **695** — allaqachon pensiyada (rel 9, 2026-10-25): UC ning uchta sahifasi o'qilib, «chet elliklar uchun stipendiyalar faqat almashinuv talabalari uchun» degan xulosa bilan yopilgan audit yozuvi
- **710** — Universidad de Chile Doctoral Stipend and Postgraduate Tuition Rebates (rel 9, aktiv) — tegilmadi
- **399** — PUCV, erta shablon o'chiruvi (2026-10-23), tegilmadi

## Tekshirilgan rasmiy sahifalar (birinchi qo'ldan fetch qilindi)

1. **admision.uc.cl** bosh sahifa (467 ning URL i) — Chili maktab-bitiruvchilari uchun PAES qabul portali ekani tasdiqlandi; «xalqaro talaba» mukofoti degan narsa yo'q.
2. **UC «Información para Futuros estudiantes» FAQ** (yangi manba **3132**) — hal qiluvchi savol-javoblar to'liq o'qildi:
   - *«¿Hay becas para extranjeros en la UC?»* → **«Si eres estudiante de intercambio, la UC tiene becas de matrícula para Universidades Católicas de América Latina, red CINDA y Universidades Católicas de Chile»** — ya'ni chet elliklar uchun aytilgan yagona liniya — Lotin Amerikasi katolik universitetlari, CINDA tarmog'i va Chili katolik universitetlaridan keladigan **almashinuv (exchange)** talabalari uchun o'qish to'lovi imtiyozi.
   - Postgrado haqida: **«La universidad no entrega ningún tipo de beneficio especial para postgrado»** — universitet magistratura/doktorantura uchun maxsus imtiyoz bermaydi, tashqi moliyalashtirishga yo'naltiradi.
   - Bakalavr liniyalari — Chili qabul tizimiga (PAES va h.k.) bog'langan ichki sxemalar: Premio a la Excelencia Académica (Matrícula de Honor), becas de arancel, Mineduc, tashqi bekalar.

Bu topilma 695 dagi 2026-10-25 xulosasini birinchi qo'ldan tasdiqlaydi.

## Qarorlar

### 467 — PENSIYA (uydirma importer nomi)

- «UC Chile International Excellence Scholarship» nomli mukofot UC da mavjud emas; ehtimoliy «urug'i» — ichki qabul tizimi orqali pregrado ga kiruvchilar uchun Premio a la Excelencia Académica (Matrícula de Honor) — bu xalqaro mukofot emas. Ilgarigi USD 8,000 uydirmasi 2026-10-26 da olib tashlangan edi.
- `is_active=false`, rel 9, izohli sarlavha; us **490** o'chirildi (unda ham uydirma «GPA 3.3+, IELTS 6+» bor edi); manba 954 saqlandi + (467, 3132).
- Izohda kelajakdagi qo'shimcha nomzodi sifatida **ANID** milliy magistratura/doktorantura konkurslari qayd etildi — bu passda tekshirilmadi, hech qanday shart da'vo qilinmadi.

### 879 — PENSIYA (almashinuv mobillik imtiyozi — katalog doirasidan tashqari)

- Imtiyoz haqiqiy, lekin bu daraja (degree) stipendiyasi emas: u talabani avval Lotin Amerikasi katolik / CINDA / Chili katolik universitetlaridan birida o'qiyotgan bo'lishini va o'sha universitet nominatsiyasi bilan almashinuvga kelishini talab qiladi. O'zbekiston OTMlari bu tarmoqlarda yo'q — auditoriyamiz foydalana olmaydi; ochiq ariza raundi ham, UC darajasi ham yo'q.
- `is_active=false`, rel 9, izohli sarlavha; us **460** o'chirildi; (879, 3132) havola qo'shildi (ilgari manba havolasi yo'q edi).

## Tasdiqlangan hisoblagichlar

- **551 active / 186 retired / 11 active rel-4 / 197 future-dated**; max idlar: scholarships 989, sources 3132, us 711.
- Chili rel-4 qoldig'i: 0. Qolgan 11 ta rel-4: Argentina 400, Braziliya 401, Kolumbiya 403, Chexiya 876, Indoneziya 398, Malayziya 339, Rossiya 466, Sloveniya 404, Janubiy Afrika 503, Tayvan 342, Tailand 502.
- Lokal tekshiruvlar: typecheck / i18n / render — **337/337**.

## Qoidaga muvofiqlik

- Uydirma miqdor yoki deadline kiritilmadi; ikkala pensiya ham fetch qilingan UC FAQ matniga asoslanadi; ANID haqida tekshirilmagan shartlar da'vo qilinmadi.
- Almashinuv (exchange) tartibi daraja stipendiyasi sifatida ko'rsatilmaydi — katalog amaliyotiga muvofiq pensiya qilindi.

## Replay

`supabase/scholarship_rewrite_pass121_chile_2026-10-28.sql` — amalda bajarilgan barcha bayonotlar.

## Keyingisi

- **Batch 28** — qo'shimchalar/boyitish (navbat bo'yicha); nomzodlar: Helsinki 742 (rel 9) uplift, ANID (tekshiruv bilan), Chalmers 421 (sahifa yangilansa).
- Pass 122 nomzodlari: qolgan 11 rel-4 dan juftlik (masalan, Lotin Amerikasi davom sifatida Argentina 400 + Braziliya 401).
