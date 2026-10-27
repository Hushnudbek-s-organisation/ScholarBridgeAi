# Grant yozuvlarini qayta yozish — 26-pass: Niderlandiya (2026-10-23)

Niderlandiya klasteri yopildi: shablon **0**, uydirma $5 000+ summa **0**, "Full Tuition + Stipend" yorlig'i **0**.

SQL eslatma: [`supabase/scholarship_rewrite_pass26_2026-10-23.sql`](../supabase/scholarship_rewrite_pass26_2026-10-23.sql)

---

## 1. Naqsh

Deyarli har golland universiteti uchun katalogda **IKKITA** qator bor edi:
- biri **aniq nom + katta uydirma USD** bilan,
- ikkinchisi **umumiy nom + bosh domen** bilan.

Umumiylari — **takror**. Aniqlarida nom to'g'ri, **pul esa xato**.

## 2. To'rtta eng muhim tuzatish

### 1) Holland Scholarship → **NL Scholarship** (2023-yil iyunda qayta nomlangan)
U **bir martalik €5 000**, yashash xarajatlariga hissa — **to'liq kontrakt emas**.

| id | Bazada turgan | Aslida |
|---|---|---|
| **374** Groningen | "Holland Scholarship", **$18 000**, Full Tuition | €5 000, bir marta → **retired** |
| **577** Erasmus | "Erasmus University Holland Scholarship", **$11 500**, Full Tuition | €5 000, milliy dastur → **retired** |

### 2) TU Delft NL Scholarship'da **qatnashmagan** (2026/27)
Milliy yozuv **id 593** da `provider = "Delft University of Technology (TU Delft)"` yozilgan edi. Aslida bu **Ta'lim vazirligi** dasturi, TU Delft esa 2026/27 da umuman qatnashmagan → **provider tuzatildi**.

### 3) Radboud — **stipendiya yo'q**
Eski yozuv: **$24 000**, "Full Tuition **+ living grant**".

Aslida: kontrakt **€18 000 → ~€2 694** ga tushadi + viza, yashash ruxsatnomasi, sug'urta. **Yashash xarajatlari qoplanmaydi** — universitet buni o'zi yozadi. Immigratsiya uchun **€13 800** ko'rsatish kerak.

### 4) Wageningen — ikki grant **birlashtirilgan**
- **Africa Scholarship Programme** — to'liq moliyalashtirish (kontrakt + yashash + yo'l + viza + sug'urta), **lekin faqat Sahroi Kabirdan janubiy Afrika** → **O'zbekiston uchun mos emas**.
- **Excellence Programme** — hammaga ochiq, **faqat kontrakt** (€21 900/yil), yashash **yo'q**.

Eski qator birinchisini va'da qilib, ikkinchisiga o'xshab ko'rinardi.

## 3. Qayta yozilgan oltita

| id | Grant | Haqiqiy shartlar |
|---|---|---|
| **152** | TU Delft van Effen | **~€30 000/yil** (norasmiy), 2 yilga ~€60 000; **16 ta** (har fakultetga 2 ta); **1-dekabr 2026**; 2-kurs uchun **48/60 ECTS** |
| **416** | Twente UTS | **€3 000–22 000** naqd, ~50 ta; **1-aprel 2027**; IELTS 6.5/TOEFL 90 |
| **417** | Radboud RSP | kontrakt **€2 694** ga tushadi; **31-yanvar**; OSIRIS'da katakcha |
| **418** | VU VUFP | **faqat kontrakt**, yashash yo'q; **1-noyabr 2026 → 1-fevral 2027** |
| **419** | Wageningen Excellence | **faqat kontrakt** (€21 900/yil) |
| **618** | Maastricht NL-High Potential | to'liq kontrakt + **€20 150** (13 oy) / **€38 750** (25 oy); **18 ta**; grant **1-fevral 2027**, **qabul 10-dekabr 2026** |

## 4. Ikki qator — yorliq olib tashlandi

**415** (TU/e TSP) va **420** (Erasmus Trustfonds) — summa ham, qamrov ham tasdiqlanmagan. "Full Tuition + Stipend" yorlig'i **olib tashlandi**, `coverage_type = Unspecified`, izoh qo'shildi. **O'chirilmadi** — grant mavjud, lekin tekshirilishi kerak.

## 5. Holat

| Ko'rsatkich | Oldin | Hozir |
|---|---|---|
| Shablon tavsif | 136 | **129** |
| Bosh domen URL | 188 | **181** |
| Faol grantlar | 605 | **597** (8 retired) |
| Qayta yozilgan | 119 / 605 (19.7%) | **125 / 597 (20.9%)** |
| Niderlandiyada shablon | 7 | **0** ✅ |

`tsc --noEmit` ✅ · `check:i18n` ✅ · `test:render` 337/0 ✅ · 13 qatorning qattiq tekshiruvlari ✅.

## 6. Yopilgan klasterlar

| Klaster | Natija |
|---|---|
| Türkiye | 8 yozildi, 4 retired |
| Rossiya | 4 yozildi, 5 retired, 1 yangi |
| Xitoy | 9 yozildi, 2 retired |
| Koreya | 3 yozildi, 3 retired |
| Malayziya | 8 yozildi, 5 retired |
| Olmoniya | 8 yozildi, 4 retired, 11 tuzatildi |
| Yaponiya | 2 yozildi, 9 retired, 1 yangi, 8 tuzatildi |
| **Niderlandiya** | **6 yozildi, 8 retired, 2 yorliq olib tashlandi** |

## 7. Keyingi navbat

**AQSh (19)**, **Buyuk Britaniya (13)**, **Avstraliya (10)**, **Italiya (10)**, **Polsha (10)**, **Kanada (8)**. 129 shablon va 181 bosh domen qoldi.
