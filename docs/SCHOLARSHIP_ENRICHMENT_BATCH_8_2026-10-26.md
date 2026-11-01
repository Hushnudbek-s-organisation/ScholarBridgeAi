# Scholarship Enrichment — Batch 8 (Serbiya, Meksika, Tailand, Tayvan)

**Sana:** 2026-10-26
**Reja:** 1 cleanup → 1 additions, navbatma-navbat. Bu — Pass 101 (cleanup) dan keyingi additions bosqichi. Batch 7 da qoldirilgan to'rtta nomzod ("World in Serbia", AMEXCID, TIPP, Tayvan MOFA/ICDF) auditi o'tkazildi: har birining rasmiy sahifati/hujjati shu kuni fetch qilindi, O'zbekiston muvofiqligi ro'yxat darajasida tekshirildi.

---

## 1. Audit natijasi (nomzodlar bo'yicha)

| nomzod | Rasmiy manba (fetch qilingan) | O'zbekistonga muvofiqligi | Qaror |
|---|---|---|---|
| **World in Serbia** (Serbiya) | `prosveta.gov.rs` dastur sahifasi + 2026 chaqiriq sahifasi; `nam.go.ug` (NAM raisi sayti) | Dastur NAM a'zo/kuzatuvchi davlatlari (127 davlat) uchun; O'zbekiston NAM da **a'zo davlat** (nam.go.ug/uzbekistan — "MEMBER STATE") | **Qo'shildi (935)** |
| **AMEXCID Becas de Excelencia** (Meksika) | `gob.mx/amexcid` 2026 chaqiriq sahifasi + ingliz tilidagi chaqiriq PDF + Anexo 5 + Anexo 3 | Anexo 5 (Osiyo) da "REPÚBLICA DE UZBEKISTÁN" bor. **Eslatma:** aviabilet imtiyozi ro'yxati (Anexo 3) da O'zbekiston **yo'q** — yozuvda bu aniq ko'rsatildi | **Qo'shildi (933)** |
| **TIPP** (Tailand) | `tica-thaigov.mfa.go.th` muvofiq davlatlar sahifati (yangilangan: 5-yanvar 2026) + "Full-support" ro'yxati PDF + TIPP 2026 Guidelines PDF (reviziya `_2`) | 2026 **full-support** ro'yxatida Markaziy Osiyo bo'limida "Uzbekistan" bor | **Qo'shildi (934)** |
| **TaiwanICDF** (Tayvan) | `icdf.org.tw` 2026 Application Guidebook PDF + Eligibility sahifasi | 2026 muvofiq davlatlar ro'yxatida Markaziy Osiyo davlatlari yo'q; qo'llanma savol-javobida: ro'yxatda bo'lmagan davlat fuqarosi ariza bera olmaydi | **Rad etildi: O'zbekiston ro'yxatda yo'q** |
| **MOFA Taiwan Scholarship** (Tayvan) | `taiwanscholarship.moe.gov.tw` Scholarship Guidelines jadvali + `en.mofa.gov.tw` MOFA sahifasi; tasdiqlovchi: NYCU/NTUT universitet sahifalari | Rasmiy qoida: "Tayvan bilan diplomatik munosabatlari bor davlatlar yoki MOFA tomonidan do'stona munosabatlar deb tan olingan davlatlar" (jadvalda Diplomatik ittifoqchilar ro'yxatiga havola). O'zbekiston ROC (Tayvan) bilan diplomatik aloqaga ega emas va uning "MOFA tan olgan do'stona" toifasiga kirganini tasdiqlovchi rasmiy manba topilmadi | **Rad etildi: muvofiqlik tasdiqlanmadi** |

**Katalogda uchrash qidiruvi (duplikat yo'q):** Serbiya/AMEXCID/TIPP/ICDF/MOFA yozuvlari yo'q edi. Meksika bo'yicha faqat universitet yozuvlari bor (UNAM 343/707, Tec de Monterrey 402/679), Tailand bo'yicha Chulalongkorn (502/555), Tayvan bo'yicha universitet yozuvlari (342/632/633/640/642) — ular o'zgartirilmaydi.

**Keyingi batchga qoldirildi (audit qilinmagan):** MOE Taiwan Scholarship (Tayvan Ta'lim vazirligining alohida dasturi; xorijiy fuqarolarga umumiy ochiq ko'rinadi, lekin O'zbekiston fuqarolari uchun ariza kanali/kvota alohida tekshirilishi kerak — yarim tekshiruv bilan qo'shilmadi).

---

## 2. Qo'shilgan yozuvlar (933–935)

Yozuvlar parallel INSERT qilindi; **parallel natijalar tugash tartibida qaytdi, so'rov tartibida emas**. Har bir INSERT `RETURNING id, title` bilan bajarildi va bog'lashdan oldin alohida SELECT bilan title bo'yicha qayta tekshirildi. Haqiqiy xaritalama: **933 = Meksika, 934 = TIPP, 935 = Serbiya** (kiritish tartibi bo'yicha kutilganidan farqli).

### 933 — Mexican Government Excellence Scholarships for Foreigners (AMEXCID)
- **Dastur:** SRE/AMEXCID ning flagman akademik-hamkorlik stipendiyasi; 170+ davlat, ~90 ta Meksika OTM (Anexo 1). Modaliyalari: bakalavr harakatlanishi (12 oygacha), magistratura harakatlanishi (12 oygacha), to'liq magistratura (24 oygacha), doktorlik/postdoktorlik ilmiy mehnat safarlari (6–12 oy). Katalog darajalarga Bachelor/Master/PhD qo'yildi, lekin harakatlanish/ilmiy-safar tabiati sarlavha darajasidagi matnda aniq yozildi.
- **Moliyaviy paket (2026 chaqiriq):** harakatlanish + magistratura uchun 4 UMA = **$14,264.88 MXN/oy**; doktorlik/postdoktorlik uchun 5 UMA = **$17,831.10 MXN/oy**; muassasa qaroriga ko'ra yozilish/tuition; 7-oydan IMSS tibbiy sug'urtasi; viza to'lovidan ozodlik; tugagach, aviabilet **faqat Anexo 3 davlatlariga — 2026 ro'yxatida O'zbekiston yo'q** (yozuvda ochiq aytilgan); Anexo 4 bo'yicha ichki transport.
- **Maydonlar:** ikki xil tarif → `award NULL (variable)`, `amount_usd_value = 0`. GPA kamida 85/100 (8,5/10, Meksika ekvivalenti) faqat harakatlanish/magistratura uchun va qabul xati orqali tasdiqlanadi → `min_gpa = NULL` (matnda). Til talabi: ispan tili CEFR B2 sertifikati (ona tili ispan bo'lmaganlarga) yoki boshqa tildagi dasturda mezbon muassasaning yozma repetitorlik majburiyati → `min_ielts = NULL`.
- **Davr:** SIGCA ro'yxati 2026-yil 21-may–22-iyun (o'tgan); natijalar 6–10 iyul; boshlanish avgust–10 noyabr → `deadline_date = NULL`, `not_published`, `closed`, rounds yozildi. `application_url = sigca.sre.gob.mx`.

### 934 — Thailand International Postgraduate Programme (TIPP)
- **Dastur:** TICA (TIV) ning 1999-yildan (birinchi kurslar 2000-yil) beri ishlayotgan magistratura dasturi; har bir davlat bitta dasturga 3 tagacha nomzod ko'rsatadi; nomzodlik National Focal Point orqali, hujjatlar Qirollik elchixonasi orqali TICA ga.
- **Moliyaviy paket (full-support, 2026 Guidelines):** tuition TICA tomonidan to'g'ridan-to'g'ri to'lanadi; yashash nafaqasi **7 000 THB/oy**; turar-joy nafaqasi **7 000 yoki 9 000 THB/oy**; kelish nafaqasi **6 000 THB** (bir marta); kitob nafaqasi **10 000 THB/yil**; dissertatsiya: tasdiqlangan dala ishlariga **20 000 THB gacha** + chop etishga **12 000 THB** (IS uchun 8 000); baxtsiz hodisa/kasalxona sug'urtasi; full-support davlatlari uchun borish-kelish ekonom aviabilet + Tailand vizasi to'lovi. Uy depoziti (~USD 300) qoplanmaydigan qism sifatida yozuvda tilga olindi.
- **Maydonlar:** ko'p komponentli paket (ikki xil turar-joy tarifi) → `award NULL (variable)`, `amount_usd_value = 0`. Yosh chegarasi 45; IELTS/TOEFL muassasa talabiga ko'ra → `min_ielts = NULL`; `min_gpa = NULL`.
- **Davr:** 2026 raundi uchun hujjatlar elchixonaga 23-fevral 2026 gacha (o'tgan) → `deadline_date = NULL`, `not_published`, `closed`, rounds yozildi.

### 935 — World in Serbia (Svet u Srbiji)
- **Dastur:** Serbiya hukumatining milliy ahamiyatdagi loyihasi (2010/2011 dan); Ta'lim vazirligi TIV bilan har yili konkurs e'lon qiladi; nomzod ishtirokchi davlat vakolatli organi tomonidan taklif etiladi; onlayn forma + `worldinserbia@prosveta.gov.rs` ga skanlar + diplomatik missiya orqali tasdiqlangan nusxalar.
- **Moliyaviy paket:** bitta o'quv darajasi uchun **bepul tuition** + **18 000 RSD/oy** + davlat talabalar shaharchasida **bepul turar-joy va ovqat** + kelganda **bepul intensiv serb tili kursi** + tibbiy sug'urta (26 yoshgacha majburiy; undan kattalarga ixtiyoriy, o'z polisi tavsiya qilinadi) + diplomlarni bepul tan olish. Qoplanmaydi: safar, shahar transporti, darsliklar, imtihon/ma'muriy to'lovlar, yashash ruxsati to'lovlari.
- **Maydonlar:** `award 18000 RSD/month fixed`, `living_allowance = 18000`, `amount_usd_value = 0`. Yosh chegaralari: <21 bakalavr, <25 magistratura, <35 doktorantura; doktoranturaga o'rtacha baho kamida 8,5 → `min_gpa = NULL` (matnda). Ingliz **yoki** serb tili kamida A1 → `min_ielts = NULL`.
- **Davr:** 2026 konkursi (2026/2027 til yili → 2027/2028 qabul) 18-may–1-iyun 2026 (o'tgan) → `deadline_date = NULL`, `not_published`, `closed`, rounds yozildi.

**Umumiy:** barchasi `verification_status = verified`, `source_reliability = 10`, `is_active = true`, `amount_usd_value = 0` (USD denominatsiyalanmagan). `university_scholarships` qatorlari qo'shilmadi — uchtasi ham ko'p-muassasali hukumat dasturi.

---

## 3. Yon jadvallar

- `sources` 3068–3070 (barchasi `is_official = true`, `is_verified = true`) qo'shildi (bitta `INSERT ... RETURNING id, url` bilan) va `scholarship_sources` orqali bog'landi: **933→3068** (`gob.mx`), **934→3069** (`tica-thaigov.mfa.go.th`), **935→3070** (`prosveta.gov.rs`).

## 4. Hisoblagichlar (hard-check)

```
faol 535 → 538 (+3) | nafaqadagi 149 | faol rel4 91 (o'zgarmadi) | UK rel4 0 | kelajakdagi deadline 165 (o'zgarmadi)
```

## 5. Tekshiruvlar

`tsc --noEmit` ✅ · `check:i18n` ✅ (`t()` 3310, o'tdi) · `test:render` ✅ 337/337.

## 6. Tayvan bo'yicha hujjatlashtirilgan xulosa

- **ICDF:** 2026 qo'llanmasidagi ro'yxatda O'zbekiston yo'q; Osiyo–Tinch okeani va G'arbiy Osiyo bo'limlarida Markaziy Osiyo davlatlari umuman berilmagan; qo'llanma savol-javobi ro'yxatdan tashqaridagilar ariza bera olmasligini aytadi.
- **MOFA:** rasmiy yo'riqnomada muvofiqlik "Tayvan bilan diplomatik munosabatlari bor yoki MOFA tomonidan do'stona deb tan olingan davlatlar" qilib belgilangan va diplomatik ittifoqchilar ro'yxatiga havola berilgan. O'zbekiston bu ro'yxatda emas; "do'stona" toifasiga kiritilgani haqida rasmiy ro'yxat topilmadi — tahminiy yozuv yaratilmadi.
- **MOE Taiwan Scholarship** alohida dastur sifatida e'tiborga olindi, ammo bu batch doirasida audit qilinmadi → Batch 9 nomzodi sifatida qoldirildi.

## 7. Keyingi qadamlar

- **Pass 102 (cleanup):** Kanada klasteri (faol rel4 = 11 ta, eng kattasi).
- **Batch 9 (additions):** MOE Taiwan Scholarship (kanal tekshiruvi bilan) va boshqa hali kataloglanmagan yillik hukumat dasturlari nomzodlari.
- Katalog vazifalari: Adelaide University yozuvi + 328 relink; Flinders yozuvi + 442 relink.
