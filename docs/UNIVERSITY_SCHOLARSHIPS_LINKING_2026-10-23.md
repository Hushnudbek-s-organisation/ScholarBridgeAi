# Universitet grantlari — tekshiruv va bog'lash (2026-10-23)

Savol: yangi kiritilgan universitetlarda **o'zi taqdim etadigan** grantlar bormi va ular
universitet sahifasida **ko'rinadimi**?

## 1. Ilova grantlarni qanday ko'rsatadi

`GET /api/universities/[id]` (`src/app/api/universities/[id]/route.ts`) ro'yxatni
`scholarships` jadvalidan quradi:

1. `scholarships.university_id = <shu universitet>` — **birinchi navbatda shu**;
2. `provider` nomi universitet nomiga mos kelsa;
3. shu davlatda taklif qilinadigan grantlar.

Faqat `is_active = true` qatorlar (`src/lib/catalogCache.ts`), ro'yxat 6 taga cheklangan.
`university_scholarships` — har universitet uchun "sarlavha grant" jadvali (PDF importida
yaratilgan); ilova uni o'qimaydi, lekin u ikki jadval mos bo'lishi uchun yuritiladi.

## 2. Tekshiruv natijasi

| Holat | Oldin | Keyin |
| --- | ---: | ---: |
| Grant **umuman yo'q** universitetlar | **1** (CTU, id 213) | **0** |
| `university_scholarships` bog'lamasi yo'q | 16 | **0** |
| `university_scholarships` qatorlari | 362 | **381** |
| `scholarship_id` NULL bo'lgan bog'lama | 0 | 0 |
| Begona grantga bog'langan qator | 0 | 0 |
| Jami grantlar | 643 | **647** |

Yangi kiritilgan barcha universitetlarda (201–216, 327–364) o'z granti bor va bog'langan:

| id | Universitet | Grantlar |
| ---: | --- | --- |
| 213 | CTU Prague | **4** (yangi qo'shildi) |
| 214 | WIUT | 1 — WIUT Scholarship Programme |
| 215 | IUT | 1 — IUT Scholarships |
| 216 | NewUU | 2 — Merit (50/70/100%), Aerospace 40% |
| 327–364 | 38 ta yangi universitet | har birida 1 (PDF manbasidan) |

## 3. CTU — 4 ta haqiqiy grant qo'shildi

CTUda umuman grant yo'q edi. Rasmiy sahifalardan olindi:

| Grant | Miqdor | Manba |
| --- | --- | --- |
| Foreign Master's students | CZK 10 000/oy gacha (≈$4 300/yil) | international.cvut.cz/students/incoming-students/ctu-scholarships/ |
| Foreign PhD students | CZK 16 000/oy gacha (≈$8 256/yil) | o'sha sahifa |
| Professor Miroslav Vlček | bir martalik CZK 30 000 (≈$1 290) | international.cvut.cz/…/professor-vlcek-scholarship/ |
| Merit scholarship | semestr uchun, GPA bo'yicha | intranet.fel.cvut.cz/en/admissions/scholarship-merit.html |

Muhim: bu to'rttasi ham **kontraktni qoplamaydi** — stipendiya/mukofot. Shuning uchun
`covers_tuition = false`, `coverage_type = 'Partial (Living Stipend)'` va hokazo
(birinchi urinishda noto'g'ri "Full Tuition + Stipend" yozilgan edi — darhol tuzatildi).

## 4. Uchta eski qator rasmiy qoidalarga zid edi — tuzatildi

Finlyandiya 2026-yil 1-avgustdan to'liq qiymatli kontraktga o'tdi, shu sababli Turku va
Oulu **birinchi kursga grant bermaydi**; Tartu esa 2026/27 dan yangi kelganlarga
tuition-waiver bermaydi. Eski qatorlar esa "Full Tuition $12 000 / $12 000 / $5 000"
deb turardi — bunday grantni hech kim olmaydi.

| id | Universitet | Eski (noto'g'ri) | Yangi (rasmiy) |
| ---: | --- | --- | --- |
| 504 | University of Turku | "International Excellence Scholarship", $12 000 Full Tuition | 2-kursdan 50% merit + €2 000 Early Bird; birinchi kursga grant yo'q |
| 505 | University of Oulu | $12 000 Full Tuition | 2-kursdan 10–40% waiver + 5–30% Early Bird; 100% grant yo'q |
| 507 | University of Tartu | $5 000 Full Tuition | 2026/27 dan waiver yo'q; ayrim dasturlarda 25–100% chegirma |

Manbalar: utu.fi/en/study-at-utu/scholarships-and-tuition-fees, oulu.fi (tuition fees and
scholarships), ut.ee/en/content/cost-tuition.

## 5. Qolgan 10 ta shubhali qator — o'chirilmadi, almashtirish kerak

Bular dastlabki seeddan qolgan **shablon** qatorlar: bir xil nom
("<Universitet> International Excellence Scholarship"), bir xil $5 000, umumiy bosh
sahifa manbasi. Uchtasi aniq xato:

| id | Universitet | Nega xato |
| ---: | --- | --- |
| 485 | University of Münster (Germaniya) | Germaniya davlat OTMlarida kontrakt **yo'q** — "$5 000 Full Tuition" bo'lishi mumkin emas |
| 506 | University of Iceland | Islandiya davlat OTMlarida faqat ro'yxat yig'imi — "$5 000 Full Tuition" mumkin emas |
| 496 | UNAM (Meksika) | Kontrakt ≈$100/yil — "$5 000 Full Tuition" mumkin emas |
| 399 | PUC Chile | Qator **PUCV** (Valparaíso) granti, lekin PUC Chile'ga bog'langan — boshqa universitet |

Qolgan 6 tasi (UPC, UNIL, DTU International, POSTECH, Universiti Malaya, Latvia)
mavjud bo'lishi mumkin, lekin nomi/miqdori tasdiqlanmagan.

Ularni **o'chirmadim**, chunki ko'pchiligida davlat darajasidagi zaxira grant yo'q —
o'chirilsa sahifa butunlay bo'shab qoladi. To'g'ri yechim: har biri uchun rasmiy
grantni topib almashtirish (Turku/Oulu/Tartu kabi). Xohlasangiz keyingi qadamda
shuni bajaraman.

## 6. Takrorlash

`supabase/link_university_scholarships_2026-10-23.sql` — CTU grantlari, 3 ta tuzatish,
15 ta bog'lama (begin/commit + tekshiruv so'rovlari).

---

## 7. Ikkinchi o'tish: sahifada nima ko'rinishini tekshirish (2026-10-23)

Birinchi o'tishdan keyin **har bir universitet sahifasidagi `Scholarships` bo'limida
nima chiqishini** API mantig'ini aynan takrorlab tekshirdim
(`src/app/api/universities/[id]/route.ts`: `university_id` bo'yicha bog'langan grant
birinchi, keyin `provider` mosligi, keyin shu davlat grantlari; 6 taga cheklangan,
UI birinchi 3 tasini ko'rsatadi).

| Tekshiruv | Natija |
| --- | ---: |
| Grant ro'yxati bo'sh bo'lgan universitetlar | **0** |
| Ro'yxatda **o'z granti birinchi** turgan universitetlar | **363 / 364** |
| Faqat davlat darajasidagi grant ko'rsatadigan | 1 (id 176 — dublikat qator) |
| Faol grantlar | 646 |

### Tuzatilgan 4 ta noto'g'ri qator

| id | Universitet | Eski (noto'g'ri) | Yangi (rasmiy manba) |
| ---: | --- | --- | --- |
| 485 | University of Münster | "International Excellence Scholarship", $5 000 Full Tuition | **ProTalent** — €300/oy (Germaniyada kontrakt yo'q, shuning uchun "fee waiver" bo'lishi mumkin emas) |
| 506 | University of Iceland | $5 000 Full Tuition | UI o'zi "prospective students uchun grant yo'q" deb yozgan → **Icelandic Government Scholarship** (ro'yxat yig'imi + oylik stipendiya) |
| 399 | PUC Chile (dublikat 174) | **PUCV** (Valparaíso) granti — boshqa universitet | o'chirildi (asosiy qator 89 da haqiqiy grantlar bor) |
| 496 | UNAM-CU (dublikat 176) | $5 000 Full Tuition | o'chirildi (asosiy qator 91 da UNAM grantlari bor) |

Qo'shildi: **UC Tuition Scholarship for Exchange Students** (CINDA va Lotin Amerikasi
katolik universitetlari) — 174-qator uchun, uc.cl manbasi bilan.

### Diqqat: dublikat universitet qatorlari

399/496 ni tekshirganda ma'lum bo'ldiki, ular **dublikat qatorlarga** bog'langan:

| Dublikat | Asosiy qator |
| ---: | ---: |
| 174 PUC Chile (UC Santiago) | 89 PUC Chile (UC Chile) |
| 176 UNAM (… - CU) | 91 UNAM |

Bundan oldin topilgan yana 5 juft: 114/143 (DTU), 116/135 (UNIL), 87/170 (POSTECH),
91/176 (UNAM), 77/187 (Universiti Malaya). Bular katalogda bir universitet ikki marta
ko'rinishiga olib keladi va grantlarining bo'linishiga sabab bo'ladi. Birlashtirish
(programs, cycles, applications, university_scholarships FK'larini ko'chirish) alohida
ish sifatida qoldirilgan — bu commitda tegilmagan.
