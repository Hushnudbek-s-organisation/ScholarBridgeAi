# Boyitish Batch 30 (2026-10-28) — Sloveniya Young Researchers (yangi 992), Universidad de Chile 710 uplift, PEC-PG keyinga qoldirildi

## Mazmun

Batch 30 ikkita dalilga tayangan birlik keltirdi: (1) Pass 123 da navbatga qo'yilgan **Sloveniya young-researcher tizimi** Ljubljana Universiteti marshruti bo'yicha alohida yangi yozuv **992** sifatida qo'shildi (pensiyaga chiqarilgan ixtiro 404 jonlantirilmadi); (2) uzoq vaqtdan beri navbatda turgan **710 Universidad de Chile** rel 9 → 10 ga ko'tarildi (rasmiy chaqiruv sahifasi to'liq qayta o'qildi, importer minima olib tashlandi). **Braziliya PEC-PG** baholandi, lekin hamkor-davlatlar ro'yxati birinchi qo'lda aniqlanmagani uchun **keyinga qoldirildi** (rad etilmadi) — 730 da eslatma sifatida qoldi.

| Yozuv | Harakat | Natija |
|---|---|---|
| `992` Young Researchers — University of Ljubljana | **YANGI** | Sloveniya, PhD, bandlik modeli, rel 10 |
| `710` Universidad de Chile Doctoral Stipend… | Uplift | rel 9 → rel 10 |
| us `274` (UChile katalog qatori) | Sinxron | 'Yes' → 'available', matn yangilandi |
| PEC-PG (CAPES/MRE) | **Keyinga qoldirildi** | Hamkorlik davlatlari aniqlanmadi |

Sanag'ichlar: **549 → 550 faol / 190 pensiyaga chiqqan / 7 rel-4 / 199 kelajak deadline**. Max id: scholarships 992, sources 3141, university_scholarships 711, links 410. Lokal tekshiruvlar **337/337**.

## Dalillar (2026-10-28 da bevosita o'qilgan)

### 992 — Young Researchers (UL)

- **UL "Young researchers" sahifasi, chunk 1** (chunk 0 Pass 123 da o'qilgan; manba **3139** qayta ishlatildi) + **"Doctoral study" sahifasi** (manba **3140**):
  - Bandlik: muddatli mehnat shartnomasi **4 yil** (2-kursdan boshlasangiz 3 yil); maosh **22-toifa = 2 332,62 EUR brutto/oy** (sahifadagi raqam; davlat sektoridagi nomutanosibliklarni 2028-yilgacha bartaraf etish hisobga olingan) + tushlik/safar xarajatlari qoplovi; ish beruvchi (UL a'zosi) **tuitionni to'liq qoplaydi** va tadqiqot mablag'ini beradi.
  - Tenderlar: birinchi chaqiruv **har yili 15 martda** e'lon qilinadi (2026: 16 mart → **8 may**); ikkinchi chaqiruv bo'lishi mumkin (2026: 1 sentabr → **10 sentabr**); ikkalasi ham "Completed".
  - Shartlar: ikkinchi bosqich (magistratura) tugaganiga **≤4 yil** (2026 uchun 2022-01-01 dan; ota-ona ta'tili/uzoq kasallik uzaytiradi); ikkinchi bosqich o'rtacha bahosi **≥8.00** (faqat raqamli baholangan majburiyatlar, diplom ishi ham kiradi — sloven shkalasi, shuning uchun faqat matnda) + "assistant" unvoni shartlari; tugallangan doktorantura va avvalgi young-researcher bandligi bo'lmasligi; **yosh chegarasi yo'q**. Ishga kirishda: UL doktoranturasining 1-/2-kursiga yozilish, assistant habilitatsiyasi, **ARIS registri**, rahbar bilan bitta tadqiqot dasturi, to'liq stavka, butun davr talaba maqomi.
  - Ariza ikki parallel yo'ldan: mentor bo'yicha tender (har bir mentorga alohida ro'yxat) + **eVŠ** portali orqali doktoranturaga yozilish. FAQ chetda/ULdan tashqarida o'qigan nomzodlarni aniq nazarda tutadi (diplom ilovasi + rasmiy baholar shkalasi) — fuqarolik sharti sahifalarda ko'rinmadi.
- Kodlash: bitta rasmiy brutto raqami o'tish davri/toifa ko'rsatkichi bo'lgani uchun matnda qoldi (`award NULL, EUR, month, variable`); status `upcoming` + `not_published` + rounds; `universities` da UL qatori yo'q → university_id NULL (backlog: universitet yozuvi/backlink yaratish). ARIS-darajasidagi chaqiruv tuzilmasi, JSI va til shartlari o'qilmadi — tasdiqlanmadi.

### 710 — Universidad de Chile uplift

- Rasmiy **Beca de Doctorado UChile** sahifasi, **ikkala chunk** (yangi manba **3141**):
  - 2026 sikl: **CLP 900 000/oy × 12 oy (2026 mart–2027 fevral) + aranceldan to'liq ozodlik** (matrícula bundan mustasno — avvalgi o'qishda bo'lmagan yangi tafsilot); yangilanish — sertifikatlangan progress + **har yili ANID ga majburiy ariza**; ANID yutilsa, benefit birinchi ANID to'lovida avtomatik to'xtaydi.
  - 5 ta talab: 1–2-kurs muntazam doktorant; so'nggi ANID konkursiga ariza; boshqa moliya manbai yo'q; deklaratsiya (21.369/20.066/20.609 + aliment qarzdlar registri); dastur CNA akkreditatsiyasi **≥6 yil** (yangi dasturlar/improvement-plan istisnolari bilan). Tanlov: har bir dasturdan ko'pi bilan 2 nominatsiya (grad school orqali); 50% gender balansi qoidasi.
  - Oyna: 2026-yil **15 yanvar** ochilgan, topshirish **6 mart 18:00** gacha, dastlabki natijalar aprel oxiri. Hujjatlar ro'yxati 01–09.
- Tuzatishlar: importer `min_gpa=3.3 / min_ielts=6.5` olib tashlandi (qatorning o'z matni ham "alohida ball yo'q" der edi); award bitta siklning fixed 900 000 idan `NULL CLP month variable` ga normalizatsiya qilindi (ko'p komponentli yozuv: stipendiya + ozodlik + foizli rebatelar); deadline `not_published/upcoming + rounds`; birinchi manba linklari qo'shildi (ilgari umuman yo'q edi). 2026-10-25 o'qishlaridan qayta o'qilmasdan saqlanganlar: fakultet rebatelari 50/75/90/100%, SYLFF-UChile (dekabr), OAS/Nelson Mandela/AGCID O'zbekistonga yopiqligi, konchilik doktoranturasi 800 UF misoli (endi sana bilan kvalifikatsiya qilingan). us **274** sinxronlandi.

### PEC-PG — nega keyinga qoldirildi

CAPES xalqaro bo'limi indeksi o'qildi: dasturlar hamkor-davlatlar bo'yicha tartiblangan (asosan braziliyaliklarning chiquvchi dasturlari); PEC-PG ning to'g'ri sahifasi va eng muhimi — **hamkor davlatlar ro'yxati (O'zbekiston kiradimi?)** — bu batchda birinchi qo'lda aniqlanmadi (taxminiy slug 404 qaytdi). Eligibilitet aniqlanmasdan yozuv qo'shilmaydi; PEC-PG 730-yozuvda termsiz eslatma sifatida qoladi. Keyingi urinishda CAPES ning "Multinacional" bo'limi yoki amaldagi edital dan boshlash kerak.

## Kodlash qarorlari

- Uydirma miqdor yoki deadline kiritilmadi; USD ga aylantirish yo'q (`amount_usd_value=0`).
- Bandlik modeli (992) va ko'p komponentli in-programme yozuv (710) uchun ham yagona raqamlar matnda, `award_amount NULL` + valyuta/davr/`variable`; shkala-maxsus minimumlar (Sloveniya 8.00; Chili shartlari) faqat matnda, `min_gpa/min_ielts NULL`.
- Sidebar: 421 Chalmers bu batchda qayta tekshirilmadi (Batch 29 da uchinchi tekshiruvda banner o'zgarmagan edi; kuzatuvda qoladi). 990 statusi 2026-11-27 dan keyin yangilanadi.

## Fayllar

- `supabase/scholarship_enrichment_batch30_2026-10-28.sql` — bajarilgan operatorlarning qayta tiklanishi (manba 3141, 710 UPDATE, 992 INSERT, linklar 408–410, us 274 UPDATE, setval).
