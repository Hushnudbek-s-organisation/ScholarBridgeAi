# Grant yozuvlarini qayta yozish — 17-pass: Rossiya klasteri (2026-10-23)

Rossiya klasteridagi **9 ta qatorning barchasi** ko'rib chiqildi. Asosiy topilma: ularning deyarli hammasi bitta milliy dasturni — **Open Doors** yoki **elchixona kvotasini** — universitetning o'z granti sifatida takrorlagan edi.

SQL: [`supabase/scholarship_rewrite_pass17_2026-10-23.sql`](../supabase/scholarship_rewrite_pass17_2026-10-23.sql)

---

## 1. Topilgan xatolar

| Yozuv | Bazada turgan | Rasmiy manba |
|---|---|---|
| **812 HSE** | "HSE Global Scholarship (**25%, 50%, 70%, 100%** Tuition) & RF Quota", $5 500 | Bunday pog'onalar yo'q. HSE'ning o'z olimpiadasi — **INTO HSE**: g'oliblar va laureatlar **100%** grant (4 yil + yotoqxona), 2–3-darajali sovrindorlar **75% gacha** chegirma. Bu **maktab o'quvchilari** uchun (10–11 sinf) → bakalavriat. |
| **807 RUDN** | "RUDN Open Olympiad **Grant**", $17 300, Nov–Feb | "Grant" degan narsa yo'q. **RUDN Open Olympiad** (2016 yildan): g'olib → kvota bo'yicha tekin, sovrindor → chegirma. Naqd pul mukofoti — alohida **RUDN Brilliant Students** (25 000 ₽/oy, 21 ta). |
| **829 MIPT** | "Phystech.International **Winner Quota** & RF Scholarship", $6 000, 3 daraja | Phystech.International — **maktab o'quvchilari** (9–11 sinf) uchun matematika/fizika olimpiadasi. G'olib **tekin o'qishga kafolat olmaydi** — MIPT o'zi shunday yozadi: "competitive advantage", ya'ni kvota tanlovida yordam. |
| **822 KFU** | "RF Quota & **Tatarstan Study Grant**", $4 000 | "Tatarstan Study Grant" yo'q. KFU'ning **o'z xalqaro olimpiadasi** bor: 10–11 sinf + magistratura abituriyentlari, 12+ fan, 2 bosqich, qatnashish bepul. |
| **629 MSU** | "RF Quota & **MSU Olympiad**" | MSU FAQ: *"Moscow State University provides scholarships to students studying on a budgetary basis. MSU does not provide scholarships to students studying on a contractual basis."* → **retired** |
| **836 MEPhI** | "**Rosatom** / RF Quota & Open Doors" | MEPhI uchta yo'l sanaydi: o'z puli, davlat kvotasi, Open Doors. Rosatom mukofoti — *"personal scholarships that are added to your monthly payments"*, ya'ni **o'qiyotgan** talabaga ustama, abituriyentga emas → **retired** |
| **543 Bauman** | "RF Quota & Open Doors (Bauman)" | Bauman sahifasi — shunchaki Open Doors'ga havola. 50% chegirma esa **4 ta YUSS** natijasiga bog'langan, xorijiy abituriyent buni topshira olmaydi → **retired** |
| **833 TSU** | "RF Quota & Open Doors" | TSU: Open Doors g'oliblariga **magistraturada 40% chegirma** — bu mezbon ustamasi, alohida grant emas → **retired** |
| **840 NSU** | "RF Quota & Open Doors (NSU)" | NSU faqat 2 yo'lni sanaydi: elchixona kvotasi + Open Doors; o'zi kirish granti bermaydi (magistraturada 25% gacha chegirma) → **retired** |

---

## 2. Yangi yozuv — **id 902**

9 ta qatorning 5 tasi bitta dasturni takrorlagani uchun **Open Doors** ning o'zi alohida yozildi:

**Open Doors: Russian Scholarship Project** — Global Universities Assotsiatsiyasi + Fan va oliy ta'lim vazirligi.

| Maydon | Qiymat |
|---|---|
| Muddat | **1-noyabr 2026** (ro'yxatdan o'tish yopiladi) — `deadline_type = fixed` |
| Holat | **`application_status = open`** — bugun 24-oktabr, **8 kun qoldi** |
| Qamrov | Federal byudjetdan to'liq kontrakt + oylik stipendiya + rus tilida o'qish uchun bepul tayyorlov yili |
| Darajalar | Bakalavr, magistratura, PhD (+ postdoc) |
| Universitetlar | **24 ta**, jumladan HSE, Bauman, MIPT, NSU, MEPhI, SPbU, Tomsk Polytechnic |
| Til | Rus yoki ingliz — to'liq onlayn, qatnashish bepul |
| 2026 | Bir oyda **100 000+** ro'yxatdan o'tgan |

**Muhim farq:** elchixona kvotasi (id 868) — **15-dekabr 2026** (MDH) / 15-yanvar 2027, mamlakat bo'yicha taqsimlanadi. Open Doors — **1-noyabr 2026**, har kim to'g'ridan-to'g'ri kiradi. **Ikkalasiga ham ariza berish mumkin.**

---

## 3. Qayta yozilgan 4 qator

- **812 HSE** — INTO HSE: 16 fan, g'olib → 4 yillik tekin bakalavriat + yotoqxona, sovrindor → 75% gacha chegirma; diploma 2 yil amal qiladi. **2022-yilda eng ko'p qatnashchi O'zbekistondan — 934 kishi** (5 759 dan).
- **807 RUDN** — 10 fan, onlayn (proktor) yoki hamkor universitetda jonli; qatnashish bepul.
- **829 MIPT** — halol yozildi: g'alaba tekin o'qishga kafolat **emas**.
- **822 KFU** — 12+ fan, 2 bosqich (dekabr–yanvar onlayn saralash).

---

## 4. Holat

| Ko'rsatkich | Oldin | Hozir |
|---|---|---|
| Importer shablonidagi tavsif | 191 | **182** |
| Bosh domen (`website_url`) | 240 | **233** |
| Faol grantlar | 631 | **627** (5 retired, 1 yangi) |
| Qayta yozilgan qatorlar | 79 / 631 (12.5%) | **83 / 627 (13.2%)** |
| Grant yo'q universitetlar | 4 | **8** (ataylab) |

**Nega "grant yo'q universitet" ko'paydi:** MSU, MEPhI, Bauman, TSU, NSU o'z sahifasida xalqaro abituriyentga kirish granti bermasligini aytadi. Ularning sahifalari bo'sh qolmaydi — **868 (elchixona kvotasi)** va **902 (Open Doors)** "bir xil davlat" qoidasi bo'yicha chiqadi.

Tekshiruvlar: 10 ta qatorning qattiq tekshiruvlari ✅ (`bad_desc`, `bad_fields`, `bad_more`, `noncanon` — hammasi `false`).

---

## 5. Rossiya klasteri — yakun

| Holat | Qatorlar |
|---|---|
| Qayta yozildi | 812 HSE, 807 RUDN, 829 MIPT, 822 KFU |
| Retired (dublikat) | 629 MSU, 836 MEPhI, 543 Bauman, 833 TSU, 840 NSU |
| Yangi | **902 Open Doors** |
| Namuna (avvaldan to'g'ri) | 868 Rossotrudnichestvo kvotasi |

## 6. Keyingi navbat

182 ta shablon tavsif va 233 ta bosh domen qoldi. Keyingi klasterlar: **Germaniya** (DAAD bilan aralashtirilgan qatorlar), **Xitoy** (CSC), **Janubiy Koreya** (GKS), **Malayziya** (MIS). Har birida xuddi shu naqsh: milliy dastur universitetning "o'z granti" sifatida yozilgan.
