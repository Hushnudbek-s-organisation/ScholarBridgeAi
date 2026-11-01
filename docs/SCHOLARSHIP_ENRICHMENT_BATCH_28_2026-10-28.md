# Enrichment Batch 28 — Helsinki 742 rel 10 + yangi ANID Doctorado Nacional (990); Chalmers 421 yana “not yet updated”

**Sana:** 2026-10-28
**Natija:** 742 rel 9→10; **yangi yozuv 990** — Beca de Doctorado Nacional (ANID, Chili); 421 bazada o'zgarishsiz (sabab quyida).

## Tekshirilgan rasmiy sahifalar (birinchi qo'ldan fetch qilindi)

1. **University of Helsinki** — «Tuition fees and scholarship programme» sahifasi (mavjud manba 2536) + «Apply to International master's programmes» sahifasi.
2. **ANID** — bosh sahifa → «Beca de Doctorado Nacional Año Académico 2027» konkurs sahifasi (yangi manba **3133**) + **Bases Concursales (Resolución 433/2026) PDF** 1–7-§ lari (yangi manba **3134**).
3. **Chalmers** — stipendiyalar sahifasi qayta fetch qilindi.

## Qarorlar

### 742 — UPLIFT rel 9 → 10 (University of Helsinki Scholarship Programme)

- **Haqiqiy oyna:** 2027 kuzgi qabul uchun ariza **2027-yil 5–19-yanvar** (Studyinfo); stipendiya so'rovi shu formadayoq — demak `deadline_date = 2027-01-19`, `fixed`, status `upcoming`. Ilgarigi `'annual'`+sanasiz holat tuzatildi.
- **Uydirma minimallar olib tashlandi:** `min_gpa 3.3` / `min_ielts 6.5` importer qoldig'i → NULL (xuddi 739 dagi kabi).
- **Mablag' kodlanishi normallashtirildi:** `award 18,000 EUR 'range'` (eng qimmat dasturning to'lovini mukofot qilib ko'rsatardi) → `NULL EUR/'year'/'variable'`. To'lovlar 13/15/18 ming EUR; waiver 50%/100%, aksariyati 50%, soni juda cheklangan, ayrim dasturlar faqat 50% beradi.
- `application_fee = 100` (2025-yil 1-yanvardan umummilliy to'lov; waiver yo'q) kodlandi; `accommodation ''` → NULL.
- Fetchdan qo'shildi: ingliz bakalavriga waiver **yo'q** (faqat 1,000 EUR Dean’s award); ichki UH bakalavr→magistr yo'li GPA qoidasi (3.8/5 → 100%, 3.4–3.7/5 → 50%) — matnda, `min_gpa` ga chiqarilmasdan; waiver yo'qolishi shartlari; scholarship agreement bosqichi; yashash xarajatlari qoplanmasligi qat'iy saqlandi; uchinchi tomonlardagi «Finland Scholarship + EUR 5,000» mish-mishi joriy sahifada yo'qligi bois olib tashlandi.
- Manba 2536 bog'landi (ilgari havola yo'q edi); us **182** sinxronlandi (`valued_aspect` dagi «High Grades & Finnish/Swedish» artefakti tuzatildi).

### 990 — YANGI YOZUV (Beca de Doctorado Nacional, ANID)

Pass 121 da nomzod sifatida qayd etilgan sxema; endi konkurs sahifasi + bases PDF (1–7-§) birinchi qo'ldan o'qildi.

- **Chet elliklarga ochiq:** bases §1 va §4.1 so'zma-so'z: «chilenas o extranjeras, **con o sin permanencia definitiva en Chile**» — doimiy yashash ruxsatisiz ham ariza topshiriladi. Shart: Chili universitetidagi CNA-akkreditatsiyalangan doktoranturaga rasmiy ariza/qabul/akademik talaba maqomi; o'qish eng kech **2027-yil 31-avgust**dan boshlanishi.
- **Imtiyozlar (§6, DS 335/2010, IPC indeksatsiyasi):** manutención **yiliga CLP 7,800,000 gacha** (oylik bo'lib to'lanadi), arancel/matrícula **yiliga CLP 2,700,000 gacha** (universitetga to'g'ridan-to'g'ri, hisob-faktura bo'yicha — bu chegara), sog'liq sug'urtasi **CLP 407,880 gacha/yil**, farzandiga 5% qo'shimcha, 4 yilgacha + dissertatsiya uchun ≤6 oy uzaytirish. Summalar matnda; `award NULL CLP/'year'/'variable'`.
- **2027 konkurs hozir OCHIQ:** 2026-yil 9-oktabrda ochilgan, arizalar va tavsiyanomalar **2026-yil 27-noyabr 13:00** (Chili vaqti) gacha; natijalar 2027-yanvar; **1,000 tagacha** beka ko'zda tutilgan → `deadline 2026-11-27`, status `open`.
- Tanlov: bakalavr bahosi/reytingi parametrlangan ball + komissiya bahosi; akademik pol — Chili shkalasi bo'yicha **5.0/7.0** yoki reytingda top-30% (matnda, `min_gpa` NULL). OEA ning US$1,200 qo'shimchasi faqat OEA a'zolariga — O'zbekistonga tegishli emasligi ochiq yozildi.
- Amaliyot: jarayon ispan tilida (SPL), to'lovlar Chili bank hisobiga (Cuenta RUT), konvensiya oldidan TGR (CAE qarzi yo'qligi) sertifikati 2027-dan yangi talab. `university_id NULL` (milliy agentlik), us qatori yo'q.

### 421 — Chalmers: yana kuzatuvda, bazada yozuvsiz

Sahifa 2026-10-28 da qayta fetch qilindi — «not yet updated with the information regarding Chalmers scholarships offered in 2027 admission round» izohi **hamon turibdi**. Batch 27 da qayta-tekshiruv izohi yozilgan edi; bu safar bazaga tegilmasdan, faqat shu hujjatda qayd etildi. Portal noyabr oxirida ochilganda rel 10 masalasiga qaytamiz.

## Tasdiqlangan hisoblagichlar

- **552 active / 186 retired / 11 active rel-4 / 199 future-dated**; max idlar: scholarships 990, sources 3134, us 711.
- Lokal tekshiruvlar: typecheck / i18n / render — **337/337**.

## Qoidaga muvofiqlik

- Uydirma miqdor/deadline yo'q: Helsinki oynasi (5–19-yanvar 2027) va ANID sanalari/summalari (7.8M/2.7M/407,880 CLP; 27-noyabr 2026; ~1,000 o'rin) fetch qilingan rasmiy sahifa va bases PDF dan; oylik arifmetika kodlanmadi (yillik chegaralar boricha).
- Qo'shimcha imtiyozlar (kotutela/pasantiya) Anexo summalari o'qilmagani uchun faqat nomlari bilan qayd etildi; OEA foydasi doirasi yashirilmadi.
- ANID yozuvi `open` statusda qo'yildi — 27-noyabrdan keyin status yangilanishi navbatdagi passlarda kuzatiladi (yozuv izohida qayd etilgan).

## Replay

`supabase/scholarship_enrichment_batch28_2026-10-28.sql` — amalda bajarilgan barcha bayonotlar.

## Keyingisi

- **Pass 122** — rel-4 juftligi (masalan, Argentina 400 + Braziliya 401).
- Navbatda: Chalmers 421 (sahifa yangilanishi bilan); ANID Magíster Nacional alohida tekshiruv bilan qo'shimcha nomzodi; Universidad de Chile 710 (rel 9) uplift nomzodi; 967 deadline konsistensiyasi.
