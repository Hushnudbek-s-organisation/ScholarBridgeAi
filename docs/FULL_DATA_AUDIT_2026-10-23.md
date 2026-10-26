# To'liq tekshiruv — 2026-10-23

**Savol:** bazada hato bormi? Muddatlar to'g'rimi? Ma'lumotlar to'g'rimi?

Javob: **jiddiy xatolar topildi va tuzatildi**. Quyida nima tekshirilgani, nima topilgani va
nima toza chiqqani.

---

## 1. Tuzatilgan xatolar

| # | Xato | Soni | Tuzatish |
|---|---|---|---|
| 1 | **Chet valyuta summasi USD ustuniga ko'chirilgan** — EUR 10 225 "USD 10 225" bo'lib turgan | 12 | `amount_usd_value = 0` ("USD summasi e'lon qilinmagan"); summa `award_amount` + `award_currency` dan to'g'ri ko'rsatiladi |
| 2 | **`required_documents` JSON emas, oddiy matn** ("CSS Profile, FAFSA (US), …") | 19 | JSON massivga o'girildi |
| 3 | **"Rolling (Priority: Nov 1)"** — sana bor, lekin yozuv "doimiy qabul" bo'lib o'qiladi | 2 | "Priority deadline 1 November 2026; applications otherwise assessed on a rolling basis" |
| 4 | **4 universitetda rasmiy sayt yo'q** | 4 | CTU → cvut.cz, WIUT → wiut.uz, IUT → inha.uz, NewUU → newuu.uz (hammasi tekshirildi) |
| 5 | **Ariza sahifasida "$0" ko'rinadi** — summa e'lon qilinmagan 26 yozuvda | 26 | Kod tuzatildi: `0` = "e'lon qilinmagan", endi "$0" chiqmaydi (`page.tsx`, `ScholarshipHub.awardLabel`) |
| 6 | Gates Cambridge sanasi kursga qarab farq qiladi | 1 | `notes` ga ogohlantirish qo'shildi |

## 2. Muddatlar — hammasi tekshirildi

| Tekshiruv | Natija |
|---|---|
| Muddati **o'tgan** faol stipendiya | **0** |
| 2 yildan uzoq kelajakdagi sana | **0** |
| Matndagi yil ≠ `deadline_date` yili | **0** |
| `deadline_type='fixed'` lekin sana yo'q | **0** |
| `application_status='open'` lekin muddat o'tgan | **0** |
| `application_cycles`: o'tgan muddat + verified | **0** |
| `application_cycles`: verified, manbasiz | **0** |
| `cycle_year` ≠ `academic_year` | **0** |

Ya'ni **muddatlarda xato topilmadi** — 989 verified cycle va 635 faol stipendiya
sanasi bugungi kundan keyin.

## 3. Ma'lumot to'g'riligi — toza chiqqan tekshiruvlar

| Tekshiruv | Natija |
|---|---|
| Takroriy nom (bir xil sarlavha) | 0 |
| Takroriy (universitet + nom) juftligi | 0 |
| Stipendiya davlati ≠ universitet davlati | 0 |
| Bo'sh provider / tavsif / talab / sayt | 0 |
| `http` bo'lmagan havola | 0 |
| Buza oilgan `degree_levels`, `eligible_majors`, `eligible_countries` | 0 |
| `min_ielts` 0–9 dan tashqarida, `min_gpa` 0–4 dan tashqarida | 0 |
| `award_basis` / `award_period` noto'g'ri qiymat | 0 |
| `coverage_type` ↔ `tuition_coverage` ziddiyati | 0 |
| Million va undan katta summalar (birlik xatosi) | 0 |
| Dastursiz universitet | 0 |
| Faol stipendiyasiz universitet | 0 |
| `program_id` bog'lanmagan cycle | 0 |

## 4. Qolgan kamchiliklar (xato emas, lekin sifat past)

Bular ma'lumot **noto'g'ri** degani emas — shunchaki to'liq emas:

| Kamchilik | Soni | Izoh |
|---|---|---|
| `website_url` — faqat domen (bosh sahifa), mukofot sahifasi emas | **302** | Har birini alohida tekshirish kerak; soxta chuqur havola yasalmaydi |
| Tavsif hali PDF import shablonida ("X (Country) offers Y. Maximum award: …") | **273** | Mazmun to'g'ri, lekin ohang bir xil — har birini manbadan qayta yozish kerak |
| `university_scholarships` arxivlangan stipendiyaga bog'langan | 21 | UI ga ta'sir qilmaydi (faqat faol yozuvlar ko'rsatiladi) |
| Rasm yo'q universitet | 57 | Soxta rasm qo'yilmaydi |
| `world_ranking` yo'q universitet | 8 | QS jadvalida yo'q (KAIST, Nazarbayev, WIUT, IUT, NewUU, École des Ponts, Corvinus, Semmelweis) |

## 5. Baza holati (2026-10-23, tuzatishlardan keyin)

```
universities               358   (hammasida dastur + faol stipendiya)
scholarships (jami)        663
  faol                     635
  arxivlangan               28
  faol + verified          635
university_scholarships    583   358 universitet
application_cycles        3096   verified 989 / estimated 81 / unverified 2026
```

## 6. Kod tomoni

- `src/app/scholarships/page.tsx` — `amount_usd_value > 0` sharti (26 yozuvda "$0" chiqmasligi uchun)
- `src/components/ScholarshipHub.tsx` — `awardLabel()` ham `0` ni "e'lon qilinmagan" deb qabul qiladi
- `scripts/check-catalog-duplicates.ts` — endi stipendiyalarni ham tekshiradi
- `scripts/check-scholarship-detail.ts` — 11 qattiq shart + 8 ma'lumot qatori

Tekshiruvlar: `tsc` 0 · `eslint` 0 · `i18n` PASS · `render` 337/0 · `build` OK
