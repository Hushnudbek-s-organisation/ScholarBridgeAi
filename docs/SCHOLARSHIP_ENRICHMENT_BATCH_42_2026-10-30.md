# Enrichment Batch 42 — Hong Kong davomiylik: PolyU STARS yangi yozuvi + Cultural Ambassador summasi tuzatildi

**Sana:** 2026-10-30
**Turi:** Enrichment Batch (Pass 135 flaglarining hal etilishi + bitta yangi sxema)
**Natija:** **548 active / 206 retired / 1 rel-≤4 / 208 future-dated**; minlow **44 → 44**. O'zgarganlar: scholarships 651 (update) + **1006 (yangi)**; sources 3190, 3191; links 490, 491; university_scholarships 70 (lv), 723 (yangi).

## 1. 651 — Cultural Ambassador: HK$50,000 → HK$60,000 (Pass-135 flagi yopildi)

Pass 135 da listing sahifasi "HK$60,000/yil gacha" ko'rsatgani, yozuvda esa 2026-10-23 o'qishidan HK$50,000 qolgani flag qilingan edi. Bugun sxemaning o'z sahifasi (source **3190**) birinchi qo'ldan o'qildi: **"Renewable scholarship of up to HK$60,000 per year"**, ariza kerak emas (avtomatik ko'rib chiqiladi), oluvchi Global Engagement Office bilan cultural ambassador sifatida ishlaydi. Tavsifdagi summa REPLACE bilan to'g'rilandi (hard-checkda LIKE bilan tasdiqlandi).

## 2. Yangi 1006 — PolyU STARS (rel 10)

Pass 135 qidiruvlarida ko'ringan **Special Talents Admission and Recognition Scheme (STARS)** — akademik kirish stipendiyalaridan (651) alohida nomlangan, iste'dodga asoslangan sxema — bugun o'z sahifasidan (source **3191**) to'liq o'qilib, alohida yozuvga aylandi:

- **Kimlar uchun:** Sport, San'at va madaniyat, Yetakchilik va jamoat xizmati yoki STEM sohalarida akademik natijalar to'liq aks ettirmaydigan yutuqlarga ega non-local abituriyentlar; STARS — muqobil qabul yo'li.
- **2027/28 darajalar ("subject to approval" deb e'lon qilingan):** T1 — renewables to'liq to'lov + HKD 60,000/yil nafaqa; T2 — to'liq to'lov + HKD 15,000; T3 — to'liq to'lov; T4 — yarim to'lov; T5/T6 — bir martalik to'liq/yarim to'lov. Renewal — universitet shartlarini bajarishga bog'liq (tafsilotlar sahifada yo'q — yozuvda ochiq aytilgan).
- **Tanlov:** alohida forma yo'q — eAdmission orqali STARS yo'li bilan topshirganda avtomatik ko'rib chiqiladi. Shu sababli `deadline_type=automatic`, `deadline_date`= operativ asosiy raund yopilishi (2027-02-11; erta raund 2026-11-17, kech arizalar 2027-05-14 gacha — sanalar 651 uchun 2026-10-23 da PolyU sahifalaridan tasdiqlangan, kelib chiqishi narrative'da ko'rsatilgan).
- **Kodlash:** ko'p darajali sxema — `award_amount` NULL + HKD/year/range, USD 0; min_gpa/min_ielts NULL (iste'dod yo'lida chop etilgan akademik/til chegarasi yo'q).

## 3. 556 CityU — yozuvsiz (intizom)

Renewal CGPA 3.2 raqamini qayta tekshirishga urinish: rasmiy `/international/` sahifasining qidiruv snippet'i hamon "3.2 or above" deydi, lekin URL umumiy admissions sahifasiga yo'naladi. Snippet — orientatsiya, tekshiruv emas; shuning uchun hech narsa yozilmadi — raqam 2026-10-23 birinchi-qo'l o'qishi asosida, Pass 135 dagi caveat bilan qoladi. Sahifa to'g'ridan-to'g'ri o'qiladigan bo'lganda qayta tekshiriladi.

## Tekshiruvlar

- Hard-check: **548/206/1/208** (1006 qo'shilishi: +1 active, +1 future-dated), minlow 44→44; 651 tavsifida HK$60,000 jumlasi borligi LIKE bilan tasdiqlandi; 1006 rel 10 / automatic / 2027-02-11 / NULL-range; links 490–491; us 723 mavjud.
- Local: `typecheck`, `check:i18n`, `test:render` — **337/337**.
- Yozuvlar ketma-ket; notes-qo'shimchalar qo'riqli (tag-eslatma: case-sensitive `'%BATCH 42%'` faqat 651 ni beradi; 1006 yaratilish yozuvi aralash registrda — kutilgandek).

## Replay

`supabase/scholarship_enrichment_batch42_2026-10-30.sql` (sources 3190–3191, 651 REPLACE, 1006 insert, links 490–491, us 70 lv + us 723, setval).

## Keyingi qadamlar

- **Pass 136:** minima navbati (44) — India (595, 597, 598, 599) yoki South Korea (583, 611, 794, 858) oilalari.
- Kuzatuvlar: **556** CityU sahifasi o'qiladigan bo'lsa (3.2 raqami); **990** 2026-11-27 dan keyin; **421** noyabr oxiri; **876/875** CTU jonlansa; **723** Arizona xalqaro Terms bo'limi e'lon qilinsa; **694/699** devorlar ochilsa; **541** faqat o'qiladigan GT-IF bilan; SINGA / 500 UM / 534 rasmiy sahifalar o'qilsa; USMCARE faqat ochiq raund bilan.
