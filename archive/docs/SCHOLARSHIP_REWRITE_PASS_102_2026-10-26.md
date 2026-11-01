# Stipendiya yozuvlarini qayta ishlash — 102-bosqicha (Cleanup Pass 102) — 2026-10-26

## Xulosa

Kanada klasteridagi ishonchlilik darajasi 4 bo'lgan barcha **11 ta faol yozuv tugatildi**: **4 tasi** jonli rasmiy mukofot sahifalaridan qayta yozildi (142 UBC 4YF, 444 Queen's QGA, 445 Dalhousie Killam Level 2, 446 UVic), **7 tasi** pensionatsiyaga chiqarildi (129 Toronto, 363 McMaster, 371 Ottawa, 375 Waterloo, 380 SFU, 386 Calgary, 391 Manitoba).

Olingan (fetch qilingan) rasmiy dalillar: saqlangan 11 URLdan **10 tasi 404 yoki hub/redirect**; faqat UBC 4YF sahifasi to'g'ridan-to'g'ri jonli mukofot sahifasi bo'lgan. Pensionatsiya sabablari: moliyalashtirish katalogi/qidiruv sahifasi (129 dublikat bilan birga, 363, 371, 380), rasmiy saytda topilmagan uydirma nomli mukofot (375, 386) va jonli rasmiy dastur sahifasi qolmagan, vorisi boshqa nomli mukofotga aylangan dastur (391).

Natija: faol yozuvlar **538 → 531**, pensionatsiya **149 → 156**, faol ishonchlilik 4 **91 → 80**, **Kanada faol rel4 = 0**, kelajakdagi dedlaynlar **165 → 166** (Killam 2027-01-31). Uydirma miqdor yoki dedlayn kiritilmadi.

## Maqsad va usul

Tozalash va qo'shimchalar navbatida Batch 8'dan keyingi cleanup qadami — eng katta qolgan klaster (Kanada, 11) yopildi. Usul avvalgidek: avval saqlangan URL fetch qilinadi, faqat rasmiy sahifa tasdiqlagan nomli mukofot qayta yoziladi; katalog/qidiruv sahifalari, nomlanmagan yoki uydirma nomli yozuvlar pensionatsiyaga chiqariladi; katalog ichidan topilgan **boshqa nomli** jonli mukofot yozuvga "yopishtirilmaydi", balki kelgusi qo'shimchalar ro'yxatiga olinadi (99–101-bosqichalar qoidasi). Miqdor/dedlayn faqat fetch qilingan rasmiy sahifadan; CAD miqdorlarda `amount_usd_value = 0`.

## Qayta yozilgan yozuvlar (4)

### 142 — UBC Four Year Doctoral Fellowship (4YF), rel 10
Rasmiy mukofot sahifasi (grad.ubc.ca) to'liq fetch qilindi: **CAD 24,000/yil stipendiya + to'liq tuition, 4 yilgacha** (2026-yil sentabrdan); PhD/DMA/MDPhD; Kanada fuqarolari, PR va **international** talabalar; alohida ariza yo'q — qabul qilinganlar avtomatik ko'rib chiqiladi, dasturlar nomzod ko'rsatadi; dedlayn har bir dastur tomonidan belgilanadi → `deadline_date NULL + not_published`, `application_status 'upcoming'`.

### 445 — Dalhousie Killam Predoctoral Scholarship — Doctoral (Level 2), rel 10
Jonli sahifa: **CAD 42,000/yil ($14,000/term), 3 yilgacha**; Kanada va international; to'liq vaqt PhD (7-termigacha egallanadi); CGRS-D arizachilari avtomatik ko'rib chiqiladi, birga egallansa **$48,000 gacha top-up**; relocation (eng arzon to'g'ridan-to'g'ri reys) kompensatsiyasi; non-Tri-agency arizachilar uchun FGS platformasi. Dedlaynlar: 1-raund 2026-10-16 (yopildi), 2-raund 2026-12-01 ochiladi, **2027-01-31** tugaydi — jonli sahifaning sanalari keshlangan qidiruv snippet'idan ($fevral$) ustun qo'yildi. `deadline_date = 2027-01-31` + rounds JSON; Dalhousie universitet yozuvi mavjud bo'lgani uchun `university_id = 284` ulandi va `university_scholarships` (id **674**) qo'shildi. Level 1 (Master's) qismi alohida dalil bazasiga ega bo'lmagani uchun bu yozuvga qo'shilmadi.

### 444 — Queen's Graduate Award (QGA), rel 9
SGSPA "Funding Packages" sahifasi (2026-27: to'liq vaqt PhD uchun kafolatlangan minimum paket **$25,000/yil**, tuition paketga kirmaydi) va rasmiy **QGA Terms & Conditions (2022-23)** PDF fetch qilindi: QGA — barcha sohalardagi to'liq vaqt Master's/Doctoral talabalarga bo'lim tavsiyasi bilan yillik beriladigan, **qiymati rasman variable** bo'lgan ichki mukofot; fuqarolik cheklovi shartlarida ko'rsatilmagan; QGA 2026-27 General Awards shartlarida ham joriy oqim sifatida tasdiqlangan. Shuning uchun `award_amount NULL (variable)`, alohida ariza/dedlayn yo'q, yozuv QGA'ni ochiq tanlov deb emas, paket komponenti deb aniq tavsiflaydi. Gazette'dagi "$4,100 per domestic master's student" markaziy ajratma stavkasi — individual mukofot qiymati emas, saqlanmadi.

### 446 — UVic Fellowships and UVic Graduate Awards, rel 9
FGS moliyalashtirish hubi + FGS eligibility sahifasi + rasmiy bo'lim sahifasi (AHVS) fetch qilindi: **UVic Fellowships $17,500/yilgacha (Master's) / $20,000/yilgacha (PhD); UVic Graduate Awards $10,000/yilgacha**; Kanada va international; birlik (unit) nominatsiya qiladi, qiymat/davomiylikni birlik belgilaydi, FGS tasdiqlaydi; moliyalashtirish odatda joriy o'quv yili (Sep–Aug), avtomatik uzaytirilmaydi; markaziy dedlayn yo'q → `award_amount NULL (variable)`, `deadline_date NULL`. `universities` jadvalida University of Victoria yozuvi yo'q (id 253 — VUW, NZ), shuning uchun `university_id NULL` qoldi — alohida kataloglashtirish vazifasi.

## Pensionatsiyaga chiqarilgan yozuvlar (7)

| ID | Universitet/yaratish | Fetch natijasi (2026-10-26) | Pensionatsiya sababi | Qoladigan qamrov |
|---|---|---|---|---|
| 129 | Toronto | SGS funding URL → **404** | Katalog + Pearson dublikati (Pearson = tasdiqlangan 50) | 50, 692 |
| 363 | McMaster | SGS homepage'iga redirect; jonli sahifa — "**Scholarship Navigator**" (qidiruv katalogi) | "GRS" nomli mukofot yo'q; katalog | 622 |
| 371 | Ottawa | graduate-studies/funding → **404** | Nomlanmagan umumiy "Doctoral Awards" katalogi | 753 |
| 375 | Waterloo | fellowships URL → **404**; sayt qidiruvida "Graduate Research Fellowship" yo'q | Uydirma nom | 767 |
| 380 | SFU | funding.html → **404** | Sarlavha **ikkita alohida** mukofotni birlashtiradi (UG Entrance + Graduate Fellowship) | — (kelgusi nomzod: SFU Graduate Fellowship) |
| 386 | Calgary | funding URL → **404**; rasmiy awards search'da GAC/tri-agency/AGES, "GRS" yo'q | Uydirma nom | 729 |
| 391 | Manitoba | gradstudies/funding → **404**; jonli hub va sayt qidiruvida MGS dastur sahifasi yo'q (faqat 2020-yilgi holder hujjatlari) | Nomi e'lon qilinmayotgan/yopilgan mukofot; joriy flagman — UMGF (boshqa mukofot) | — (kelgusi nomzod: UMGF) |

Har biriga: sarlavhaga "(retired: ...)" izohi, `is_active=false`, `application_status='closed'`, `source_reliability=9`, dedlayn NULL/not_published, `notes` oxiriga RETIRED izohi (audit izi saqlanadi).

**E'tiborli dalil:** "Graduate Research Scholarship (GRS)" nomi McMaster va Calgary uchun bir xil uydirma tarzda qayta ishlatilgan — importer uydirmasining aniq belgisi; ikkala universitet ham bunday mukofot e'lon qilmaydi.

## Kelgusi qo'shimchalar nomzodlari (bu bosqichda qo'shilmadi)

- **uOttawa Admission Scholarship (Doctorate)** — kamida CAD 72,000/4 yil ($9,000/yil stipendiya + ≥$9,000/yil birlik yordami), qabul o'rtacha ≥8.0/10, international, alohida ariza yo'q.
- **University of Manitoba Graduate Fellowship (UMGF)** — CAD $20,000/yil Master's (12–24 oy), $25,000/yil PhD (12–48 oy), barcha fuqaroliklar, min. admission GPA 3.0, bo'lim tavsiyasi (2024-09-01 dan).
- **SFU Graduate Fellowship** — alohida tekshiruv talab etiladi.

Bular 371/391/380 yozuvlari **nomlamagan** boshqa mukofotlar; qoida bo'yicha pensionatsiya qilingan yozuvga retarget qilinmaydi — Batch 9+ da har biri o'z rasmiy sahifa auditi bilan baholanadi.

## Yon jadvallar

- `sources` (yagona linkli 11 ta): qayta yozilganlarda jonli mukofot sahifasiga (2638 UBC, 2602 Queen's, 2509 Dalhousie, 2689 UVic); pensionatsiya qilinganlarda fetch qilingan 404/redirect URLga (2685 Toronto, 2674 Ottawa, 838 Waterloo, 2613 SFU, 2639 Calgary, 2653 Manitoba) va 2573 McMaster — navigator sahifasiga.
- `university_scholarships`: 531/534/603/607/610 — pensionatsiya sarlavhasi, `availability_status='No'`, "No confirmed award..." maks-qiymati; 539 (UBC) va 633 (Queen's) — yangi sarlavha va tasdiqlangan qiymat; **674** — Killam ↔ Dalhousie (284) yangi qator.
- `scholarship_sources` linklari o'zgarmadi (tekshirildi: 11/11 yozuvda 1 link).
- `university_id`: 445 → 284 ulandi; 380/391/446 NULL qoldi (Simon Fraser/Manitoba/University of Victoria yozuvlari jadvalda yo'q — kataloglashtirish vazifasi); UBC'ning 49/65 juft id'lari tegilmadi.

## Sanoglar va halollik holati

- Faol: **531**, pensionatsiya: **156**, faol rel4: **80**, Kanada faol rel4: **0**, kelajakdagi dedlaynlar: **166**.
- Tozalash tugamagan: **80 ta** faol rel4 yozuv qolmoqda (eng kattalari: Xitoy 7, Janubiy Koreya 6, Singapur 6, Shveytsariya 6, Yangi Zelandiya 5).
- Tekshiruvlar: `tsc --noEmit` ✅, `check:i18n` ✅, `test:render` **337/337** ✅.

Bajarilgan SQL: `supabase/scholarship_rewrite_pass102_2026-10-26.sql`.
