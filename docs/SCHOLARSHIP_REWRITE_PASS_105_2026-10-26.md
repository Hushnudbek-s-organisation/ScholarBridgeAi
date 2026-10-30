# Stipendiyalarni tozalash — 105-o'tish (Janubiy Koreya klasteri)

**Sana:** 2026-10-26 · **Branch:** `arena/a496ffaa-scholarbridgeai` · **PR:** #103

Avvalgi bosqich (Batch 11, `d145b12`) dan keyin navbat yana tozalashga keldi: katalogda qolgan 67 ta «reliability 4» (rasmiy sahifasi o'qilmagan, importer tomonidan yolg'iz domen bilan kiritilgan) faol yozuvning Janubiy Koreyaga oid 6 tasi ko'rib chiqildi. Har bir yozuv uchun avval rasmiy sahifa/quollanma o'qildi, shundagina DBga yozildi. Natija: **5 ta rewrite** (1 tasi reliability 10, 4 tasi 9) va **1 ta pensionatsiya**.

## Qarorlar xulosasi

| ID | Eski yozuv | Qaror | Yangi holat |
|---|---|---|---|
| 135 | Seoul National University Global Scholarship Program (GSF) | **Pensionatsiya** | Ikkita boshqa-boshqa sxemani aralashtirgan kompozit nom; SNU sahifasi aslida 4 alohida dasturning katalogi — yagona stipendiya sifatida ko'rsatib bo'lmaydi |
| 310 | KAIST International Student Full Scholarship | **Rewrite (rel 9)** | *KAIST Scholarship for International Graduate Students* — to'liq kontrakt + tibbiy sug'urta + tadqiqotga bog'liq oylik stipendiya; KGPS/KPS pog'onalari |
| 317 | Yonsei Global Leaders Fellowship | **Rewrite (rel 9)** | *Yonsei Global Leader Fellowship* (rasmiy shakl — yakka son) — to'liq kirish to'lovi+kontrakt + stipendiya, 4 semestr (birlashtirilgan darajada 6) |
| 321 | Korea University Global Leader Fellowship | **Rewrite (rel 10)** | *Korea University Global Leader Scholarship (Graduate)* — A turi: 100% kirish+kontrakt va 500 000 KRW/oy yashash nafaqasi (birinchi semestr); B 60%, C 65% |
| 452 | Hanyang University International Students Excellence... | **Rewrite (rel 9)** | *Hanyang International Scholarship Program (HISP)* — 100/70/50% kontrakt chegirmasi, qabulda avtomatik tanlanadi |
| 453 | POSTECH Graduate Fellowship | **Rewrite (rel 9)** | *POSTECH Graduate TA/RA Scholarship* — bunday nomli «Fellowship» mavjud emas; haqiqiy asosiy sxema TA/RA (2026: magistr 1 850 000, PhD 2 200 000 KRW/oy) |

## Dalillar (o'qilgan rasmiy manbalar)

- **321 (rel 10)** — `graduate2.korea.ac.kr/scholarship/scholarships.html` to'liq o'qildi: A/B/C turlar jadvali (GPA to'rt shkaladagi ekvivalentlar; IELTS 7.0/6.0, TOEFL, TEPS, TOPIK chegaralari), qabul bilan bir vaqtda avtomatik baholash, imtiyozlar faqat birinchi semestrga tegishliligi va 500 000 KRW/oy (4 oy) yashash nafaqasi hammas birinchi qo'ldan tekshirildi. GPA/IELTS bitta raqam sifatida saqlanmadi (ko'p shkala/ko'p test) — matnda qoldi.
- **317 (rel 9)** — `graduate.yonsei.ac.kr/.../foreigner_scholar.do` o'qildi: kollej tavsiyasi bilan yangi xalqaro talabalarga, to'liq kirish+kontrakt+stipendiya, saqlab qolish GPA ≥3.4/4.3. Stipendiya summasi rasmiy jadvalda e'lon qilinmagan — uydirib yozilmadi (2021-yilgi eski summa ham ko'chirilmadi), shu sababli rel 9.
- **310 (rel 9)** — KAISTning joriy stipendiya sahifasi fetcherga uch marta `HTTP 500` qaytardi (sahifa o'zi tirik va indekslangan). Shuning uchun sxema o'sha rasmiy URLning indekslangan matni + KAISTning 2024-yilgi rasmiy qabul qo'llanmasi (PDF, birinchi qo'ldan o'qildi) asosida yozildi; 2024-yilgi eski stipendiya summalari ataylab saqlanmadi (joriy sahifa stipendiyani tadqiqot ishtirokiga bog'laydi). Bu cheklov yozuvning `notes`ida ochiq yozilgan — shuning uchun rel 9.
- **452 (rel 9)** — Hanyang OIAning 2024 Bahor qabul qo'llanmasi (Graduate, PDF) o'qildi: HISP malaka GPA ≥80/100, 100/70/50% pog'onalar, magistr/PhD 4 semestr, saqlab qolish 3.0, alohida ariza yo'q. Qo'llanma 2024-yilniki bo'lgani (universitet har semestr yangilaydi) uchun rel 9.
- **453 (rel 9)** — `adm-g.postech.ac.kr/ENG/graduate-info/support-policy/` o'qildi: «Graduate Fellowship» nomli sxema yo'q; 2026-yilgi TA/RA jadvali (kontrakt komponenti 884 000 + yashash) birinchi qo'ldan olindi. Yozuv haqiqiy sxemaga o'zgartirilgan «identity step» bo'lgani uchun rel 9.
- **135 (pensionatsiya)** — `en.snu.ac.kr/.../before_application` o'qildi: sahifa 4 alohida dasturni sanaydi (President Fellowship, GSFS, Overseas Koreans, GKS). Eski nom ikki sxemani aralashtirgan, eski URL 404. Direktoriy/kompozit yozuvlar qoidasi bo'yicha pensionatsiya qilindi.

## Muhim qo'shimcha xulosalar (keyingi ishlar uchun)

- **SNU President Fellowship** va **GSFS** — Batch 12 uchun kuchli nomzodlar (rivojlanayotgan davlatlar, jumladan O'zbekistan, qamrab olinadi; GSFS da mamlakatlar ro'yxati har semestr o'zgaradi — alohida tekshiriladi).
- POSTECH sahifasidagi **Ruth L. Satter** (osiyolik qiz talabalarga) va **POSCO Global Scholarship** — millat malakasini tekshirib, keyinchalik ko'rib chiqish mumkin.

## Metodik eslatmalar

- Uydirma miqdor yoki deadline kiritilmadi: barcha 5 rewrite qabul-bilan-bog'liq sxemalar bo'lgani uchun `deadline_date` NULL + `not_published`, muddat tartibi `rounds`da yozildi; o'zgaruvchan/pog'onali to'lovlar `award_amount` NULL (variable) sifatida saqlandi, summalar matnda.
- Yon jadvallar sinxronlashtirildi: `sources` 2618/2549/2775/2556/2534/2594 (bare domendan real sxema sahifasiga; barchasi exclusive ekanligi oldindan tekshirilgan, URL to'qnashuvi 0), `university_scholarships` 566 (withdrawn), 527/513/514/477/478 (verified).
- Sxema ustunlari `information_schema`dan tasdiqlandi (`sources.accessed_at`, `max_scholarship`, `covers_living_expenses`) — xotiradagi nomlar bilan yuborilgan birinchi CASE urinishlari 42703 xato bilan rad etilib, tuzatilgani yuborildi.

## Sanovchilar (yozuvlardan keyin DBdan qayta o'qilgan)

| Ko'rsatkich | Oldin | Keyin |
|---|---|---|
| Faol stipendiyalar | 533 | **532** |
| Pensionatsiya qilingan | 163 | **164** |
| Faol reliability-4 yozuvlar | 67 | **61** |
| Janubiy Koreya reliability-4 | 6 | **0** |
| Kelajakdagi deadline'lar | 169 | **169** |

Lokal tekshiruvlar: `typecheck` ✅ · `check:i18n` ✅ · `test:render` ✅ 337/337.

## Keyingi qadamlar

1. **Batch 12 (qo'shimchalar):** SNU President Fellowship va GSFSni alohida tekshirib qo'shish; imkon bo'lsa Ruth L. Satter/POSCO.
2. **Pass 106 (tozalash):** Shveysariya reliability-4 klasteri (6 yozuv). Undan keyin Yangi Zelandiya (5).
3. Ilgari belgilangan texnik qarzlar: SMU universitet yozuvini yaratish + 396 ni bog'lash; Adelaide/Flinders qayta bog'lash; 31/849 va 44/554 dubl tekshiruvlari.
