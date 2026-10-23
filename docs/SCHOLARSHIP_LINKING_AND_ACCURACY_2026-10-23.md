# Universitet ↔ scholarship bog'lanishi va miqdorlarni tuzatish (2026-10-23)

**Loyiha:** `zkdguzbdopfedkffsatk` · **Branch:** `arena/99b0c7fe-scholarbridgeai`
**SQL:** `supabase/scholarship_accuracy_and_linking_pass4_2026-10-23.sql`

Savol: *"Kiritilgan universitetlarni qarab chiq — universitet o'zi beradigan
scholarshiplar bo'lsa, ularni universitetga ulab qo'y, o'sha yerda chiqadigan qilib."*

Javob: **ha — endi 364/364 universitetning har birida kamida bitta bog'langan
scholarship bor** va u universitet sahifasida ko'rinadi. Yo'l-yo'lakay jiddiy
xato topildi: bir qancha qator `verified` deb belgilangan bo'lsa ham, **miqdorlar
to'qib yozilgan edi**. Ular rasmiy sahifalardagi raqamlar bilan almashtirildi.

---

## 1. Bog'lanish holati

| Ko'rsatkich | Oldin | **Keyin** |
| --- | --- | --- |
| `university_scholarships` qatorlari | 383 | **389** |
| Bog'langan universitetlar | 361 | **364 / 364** |
| Bog'lanishsiz universitetlar | 3 | **0** |
| Aktiv scholarship | 643 | 641 |
| Nafaqaga chiqarilgan (retired) qatorlar | 5 | 9 |

Uch bo'shliq yopildi: **McGill (26)**, **PSL (44)** va **UNAM (176)**.
UNAM ikki nusxa (91 va 176) — birlashtirish alohida vazifa, shuning uchun 176 ga
ham 91 dagi haqiqiy mukofotlar bog'landi.

### Sahifada qanday ko'rinadi
`GET /api/universities/[id]` scholarxiplarni shunday tartiblaydi:
1. `scholarships.university_id` = shu universitet (**birinchi**),
2. provider nomi universitetga mos keladigan,
3. shu davlatdagi,
4. keyin `verified` va miqdor bo'yicha kamayish tartibida.

Ro'yxat 6 ta bilan cheklangan, sahifada birinchi 3 tasi ko'rinadi. Shu sababli
universitetning **o'z** mukofotlari har doim birinchi o'rinlarda turadi.
Buni endi integration test ham tasdiqlaydi (quyida).

---

## 2. Topilgan xato: "verified" qatorlardagi to'qima miqdorlar

| Universitet | Bazada yozilgan | Rasmiy manba | Tuzatildi |
| --- | --- | --- | --- |
| Arizona | $37,000 "Full Tuition" | GPA jadvali, qat'iy maksimum e'lon qilinmagan | miqdor — "nashr etilmagan" (0), 1-noyabr ustuvor sana |
| Minnesota | $9,000 | $5,000–$20,000 / yil, 4 yilgacha | $20,000 (maks.) |
| Pittsburgh | $25,000 va $38,000 | **$10,000** / yil, 8 semestr | $10,000, muddat 1-fevral |
| Rochester | $63,000 "Full Tuition" | Meliora: **$10,000–$35,000** (o'rtacha $20,000) | $35,000 (maks.) |
| Swansea | $26,000 + UCAS sanasi | **£5,000** (2-kursda +£2,000) | £5,000, muddat 27-noyabr 2026 |
| Sussex | $6,875 + "Jan 25 (UCAS)" | **£5,000**, 2026 raund 30-aprelda yopilgan | £5,000, 2027 muddati e'lon qilinmagan |
| Auckland | $25,000 va $31,000 | **NZD 10,000** gacha, 50 ta | NZD 10,000, muddat 2026-10-21 |
| Leiden | $15,500, bakalavr+magistr | LExS — **faqat magistratura**, miqdor dastur bo'yicha | magistratura, 1-dekabr 2026 |
| Utrecht | UES "mavjud" | **2026-27 dan boshlab bekor qilingan** | retired + NL Scholarship qo'shildi |
| Montréal | $25,000 | miqdor dasturga bog'liq | "nashr etilmagan" |

Bu qatorlar PDF importidan kelgan va keyin tekshirilmasdan `verified` deb
belgilangan. Endi har birida `source_url` — universitetning o'z sahifasi va
`notes` — nima o'zgargani yozilgan.

---

## 3. Nafaqaga chiqarilgan qatorlar

| id | Sabab |
| --- | --- |
| 473 | Utrecht Excellence Scholarship 2026-27 dan beri berilmaydi (byudjet qisqartirishi) |
| 724 | Auckland: $31,000 "full tuition" hech qayerda e'lon qilinmagan |
| 755 | Pittsburgh: $38,000 — 495-qatorning dublikati |
| 468 | Montréal: $25,000 tasdiqlanmadi |
| 496 | UNAM (176) shablon qatori — asosiy 91-qatorda haqiqiy mukofotlar bor |

## 4. Qo'shilgan yangi mukofotlar

| id | Nomi | Universitet | Miqdor | Muddat |
| --- | --- | --- | --- | --- |
| 884 | NL Scholarship (Utrecht University) | 101 | €5,000 (bir martalik) | 2027-02-01 |
| 885 | LION Scholarship (Leiden Institute of Physics) | 107 | nashr etilmagan | 2027-02-01 |

---

## 5. Kod: yangi integration testlar

`scripts/check-integration.ts` ga ikkita tekshiruv qo'shildi:

1. **"a scholarship awarded by the university itself appears on its page with the
   published amount"** — universitetga bog'langan scholarship sahifada chiqadi va
   miqdori to'g'ri keladi.
2. **"a retired scholarship (is_active = false) is never shown"** — nafaqaga
   chiqarilgan qator sahifaga tushmaydi.

Natija: **331 test, 0 xato**.

> Test yozish paytida kesh muammosi ham aniqlandi: yangi qo'shilgan scholarship
> `catalogCache` TTL tugagachgina ko'rinadi. Test buni `invalidateCatalogCache`
> bilan hal qiladi — admin mutatsiyalari ham xuddi shunday qiladi.

---

## 6. Qolgan ish (keyingi bosqich)

**34 ta universitetda** hali ham faqat umumiy shablon qator bor
(`"<Universitet> Scholarships"`). Ular quyidagilar:

`Swinburne, Tasmania, ULB, Antwerp, Campinas, Montréal, UNIL-HEC, Los Andes,
Bonn, DTU International, UPC, UPF, Barcelona, Navarra, Paris 1, Paris-Saclay,
Leicester, Reading, Strathclyde, Galway, POSTECH (170), Latvia, Macau,
UM International (187), Auckland, Canterbury, Waikato, Victoria Wellington,
Lisbon, Porto, Florida, Maryland, Virginia, Witwatersrand`

Har biriga o'sha universitetning rasmiy scholarxiplar sahifasidan haqiqiy nom,
miqdor va muddat yozilishi kerak — bu keyingi bosqichning ishi.
