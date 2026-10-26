# Scholarship Rewrite — Pass 101 (UK klasteri, 2-qism: 12 ta "named award unconfirmed" yozuvi retire qilindi)

**Sana:** 2026-10-26
**Reja:** 1 cleanup → 1 additions, navbatma-navbat. Bu — Batch 7 (additions) dan keyingi cleanup bosqichi; Pass 100 dagi UK klasterining davomi va yakuni.

---

## 1. Muammo

Pass 100 dan keyin UK klasterida 12 ta `source_reliability = 4` yozuvi qolgandi. Ular oldingi passlarda allaqachon "(named award unconfirmed)" deb belgilangan (coverage `Unspecified`, miqdorlar NULL), lekin **`is_active = true` va aksariyati `application_status = open`** holatda katalogda haqiqiy ochiq stipendiya kabi ko'rinardi. Pass 101 da har birining saqlangan URL i rasman qayta fetch qilindi — **barchasi** direktoriya / kurs katalogi / 404 ekani tasdiqlandi. Doimiy qoida bo'yicha (umumiy funding-katalog yozuvlari bitta stipendiya sifatida ko'rsatilmaydi, retire qilinadi) 12 tasi ham retire qilindi: `is_active = false`, `application_status = closed`, `source_reliability = 9` (topilma o'zi tasdiqlangan), sarlavha "...(retired: ...)", notes ga `RETIRED 2026-10-26 (cleanup pass 101)` yozildi, yozuvlar audit uchun saqlab qolindi.

## 2. Fetch natijalari (har bir URL 2026-10-26 da qayta ochilgan)

| ID | Universitet | Saqlangan URL holati (fetch) | Boshqa tasdiqlangan yozuv |
|---|---|---|---|
| 368 | Aston | `aston.ac.uk/courses` — kurs katalogi ("309 courses found") | Yo'q |
| 369 | Bath | `bath.ac.uk/postgraduate/research/funding/` — **404 "File not found"** | 542 (rel 9) |
| 383 | Leicester | `le.ac.uk/.../funding/` → yangi manzilga redirect, o'zi **404** | 744 (rel 8) |
| 384 | UEA | `uea.ac.uk/.../funding/` — **"Page not found"** | Yo'q |
| 385 | Liverpool | `liverpool.ac.uk/study/postgraduate-research/` — umumiy PGR hub | Yo'q |
| 387 | Essex | `essex.ac.uk/scholarships` — "Scholarships and bursaries" direktoriya hubi | Yo'q |
| 388 | Kent | `kent.ac.uk/scholarships` — direktoriya (UG/PG qidiruv, sport/musiqa, kreditlar); ko'rilgan yagona mukofot — Kent bitiruvchilari uchun 20% alumni chegirma | Yo'q |
| 389 | Queen's Belfast | `qub.ac.uk/courses` — kurs qidiruv sahifasi (811 ta natija) | 658 (rel 10) |
| 390 | Portsmouth | `port.ac.uk/.../funding/` — **404** | Yo'q |
| 406 | Lancaster | `lancaster.ac.uk/.../fees-and-funding/` — umumiy fees hub + scholarship finder | 614 (rel 10) |
| 455 | KCL | `kcl.ac.uk/study/funding/funding-opportunities` — **404 "Page Not Found"** | Yo'q |
| 498 | QMUL | `qmul.ac.uk/scholarships/` — interaktiv mukofotlar bazasi hubi; sahifadagi yagona summa — 2025-yilgi video sarlavhasidagi £5,000 Global Talent (tasdiqlanmagan, avval yozib qo'yilgan) | 657 (rel 9) |

Hech birida ushbu yozuvga mos **nomlangan mukofot** tasdiqlanmadi. 5 ta universitet (Bath, Leicester, QUB, Lancaster, QMUL) katalogda tasdiqlangan yozuvlar orqali qamrab olingan; qolgan 7 tasi (Aston, UEA, Liverpool, Essex, Kent, Portsmouth, KCL) uchun notes da "individual sxemalar alohida tekshiruvdan keyingina qo'shiladi" deb yozildi — soxta "ochiq" yozuv o'rniga halol bo'shliq tanlandi.

## 3. Yon jadvallar

- `sources` 2488/2490/2564/2646/2566/2517/2552/2601/2592/2562/271/925 — barchasi faqat shu yozuvlarga bog'langani oldindan tekshirildi (har birida 1 ta link); bare-domain URL lar fetch qilingan dalil sahifalariga repoint qilindi, sarlavhalar audit izohi bilan yangilandi (404 URL lar faqat retire qilingan audit yozuvlarida saqlanadi — Pass 100 an'anasi).
- `university_scholarships` 602/145/464/27/662 — `availability_status` allaqachon `No`, `max_scholarship` allaqachon "No confirmed award..." edi; `scholarship_name` retired sarlavhalarga sinxronlandi, `last_verified_at` yangilandi.

## 4. Hisoblagichlar (hard-check)

```
faol 547 → 535 (-12) | nafaqadagi 137 → 149 (+12) | faol rel4 103 → 91 (-12) | UK rel4 12 → 0 ✅ | kelajakdagi deadline 165 (o'zgarmadi)
```

**UK faol rel4 = 0** — Buyuk Britaniya klasteri to'liq yopildi (Avstraliya kabi). Qoldiq 91 ta faol rel4 bo'yicha eng katta guruhlar: Kanada 11, Xitoy 7, Janubiy Koreya 6, Singapur 6, Shveysariya 6, Yangi Zelandiya 5, Shvetsiya/Finlyandiya/Fransiya/Belgiya 4 tadan, Gonkong/Avstriya/Daniya 3 tadan, Norvegiya/Hindiston 2 tadan (yuqori 15 talik jami 70; qolgan 21 tasi boshqa davlatlarda). Cleanup **tugamagan** — bu faqat UK bo'limining yakuni.

## 5. Tekshiruvlar

`tsc --noEmit` ✅ · `check:i18n` ✅ (`t()` 3310) · `test:render` ✅ 337/337.

## 6. Keyingi qadamlar

- **Batch 8 (additions):** Serbiya "World in Serbia", Meksika AMEXCID, Tailand TIPP, Tayvan MOFA/ICDF — har biri rasmiy chaqiriq + O'zbekiston muvofiqligi tekshiruvi bilan.
- **Pass 102 (cleanup):** Kanada klasteri (11 ta faol rel4) — eng kattasi.
- Katalog vazifalari: Adelaide University yozuvi + 328 relink; Flinders yozuvi + 442 relink.
