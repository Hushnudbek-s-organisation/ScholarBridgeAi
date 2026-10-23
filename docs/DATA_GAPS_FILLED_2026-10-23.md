# Ma'lumot bo'shliqlari — topildi va to'ldirildi (2026-10-23)

Vazifa: bazadagi bo'sh joylarni topib, **ishonchli manbalardan** to'ldirish.
Manbalar: universitetlarning o'z rasmiy saytlari (uchinchi tomon agregatorlari emas) va
Wikimedia Commons. Har bir raqam qaysi sahifadan olingani `sources` / `university_sources`
jadvalida saqlangan.

## 1. To'liqlik auditi (oldin → keyin)

| Ko'rsatkich | Oldin | Keyin |
| --- | ---: | ---: |
| QS 2026 reytingi yo'q | 8 | 8 |
| Rasmi yo'q (`image_url`) | 71 | **57** |
| Kontrakt narxi yo'q (`annual_tuition`) | 4 | **0** |
| `annual_tuition_usd` yo'q (legacy ustun) | 164 | **0** |
| Asos (founded_year / university_type) yo'q | 4 | **0** |
| Dasturi yo'q (`programs`) | 4 | **0** |
| `unverified` qatorlar | 4 | **0** |
| Grant yo'q (`university_scholarships`) | 19 | **16** |
| `programs` jami | 3008 | **3032** |
| `scholarships` jami | 639 | **643** |

## 2. Eng katta bo'shliq: 4 ta "placeholder" universitet

Bu 4 qatorda faqat nom, shahar va sayt bor edi — kontrakt narxi, talablar, tashkil
topgan yili, turi, dasturlari, muddatlari, manbalari **hammasi bo'sh**, holati
`unverified` (ya'ni API ularni foydalanuvchiga umuman ko'rsatmasdi). Uchtasi
Toshkentda — o'zbek abituriyentlari uchun eng dolzarb qatorlar.

| id | Universitet | Manba |
| ---: | --- | --- |
| 213 | Czech Technical University in Prague (CTU) | cvut.cz, fit.cvut.cz, fel.cvut.cz |
| 214 | Westminster International University in Tashkent (WIUT) | wiut.uz/undergraduate, /tuition-fees, /apply |
| 215 | Inha University in Tashkent (IUT) | inha.uz/program-overview-kor, /tuitions |
| 216 | New Uzbekistan University | newuu.uz/en/undergraduate-program, /scholarships/tuition-fees-overview |

### To'ldirilgan ma'lumotlar

| | CTU | WIUT | IUT | NewUU |
| --- | --- | --- | --- | --- |
| Tashkil topgan | 1707 | 2002 | 2014 | 2021 |
| Turi | Public | Public | Public | Public |
| Kontrakt (yillik) | 110 000 CZK ≈ **$4 730** | 38 820 000 UZS ≈ **$3 033** | 40 400 000 UZS ≈ **$3 156** | 25,2–94 mln UZS ≈ **$1 969–7 344** |
| Ingliz tilida | ha | ha | ha | ha |
| IELTS | 5.5 (fakultetga qarab 6.0) | nashr etilmagan | o'z imtihoni | o'z imtihoni |
| PSW (viza) | 0.75 yil (9 oy) | — | — | — |
| Xalqaro talabalar | 3 000+ (16%) | — | — | — |
| **Dasturlar** | **2** | **7** | **4** | **11** |
| Grantlar | — | 1 | 1 | 2 |

Dasturlar ro'yxati (haqiqiy, saytdan):

* **WIUT (7):** BA (Hons) International Relations and Law; BSc (Hons) Economics;
  BSc (Hons) Computer Science; BA (Hons) Commercial Law; BSc (Hons) Finance;
  BA (Hons) Business Management; BSc (Hons) Business Information Systems
* **IUT (4):** BSc Computer Science and Software Engineering (CSE);
  BSc Information and Communication Engineering (ICE); BSc Business Administration;
  BSc Logistics Management
* **NewUU (11):** BSc Software Engineering; BSc Cyber Security; BSc AI & Robotics;
  BSc Mechanical Engineering; BSc Chemical & Materials Engineering;
  BSc Aerospace Engineering; BSc Applied Mathematics; BSc Economics & Data Science;
  BSc STEM Education; M.D. Doctor of Medicine; BSc Industrial Management
* **CTU (2 tasdiqlangan):** BSc Electrical Engineering and Computer Science;
  BSc Information Technology (qolgan fakultetlar dasturlari alohida tasdiqlanmagan
  — shuning uchun yozilmadi)

### Valyuta konvertatsiyasi — halol qoida

Bazada barcha `annual_tuition` qiymatlari USD'da. UZS/CZK summalari ilovaning **o'z**
kurslari bilan aylantirildi (`src/lib/countryCostBenchmarks.ts`: UZS = 1/12 800,
CZK = 0.043). Asl summa `highlights` va dastur tavsifida saqlangan — hech narsa
jimgina o'zgartirilmagan.

## 3. `annual_tuition_usd` — 164 qator

PDF importi faqat `annual_tuition`ni to'ldirgan, ilova esa ro'yxatda va narx
bo'yicha saralashda legacy `annual_tuition_usd` ustunini o'qiydi. Shu sababli 160 ta
PDF qatorida narx ustuni **bo'sh** ko'rinardi. Barcha qiymatlar USD bo'lgani uchun
ko'chirish lossless: `annual_tuition_usd = annual_tuition`. Natija: 164 → **0**.

## 4. Rasmlar — 71 → 57

14 ta yangi kampus fotosi Commons'dan topildi:

| id | Universitet | Fayl |
| ---: | --- | --- |
| 254 | University of Macau | `University of Macau in Hengqin（west）2021.jpg` |
| 255 | University of Sussex | `Universität Sussex.jpg` |
| 256 | Griffith University | `Griffith University.jpg` |
| 271 | Swinburne University of Technology | `Swinburne University of Technology campus in Hawthorn…01.jpg` |
| 275 | University of Tübingen | `Alte-aula-tuebingen-2018.jpg` |
| 276 | Vanderbilt University | `Vanderbilt university campus 2017.jpg` |
| 278 | American University of Beirut | `American University of Beirut (4694793112).jpg` |
| 280 | Harbin Institute of Technology | `Harbin Institute of Technology - Main Bldg.jpg` |
| 281 | Radboud University | `Spinozagebouw Universiteit Nijmegen.jpg` |
| 288 | University of Strathclyde | `University of Strathclyde Campus.jpg` |
| 289 | University of Arizona | `University of Arizona May 2019 73 (Mall).jpg` |
| 292 | Stellenbosch University | `Stellenbosch University KONSERVATORIUM.jpg` |
| 293 | University of Virginia | `University of Virginia Rotunda 2006.jpg` |
| 294 | Swansea University | `Great Hall at Swansea University Bay Campus.jpg` |

## 5. Grantlar (4 ta yangi)

| Universitet | Grant | Qoplama | Manba |
| --- | --- | --- | --- |
| NewUU | Merit Scholarship (50% / 70% / 100%) | qisman–to'liq | newuu.uz/en/scholarships/tuition-fees-overview |
| NewUU | Aerospace Engineering 40% (mahalliy talabalar) | 40% | o'sha sahifa |
| WIUT | WIUT Scholarship Programme | qisman | wiut.uz/scholarship |
| IUT | IUT Scholarships | qisman | inha.uz/…/scholarships/ |

## 6. Nima uchun qolganlari bo'sh qoldirildi (taxmin yozilmadi)

* **8 ta reyting** — KAIST QS 2026 nashridan chiqarilgan; Nazarbayev, WIUT, IUT,
  NewUU, École des Ponts, Corvinus, Semmelweis QS 2026 ro'yxatida yo'q.
* **57 ta rasm** — Commons'da aynan shu universitet binosi topilmadi (logo/gerb/
  boshqa OTM surati chiqdi). Bo'sh qoldirish noto'g'ri rasmdan yaxshiroq.
* **16 ta grant** — rasmiy sahifada aniq grant dasturi e'lon qilinmagan.
* **3 ta `min_ielts`** — WIUT/IUT/NewUU IELTS talab qilmaydi, o'z qabul imtihonini
  o'tkazadi (saytlarida shunday yozilgan).

## 7. Aniqlangan qo'shimcha muammo: dublikat qatorlar

Grant bo'lmagan 19 qatorni tekshirganda 5 juft **dublikat** aniqlandi (dastlabki
seeddan qolgan): `114/143` (DTU), `116/135` (UNIL), `87/170` (POSTECH),
`91/176` (UNAM), `77/187` (Universiti Malaya). Ular ustida ishlash (birlashtirish)
FK'lar (programs, scholarships, applications) sababli alohida vazifa — bu commitda
**tegilmadi**, faqat qayd etildi.

## 8. Takrorlash

`supabase/fill_data_gaps_official_sources_2026-10-23.sql` — barcha UPDATE/INSERT
(begin/commit), manba URL'lari bilan. Idempotent: `programs` allaqachon mavjud
bo'lsa qayta yozilmaydi, `annual_tuition_usd` faqat bo'sh qatorlarga to'ldiriladi.

Tekshiruv so'rovlari fayl oxirida (kutilgan qiymatlar bilan).
