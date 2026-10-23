# To'liq o'quv katalogini yig'ish (`programs`) — holat va qo'llanma (2026-10-23)

## 1. Nima uchun PDFdagi "11 ta dastur" yozilmadi

`top_universities_programs_qs_rankings_master.pdf` 3-bo'limi har bir universitetga **bir xil** 11 ta
dasturni beradi: 4 ta arxetip (COMPREHENSIVE / STEM_TECH / ECON_BUSINESS / MEDICAL_LIFE) bo'yicha
tayyor ro'yxat. Tekshirilganda:

* dastur nomlari universitetning **haqiqiy katalogidan** olinmagan — profil bo'yicha shablon
  (masalan har bir "Kompleks" universitetda bir xil 11 ta nom);
* PDFdagi SQL `official_url = sayt || '/programs'`, `application_url = sayt || '/apply'`,
  `source_url = sayt || '/admissions'` — **uydirma deep-link** (avvalgi qaror: bunday URL yozilmaydi);
* ilova universitet sahifasida `programs`ning hammasini filtrsiz ko'rsatadi
  (`src/app/api/universities/[id]/route.ts`), ya'ni shablon qatorlar haqiqiy dasturlar bilan
  aralashib, foydalanuvchini chalg'itadi.

Shu sababli 11 talik to'plam **bazaga qo'shilmadi**. Buning o'rniga PDFning 4-vazifasidagi to'g'ri
yo'l — research-agent bilan har bir universitetning o'z katalogini o'qish — kodga ulandi.

## 2. Hozirgi holat (2026-10-23)

```
programs                 3008   (200 ta universitetda 12–26 tadan haqiqiy dastur)
programs = 0                 4   (id 213 CTU, 214 WIUT, 215 IUT, 216 NewUU)
programs = 1 (umumiy)      160   (PDF importidagi "Undergraduate Degree Programs (BSc/BA/BEng)" qatori)
```

Ya'ni 164 ta universitetda **hali to'liq katalog yo'q**. Bu qatorlar "dasturi bor" deb ko'rinmasligi
uchun ularning mavjud yagona yozuvi umumiy nom bilan turadi.

## 3. Nima qilindi (kod)

**`scripts/seed-programs.ts`** (yangi) — research-agentni ommaviy ishga tushiruvchi CLI:

```bash
npm run db:seed:programs                  # dasturi < 2 ta bo'lgan barcha universitet
npm run db:seed:programs -- --limit 25    # birinchi 25 tasi
npm run db:seed:programs -- --ids 213,215,216
npm run db:seed:programs -- --dry-run     # hech narsa yozmaydi, faqat tekshiradi
```

Ishlash tartibi (`src/lib/research-agent/`):

1. agent universitetning `/programs`, `/courses`, sitemap sahifalarini topadi (faqat shu domen);
2. har sahifadan AI bilan dastur nomi, daraja, davomiylik, til, tuition, URL ajratadi;
3. ishonch `AGENT_CONFIG.writeConfidence = 0.7` dan past bo'lsa **`verification_status = 'review_required'`**
   va `is_verified = false` bilan yozadi (ya'ni noto'g'ri ma'lumot "tasdiqlangan" bo'lib ko'rinmaydi);
4. Telegram bot orqali adminga tasdiqlash so'rovi ketadi (mavjud oqim);
5. `programs` + `program_requirements` + `program_sources` jadvallariga yoziladi.

Xarajat nazorati `src/lib/research-agent/config.ts` da: `aiMaxCallsPerRun = 24`,
`maxPagesDefault = 8`, `batchDelayMs = 1500` — ya'ni bitta universitet uchun cheklangan.

## 4. Nima uchun buni men hozir ishga tushira olmadim

Bu muhitda (sandbox) **faqat ruxsat etilgan domenlarga** chiqish bor (github, npm, pypi).
Universitet saytlari ochilmaydi:

```
$ curl -sI https://www.mit.edu   → ulanmadi (000)
$ curl -sI https://wiut.uz       → ulanmadi (000)
```

Agent esa aynan shu saytlarga borishi kerak. Shuning uchun katalog yig'ish **internetga chiqadigan
muhitda** (sizning serveringiz, `npm run start` turgan joy yoki lokal kompyuter + `.env` dagi DB URL)
bajarilishi shart.

## 5. Qanday ishga tushiriladi (serverda)

```bash
# 1) DB ulanishi va AI kalitlari .env da bo'lishi kerak (DATABASE_URL yoki Supabase sozlamalari)
npm install
npm run db:seed:programs -- --limit 5 --dry-run   # avval 5 tasida sinab ko'rish
npm run db:seed:programs -- --limit 5             # haqiqiy yozish
npm run db:seed:programs                          # qolganlarini ketma-ket
```

Tavsiya: 25–50 tadan guruhlab yurish (AI xarajati va Telegram tasdiqlar oqimini kuzatish oson bo'ladi).

Tekshirish:

```sql
SELECT university_id, count(*) FROM public.programs GROUP BY 1 ORDER BY 2 ASC LIMIT 20;
SELECT count(*) FROM public.programs WHERE verification_status = 'review_required';
```

## 6. Muqobil variantlar

* **Qo'lda** — admin panel → universitet → Programs: har bir dasturni kiritish (1000+ dastur uchun noqulay).
* **CSV import** — agar sizda universitet kataloglari CSV/Excel'da bo'lsa, `data/university-import.template.json`
  formatiga keltirib import qilish mumkin (o'sha formatda `programs` massivi bor).
* **Agent** (tavsiya etiladi) — yuqoridagi skript.

## 7. Bog'liq hujjatlar

* `docs/QS2026_RANK_VERIFICATION_2026-10-23.md` — PDF tekshiruvi, QS 2026 tuzatishlari, rasm/11-dastur qarorlari.
* `docs/UNIVERSITIES_MISSING_RANK_IMAGE_PROGRAMS_2026-10-23.md` — qaysi universitetda nima yetishmayapti.
* `supabase/campus_images_wikimedia_2026-10-23.sql` — qo'shilgan 93 ta rasmning manbalari.
