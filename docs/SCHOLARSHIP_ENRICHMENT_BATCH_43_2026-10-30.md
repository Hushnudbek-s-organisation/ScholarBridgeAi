# Enrichment Batch 43 — Yangi yozuv: CityUHK sportchilar uchun OAES (HK$250,000/yil gacha)

**Sana:** 2026-10-30
**Turi:** Enrichment Batch (Pass 136 dan keyin navbat bo'yicha)
**Natija:** **549 active / 206 retired / 1 rel-≤4 / 209 future-dated**; minlow **40 → 40**. Qo'shilganlar: scholarship **1007**; source 3195; link 495; university_scholarships 724.

## Batch borishi va rad etilgan kandidat

Batch boshida ikkita yo'nalish tekshirildi:

1. **HKSAR Belt and Road / Government Scholarship** — Study in Hong Kong sahifasi birinchi qo'ldan o'qildi, lekin katalogda **974 (Belt and Road)** va **975 (Outstanding Performance)** yozuvlari allaqachon to'liq shaklda, rel 10 bilan mavjud ekan (ikkisi ham 2026-10-28, Batch 21 da, jumladan 2024/25 da Lingnan University dagi O'zbekistonlik sovrindor dalili bilan). Yangi yozuv shart bo'lmadi — dublikat yaratilmadi, sahifadan manba ham mintlanmadi (xuddi shu sahifa 974 da source 3109 sifatida mavjud).
2. **CityUHK OAES** — Student Development Services rasmiy sahifasi to'liq (2/2 chunk) o'qildi va alohida sxema sifatida katalogga birinchi marta qo'shildi (bazada sportchi sxemasi ilgari yo'q edi).

## Yangi 1007 — Outstanding Athletes Entrance Scholarship (OAES) for Non-Local Students

1997-yildan beri ishlayotgan Student Athletes Admission Scheme (1,600+ talaba) ning non-local sportchilarga kengaytirilgani:

- **Miqdor:** yiliga **HK$250,000 gacha** (universitetning o'z taxmini ≈ US$32,050 — tavsifda keltirilgan, strukturlanmagan); akademik Top Scholarship (556) ga ekvivalent deb e'lon qilingan; Diversity Grant bilan birlashtirilmaydi.
- **Qoplama:** bakalavrlar uchun to'liq to'lov (normal muddat, max 4 yil) + yotoqxona haqini qoplaydigan Residence Scholarship; magistrlar uchun — faqat bir yilga to'liq/qisman to'lov, yotoqxona yo'q.
- **Tanlov:** 18 ta sport turi (atletika, badminton, basketbol, cross country, dragon boat, qilichbozlik, gandbol, karatedo, regbi, futbol, squash, suzish, stol tennisi, taekvondo, tennis, voleybol, suv polosi, woodball); panel tanlovi, shortlist kollej/maktablarga qabul ko'rib chiqishi uchun tavsiya etiladi.
- **Topshirish (ikki bosqich):** 1) qabul arizasi — asosiy raund **2027-yil 15-yanvar**; 2) OAES onlayn formasi + hujjatlar **2027-yil 30-yanvar** (murabbiy/menejer tavsiyasi ≤2 yil, transkriptlar, TOEFL/IELTS dalillari, rasmiy match videolari bilan sport CV, 3 oylik shifokor xati).
- **Renewal:** sport natijasi qoniqtiruvchi + CGPA ≥ 2.5 (kirish minimumi emas — strukturlanmadi); jarohatni oshkor qilmaslik/to'satdan kelib musobaqaga chiqa olmaslik — grace period va yo'qotish xavfi bo'lishi yozuvda qayd etilgan.

Kodlash: `award_amount` 250000 HKD/year/`range` (chop etilgan "up to" maksimum — 783 precedenta mos), USD 0; `deadline_type=fixed`, sana 2027-01-30; darajalar Bachelor+Master; min_gpa/min_ielts NULL.

## Tekshiruvlar

- Hard-check: **549/206/1/209** (+1 active, +1 future-dated), minlow 40→40; 1007 rel 10 / fixed / 2027-01-30 / 250000-range; link 495 va us 724 mavjud.
- Local: `typecheck`, `check:i18n`, `test:render` — **337/337**.
- Yozuvlar ketma-ket; dublikat/kolliziya tekshiruvlari yozishdan oldin bajarildi.

## Replay

`supabase/scholarship_enrichment_batch43_2026-10-30.sql` (source 3195, 1007 insert, link 495, us 724, setval). 974/975 ga tegilmadi.

## Keyingi qadamlar

- **Pass 137:** South Korea minima oilasi (583 NIIED qoidalari, 858 chop etilgan qabul-ingliz darajalari — har biri alohida) — navbatda 40 ta yozuv.
- Kuzatuvlar o'zgarmadi: **990** 2026-11-27 dan keyin; **421** noyabr oxiri; **876/875** CTU jonlansa; **723** Arizona xalqaro Terms bo'limi e'lon qilinsa; **556/694/699** sahifalar to'g'ridan-to'g'ri o'qilsa; **541** faqat o'qiladigan GT-IF bilan; SINGA / 500 UM / 534 rasmiy sahifalar o'qilsa.
