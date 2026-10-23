# Xalqaro stipendiyalar — 1-batch (2026-10-23)

**Maqsad:** bazadagi 358 ta universitetning har birida kamida bitta universitet stipendiyasi bor,
lekin **universitetga bog'lanmagan yirik xalqaro dasturlar** deyarli yo'q edi
(Chevening 0, Fulbright 0, Erasmus Mundus 0, Eiffel 0, Honjo 0, Yenching 0, JJ/WBGSP 0).
Bu batch o'sha bo'shliqni yopishning birinchi qadami.

**Qoida:** har bir yozuv **dasturning o'z rasmiy saytidan** o'qiladi (GrantGO kabi agregator
faqat topish uchun ishlatiladi), summa va muddat to'qib yozilmaydi.

---

## Qo'shilgan 7 dastur

| # | Dastur | Davlat | Daraja | Muddat | ID | Manba |
|---|---|---|---|---|---|---|
| 1 | Chevening Scholarships | Buyuk Britaniya | Master | 2027-28 yopilgan; keyingi — 2027-yil oktabr | 888 | chevening.org/scholarship/uzbekistan |
| 2 | Fulbright Foreign Student Program | AQSh | Master | 2027-28 yopilgan (2026-06-30); keyingi — 2027-yil iyun | 889 | uz.usembassy.gov/fulbright-foreign-student-program |
| 3 | Erasmus Mundus Joint Masters | Yevropa Ittifoqi | Master | Dasturga qarab: 2026-10-01 — 2027-01-31 | 890 | erasmus-plus.ec.europa.eu |
| 4 | France Excellence Eiffel | Fransiya | Master, PhD | **2027-01-06** | 891 | campusfrance.org |
| 5 | JJ/World Bank Graduate Scholarship | Bir necha davlat | Master | **26-fevral 2027** (2-oyna: 21-may 2027) | 892 | worldbank.org |
| 6 | Honjo International Scholarship | Yaponiya | Master, PhD | **2026-10-31** | 893 | hisf.or.jp |
| 7 | Yenching Academy Fellowship | Xitoy | Master | **2026-11-30** | 894 | yenchingacademy.pku.edu.cn |

### Har bir yozuvda nima bor

- `source_url` — dasturning rasmiy sahifasi (agregator emas);
- `requirements` — faqat rasmiy sahifada yozilgan shartlar;
- `notes` — qaysi kuni o'qilgani, sahifada nima yozilgani va **nima uchun** biror maydon
  bo'sh qoldirilgani;
- `min_gpa` / `min_ielts` — **NULL**, chunki bu dasturlar yagona ball belgilamaydi
  (universitet yoki dastur o'zi belgilaydi). Seed standart qiymatlari (3.2 / 6.5) ataylab
  yozilmadi — ular to'qima bo'lardi.

---

## Rad etilganlar — va nima uchun

Tekshiruv jarayonida 4 ta mashhur dastur **ataylab qo'shilmadi**. Bu "to'qib yozmaslik"
qoidasining amaldagi isboti:

| Dastur | Sabab |
|---|---|
| **Vanier Canada Graduate Scholarships** | Rasmiy sayt: *"We are no longer accepting applications… the new harmonized program"* — dastur yopilgan, CGRS-D ga almashtirilgan. Aggregatorlarda hali ham "ochiq" deb turadi. |
| **Australia Awards Scholarships** | Ishtirokchi davlatlar ro'yxatida **O'zbekiston yo'q** (Afrika + Indo-Tinch okeani + Tinch okeani). |
| **Commonwealth Scholarships** | Faqat Hamdo'stlik a'zolari uchun; O'zbekiston a'zo emas. |
| **Friedrich Ebert Foundation** | Talab: *"you live in Germany and study at a German university… applications in German"* — O'zbekistondan turib ariza berib bo'lmaydi. |

Mana shu 4 ta holat nima uchun avtomatik skrep qilmaslik kerakligini ko'rsatadi: ularning
hammasi ommaviy aggregatorlarda "ochiq stipendiya" sifatida turadi, lekin rasmiy manbada
boshqacha yozilgan.

---

## Baza holati (2026-10-23, batch 1 dan keyin)

| Ko'rsatkich | Oldin | Hozir |
|---|---|---|
| `scholarships` jami | 650 | **657** |
| Faol | 639 | **646** |
| Faol va `verified` | 639 | **646** |
| Universitetga bog'lanmagan (xalqaro) | 60 | **67** |

Tekshiruvlar (SQL orqali):

- `verified` + `source_url` yo'q: **0**
- muddati o'tgan, lekin faol: **0**
- noto'g'ri `award_basis` / `award_period` / `deadline_type`: **0**

---

## Keyingi batch uchun ro'yxat

Tekshirilishi kerak bo'lgan nomzodlar (hali bazada yo'q):

1. Czech Government Scholarships (developing countries)
2. Romanian Government Scholarship
3. Slovak National Scholarship Programme (SAIA)
4. Bulgarian Government Scholarship
5. KAAD — Catholic Academic Exchange Service (rivojlanayotgan davlatlar)
6. Konrad-Adenauer-Stiftung, Heinrich-Böll-Stiftung (Germaniya)
7. IsDB (Islom taraqqiyot banki) dasturlari — O'zbekiston a'zo
8. Aga Khan Foundation International Scholarship
9. Rotary Peace Fellowship
10. New Zealand Scholarships — O'zbekiston ro'yxatda bor-yo'qligini tekshirish kerak

Har biri uchun tartib bir xil: **rasmiy sahifa → sana/summa → SQL → `notes`**.

---

## Fayllar

- `supabase/international_scholarships_batch1_2026-10-23.sql` — bajarilgan SQL (id 888–894)
- `docs/GRANTGO_ASSESSMENT_2026-10-23.md` — manba baholashi (nega agregatordan nusxa olinmaydi)
