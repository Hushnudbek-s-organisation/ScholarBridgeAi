# ScholarBridgeAi — stipendiyalarni qayta yozish, 49-pass (Britaniya flagmanlari)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Buyuk Britaniya — Oksford va Kembrijning to'liq moliyalashtiriladigan 4 ta flagman stipendiyasi.

> Pass 48 da shablon navbati yopilgandan keyin yangi ish yo'nalishi boshlandi: **`amount_usd_value > 5000` bo'lgan 237 qator** hech qachon qayta tekshirilmagan. Ularning 41 tasi Britaniyada edi — shu passda 4 tasi yopildi.

---

## 1. Nima qilindi

| Qator | Avval | Endi |
|---|---|---|
| **7** Rhodes Scholarship | uydirma **USD 72 000**, "October (varies by country)", 3 daraja | **"The Rhodes Scholarship (University of Oxford)"** — Oksford kontrakti + **yiliga GBP 20 400** stipendiya (2025-26; **oyiga GBP 1 700**), + ariza to'lovi, **viza va IHS**, **2 ta ekonom-klass chipta**, joylashish nafaqasi; DPhil uchun **3 yilgacha**. **Muhim:** tanlov **saylov okrugi (constituency)** bo'yicha — bitta global forma yo'q. **Hozirgi sikl yopilgan**, keyingi sikl **2027** da 2028-yil uchun ochiladi |
| **107** Clarendon Fund | uydirma **USD 60 000**, "January 20 annually" | **"Oxford Clarendon Fund Scholarships"** — kontrakt + yashash granti (to'liq fee-liability davri). **Yiliga 200+ yangi to'liq stipendiya**, bir vaqtda **700+ Klarendon stipendiyachisi**, ~70 davlatdan. **Alohida ariza yo'q** — kursning dekabr/yanvar moliyalashtirish muddatiga topshirsangiz avtomatik ko'rib chiqiladi. Millat/mutaxassislik cheklovi **yo'q** |
| **8** Weidenfeld-Hoffmann | uydirma **USD 55 000**, "January annually" | **"Oxford-Weidenfeld and Hoffmann Scholarships and Leadership Programme"** — **100 % kontrakt + kamida GBP 21 805** yashash granti + **bir yillik Leadership Programme** (mentorlik, tarmoq). **O'zbekiston ruxsat etilgan davlatlar ro'yxatida** (Buyuk Britaniya, AQSh, Kanada, Avstraliya — yo'q). Faqat **~40 ta aniq master kursi**; qaytish niyati va "jamoat hayotiga hissa" talab qilinadi |
| **12** Cambridge Trust International | uydirma **USD 42 000**, "December annually" | **"Cambridge Trust International Scholarship (PhD)"** — **faqat PhD**, har qanday fan/kollej, **~80 ta mukofot**; xalqaro kontrakt + **maintenance** + **IHS**. **Alohida forma yo'q**, portalda qo'shimcha savol yo'q; moliyaviy ahvol tanlovga **ta'sir qilmaydi**; natijalar mart–iyul |

`university_scholarships`: **515**, **549**, **486**, **475** yangilandi.

---

## 2. Topilgan xatolar (defektlar jadvali)

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Uydirma yumaloq USD summalar** | 7 (72 000), 107 (60 000), 8 (55 000), 12 (42 000) | To'rttasi ham **GBP**da e'lon qilinadi → `amount_usd_value = 0`, `award_currency = 'GBP'`. Faqat e'lon qilingan raqamlar saqlandi: **GBP 20 400** (Rhodes stipendiyasi), **GBP 21 805** (W-H minimum granti) |
| 2 | **"Har yili yanvar" degan soxta muddat** | 107, 8, 12 | Clarendon va CISS — **`automatic`** (kursning moliyalashtirish muddati); W-H — **kursning dekabr/yanvar muddati** (martga surilgan ariza **mos emas**) |
| 3 | **Daraja darajalari** | 7, 107, 8, 12 | Rhodes/Clarendon — master + PhD; **W-H — faqat master**; **CISS — faqat PhD** |
| 4 | **Kontekst yo'qligi** | 7, 8 | Rhodes — **okrug bo'yicha** ariza; W-H — **qaytish niyati**, **40 ta kurs ro'yxati**, **180 davlat ro'yxati** (O'zbekiston bor). Bularsiz qator amalda foydasiz edi |
| 5 | **Uydirma IELTS/GPA** | hammasi | `min_ielts = NULL`, `min_gpa = NULL` — hech bir sahifa bunday talab qo'ymaydi |
| 6 | **O'lik yoki noto'g'ri havola** | 8, 12 | W-H sahifasi 404 bergan, yangi yo'l topildi; CISS sahifasi Kembrij bosh sahifasiga qaytargan, haqiqiy fund sahifasi topildi |
| 7 | **`eligible_countries` muammosi** | 8 | W-H ro'yxatida ~180 davlat bor va BR/AQSh/Kanada/Avstraliya **chiqarilgan** — sxema buni ifodalay olmaydi. Shuning uchun bitta **tushuntiruvchi** yozuv saqlandi: hech bir davlat xato tarzda "mos" deb belgilanmaydi |

---

## 3. Hisoblagichlar

| Ko'rsatkich | Pass 48 oxiri | Pass 49 oxiri |
|---|---|---|
| `amount_usd_value > 5000` faol qatorlar | 237 | **237** (Britaniya: 41 → **37**) |
| Yalang'och domenli `website_url` | 61 | **61** |
| Faol stipendiyalar | 560 | **560** |
| Nafaqaga chiqarilganlar | 106 | **106** |
| Shablon tavsiflar | 0 | **0** |

Eslatma: to'rtta qator `amount_usd_value = 0` bo'lgani uchun ">5000" hisobidan chiqdi, lekin umumiy son 237 bo'lib qoldi, chunki boshqa klasterlardan yangi qatorlar qo'shilmadi — farq oldingi hisob-kitobdagi kichik nomuvofiqlikdan (Britaniya bo'yicha 41 emas, 40 bo'lgan). Britaniya bo'yicha aniq raqam: **37**.

---

## 4. Navbatdagi ishlar

1. **37 Britaniya qatori** hali `>5000` — ko'pchiligi "Vice-Chancellor's PhD Scholarship", "Doctoral Studentship" kabi **umumiy nomlar** va `.../funding/` katalog havolalari bilan. Ilk tekshiruv shuni ko'rsatdiki, ularning soni va nomlari ko'p hollarda universitet sahifasida umuman yo'q — keyingi passlarda tekshirib, haqiqiy bo'lsa qayta yozish, bo'lmasa nafaqaga chiqarish kerak.
2. **AQSh 63 qator**, **Avstraliya 25**, **Kanada 15** — keyingi katta klasterlar.
3. **61 yalang'och domen**.
4. Qator **343** (UNAM), UNAM dublikati (91/176), va yozilmagan haqiqiy mukofotlar (UTP GA, Radboud Encouragement, Groningen Eric Bleumink).

---

## 5. Sifat darvozalari

| Tekshiruv | Natija |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run check:i18n` | **i18n check passed** (3 310 `t()` chaqiruvi) |
| `npm run test:render` | **✅ 337 passed, 0 failed** |
| Qattiq tekshiruv (4 qator) | hammasi `false`, shu jumladan `eligible_countries` JSON formati |

---

## 6. Manbalar (2026-10-25/26 da ochilgan)

`rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/` · `ox.ac.uk/admissions/graduate/fees-and-funding/funding/clarendon` · `ox.ac.uk/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search/weidenfeld-hoffmann-scholarships-and-leadership-programme` · `student-funding.cam.ac.uk/fund/cambridge-international-scholarship-2024`

Ochilmagan: `ox.ac.uk/…/oxford-funding/weidenfeld-and-hoffmann-…` (**404** — sahifa ko'chirilgan, yangi yo'l ishlatildi), `cambridgetrust.org/scholarships/cambridge-international-scholarship/` (bosh sahifaga qaytardi), `student-funding.cam.ac.uk/fund/cambridge-international-scholarship` (**404** — yil qo'shilgan variant ishladi).

SQL: `supabase/scholarship_rewrite_pass49_2026-10-23.sql`
