# Scholarship Enrichment Batch 24 (2026-10-28)

## Maqsad

Pass 117 (BAA: Khalifa University + UAEU) dan keyin navbatdagi qo'shimcha batch. Ikkita
rasmiy dalil bilan tasdiqlangan yozuv qo'shildi:

1. **985 — Chancellor's Scholarship for Talented Students (UAEU)** — Pass 117 da
   tekshirilgan 848-son (Elite Students) yozuvining **iste'dodga asoslangan qo'shimcha
   sxemasi**; dalil o'sha fetch qilingan UAEU sahifasidan (manba 3116) olindi.
2. **986 — Islamic University of Madinah Scholarship for International Students** —
   Madina Islom Universitetining xorijlik talabalar uchun to'liq ("external")
   bakalavriat granti; bazada Madina bo'yicha hech qanday yozuv yo'q edi.

Hech qanday summa yoki deadline uydirilmadi: rasmiy matnda e'lon qilinmagan
stipendiya miqdori va IELTS bali NULL qoldirildi.

## Qo'shilgan yozuvlar

### 985 — Chancellor's Scholarship for Talented Students (UAEU), ishonchlilik 10

- **O'quv to'lovidan 100% yoki 50% chegirma** — bakalavr talabalari uchun,
  innovatsiya, san'at, sport yoki texnologiyadagi iste'dod asosida (sertifikatlar,
  mukofotlar, ishtirok yozuvlari, tavsiyanomalar — mahalliy yoki xalqaro darajada).
  Sahifa 100% va 50% daraja qanday taqsimlanishini e'lon qilmagan — yozuvda shu
  ochiq aytilgan.
- Davom ettirish shartlari: 100% daraja — CGPA ≥ 3,6; 50% daraja — CGPA ≥ 2,75;
  ikkalasida ham iste'dod yo'nalishidagi tadbirlarda (ko'rgazma, chempionatlar)
  faol ishtirok majburiyati, boshqa grant/homiylik bo'lmasligi, dasturni normal
  muddatda bitirish.
- Faqat o'quv to'lovi qoplanadi (yashash xarajatlari — talabaning o'ziga);
  takroriy fanlar chegirmaga kirmaydi; bir vaqtda faqat bitta grant; shartnoma
  imzolanadi; kollej/ixtisoslik o'zgartirish grantni bekor qiladi; 30 kun ichida
  apellyatsiya mumkin.
- **Elite Students (848) dan farqi:** bu sxemaning o'z Grade-12 foizi yoki IELTS
  talabsi sahifada e'lon qilinmagan — kirish mezoni iste'dod dalillaridir
  (dasturga qabulning umumiy talablari alohida qo'llaniladi).
- Deadline: yagona sana yo'q — ariza qabul arizasining ichida beriladi
  (`deadline_date` NULL, `not_published`); status `open` (848 bilan bir xil).
- `university_id` 364 (UAEU), yon jadvalga **us 708** qo'shildi; manba 3116
  (Pass 117 da yaratilgan) bilan bog'landi.
- Xuddi shu sahifadagi **Children of UAEU Employees** sxemasi (xodimlar farzandlari)
  doiradan tashqarida qoldirildi — faqat tilga olindi.

### 986 — Islamic University of Madinah Scholarship for International Students, ishonchlilik 10

Dalillar — birinchi qo'ldan fetch qilingan ikkita rasmiy manba:

- IUM "Qualifications required for international students" sahifasi (yangi manba
  **3117**): ariza **Study in Saudi Arabia** platformasi orqali, 1448-H davri
  **2026-yil 19-aprel – 21-may** oralig'ida bo'lgan (yopilgan).
- Inglizcha **"Undergraduate Admission Guide for Full and Partial Scholarship
  Students 1448 AH"** qo'llanmasi (PDF, yangi manba **3118**): imtiyozlar,
  dasturlar, talablar, hujjatlar, majburiyatlar.

Yozuv mazmuni (faqat fetch qilingan matn asosida):

- **To'liq (external) grant:** Saudiya Arabistoni tashqarisida yashovchi
  no-saudiyaliklar, 17–25 yosh; bakalavriat **bepul** ("at no cost") + oylik
  stipendiya (**summa qo'llanmada e'lon qilinmagan — NULL**) + kelgandagi
  2 oylik yordam puli + bitirishda kitoblarni jo'natish uchun 3 oylik pul +
  har o'quv yili oxirida chegirmali ekonom-klass aviachipta + universitet
  yotoqxonasi + subsidiyalangan ovqat; kampusda bepul tibbiy xizmat va
  Masjid an-Nabaviyga bepul transport.
- Talabalar 140+ davlatdan, universitet talabalarning ~85% i xorijlik.
- Dasturlar: nazariy kollejlar (arab tilida — Shariat, Aqida va Da'vat, Qur'on,
  Hadis, Arab tili, Media, Huquq, Iqtisodiyot) va ilmiy kollejlar (ingliz tilida —
  5 ta muhandislik, 3 ta kompyuter yo'nalishi, 5 ta fan yo'nalishi). Arab tili
  instituti — alohida tanlanadigan dastur emas, qabul qilinganlar uchun
  tayyorgarlik bosqichi (Arabic Language Placement Test bilan joylashtiriladi).
- Talablar: o'rta maktab attesti (ilmiy kollejlar uchun — ilmiy yo'nalish),
  attest 5 yildan eski bo'lmasligi, 17–25 yosh, yaxshi axloq, boshqa KSA
  granti yo'qligi, **2 ta** tavsiyanoma, jinoiy ish yo'qligi to'g'risida
  ma'lumotnoma, tibbiy ma'lumotnoma, kirish imtihonlari; Qur'on fakulteti —
  Qur'onni to'liq yod bilish + test.
- Majburiyatlar ochiq yozilgan: muntazam davom etish, bitirgach (yoki
  ketkazilsa) Qirollikda qolmaslik, homiylikni boshqa tashkilotga o'tkazmaslik,
  o'qish tugagach yurtiga qaytish; fakultetlararo o'tkazish yo'q.
- Universitetning dunyoda hech qanday agenti yo'q — faqat rasmiy platforma.
- Ingliz tili: ilmiy kollejlarga (oldingi ta'lim ingliz tilida bo'lmasa)
  akkreditatsiyalangan sertifikat (IELTS/TOEFL yoki ekvivalent) kerak, lekin
  **ball e'lon qilinmagan** — `min_ielts` NULL.
- Deadline: 1448-H davri yopilgan; keyingi davr platformada e'lon qilinadi —
  `deadline_date` NULL, `not_published`, status `upcoming`; yopilgan davr
  `rounds` maydonida saqlangan.
- `university_id` NULL — `universities` jadvalida Madina universiteti yozuvi
  yo'q (keyingi katalog ishlari uchun belgilandi); us qatori yo'q.
- **Qisman (internal) grant** — Qirollikda qonuniy yashovchilar uchun faqat
  to'lovdan ozod qilish — doiradan tashqari, yozuvda tilga olingan, alohida
  yozuv qilinmadi.

### Kodlash qarorlari (halollik qaydlari)

- Aggregatorlardagi "SAR 840" kabi stipendiya summalari ishlatilmadi —
  fetch qilingan rasmiy qo'llanma summa bermaydi, shuning uchun
  `award_amount` NULL (SAR, `variable`/`variable`), `amount_usd_value` 0.
- IUM ning eski inglizcha sahifalari (`enweb.iu.edu.sa`) ikki marta fetch
  qilib bo'lmadi; u yerlardagi "Muslim male" sharti qidiruv natijasi
  parchasi (snippet) darajasida qolganligi uchun tasdiqlangan talab sifatida
  kodlanmadi — yozuv matnida "portalda joriy shartlarni tekshiring" deb
  ochiq qayd etildi. 1448-H qo'llanma va talablar sahifasi bu shartni
  takrorlamaydi; faqat fetch qilingan matn asos qilib olindi.
- 985 uchun ham xuddi shunday: sahifa daraja taqsimoti, AED summasi va
  sxemaga xos ball/foiz bermaydi — hammasi NULL, hech narsa uydirilmadi.
- Texnik qayd: birinchi INSERT urinishi eskirgan ustunlar ro'yxati bilan
  yuborilib, rad etildi (ma'lumotlar bazasi xatosi, yozuv kirmadi). Haqiqiy
  sxema `information_schema` dan va 984-son yozuvdan qayta o'qilib, INSERT
  lar tuzatilgan 48 ustunli shaklda qayta bajarildi — replay faylda
  aynan bajarilgan variant saqlangan.

## Hisoblagichlar (qat'iy tekshiruv)

| Ko'rsatkich | Batch 24 oldin | Batch 24 keyin |
| --- | --- | --- |
| Faol yozuvlar | 552 | **554** (+2) |
| Bekor qilingan (retired) | 180 | 180 |
| Faol rel-4 | 19 | 19 |
| Kelajakdagi deadline lar | 197 | 197 |
| Max scholarship id | 984 | **986** |
| Max source id | 3116 | **3118** |
| Max university_scholarships id | 707 | **708** |

Yangilangan ketma-ketliklar: `scholarships_id_seq` 986, `sources_id_seq` 3118,
`university_scholarships_id_seq` 708.

Mahalliy tekshiruvlar: `npm run typecheck` ✓, `npm run check:i18n` ✓,
`npm run test:render` **337/337** ✓.

## Keyingi qadamlar

Navbat bilan **Pass 118** (tozalash): qolgan 19 ta rel-4 dan ikkitalik
klasterlardan biri (Chile 467/879, India 397/477, Mexico 343/402 yoki
Norway 346/424) birinchi qo'ldan fetch bilan tekshiriladi. Qo'shimcha
nomzodlar: KFUPM bakalavr yozuvi (608) ni rel 8 dan ko'tarish;
`universities` katalogiga Madina universiteti yozuvini yaratib 986 ni
bog'lash (Karolinska 981 va boshqalar bilan birga kutilmoqda).
