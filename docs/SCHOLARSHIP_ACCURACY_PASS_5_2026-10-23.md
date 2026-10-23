# Scholarship to'g'rilash — 5-bosqich: oxirgi 32 universitet (2026-10-23)

**Loyiha:** `zkdguzbdopfedkffsatk` · **Branch:** `arena/99b0c7fe-scholarbridgeai`
**SQL:** `supabase/scholarship_accuracy_pass5_2026-10-23.sql`

Bu bosqichda oxirgi **32 ta universitet** tekshirildi. Ularning har birida faqat
shablon qator bor edi — `"<Universitet> Scholarships"` — va **hech qayerda e'lon
qilinmagan dollar miqdori** yozilgan edi.

---

## 1. Topilgan eng yomon xatolar

| Universitet | Bazada yozilgan | Universitet aslida e'lon qiladi |
| --- | --- | --- |
| Reading | $25,500 "International Excellence" | **Master's Excellence**: £10,000 (1st), £9,000 (2:1), £4,000 (2:2) |
| Virginia | $55,000 Jefferson | **$83,000+ / yil** (non-Virginian va xalqaro) |
| Leicester | $6,500 + "Jan 25 (UCAS)" | **£5,000 / yil**, avtomatik |
| Strathclyde | $6,750 + "Jan 25 (UCAS)" | **£6,000–£7,000 / yil**, 31-iyul |
| Galway | $24,000 + "Feb 1" | **€2,000–€10,000** kollej bo'yicha, avtomatik |
| DTU | $16,500, muddatsiz | **to'liq 2 yillik tuition waiver** (€30,000), 15-yanvar |
| Macau | $11,000 + "Feb (for Fall)" | **to'liq yoki yarim** tuition + yotoqxona |
| Antwerp | $15,000 + "February 15" | **Master Mind**: €10,225/yil + tuition waiver, 1-fevral |
| Canterbury | $24,000 + "Dec 10" | **NZD 15,000**, 31-oktabr |
| Victoria (NZ) | $24,500 Tongarewa | **avtomatik NZD 15,000 / 10,000** (Tongarewa bekor qilingan) |
| Waikato | $23,500 + "Dec 10" | **NZD 15,000 gacha**, oylik kesimlar |

## 2. Tuzatilgan boshqa qatorlar

| Universitet | To'g'ri mukofot |
| --- | --- |
| Swinburne | George Swinburne International Excellence — **30% chegirma** (20% oddiy) |
| Tasmania | Tasmanian International Scholarship — **25% chegirma** |
| UNIL | Master's Scholarship — **CHF 1,600/oy**, 1-noyabr |
| Paris-Saclay | International Master's — **€10,000/yil** + €900 yo'l |
| Bonn | Deutschlandstipendium — **€300/oy** (Bonn tuition olmaydi) |
| POSTECH | **To'liq tuition waiver** + KRW 500,000/oy + KRW 2,5 mln arrival |
| Latvia | Latvian State Scholarship — **€500/600/700/oy** |
| UM Malaysia | **Bright Scholarship** (faqat PhD): RM 3,500/oy + 7 semestr |
| Unicamp | **Tuition yo'q**; CAPES/CNPq/FAPESP stipendiyalari |
| UPC | Fakultet grantlari — **€1,500–€2,100** |

## 3. "Universitet mukofoti yo'q" deb halol yozilganlar

ULB, Paris 1, Lisbon, Porto, Florida, Maryland, Witwatersrand, Navarra,
UPF, Barcelona — bu universitetlar **xalqaro talabalar uchun umumiy mukofot
e'lon qilmaydi**. Shablon o'rniga endi qator aniq nima borligini aytadi
(masalan Kataloniyada — Beca Equitat, 10–50% chegirma; Portugaliyada — DGES
faqat Portugaliya fuqarolariga).

## 4. Qo'shimcha ma'lumot sifati tuzatishlari

### 4.1 `award_basis` — 386 qator
Import `award_basis` ustuniga erkin matn yozgan: `"Merit-based"`, `"Academic
Excellence"`, `"Research Merit"`, `"Salaried PhD"`, hatto bitta `"year"` so'zi.
Admin API faqat 5 qiymatni qabul qiladi, `awardLabel()` esa faqat 3 tasini
tarjima qiladi — natijada bu qatorlar **yorliqsiz, faqat raqam** bo'lib
ko'rinardi.

Hammasi kanonik to'plamga o'tkazildi:

| Yangi qiymat | Soni |
| --- | --- |
| `fixed` | 300 |
| `full_tuition` | 218 |
| `variable` | 117 |
| `need_based` | 11 |

### 4.2 `award_period`
`academic_year` → `year`, `one-off` → `one_time`.

## 5. Yakuniy holat

| Ko'rsatkich | Qiymat |
| --- | --- |
| Universitetlar | 364 |
| **O'z mukofoti bor universitetlar** | **364 / 364** |
| Aktiv mukofotlar | 639 |
| Nafaqaga chiqarilgan | 11 |
| E'lon qilingan miqdori bor | **603** |
| Manba URL'i bor | **635** |
| `university_scholarships` bog'lanishlari | 389 |

Testlar: **331 passed, 0 failed** (2 tasi aynan shu yo'nalishda — universitet
mukofoti sahifada chiqadi, nafaqaga chiqarilgani chiqmaydi).
