# Enrichment Batch 36 — 2026-10-29

Batch 34 dan qoldirilgan UBC Okanagan grantlari qo'shildi, 356 ning muddati strukturaviy to'ldirildi va CTU yana zondlandi (hali o'chgan).

## 1) YANGI: 1002 — UBC Okanagan Global Elevation Award (rel 10)

UBC ning rasmiy sahifasi (manbalar 3154/3155, Batch 34 da birinchi qo'ldan o'qilgan) asosida: UBC Okanagan ga yozilgan **har bir** yangi xalqaro bakalavr talabasiga avtomatik beriladigan **CAD 8 000/yil** o'qish krediti (2 × 4 000), 3 yilga uzaytiriladi (jami 4 yilgacha). Tanlov ham, alohida ariza ham yo'q — taklifni qabul qilib yozilsangiz bo'ldi. Summa bitta e'lon qilingan raqam bo'lgani uchun strukturaviy: 8000/CAD/year/fixed. Operativ muddat sifatida UBC arizasi muddati (2027-01-15) saqlandi, status `open` (ariza 2026 oktabr boshida ochilgan). Yon qator us 719 (UBC, 49).

## 2) YANGI: 1003 — UBC Okanagan International Welcome Award (rel 10)

Xuddi shu sahifalardan: UBC Okanagan darajasini **birinchi tanlov** qilib ko'rsatgan, qabul qilingan va to'liq stavkada (24 kredit) yozilgan xalqaro talabalarga birinchi yil uchun **CAD 5 000** kredit (50% + 50% semestrlar bo'yicha), avtomatik. 5000/CAD/one_time/fixed; muddat/status 1002 kabi; us 720.

Ikkala yozuvda ham: GPA/IELTS minimumlar NULL (grant kesimi e'lon qilinmagan; til — UBC ELAS standarti). Ularning bir-biri bilan qo'shilishi (stacking) sahifada aytilmagani uchun da'vo qilinmaydi. Sahifadagi uchinchi Okanagan granti — BCom Launch Award (CAD 6 000) — **qo'shilmadi**: u bitta darajaning 2027 sentabr qabuli uchun yozilgan, takroriyligi tasdiqlanmagan.

## 3) Micro-update: 356 — UBC International Scholars Program

Yozuvning o'z matnida muddat bor edi (2027 sentabr qabuli uchun arizalar 2026-yil 5-oktabrda ochilgan, nominator tavsiyalari 15-noyabr arafasida), lekin `deadline_date` bo'sh, status `not_announced` edi. Batch 34 da o'qilgan rasmiy muddatlar sahifasi (3155) bilan tasdiqlanib: `deadline_date=2026-11-15`, `status=open` qilindi, havola 455 (356←3155) qo'shildi. Shartlar o'zgartirilmadi.

## 4) Zond: CTU (875/876)

`international.cvut.cz` yana "Service temporarily unavailable" — o'zgarishsiz qoldi. (UM va GT-IF kecha/kuni kecha zondlangan, bu safar takrorlanmadi.)

## Natija (qattiq tekshiruv)

- **546 faol / 205 nafaqada / 1 rel-4 (876) / 208 kelajak-muddat** (batch hissasi: +2 yozuv; kelajak +3 — 1002, 1003 va 356 ning sanasi). Maks ID: grantlar 1003, manbalar 3158, us 720, havolalar 455. Ketma-ketliklar MAX bo'yicha sinxron.
- UBC klasteri endi 6 ta faol yozuv: 142 (4YF), 356 (ISP), 602 (IMES), 994 (OIS), 1002, 1003 (Okanagan avtomatlari).
- Mahalliy tekshiruvlar: typecheck ✓, check:i18n ✓, render 337/337 ✓.

Keyingi qadam: **Pass 130** (tozalash) — nomzod: AQSh need-based aid klasteridagi shablon minimumlar (Pass 129 da belgilangan). Kuzatuvlar o'zgarmadi.
