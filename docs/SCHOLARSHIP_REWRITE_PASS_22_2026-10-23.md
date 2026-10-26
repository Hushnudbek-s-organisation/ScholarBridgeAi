# Grant yozuvlarini qayta yozish — 22-pass: Malayziya, 1-qism (2026-10-23)

Malayziya klasterining birinchi qismi: **to'rtta davlat tadqiqot universiteti**.

SQL: [`supabase/scholarship_rewrite_pass22_2026-10-23.sql`](../supabase/scholarship_rewrite_pass22_2026-10-23.sql)

---

## 1. Naqsh — katalogdagi eng yomoni

Beshta qator **"<Universitet> granti **& MIS**"** ko'rinishida qurilgan. **MIS** — bu **MOHE**ning milliy dasturi (*Malaysia International Scholarship*), katalogda **id 603** da to'g'ri yozilgan. Uni universitet orqali so'rab bo'lmaydi.

Undan yomoni — **to'rttasi ham o'ylab topilgan nom**:

| Yozuv | O'ylab topilgan nom | Rasmiy manba |
|---|---|---|
| **705 UKM** | "UKM Vice-Chancellor Scholarship & MIS", $6 500, "Apr–Jul / Nov–Jan" | **UKM Vice-Chancellor's Scholarship** — Gold va Silver. Muddat **yo'q**: qo'mita **har semestr** yig'iladi. |
| **772 UPM** | "UPM International Scholarship & MIS", $6 200, **to'liq kontrakt** | **IGSS** — **30–50%** kontrakt chegirmasi, **faqat PhD**, 6 semestr. Stipendiya **yo'q**. |
| **805 UTM** | "UTM International **Endowment** & MIS", $6 500, to'liq | **International Doctoral Fellowship** — **MYR 2 000**. "Endowment" degan grant UTM sahifasida **yo'q**. |
| **776 USM** | "USM **Global Fellowship** & MIS", $6 000, **stipendiya bilan** | **USM Graduate Scholarship** — birinchi semestr kontrakti, **stipendiya umuman yo'q**. |
| **469/471/472/395** | "…International Excellence Scholarship", $5 000; "USM International Scholarship **ISS**", $12 000 | Bunday nomlar **hech bir** universitet sahifasida yo'q → **retired** |

**Eng muhim xato:** uchtasi *"to'liq kontrakt + oylik nafaqa"* deb yozilgan, aslida **uchtasi ham oylik nafaqa to'lamaydi**.

---

## 2. Yozilgan haqiqiy raqamlar

### 705 — UKM Vice-Chancellor's Scholarship (Gold va Silver)
| | **Gold** | **Silver** |
|---|---|---|
| Kontrakt | har semestr bepul + ro'yxatdan o'tish | bepul + ro'yxatdan o'tish |
| Stipendiya (PhD) | **MYR 3 200/oy** | **MYR 2 000/oy** |
| Stipendiya (Master) | **MYR 2 200/oy** | **MYR 1 500/oy** |
| Yotoqxona | MYR 300/oy | MYR 300/oy |
| Aviabilet + viza | **bor** | **yo'q** |
| Publikatsiya | 1× Q2 (master) / 2× Q2 (PhD) | Q3 |
| CGPA | **3.67** | 3.67 |

Davomiyligi 2–6 semestr, har yil KPI tekshiruvi.

### 772 — UPM IGSS
- **30–50% kontrakt chegirmasi**, 6 semestr, har yil qayta ko'rik.
- Hududlar: Janubi-sharqiy Osiyo, Janubiy Osiyo, **Markaziy Osiyo** (O'zbekiston shu yerda), Yaqin Sharq, Afrika.
- Ikkita oyna: **1–31-avgust** va **1–31-yanvar**. Rahbar + elchixona xati majburiy.

### 805 — UTM International Doctoral Fellowship
- **MYR 2 000** — faqat kontrakt. Stipendiya, yotoqxona, sug'urta **yo'q**.
- Halol yozildi: bu **kichik ustama**, moliyalashtirish rejasi emas. Kattaroq variant — **UTM ASCEND** (6 semestr to'liq kontrakt + MYR 3 000/oy, 31-may 2026 da yopilgan).

### 776 — USM Graduate Scholarship
- **Birinchi semestr kontrakti**, ikkinchisiga uzaytirilishi mumkin. **Stipendiya yo'q.**
- Xalqaro talaba **faqat PhD** ga ariza bera oladi.
- CGPA **3.33** + WoS/Scopus/ERA maqolasi. 2026 davra **1-sentabr**da yopilgan.

---

## 3. Holat

| Ko'rsatkich | Oldin | Hozir |
|---|---|---|
| Shablon tavsif | 165 | **161** |
| Bosh domen (`website_url`) | 218 | **212** |
| Faol grantlar | 622 | **618** (4 retired) |
| Qayta yozilgan | 97 / 622 (15.6%) | **101 / 618 (16.3%)** |
| Malayziyada shablon qoldi | 9 | **5** |

Tekshiruvlar: `npx tsc --noEmit` ✅ · `npm run check:i18n` ✅ · `npm run test:render` ✅ (337 passed) · 8 qatorning qattiq tekshiruvlari ✅.

---

## 4. Keyingi navbat — Malayziyaning qolgan 5 qatori

| id | Yozuv | Tekshiriladi |
|---|---|---|
| 811 | IIUM **Ummatic** Scholarship & MIS | IIUM sahifasida bunday nom bormi? |
| 677 | Taylor's World Class & Excellence Merit | Taylor's o'z granti |
| 703 | UCSI University Trust Scholarship | UCSI o'z granti |
| 779 | UTP International UG Scholarship & MIS | UTP (PETRONAS) granti |
| 842 | Sunway **Jeffrey Cheah** Entrance Scholarship | Bu **malayziyaliklar uchun** bo'lishi mumkin — tekshirish shart |

842 ayniqsa muhim: avvalgi tekshiruvda uning shartlarida *"Only Malaysian citizens are eligible to apply"* degan satr ko'rilgan edi. Agar tasdiqlansa — qator **butunlay bekor qilinadi**, chunki o'zbek talabasi hech qachon ariza bera olmaydi.

Shundan keyin: **Germaniya (DAAD)**, **Yaponiya (MEXT)**.
