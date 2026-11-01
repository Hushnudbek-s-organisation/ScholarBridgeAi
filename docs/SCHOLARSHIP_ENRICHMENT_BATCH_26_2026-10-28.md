# Scholarship Enrichment Batch 26 (2026-10-28)

## Maqsad va ko'lam

Bitta **yangi yozuv** va bitta **ko'tarish (uplift)**:

1. **987 — Guru Krupa Foundation Postgraduate Scholarship for International
   Students (IIT Kharagpur)** — Pass 119 da to'liq tekshirilgan haqiqiy grant,
   endi o'z yozuvi sifatida qo'shildi (rel 10).
2. **773 — Uppsala University Global Scholarship** — rel 8 → 10 ko'tarildi.

Qo'shimcha tekshiruv: IIT Delhi ning `78-2/` sahifasi yana bir bor fetch
qilinib ko'rildi — 5-urinish ham muvaffaqiyatsiz; IITD yozuvi tiklanmadi
(hujjatlashtirilgan tiklash yo'li Pass 119 da).

## 987 — GKF Postgraduate Scholarship (yangi, rel 10)

Manba: IIT Kharagpur International Relations rasmiy sahifasi (yangi manba
**3125**, Pass 119 da va bugun qayta fetch qilingan).

- Donor Guru Krupa Foundation (AQSh) — asoschisi bitiruvchi Dr Mukund
  Padmanabhan. **Ro'yxatdan o'tgan, o'z hisobidan o'qiyotgan xalqaro
  aspirantlarga** (barcha yo'nalishlar) **oyiga 25 000 INR gacha** —
  o'quv to'lovi, yotoqxona, mess va yashash xarajatlari uchun; tanlov —
  akademik ulug'vorlik bo'yicha.
- Bu **davom etuvchilar** granti (kirish granti emas): CGPA ≥ 8,5 (10 balli
  shkala) + backlog yo'q + intizomiy jazo yo'q + institut/tashqi homiydan
  boshqa yordam OLMASLIK sharti (assistentlik oluvchilar doiradan tashqari).
  Chaqiruv — IR Office tomonidan odatda har yili **yanvarda**; grant 1 yil,
  keyingi chaqiruvga qayta topshirish mumkin.
- Kodlash: summa NULL / INR / `month` / `variable` ("up to" chegarasi matnlarda
  to'liq berilgan); `min_gpa` NULL (8,5 — institut ichidagi 10 balli CGPA,
  qabul chegarasi emas); deadline NULL/`not_published` + `rounds`; status
  `upcoming`; darajalar Magistr/PhD; uni 316, **us 710** yaratildi.
- Qo'shni sxemalar faqat tilga olingan: ADSIP (faqat SAARC), SGRIP (mehmon
  professor/postdoc), GKF internship dasturi (mahalliy talabalarning chetga
  amaliyoti).
- Muhim izchillik: bu yozuv bekor qilingan 397 ning "qayta yozilishi" EMAS —
  397 mahalliy MCM/freeship oilasini nomlagani uchun bekor qilingan edi; GKF —
  alohida sxema, alohida yozuv. Ilgari bekor qilingan "salbiy" yozuv **596**
  ("institut mablag'idan moliyalashtiriladigan grant e'lon qilinmagan") ga
  supersedesiya izohi qo'shildi (GKF — fond mablag'i), uning eskirgan
  **us 287** qatori o'chirildi.

## 773 — Uppsala University Global Scholarship (rel 8 → 10)

Fetch qilingan UU sahifasi (yangi manba **3126**) asosida tuzatishlar:

- **Darajalar**: Bakalavr/Magistr → **faqat Magistr**. Fetch qilingan sahifa:
  Global Scholarship — Magistr dasturlari uchun; sahifadagi bakalavr elementi
  **Anders Wall** sxemasiga tegishli va u faqat **Afrika davlatlari**
  fuqarolariga — doiradan tashqari, faqat tilga olindi.
- **Deadline**: 2027-01-15 (bu QABUL deadline) → **2027-02-01** — kuz 2027
  uchun grant arizasi oynasining yopilish sanasi (forma 16-yanvar–1-fevral
  2027); ikki sana `rounds` da ketma-ket berilgan. Uppsala modeli Stokgolmdan
  (673) farqli: alohida forma qabul natijalaridan OLDIN beriladi.
- **Minimalar**: uydirma `min_gpa` 3,3 / `min_ielts` 6,5 olib tashlandi (NULL)
  — sahifada chegara yo'q (tanlov "academic talent" bo'yicha; muvaffaqiyat
  ~2%). us 87 dagi xuddi shu uydirma profil ham tozalandi (nomi-dagi
  "Scholarships" xatosi bilan birga).
- `award_basis` "full_tuition" → "variable" (673 bilan izchillik: bekor
  qilinadigan to'lov dasturga qarab farqlanadi); qamrov "All" →
  EU/EEA/Shveytsariyadan tashqari; **11 ta istisno dastur** ro'yxati fetch
  qilingan sahifadan matnlarga kiritildi; manba havolasi (773→3126)
  qo'shildi (oldingi holatda yo'q edi).
- Moliyalashtiruvchi: Swedish Council for Higher Education (UHR) — fetch
  bilan tasdiqlandi.

## Hisoblagichlar (qat'iy tekshiruv)

| Ko'rsatkich | Batch 26 oldin | Batch 26 keyin |
| --- | --- | --- |
| Faol yozuvlar | 552 | **553** (+1: 987) |
| Bekor qilingan (retired) | 182 | 182 |
| Faol rel-4 | 15 | 15 |
| Kelajakdagi deadline lar | 196 | 196 (773 sanasi 15-yan → 1-fev, hisob o'zgarmadi) |
| Max scholarship id | 986 | **987** |
| Max source id | 3124 | **3126** |
| Max university_scholarships id | 709 | **710** |

Ketma-ketliklar: `scholarships_id_seq` 987, `sources_id_seq` 3126,
`university_scholarships_id_seq` 710. O'chirildi: us 287 (eskirgan salbiy
qator). Texnik qayd: us 87 yangilashda tasodifiy ortiqcha belgi kirib qolgan
edi — shu sessiyaning o'zida tozalash UPDATE bilan tuzatildi (replayda ikki
qadam ham ko'rsatilgan).

Mahalliy tekshiruvlar: `npm run typecheck` ✓, `npm run check:i18n` ✓,
`npm run test:render` **337/337** ✓.

## Keyingi qadamlar

Navbat bilan **Pass 120** (tozalash): qolgan rel-4 juftliklar — Chile 467/879
yoki Mexico 343/402 (jami faol rel-4 — 15). Ko'tarish navbatida: Chalmers
(421, rel 9), Axel Adler (739, rel 9). IIT Delhi yozuvi `78-2/` sahifasi
fetch imkoni bo'lganda tiklanadi (5 urinish muvaffaqiyatsiz).
