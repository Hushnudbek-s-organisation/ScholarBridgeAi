# Rewrite Pass 123 (2026-10-28) — Colombia 403 va Slovenia 404: ikkala ixtiro qilingan nom ham pensiyaga chiqarildi

## Mazmun

Pass 123 rel-4 ro'yxatidagi keyingi juftlikni — Colombia **403** ("UNAL Doctoral Scholarship for International Researchers") va Slovenia **404** ("University of Ljubljana International Doctoral Grant") — ko'rib chiqdi. Rasmiy sahifalar bevosita o'qilgach, **ikkala nom ham importer ixtirosi** ekani tasdiqlandi va ikkalasi ham rel 9 darajasida pensiyaga chiqarildi (Pass 122 shakli). Haqiqiy mexanizmlar bor, lekin ular bu yozuvlarning ayniyati emas: UNAL da — faqat o'z talaba/bitiruvchilari uchun ichki beca tizimi (tirik yozuv **712** da to'liq hujjatlashtirilgan), Ljubljanada — doktoranturaning to'liq bandlik (ish o'rni) modeli **Young researchers** (kelajakdagi qo'shimchalar batchi uchun nomzod sifatida navbatga qo'yildi).

| Yozuv | Harakat | Natija |
|---|---|---|
| `403` UNAL "Doctoral Scholarship for International Researchers" | **Pensiyaga chiqarildi** | Ixtiro qilingan nom; ichki tizim = yozuv 712 |
| `404` UL "International Doctoral Grant" | **Pensiyaga chiqarildi** | Ixtiro qilingan nom; haqiqat = Young researchers (bandlik) |
| us `665` (403 katalog qatori) | O'chirildi | Katalog tozalandi |
| Manba `3138` (UNAL becas sahifasi) | Qo'shildi, linklandi | (403,3138) + tirik 712 ga ham (712,3138) |
| Manbalar `3139/3140` (UL sahifalari) | Qo'shildi, linklandi | (404,3139), (404,3140); 2651 audit sifatida qoldi |

Sanag'ichlar: **551 → 549 faol / 188 → 190 pensiyaga chiqqan / 9 → 7 rel-4 / 199 kelajak deadline**. Max id: scholarships 991 (o'zgarishsiz), sources 3140, university_scholarships 711, links 407. Lokal tekshiruvlar **337/337**.

## Dalillar (2026-10-28 da bevosita o'qilgan)

### 403 — UNAL

- **posgrados.unal.edu.co/becas/** (yangi manba **3138**), chunk 0 va 5 (6 tadan):
  - Sistema Nacional de Becas = **becas internas** + **becas externas** (tashqi tashkilotlar UNAL da o'qish uchun taklif qiladigan).
  - Internas: **POSGRADO – GRADO DE HONOR** — UNAL bakalavriatida "Grado de Honor" olgan o'z bitiruvchisiga: avtomatik qabul, ma'muriy + akademik to'lovlardan to'liq ozodlik, kalendar semestriga 9 smmlv (ixtisoslashuv/magistr) yoki 15 smmlv (sog'liqni saqlash ixtisosligi/doktorantura); 2026-2 formallashtirish oynasi 15 iyun–31 iyul 2026; **ASISTENTE DOCENTE** (UNAL ning ro'yxatdan o'tgan doktorant/magistr talabalari uchun), **AUXILIAR DOCENTE**, **EXENCIÓN DERECHOS ACADÉMICOS**.
  - Externas (chunk 5): Fundación Juan Pablo Gutiérrez Cáceres convenio — UNAL ga qabul qilingan magistrantlarga (har semestr qo'llab-quvvatlash; 2025 chaqiriqda 3 kvota) va A Coruña (Ispaniya) ga chiquvchi mobillik bandi. Kiruvchi xalqaro tadqiqotchilar uchun hech qanday UNAL nomli mukofot yo'q.
- Tirik yozuv **712** (rel 8, xuddi shu universitet 190) aynan shu ichki tizimni 2026-10-25 da shu sahifadan to'liq qayta yozgan edi ("har bir ichki mukofot UNAL transkriptini talab qiladi; chet ellik talaba moliyalashtirilgan holda kelishi kerak"). Demak 403 qayta yozilmaydi — dublikat/ixtiro sifatida yopiladi.
- Tarix: uydirma $13,000 va "31 iyul yillik" deadline 2026-10-26 deklaratsiyasida allaqachon olib tashlangan edi; qator rel 4 placeholder bo'lib turgan edi.

### 404 — University of Ljubljana

- **UL "Doctoral study" rasmiy sahifasi** (yangi manba **3140**): "International Doctoral Grant" degan mukofot yo'q; moliyalashtirish **Young researchers** orqali ko'rsatilgan — "doctoral students working in UL member institutions in research programmes. Their doctoral tuition fees are fully covered, and their employer provides them with the material resources."
- **UL "Young researchers" rasmiy sahifasi** (yangi manba **3139**), chunk 0 (2 tadan): o'rinlar tender sifatida e'lon qilinadi, turi — **"Job application"**; 2026 da ikki chaqiruv (16 mart → **8 may**; 1 sentabr → **10 sentabr**; ikkalasi "Completed"). Shartlar: ikkinchi bosqich tugaganiga ≤4 yil; ikkinchi bosqich + diplom ishi o'rtacha bahosi **≥8.00** va "assistant" unvoni shartlari; tugallangan doktorantura yo'q; ilgari young researcher bo'lmagan. Bandlik shartlari: UL doktoranturasining 1- yoki 2-yiliga (2026/27) yozilish, assistant habilitatsiyasi, **ARIS** tadqiqotchilar registri, rahbar bilan bitta tadqiqot dasturi, to'liq stavka bandlik, butun davr davomida talaba maqomi. Ikki parallel ariza (tender — studij.uni-lj.si/mr; ro'yxatga olish — eVŠ portali). FAQ UL dan tashqarida va **chetda o'qigan nomzodlarni** aniq nazarda tutadi (diplom ilovasi + rasmiy baholar shkalasi).
- Qatorning saqlangan manzili **ijs.si** — Jožef Stefan Institute (boshqa muassasa) ga tegishli; uydirma $18,000 / "28 fevral yillik" 2026-10-26 da olib tashlangan. Importer manbasi 2651 (ul.uni-lj.si ildizi) audit sifatida qoldirildi.

## Qarorlar va kelajak navbati

- Ikkala qator ham Pass 122 retire shaklida: `is_active=false`, `application_status=closed`, `recurrence=none`, award oilasi to'liq NULL, tushuntiruv sarlavha, description/requirements pensiya izohiga almashtirildi, manba izi saqlandi (+ yangi birinchi qo'l manbalar linklandi). 403 da university_id=190 saqlandi, 404 da NULL qolaverdi.
- us **665** o'chirildi; 712 ning us 178 qatoriga tegilmadi. 712 qatorining o'ziga ham tegilmadi — faqat audit linki (712,3138) qo'shildi.
- **Navbat (qo'shimchalar batchi uchun, qayta yozish nishoni emas):** Sloveniya young-researcher (mladi raziskovalci) tizimini alohida yozuv sifatida baholash — ARIS moliyalashtiradigan bandlik (UL a'zolari, Jožef Stefan Institute va b.). Maosh miqdori, til shartlari va ARIS chaqiruv tuzilmasi birinchi qo'l o'qishni talab qiladi; bu yerda hech narsa tasdiqlanmadi.
- **Tasdiqlanmadi:** MinCiencias/ICETEX chet elliklarga oid shartlari bu passda o'qilmadi; hech qanday da'vo kiritilmadi.
- Uydirma miqdor yoki deadline kiritilmadi.

Qolgan rel-4 (7): Czechia 876, Indonesia 398, Malaysia 339, Russia 466, South Africa 503, Taiwan 342, Thailand 502.

## Fayllar

- `supabase/scholarship_rewrite_pass123_colombia_slovenia_2026-10-28.sql` — bajarilgan operatorlarning qayta tiklanishi (manbalar 3138–3140, 403/404 retire UPDATE, linklar 404–407, us 665 DELETE, setval).
