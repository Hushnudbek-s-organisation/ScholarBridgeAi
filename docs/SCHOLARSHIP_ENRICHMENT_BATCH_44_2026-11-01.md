# Enrichment Batch 44 — Yangi yozuv: K-Arts AMA+ Scholarship (South Korea, san'at)

**Sana:** 2026-11-01
**Turi:** Enrichment batch (Pass 137 dan keyin navbat bo'yicha)
**Natija:** **550 active / 206 retired / 1 rel-≤4 / 194 future-dated** (>2026-11-01); minlow **36 → 36**. Yangi: scholarships 1008; sources 3203–3204; links 503–504. Yon yozuv yo'q (K-Arts `universities` jadvalida yo'q — university_id NULL, 91 ta aktiv precedent kabi).

## Nomzod qanday topildi

Pass 137 da birinchi qo'ldan o'qilgan Study in Korea sahifasining "Other Scholarships" bo'limida **Korea National University of Arts (K-Arts) AMA+ Scholarship** ko'ringan edi. Dublikat-tekshiruv: katalogda AMA+/K-Arts yozuvi yo'q. Ushbu batchda ikkita rasmiy K-Arts hujjati birinchi qo'ldan o'qildi:

| Source | Hujjat | Olingan asosiy faktlar |
|---|---|---|
| **3203** | karts.ac.kr/en/karts/ama.do — AMA+ Admissions sahifasi (to'liq) | 8 ta imtiyoz, eligibility 1–5, chop etilgan DAC davlatlari ro'yxati (**Uzbekistan bor**), 13 ta hujjat |
| **3204** | 2027 AMA+ Admissions Guide (PDF, 49 bet; qarorga tegishli qismlar) | 2027 jadval (ariza **2026-yil 5–15 may**, final 30-iyun, originallar 31-iyulgacha), qayta topshirish cheklovlari, 2027 davlatlar jadvali (Uzbekistan — lower-middle income), benefits jadvali, 6 maktab admission unitlari + TOPIK darajalari |

## Yozuv 1008 (rel 10)

- **Dastur:** AMA+ (Art Major Asian plus) — Madaniyat, sport va turizm vazirligining ODA dasturi, 2005 yildan beri (41 davlatdan 400 talaba, 261 bitiruvchi). Bakalavr (4 yil), magistr (2–3 yil) va Artist Diploma (3 yil, magistr darajasi); 6 maktab: Music, Drama, Film/TV/Multimedia, Dance, Visual Arts, Korean Traditional Arts.
- **Paket:** to'liq tuition (regular semestrlar), **oyiga KRW 800,000** (qabul paytidagi qoidalarga ko'ra oshirilishi mumkin — matnda shu izoh bilan), kirish/bitiruv aviachiptasi, 6 yoki 3 oylik pre-entry koreys tili + daraja davomida kurslar, KRW 200,000 settlement, KRW 1,000,000 gacha graduation-thesis, oyiga KRW 100,000 proficiency granti, NHI, yotoqxona ustuvorligi. `award_amount` = nashr etilgan oylik summa (800000, KRW/month, `fixed`; 583 GKS precedenti), USD 0.
- **Kimlar uchun:** OECD DAC davlatlari fuqarolari (ota-onasi ham); yuqori badiiy iqtidor — portfolio bo'yicha tanlov; **til darvozasi — ingliz emas, koreys tili**: har bo'lim o'z TOPIK darajasini belgilaydi (2027 da Level 3–6), ingliz ballari TOPIK ni almashtira olmaydi. Shu sabab `min_gpa`/`min_ielts` NULL; guideline dagi yagona GPA raqami (90% / 3.87/4.3) — sobiq davlat-stipendiatlarning qayta topshirish chegarasi, kirish minimumi emas (matnga shunday yozildi).
- **Muddat holati:** 2027-qabul raundi **2026-yil 15-mayda yopilgan** — yozuv raundlar orasida saqlanadi: `deadline_date` NULL + `not_published` + rounds JSON (2027 intake), `application_status=not_announced`, expected maydonlar yillik aprel–may siklini ko'rsatadi. 20+ yillik uzluksiz faoliyat — bir martalik yopiq kohorta emas, har yili takrorlanuvchi sxema (583 GKS kabi).
- **Manba nuanslari (yashirilmadi):** veb-sahifaning jadval bloki sikllarni aralashtiradi (2025 ariza ↔ 2026 screening) — barcha sanalar PDF dan olindi; proficiency grantning "bir yil" muddati veb-sahifada qat'iy, guideline da bo'lim mezoniga qoldirilgan — tavsif guideline bo'yicha yozildi.

## Tekshiruvlar

- Hard-check: **550/206/1/194** (1008 — future hisoblanmaydi, deadline_date yo'q), minlow **36 → 36**; 1008 = `10/not_published/NULL/800000 KRW month fixed/["Bachelor","Master"]`; links 503–504.
- Local: `typecheck`, `check:i18n` (3310), `test:render` — **337/337**.
- Yozuvlar qat'iy ketma-ket; URL dublikatlari mintlashdan oldin tekshirildi.

## Replay

`supabase/scholarship_enrichment_batch44_2026-11-01.sql` (sources 3203–3204, 1008, links 503–504, setval).

## Keyingi qadamlar

- **Pass 138** (cleanup navbati): minima navbati (36) — Canada/France/Netherlands/New Zealand oilalari (3 tadan) yoki 794/858 amount-period flaglari (Pass 137 dan qolgan ochiq masala).
- Kuzatuv: AMA+ 2028-qabul guideline'i 2027-yil aprel atrofida chiqsa — 1008 raund sanalarini yangilash.
- Kuzatuvlar: **990** 2026-11-27 dan keyin; **421** noyabr oxiri; **876/875** CTU jonlansa; **723** Arizona xalqaro Terms e'lon qilinsa; **556/694/699** sahifalar to'g'ridan-to'g'ri o'qilsa; **541** faqat o'qiladigan GT-IF bilan; SINGA / 500 UM / 534 rasmiy sahifalar o'qilsa; USMCARE faqat ochiq raund bilan.
