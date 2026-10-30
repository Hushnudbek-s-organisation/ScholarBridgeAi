# Stipendiyalar boyitish — 23-partiya (2026-10-28, Stockholm, Sweden)

**Kontekst.** Uzoq vaqtdan beri navbatda turgan "Stockholm" nomzodlari bajarildi. Avval dublikat manzarasi tekshirildi: Sweden katalogi allaqachon kuchli (KTH 325/968/969, Lund 323, Uppsala 348/773, Gothenburg 739/967, Chalmers 421, SU Scheme 673, Swedish Institute 922); **Karolinska Institutet umuman yo'q edi**. "Stockholm Trio" nomzodi tadqiqotda yechildi: bu uchta universitet (**Karolinska Institutet + KTH + Stockholm University**) alyansining ikkita qo'shma magistrlik dasturi uchun birgalikda moliyalashtiriladigan alohida nomli stipendiya ekan (KI hisobotlarida "KI–KTH–SU Scholarship"). Jami 6 ta rasmiy sahifa o'qildi: KI stipendiya sahifasi + overview, SU markaziy Scholarships sahifasi, SU ICAL dastur sahifasi (2 chunk), KTH Scholarship sahifasi, KTH Biostatistics sahifasi. To'rttala yozuv ham rel 10.

| # | ID | Yangi yozuv | Qoplama | Deadline / holat | us |
|---|----|-------------|---------|------------------|----|
| 1 | 981 | Karolinska Institutet Global Master's Scholarship | O'qish to'lovi to'liq (faqat tuition); yiliga ~10–12 ta | Ariza 2027-yil 8–24-fevral → `2027-02-24`/`fixed`; `upcoming` | — (KI universitet yozuvi yo'q) |
| 2 | 982 | Stockholm Trio Scholarship | Ikkita qo'shma dasturning to'liq o'qish to'lovi (uch universitet birgalikda moliyalashtiradi) | KTH formasi orqali: `2027-01-15`/`fixed`; `upcoming` | — (alyans sxemasi) |
| 3 | 983 | Vinge Stockholm Arbitration Scholarship (SAS) — ICAL LL.M. | ICAL o'qish to'lovi to'liq | Qabul natijalaridan keyin ochiladi → NULL/`not_published`; `upcoming` | 706 (uni 140) |
| 4 | 984 | Swedish Arbitration Association (SAA) Scholarship — ICAL LL.M. | ICAL o'qish to'lovi to'liq | Qabul natijalaridan keyin ochiladi → NULL/`not_published`; `upcoming` | 707 (uni 140) |

## Qarorlar mantiqi

- **981 (KI Global Master's).** Talablar: butun o'qish davomida to'lov-to'lovchi maqom; KI magistrlik dasturiga ariza; KI dasturi **birinchi tanlov** sifatida belgilangan bo'lishi (quyiroq reytingdagi KI variantiga qabul qilinsang ham huquq saqlanadi). Tanlov mexanikasi shaffof: KI CV-formasi reytingi (har bir dasturda eng yuqori reyting sohibi oladi; tenglikda — lotereya; rad etilsa — keyingi nomzod). Statistika sahifadan: 2026 — 1002 ariza / 12 sovrindor (484 to'lov-to'lovchi qabul qilingan); 2025 — 687 / 10. Faqat tuition — yashash/safar qoplmaydi; ogohlantirish matnda aniq yozilgan. Ikkita Trio dasturi ataylab chiqarib tashlangan (ular 982 orqali) — cross-reference qilindi. **KI-DIS Fellowship yozuv sifatida qo'shilmadi** (yiliga bitta, faqat DIS Stockholm/Copenhagen bitiruvchilari uchun tor doirali mukofot) — 981 notesida qayd etilgan. Karolinska uchun `universities` jadvalida yozuv yo'qligi so'rov bilan tasdiqlandi → `university_id=NULL`, us qatori yaratilmadi (qoida); KI universitet yozuvini yaratish kelajak backlink ro'yxatiga qo'shildi.
- **982 (Stockholm Trio).** SU sahifasi sxemani nomlaydi va ikki dasturni sanaydi (Molecular Techniques in Life Science; Biostatistics and Data Science); KTH dastur sahifasi qo'shma moliyalashtirishni to'g'ridan-to'g'ri tasdiqlaydi ("funded jointly by KTH, Karolinska Institutet and Stockholm University"); KTH Scholarship sahifasi bu ikki dasturni eligible ro'yxatga kiritgan. Ariza KTH Scholarship formasi orqali (2026-12-01 → 2027-01-15; 325-yozuvdagi tasdiqlangan sana bilan bir xil). Router nuqtai nazaridan muhim: bu ikki dastur **981 dan ham, 969 (KTH Joint) dan ham ataylab chiqarilgan** — uchala yozuv o'zaro qarama-qarshi cross-reference qilindi. Alyans sxemasi bo'lgani uchun `university_id=NULL`, us qatorlarsiz (bitta universitetga bog'lash moliyalashtiruvchini buzib ko'rsatadi; ariza KTH da joylashgani `application_url` da aks etgan).
- **983/984 (ICAL SAS + SAA).** Ikkita har xil sponsorli nomli mukofot (Vinge yuridik firmasi vs Swedish Arbitration Association) — E3 (978/979) printsipiga ko'ra ikkita alohida yozuv. Ikkala rasmiy nomlash ham hisobga olindi (markaziy sahifa: "Stockholm Arbitration Scholarship (SAS)"; dastur sahifasi: "Vinge Stockholm Arbitration Scholarship"). Shartlar: EU/EEA tashqarisidagi fuqarolik, aynan ICAL LL.M. ga qabul; o'qish to'lovi to'liq qoplanadi; ariza raundi qabul natijalaridan **keyin** ochiladi va jarayon qabul qilinganlarga aytiladi → sana **uydirilmadi** (NULL/`not_published`). Bir nechta stipendiyaga ariza berish mumkin, lekin faqat bittasi beriladi (673, 922 cross-ref). ICAL o'qish to'lovining aniq summasi o'qilgan sahifalarda yo'q → raqam yozilmadi.
- Kodlash konventsiyasi: 'Full Tuition Waiver' + NULL/SEK/`year`/`variable` — 325 (KTH Scholarship) andozasi bilan moslashtirildi; `amount_usd_value=0`; `min_gpa`/`min_ielts` NULL (GPA tanlov omili, lekin chegara yo'q; English 6 — qabul talabi).
- **SKIP — KTH India:** past prioritet o'zgarishsiz (faqat Hindiston fuqarolari uchun tor sxema); keyingi partiyalarda qayta ko'rib chiqilishi mumkin.

## Tasdiqlangan hisoblagichlar (partiyadan keyin)

| Ko'rsatkich | Pass 116 dan keyin | 23-partiyadan keyin |
|---|---|---|
| Faol stipendiyalar | 548 | **552** |
| Nafaqaga chiqarilgan | 180 | 180 |
| Faol rel-4 | 21 | 21 |
| Kelajakdagi deadlinelar | 195 | **197** (981, 982) |
| Max ID | 980 | 984 |
| Max source | 3113 | 3115 |
| Max university_scholarships | 705 | 707 |

Alomat: to'rtta INSERT ham `RETURNING`-tasdiqlangan (981 KI, 982 Trio, 983 SAS, 984 SAA); bog'lanishlar 7 ta (981→3114; 982→2623+2557 — mavjud manbalar qayta ishlatildi; 983/984→3115+2623); us 706→983, 707→984. Sequences: 984/3115/707. `npm run typecheck`, `check:i18n`, `test:render` — toza. Replay: `supabase/scholarship_enrichment_batch23_2026-10-28.sql`.

## Keyingi qadam

Pass 117: navbatdagi 2 qatorli rel-4 klaster (Chile UC 467/879; India IIT 397/477; Mexico 343/402; Norway 346/424; UAE 501/848 — faol rel-4 jami 21). Kelajak nomzodlar: Islamic University of Madinah stipendiyasi (bazada yo'qligi so'rov bilan tasdiqlandi; rasmiy sahifalari fetch qilinib tekshirilishi kerak); 608 KFUPM UG verifikatsiyasi (rel 8 → 10); 673 SU Scheme kodlanishini qayta tekshirish (140000 SEK/'fixed' + 'annual' deadline turi amaldagi konventsiyalardan farq qiladi); eksternal universitetlar yaratish (Karolinska Institutet — yangilik, Innsbruck 432, Tampere 965, LUT 964, Roskilde 972, SDU 973, SMU 396, KAUST/MBZUAI/Doha 954/955/956, Adelaide+328, Flinders+442, Simon Fraser/Manitoba/UVic — 446 NULL qoladi); 31/849, 44/554, UBC 49/65 deduplikatsiyalari; us `verification_status` ↔ UI ko'rinishi.
