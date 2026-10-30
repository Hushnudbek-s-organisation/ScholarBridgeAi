# Stipendiya yozuvlarini qayta ishlash — 103-bosqich (Cleanup Pass 103) — 2026-10-26

## Xulosa

Xitoy klasteridagi ishonchlilik darajasi 4 bo'lgan barcha **7 ta faol yozuv tugatildi**: **1 tasi** qayta yozildi (153 SJTU), **6 tasi** pensionatsiyaga chiqarildi (118 PKU, 143 Fudan, 307 ZJU, 322 USTC — dublikat, 358 Wuhan, 478 NJU).

Olingan (fetch qilingan) rasmiy dalillar: saqlangan URLlardan biri 404 (SJTU), biri yaroqsiz ustun xatosi (ZJU), biri universitet bosh sahifasiga redirect (Wuhan), qolganlari xalqaro talabalar bo'limlarining bosh sahifalari bo'lgani aniqlandi. Pensionatsiya sabablari: uydirma nom (118 "President", 478 "International Excellence"), katalog/umuman boshqa sxemalar ro'yxati (143, 307, 358) va **tasdiqlangan yozuv dublikati** (322 = 778).

Natija: faol yozuvlar **535 → 529**, pensionatsiya **156 → 162**, faol ishonchlilik 4 **80 → 73**, **Xitoy faol rel4 = 0**, kelajakdagi dedlaynlar 166 (o'zgarishsiz). Uydirma miqdor yoki dedlayn kiritilmadi.

## Maqsad va usul

Batch 9'dan keyingi cleanup qadami — qolgan eng katta klaster (Xitoy, 7) yopildi. Usul avvalgidek: saqlangan URL fetch qilinadi; faqat yozuv sarlavhasi/URLi aniqlaydigan va rasmiy sahifa tasdiqlagan nomli mukofot qayta yoziladi; kataloglar, uydirma nomlar va dublikatlar pensionatsiyaga chiqariladi; katalog ichidan topilgan **boshqa nomli** jonli mukofot yozuvga retarget qilinmay, kelgusi qo'shimchalar ro'yxatiga olinadi. CNY miqdorlarda `amount_usd_value = 0`.

## Qayta yozilgan yozuv (1)

### 153 — SJTU Scholarship for International Graduate Students, rel 9
Ikkita rasmiy sahifa fetch qilindi: (a) Study@SJTU "SJTU Scholarship" sahifasi (doimiy sxema tavsifi): doktoranturada — oylik stipendiya + tuition waiver + guruh tibbiy sug'urtasi + qisman turar-joy subsidiyasi; magistraturada — SJTU Scholarship (stipendiya + standard tuition waiver + sug'urta + subsidiya) va alohida Tuition Waiver Scholarship; aniq summalar ariza tizimida tasdiqlanadi. (b) Graduate School'ning 2025-yilgi xalqaro qabul e'loni: fuqarolik/daraja talablari, bitta kanal qoidasi (apply.sjtu.edu.cn, agentlik kodi 10248), dedlaynlar (SJTU Scholarship — 2025-03-31), full/partial tuition izohi, yotoqxona bepul emasligi, aprel/may yillik review, hujjatlar ro'yxati, doktorantura tuition RMB 45,500/yil. Saqlangan eski ISC URL — **404**.
Yozuv rasmiy sxema nomi bilan qayta yozildi; `award_amount NULL` (universitet yagona stipendiya raqami e'lon qilmaydi; qidiruvda ko'ringan eski maktab jadvali raqamlari first-hand o'qilmagani uchun saqlanmadi); oxirgi o'qilgan e'lon 2025-siklniki bo'lgani uchun `deadline_date NULL` + `application_status 'closed'`, yillik naqsh `rounds`da qayd etildi; rel **9**.

## Pensionatsiyaga chiqarilgan yozuvlar (6)

| ID | Universitet | Fetch natijasi (2026-10-26) | Pensionatsiya sababi | Qoladigan qamrov |
|---|---|---|---|---|
| 118 | Peking | ISD sayti: 5 toifa — CSC, Beijing Govt, CLEC, **PKU Scholarship for International Students**, donor | "President Scholarship" e'lon qilingan toifalar orasida **yo'q** — uydirma nom | 894 (rel 10), 31, 849 |
| 143 | Fudan | ISO "Scholarships" sahifasi: faqat CSC / Shanghai Govt / Confucius | Universitet mukofoti emas — katalog/umuman | 44, 554 |
| 307 | Zhejiang | Saqlangan URL: "54-ustun topilmadi" xatosi; qabul sahifalari: CSC variantlari, Zhejiang Provincial Govt, maktab sxemalari | Bunday nomli yagona mukofot yo'q — e'lonlar ustuni/katalog | 846, 866 |
| 322 | USTC | Bulletin URL admissions hubga redirect (USTC Fellowship daraja sahifalari) | **Dublikat**: xuddi shu fellowship tasdiqlangan **778** (rel 9) sifatida katalogda bor | 778 |
| 358 | Wuhan | /en/scholarships/ → universitet bosh sahifasiga redirect | Nomlanmagan umumiy sarlavha, o'lik URL | 792, 866 |
| 478 | Nanjing | Institut stipendiya menyusi: aniq 4 sxema (CSC, Nanjing Municipal Govt, Chinese Language Teachers, Confucius China Studies) | "International Excellence Scholarship" ro'yxatda **yo'q** — uydirma nom | 631 |

Har biriga: sarlavhaga "(retired: ...)" izohi, `is_active=false`, `application_status='closed'`, `source_reliability=9`, dedlayn NULL/not_published, `notes` oxiriga RETIRED izohi.

## Kelgusi qo'shimchalar nomzodlari (bu bosqichda qo'shilmadi)

- **Peking University Scholarship for International Students** — PKU ISD'ning rasmiy toifasi (detail sahifasi alohida o'qilishi kerak).
- **Nanjing Municipal Government Scholarship** — NJU instituti menyusida e'lon qilingan munitsipal sxema.
- ZJU maktab darajasidagi sxemalar (ZIBS Hai, ZJU-ISM Master's Freshman) — tor qamrovli; past ustuvorlik.

Har biri Batch 10+'da o'z rasmiy sahifa auditi bilan baholanadi.

## Kuzatilgan, lekin tegilmagan

Qamrov tekshiruvida rel 9 dagi ehtimoliy dublikat juftliklar ko'zga tashlandi: **31 / 849** (ikkalasi ham CSC at PKU) va **44 / 554** (ikkalasi ham CSC at Fudan). Ular ushbu rel4 bosqichi doirasidan tashqarida — kelgusi dedupe tekshiruvi uchun nomzod sifatida qayd etildi, o'zgartirilmadi.

## Yon jadvallar

- `sources` (yagona linkli 7 ta): 2615 SJTU — jonli rasmiy sahifaga; pensionatsiyalarda fetch qilingan sahifa/URLga (2589 PKU ISD, 2527 Fudan ISO scholarships, 2777 ZJU yaroqsiz URL, 2681 USTC redirect URL, 2699 WHU redirect URL). **908 (NJU) alohida holat:** mo'ljallangan `hwxy.nju.edu.cn/en/` URLi `idx_sources_url` unique chekloviga urildi (1054-manbada mavjud) — shuning uchun 908 institutning stipendiya bo'limi indeksi (`/lxnd/zsxx/jxj/index.html`)ga yo'naltirildi. (Birinchi urinishdagi butun CASE bayonot rollback bo'lgani tekshirib, tuzatilgan holda qayta bajarildi.)
- `university_scholarships`: 641/540/35/574/497 — pensionatsiya (35 dagi eski "Full Ride" da'vosi ham olib tashlandi); 568 (SJTU) — yangi sarlavha va halol qiymat matni; 358 da qator yo'q edi.
- `scholarship_sources` linklari o'zgarmadi (tekshirildi: 7/7 yozuvda 1 link).
- `university_id`: o'zgarishsiz (358 NULL qolaveradi — yozuv pensionatsiya qilingani uchun Wuhan (230) ulanmadi).

## Sanoglar va halollik holati

- Faol: **529**, pensionatsiya: **162**, faol rel4: **73**, Xitoy faol rel4: **0**, kelajakdagi dedlaynlar: **166**.
- Tozalash tugamagan: **73 ta** faol rel4 yozuv qolmoqda (eng kattalari: Singapur 6, Janubiy Koreya 6, Shveytsariya 6, Yangi Zelandiya 5, Belgiya/Finlandiya/Fransiya/Shvetsiya 4 tadan).
- Tekshiruvlar: `tsc --noEmit` ✅, `check:i18n` ✅, `test:render` **337/337** ✅.

Bajarilgan SQL: `supabase/scholarship_rewrite_pass103_2026-10-26.sql`.
