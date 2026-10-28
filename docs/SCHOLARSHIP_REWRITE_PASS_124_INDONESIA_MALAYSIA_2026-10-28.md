# Rewrite Pass 124 (2026-10-28) — Indonesia 398 va Malaysia 339 pensiyaga chiqarildi; Czechia 876 fetch devori sabab qoldirildi

## Mazmun

Pass 124 rel-4 ro'yxatidan uchta yozuvni ko'rib chiqdi. **398** ("ITB Presidential Scholarship for International Students") — ITBning rasmiy hamkorlik sahifasidagi to'liq ro'yxatda bunday mukofot yo'q → ixtiro qilingan nom sifatida **pensiyaga chiqarildi**. **339** ("Universiti Malaya Bright Sparks and Graduate Fellowship") — 2009-yilda tashkil etilgan, ammo arizalari yopilgan Bright Sparks dasturi nomi umumiy yorliq ("Graduate Fellowship") bilan payvandlangan; UMning amaldagi mukofoti — **500** (UM Bright Scholarship) → **pensiyaga chiqarildi**. **876** (CTU Scholarship for Foreign PhD Students) — mukofot **haqiqiy** (qidiruv indeksi rasmiy sahifadagi qoidalarni ko'rsatadi), lekin sahifa fetch vositamizga uchinchi bor ham ochilmadi (HTTP 500) → shartlar kodlanmadi, yozuv halol rel-4 placeholder holida **qoldirildi**, notes ga qayta tekshiruv qaydi qo'shildi.

| Yozuv | Harakat | Natija |
|---|---|---|
| `398` ITB "Presidential Scholarship…" | **Pensiyaga chiqarildi** | Ixtiro nom; haqiqiy kanallar = 541 (GT-IF), 579 (KNB) |
| `339` UM "Bright Sparks and Graduate Fellowship" | **Pensiyaga chiqarildi** | Payvandlangan/yopilgan nom; amaldagi = 500 |
| `876` CTU Foreign PhD Students | Qayta tekshiruv (notes) | Faol, rel 4; fetch devori hujjatlashtirildi |
| us `584` (339 katalog qatori) | O'chirildi | — |
| Manba `3142` (ITB partnership sahifasi) | Qo'shildi | (398,3142) + tirik 541 ga (541,3142) |

Sanag'ichlar: **550 → 548 faol / 190 → 192 pensiyaga chiqqan / 7 → 5 rel-4 / 199 kelajak deadline**. Max id: scholarships 992, sources 3142, university_scholarships 711, links 412. Lokal tekshiruvlar **337/337**.

## Dalillar (2026-10-28)

### 398 — ITB (birinchi qo'l fetch ✓)

- **partnership.itb.ac.id/scholarships/** (yangi manba **3142**, bitta chunk): kiruvchi xalqaro talabalar uchun aynan **4 dastur** — **Ganesha Talent Fellowship (GT-IF)** (ITB moliya; magistr/doktor; tuition + ehtimoliy living allowance; deadline "To be announced"), **KNB Scholarship** (vazirlik; tuition/living/insurance/settlement/airfare + 1 semestr Bahasa tayyorlov; belgilangan rivojlanayotgan davlatlar), **Indonesian Aid (TIAS)** (Moliya vazirligi; davlat sektori yetakchilari; associate–magistr), **ASEAN-Maybank** (faqat bakalavr, faqat ASEAN fuqarolari). "Presidential" degan narsa yo'q.
- ITB admission bosh sahifasi va international-program sahifasi ham o'qildi (faqat dastur tuzilmasi).
- Tirik yozuvlar: **541** (GT-IF, rel 7 — xuddi shu sahifadan 2026-10-25 da yozilgan), **579** (KNB, rel 9). TIAS katalogda yo'q → kelajakdagi batch nomzodi (hamkor davlatlar o'qilmadi, da'vo yo'q).

### 339 — Universiti Malaya (fetch devori; shaffof provans)

- UM subdomenlari (saqlangan aadc, aasd, ips) fetch vositasiga ochilmadi (4 urinish muvaffaqiyatsiz, 1 bo'sh javob). Shu sabab **yangi "verified" manba yaratilmadi**.
- Birinchi qo'lda o'qilganlar: **um.edu.my** bosh sahifasi — "Scholarship & Financial Aid → Postgraduate" navigatsiyasi 500-yozuvning manba oilasiga (aasd…/financial-aid-for-postgraduate) olib boradi; study.um.edu.my.
- Qaror asosi: (a) **500** ning 2026-10-23 birinchi qo'l tekshiruvi (UM Bright Scholarship — universitetning o'z xalqaro mukofoti: 7 semestr tuition waiver + MYR 3,500/oy ≤42 oy, PhD by research; bakalavr xalqaro grant yo'q); (b) IPS rasmiy sahifalarining qidiruv-indeks nusxalari: Bright Sparks Program **2009-09-09 da tashkil etilgan** (to'liq kunduzgi PhD nomzodlari), IPS grantlar sahifasi: *"The application of Bright Sparks Program is closed at this moment"* (yonida MIS/MTCP/CSFP ro'yxati). Snippet mazmuni faqat **pensiya qarori uchun audit provansi** sifatida ishlatildi (nomlangan mukofot ochiq/topshiriladigan emas) — jonli shartlar kodlanmadi; ular 500 da yashaydi.
- Navbat: aasd xosti ochilsa, PG aid sahifani qayta o'qib 500 ni uplift qilish (uning min_gpa 3.3 / min_ielts 6 va nostandart `award_basis='full_tuition'` gigiyenasi ham navbatda).

### 876 — CTU (qoldirildi, rel 4)

- Saqlangan rasmiy URL (international.cvut.cz …/ctu-scholarships/) bugun https va http da **HTTP 500**; 2026-10-26 da ham fetch xatosi edi; curl — sandbox egress bilan bloklangan.
- Qidiruv indeksi (sahifa 2025-09-19 indekslangan, bugun qayta topildi) sahifa jonli ekanini va **"Rules for awarding scholarships to foreign students in doctoral study programmes at CTU"** ni ko'rsatadi; indeks matnida: asosiy doktoral grant + yashash xarajatlari **oyiga 16 000 CZK gacha**, **6–12 oy** (a'lo natijalarda uzaytiriladi), 50/50 rektorat/fakultet, istisnolar (Erasmus/almashinuv, hukumat granti egalari), ariza fakultet International Office orqali, qaror — vitse-rektor; natija majburiyati — xalqaro retsenziyali jurnalda maqola yoki xalqaro grant arizasi. Bu 875-qardoshning xuddi shu sahifadan 2026-10-23 dagi tekshiruvi (magistr varianti 10 000 CZK gacha) bilan uyg'un. **Biroq bu raqamlar snippet provansi — uy qoidasi (477/IITD) bo'yicha shartlarga KODLANMADI.** Mukofot haqiqiy deb topilgani uchun pensiya ham noto'g'ri bo'lardi → yozuv o'zgarmadi, faqat notes ga to'liq qayta-tekshiruv qaydi qo'shildi.
- Navbat: keyingi sikllarda fetch ni qayta urinish / cvut.cz ko'zgusi; 875 gigiyenasi (amount_usd_value 4300 konversiya, minima) — kelajak uplift uchun.

## Qarorlar

- Ikkala pensiya ham Pass 122/123 shaklida (closed, recurrence none, award oilasi NULL, tushuntiruvchi sarlavha, manba izi saqlangan; 398 ga yangi manba linklandi, 339 da o'qilmagan sahifa uchun manba yaratilmadi).
- Uydirma miqdor/deadline kiritilmadi; snippet raqamlari (CZK 16 000) atayin kodlanmadi.
- 541 ga tegilmadi (faqat link qo'shildi); 500/875 ga tegilmadi (gigiyena navbatlari qayd etildi).

Qolgan rel-4 (5): **Czechia 876** (fetch devori), Russia 466, South Africa 503, Taiwan 342, Thailand 502.

## Fayllar

- `supabase/scholarship_rewrite_pass124_indonesia_malaysia_2026-10-28.sql` — bajarilgan operatorlar (manba 3142, 398/339 retire, 876 notes-append, linklar 411–412, us 584 DELETE, setval).
