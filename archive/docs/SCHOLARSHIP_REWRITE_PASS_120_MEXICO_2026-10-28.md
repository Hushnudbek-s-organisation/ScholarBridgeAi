# Scholarship Rewrite Pass 120 — Meksika klasteri (UNAM 343 + Tec de Monterrey 402 tozalash; 679 va 707 rel 10 ga ko'tarish)

**Sana:** 2026-10-28
**Natija:** 343 va 402 pensiyaga chiqarildi; 679 (Tec) rel 7→10, 707 (UNAM Elisa Acuña) rel 8→10.

## Tekshirilgan rasmiy sahifalar (birinchi qo'ldan fetch qilindi)

1. **Tec de Monterrey** — `tec.mx/es/becas-y-creditos-educativos-para-alumnos-internacionales` (yangi manba **3128**). Sahifa menyusi va bo'limlari o'qildi: Beca Socioeconómica LATAM, Beca al Talento Académico LATAM, Beca Líderes del Mañana LATAM, talent bekalar (Atlético, Artístico, Liderazgo, Emprendedor, Creativo, Transformador), tashqi kreditlar (AQSh federal loanlari, GI Bill), Inversión Educativa TEC.
2. **402 ning saqlangan URL i** `tec.mx/en/scholarships` — fetch natijasi: **404** («Página no encontrada»).
3. **UNAM Portal de Becas** — `becas.unam.mx/.../becas-para-estudios-de-posgrado-en-la-unam-convocatoria-2027-1/` (yangi manba **3127**) — Elisa Acuña dasturi doirasidagi 2027-1 chaqiruvi to'liq o'qildi.

## Qarorlar

### 402 — PENSIYA («…Moss» buzilgan nomli dublikat)

- Sarlavhadagi «Moss» — importer artefakti, hech bir Tec mukofotining nomi emas; saqlangan ingliz URL hozir 404 berdi. Real kontent 679 yozuvida bor.
- `is_active=false`, `application_status='closed'`, rel 9, izohli sarlavha; `university_id` to'g'ri atributsiya uchun **226** (Tec katalog qatori) etib belgilandi; ildiz manba 2626 audit uchun saqlandi. us qatori yo'q edi.

### 679 — UPLIFT rel 7 → 10 (Tec de Monterrey Scholarships for International Students)

Fetch qilingan ispan sahifasi asosida tuzatishlar:

- **Halol geografik doira**: uchta bosh mukofot faqat **Lotin Amerikasi** uchun — Socioeconómica LATAM (ehtiyojga asoslangan %; test ≥1,220 yoki konvertatsiya qilingan SAT ≥1,320; baho ≥85/100; MXN 750 to'lov; MXN 9,000/15,000 avans), Talento Académico LATAM (30/40/50/60/70% merit; 21 mamlakat ro'yxati; baho ≥90/100; test ≥1,300), Líderes del Mañana LATAM (100%; **8 mamlakat** — Nikaragua ro'yxatda yo'qligi tuzatildi; ijtimoiy loyiha dalili; reciprocity majburiyati). `eligible_countries ["All"]` o'rniga aynan shu doira kiritildi.
- Talent bekalar sahifada milliy cheklovsiz berilgan — matnda ajratib ko'rsatildi; kredit yo'llari grant emasligi belgilandi.
- `award_basis 'range'` → `'variable'`; status `'unknown'` → `'upcoming'` + yillik chaqiruv rounds shabloni (sahifadagi taqvimlar 2022–23 chaqiruvlariniki — joriy qat'iy sana kodlanmadi); `financial_need_based=true` (bosh sxemalardan ikkitasi ehtiyojga bog'liq), `min_gpa`/`min_ielts` NULL qoladi (85/90 baho va test chegaralari matnda).
- Manba 3128 yaratilib bog'landi (ilgari manba havolasi yo'q edi). us **197** sinxronlandi (Nikaragua qo'shildi, `availability_status 'Yes'`→`'available'`).

### 343 — PENSIYA (umumiy importer «soyabon» yozuvi)

- «UNAM International Postgraduate Scholarship» nomli mukofot UNAM da mavjud emas; saqlangan URL — Posgrado portali ildizi. Real kanallar katalogda bor: **707** (Elisa Acuña CGEP stipendiyasi) va **933** (AMEXCID, rel 10).
- `is_active=false`, rel 9, izohli sarlavha; us **471** o'chirildi; ildiz manba 2656 saqlandi + audit uchun (343, 3127) havola qo'shildi.

### 707 — UPLIFT rel 8 → 10 (UNAM Becas para Estudios de Posgrado / Elisa Acuña)

Fetch qilingan 2027-1 chaqiruvi asosida:

- Yangi kiruvchi, to'liq kunlik (presensial) magistratura/doktorantlarga oylik stipendiya: **4.5 UMA (magistr) / 6.0 UMA (doktor)** — summalar UMA da qotirib yozilgan; peso/USD miqdor kodlanmadi (award NULL, MXN/`month`/`variable`).
- Status `'closed'` → `'upcoming'` (sxema har semestr chaqiruv beradi; yopilgan faqat 2027-1 sikli: 2026-yil 10–14 avgust); `deadline_type 'range'` → `'not_published'` + rounds (yopilgan sikl + semestr shabloni).
- Minimallar: qat'iy GPA minimum va IELTS chaqiruvda yo'q → NULL. Hujjatlar fetch dan aniqlandi: semestr yozuvi, oldingi bosqich sertifikati (baho bilan), SIAAPosgrado forma + majburiyat xati, bank hisob varag'i ≤3 oy, tasdiqlangan CURP, SAT holati to'g'risidagi hujjat **faqat ro'yxatdan o'tgan bo'lsa** (shartliligi tuzatildi), ish daromadi ≤8 soat/hafta qoidasi va boshqa shu maqsadli qo'llab-quvvatlovning bo'lmasligi.
- Chet elliklarga: chaqiruv matnida meksika fuqaroligi sharti yo'q, lekin dastur federal Elisa Acuña (DOF qoidalari — fetch qilinmadi) va CURP talab etiladi → «CGEP bilan tasdiqlang» eslatmasi qat'iy saqlandi; chet elliklar kanali — 933. us **88** sinxronlandi.

## Yon-jadvallar va texnik yozuvlar

- Yangi manbalar: **3127** (UNAM chaqiruv), **3128** (Tec sahifa). Havolalar: (343, 3127), (707, 3127), (679, 3128).
- `university_scholarships`: us **197** va us **88** yangilandi, us **471** (343) o'chirildi. Birinchi urinishdagidek xato: `details_url` ustuni mavjud emas (42703) — `information_schema` dan haqiqiy 16 ustun olindi (`availability_status`, `official_url`, `max_scholarship` = matnli miqdor tavsifi) va yangilanishlar to'g'ri ustunlar bilan qayta bajarilib, RETURNING bilan tasdiqlandi. Bu tuzatish replay SQL da izoh bilan aks ettirilgan.
- `setval('sources_id_seq', 3128)`.

## Tasdiqlangan hisoblagichlar

- **551 active / 184 retired / 13 active rel-4 / 196 future-dated**; max idlar: scholarships 987, sources 3128, us 710.
- Meksika rel-4 qoldig'i: 0 (343/402 tozalandi).
- Lokal tekshiruvlar: typecheck / i18n / render — **337/337**.

## Qoidaga muvofiqlik

- Uydirma miqdor yoki deadline kiritilmadi: barcha foizlar, chegaralar (1,220/1,300 ball; 85/90 baho), MXN to'lov/avanslar, UMA me'yorlari va 2027-1 oynasi fetch qilingan rasmiy sahifalardan; o'tgan/eski taqvimlar joriy sana sifatida kodlanmadi.
- Lotin Amerikasi cheklovi yashirilmaydi: 679 dagi uch bosh mukofot Markaziy Osiyo uchun yopiq ekani boricha ko'rsatildi; «All» degan yolg'on yorliq olib tashlandi.
- 707 uchun millat taqiqlari haqida fetch qilinmagan DOF qoidalaridan biror da'vo qilinmadi — na «faqat meksikalikaliklar», na «hammaga ochiq».

## Replay

`supabase/scholarship_rewrite_pass120_mexico_2026-10-28.sql` — amalda bajarilgan barcha bayonotlar (xatolangan birinchi us-yozuvlari haqida izoh bilan).

## Keyingisi

- **Batch 27** — yangi qo'shimchalar (alternatsiya tartibi bo'yicha).
- Pass 121 nomzodi: Chili 467/879. Rel-4 qoldig'i: 13 (Chili 467/879 + yakka yozuvlar: Argentina 400, Braziliya 401, Kolumbiya 403, Chexiya 876, Indoneziya 398, Malayziya 339, Rossiya 466, Sloveniya 404, Janubiy Afrika 503, Tayvan 342, Tailand 502).
