# Grant yozuvlarini qayta yozish — 21-pass: Janubiy Koreya (2026-10-23)

Koreya klasteri yopildi: faol koreys qatorlarida shablon tavsif **0** ta qoldi.

SQL: [`supabase/scholarship_rewrite_pass21_2026-10-23.sql`](../supabase/scholarship_rewrite_pass21_2026-10-23.sql)

---

## 1. Naqsh

5 ta shablon qatorning **4 tasi** allaqachon to'g'ri yozilgan qatorlarning **uchinchi nusxasi** edi — va har biriga **"& GKS"** yopishtirilgan. GKS (Global Korea Scholarship) — bu **NIIED**ning milliy dasturi; uni **hech bir koreys universiteti** bermaydi. U **id 863** da to'g'ri yozilgan.

| Yozuv | Bazada turgan | Nima bo'ldi |
|---|---|---|
| **585 Hanyang** | "Hanyang International Excellence Awards (**HIEA**) & GKS", $21 000 | "HIEA" nomi Hanyang sahifasida **yo'q**; 452 ning nusxasi → **retired** |
| **652 POSTECH** | "POSTECH Global Scholarship & GKS", $32 000 | "POSTECH Global Scholarship" **mavjud emas**; 453 + 493 nusxasi → **retired** |
| **819 KAIST** | "KAIST International Student Scholarship", $36 000 | 310 ning nusxasi, summasi esa **kattaroq** edi → **retired** |
| **668 SKKU** | "SKKU Samsung Global Scholarship & Foreign Student Grant", $18 000 | **Nusxa EMAS** — haqiqiy alohida grant → **qayta yozildi** |
| **709 UNIST** | "UNIST International Undergraduate Scholarship", $31 500 | Haqiqiy grant, lekin summa o'ylab topilgan → **qayta yozildi** |
| **451 SKKU** | "SKKU **Superior** Global Scholarship" — *"Samsung bilan, **magistratura** talabalari uchun, 100% + stipendiya"* | **Uch xato** → **qayta yozildi** |

---

## 2. Eng xavfli topilma — 451 SKKU

Eski qatorda: *"full 100% tuition waiver **and living stipend** funded in partnership with Samsung for top international **postgraduates**"*.

Aslida:
- Samsung granti — **bakalavriat** uchun (magistratura emas);
- SKKU'ning **umumiy** kirish granti — **10–100%** birinchi semestr, keyin **30–70%** merit; **stipendiya umuman yo'q**.

Ya'ni talaba "100% + oylik nafaqa" deb byudjet tuzsa — **butunlay adashardi**. Endi 451 — SKKU'ning haqiqiy zinapoyasi; Samsung granti esa **668** da alohida.

## 3. Yozilgan raqamlar

### 668 — Samsung Global Sungkyun Scholarship (SKKU)
- **To'liq kontrakt + kirish to'lovi, 8 semestr** (4 yil)
- **KRW 570 000/oy** yashash uchun (KRW 3 400 000/semestr)
- Yotoqxona to'liq qoplanadi + 1:1 mentorlik
- **Saqlash:** 12 kredit, GPA **3.7** (1–2-semestrda 3.5), "F" bo'lmasligi. **Bir marta** buzsa — keyingi semestr to'xtaydi; **ikki marta** — butunlay yo'qoladi.
- Ariza formasi **yo'q** — SKKU eng kuchli birinchi kurs talabalaridan **nomzod ko'rsatadi**.

### 709 — UNIST International Undergraduate Scholarship
- **Birinchi semestr — hamma uchun to'liq bepul.** Keyin: 12 kredit + GPA **2.7** → to'liq; GPA **2.0** → yarmi.
- **Yashash stipendiyasi:** Gold **KRW 630 000/oy**, Silver 330 000, Dream 130 000 — kuniga 2 mahal ovqat bilan.
- **Tibbiy sug'urta** KRW 75 000/oy — UNIST qaytaradi.
- Kontrakt: KRW 3 316 500/semestr (muhandislik), 2 795 500 (biznes).
- **Tuzoq:** 12 kreditdan tushib qolsa — kontrakt bepul bo'lishi **yo'qoladi**.

### 451 — SKKU International Admission + Merit Scholarship
- Kirish: **10 / 50 / 70 / 100%** (birinchi semestr).
- 2-semestrdan: top **6%** → 70%, **6–18%** → 50%, **18–30%** → 30%.
- Til bonuslari: TOPIK 6 yoki IELTS 8.0 → **100%**; TOPIK 5 yoki IELTS 7.0 → 50%.

---

## 4. Holat

| Ko'rsatkich | Oldin | Hozir |
|---|---|---|
| Shablon tavsif | 170 | **165** |
| Bosh domen (`website_url`) | 222 | **218** |
| Faol grantlar | 625 | **622** (3 retired) |
| Qayta yozilgan | 94 / 625 (15.0%) | **97 / 622 (15.6%)** |
| Koreyada shablon qoldi | 5 | **0** ✅ |

Tekshiruvlar: `npx tsc --noEmit` ✅ · `npm run check:i18n` ✅ · `npm run test:render` ✅ (337 passed) · 6 qatorning qattiq tekshiruvlari ✅.

---

## 5. Keyingi navbat

**Malayziya** (MIS va boshqa milliy dasturlar), keyin **Germaniya (DAAD)**, **Yaponiya (MEXT)**. Har birida shu naqsh: milliy dastur universitetning "o'z granti" sifatida yozilgan.
