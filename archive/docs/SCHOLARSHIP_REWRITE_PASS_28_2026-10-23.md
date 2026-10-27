# Grant yozuvlarini qayta yozish — 28-pass: Italiya (2026-10-23)

Italiya klasteri yopildi: shablon **0**, uydirma $3 000+ summa **0**, birlashtirilgan qator **0**.

SQL eslatma: [`supabase/scholarship_rewrite_pass28_2026-10-23.sql`](../supabase/scholarship_rewrite_pass28_2026-10-23.sql)

---

## 1. Naqsh — va nega bu boshqalardan jiddiyroq

Italiyada **uchta butunlay alohida** moliyalashtirish mexanizmi bor, va **o'nta** qator uchalasini bitta "Full Ride" qilib birlashtirgan:

| # | Dastur | Kim beradi | Nimaga qarab |
|---|---|---|---|
| 1 | **MAECI** | Tashqi ishlar vazirligi (milliy) | **Merit** |
| 2 | **DSU** | Mintaqaviy agentliklar (ER.GO, EDISU, DiSCo, DSU Toscana, ADISURC, ESU Padova) | **Ehtiyoj (ISEE)** |
| 3 | **Universitet granti** | PoliMi, Padova, Sapienza va boshqalar | **Merit** |

**Nega muhim:** DSU'ning **daromad chegarasi** bor — oila ISEE bo'yicha ~€25 000–28 000 dan yuqori bo'lsa, **umuman olmaydi**. Uchalasini birlashtirgan qator talabaga **hech qaysi biriga mos kelishini aytmagan**.

## 2. Uchta tasdiqlangan yozuv

### 864 — MAECI Italian Government Scholarship
| | |
|---|---|
| **Summa** | **€10 800** — 9 oy (2026–27, o'tgan yil €9 000 edi) |
| **To'lov** | 3 bo'lib: ~€5 500 + €2 300 + €3 000 |
| **Til kursi** | €3 600 |
| **Yosh** | magistratura **28**, PhD **30**, tadqiqot **40** |
| **Til** | B2 italyan **yoki** B2 ingliz |
| **Muddat** | **26-mart 2026, 14:00 CET** |

**🔴 Muhim tuzatish:** eski qatorda "to'liq kontrakt" yozilgan edi. Aslida MAECI **nafaqa to'laydi, kontrakt emas** — kontraktdan ozod qilishni **har bir universitet o'zi** hal qiladi.

### 907 — DSU Regional Right-to-Study Grant **YANGI**
| | |
|---|---|
| **Milliy minimum** | **€7 171,11** (fuori sede) / €4 190,71 (pendolare) / €2 890,16 (in sede) |
| **Mintaqaviy yuqori** | Piemonte ~€8 096 · Padova ~€8 246 · Lombardiya €8 248 · Lazio €7 556,78 |
| **Shift** | ISEE **€28 339,88**, ISPE **€61 608,48** |
| **Mintaqaviy shift** | ER.GO **€25 000** · EDISU €26 306,25 · Lombardiya €26 887,93 |

**Qo'shimcha:** bepul ovqat (Lazio'da kuniga 2 mahal) + subsidiyalangan yotoqxona.
**Non-EU uchun:** **ISEE Parificato** — CAF orqali oila chet eldagi daromadini tasdiqlash.
**Kvota:** EDISU'da **15%**, Padova'da **7%** non-EU birinchi kursga ajratilgan.

**⚠️ Viza tuzog'i:** Italiya vazirlik sirkulyariga ko'ra, **faqat DSU arizasi viza uchun moliyaviy dalil bo'lmaydi** — baribir **€10 179,85/yil** ko'rsatish kerak.

### 351 — Politecnico di Milano merit tiers
| Pog'ona | Summa | Joylar |
|---|---|---|
| **Platinum** (Milan) | **€10 000** + kontrakt | 10 |
| **Gold** (Milan) | **€8 000** + kontrakt | 18 |
| **Gold** (Piacenza) | **€5 000** + kontrakt | 16 |
| **Bronze** (Piacenza) | kontrakt | 10 |
| **Silver** (4 kampus) | kontrakt | 10 |

**🔴 Eng jiddiy tuzatish:** eski qatorda muddat **"February 15"** edi. Aslida **faqat 1-oktabr – 1-dekabr 2026 Early Bird** arizalari hisobga olinadi. Fevralda ariza bergan talaba **qabul qilinardi, lekin barcha grantlardan jimgina chiqarib tashlanardi**.

Yana: kontrakt €3 886/yil, ya'ni waiver o'zi Platinum naqd pulidan kam. Ariza to'lovi Early Bird'da **€50**, keyin €169.

## 3. Bekor qilingan o'nta

`649` PoliTo · `650` PoliMi · `665` Sapienza · `727` Bologna · `748` Milan · `754` Padova · `801` Naples · `808` UNIFI · `835` Pisa · `839` Turin

Har biriga alohida izoh. **Diqqat:** 649 va 839 **ikkalasi ham** EDISU Piemonte'ni tasvirlagan — mintaqaviy agentlik universitetga tegishli emas, shu sababli ikki xil universitetda ikki xil dastur bo'lib ko'ringan.

## 4. Uch qator — summa olib tashlandi

`379` UNIFI · `481` Bologna · `482` Sapienza — summa va qamrov tasdiqlanmagan. `award_amount = NULL`, `amount_usd_value = 0`, yorliq **pasaytirildi**, izoh qo'shildi. **O'chirilmadi** — grant mavjud, tekshirish kerak.

## 5. Holat

| Ko'rsatkich | Oldin | Hozir |
|---|---|---|
| Shablon tavsif | 119 | **109** |
| Bosh domen URL | 171 | **160** |
| Faol grantlar | 587 | **578** |
| Qayta yozilgan | 126 / 587 (21.5%) | **129 / 578 (22.3%)** |
| Italiyada shablon | 9 | **0** ✅ |
| Italiyada $3 000+ | 9 | **0** ✅ |

`tsc --noEmit` ✅ · `check:i18n` ✅ · `test:render` 337/0 ✅ · 6 faol qatorning qattiq tekshiruvlari ✅.

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
| Niderlandiya | 6 yozildi, 8 retired, 2 yorliq olib tashlandi |
| Polsha | 1 yozildi, 10 retired |
| **Italiya** | **2 yozildi, 10 retired, 1 yangi, 3 tuzatildi** |

## 7. Keyingi navbat

**AQSh (19)**, **Buyuk Britaniya (13)**, **Avstraliya (10)**, **Kanada (8)**. 109 shablon va 160 bosh domen qoldi.
