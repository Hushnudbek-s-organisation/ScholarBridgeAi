# Scholarship Rewrite Pass 110 — Finland (2026-10-27)

Rejim: 1 tozalash ↔ 1 qo'shish almashinuvi bo'yicha Pass 110 (Batch 16 dan keyin). Maqsad — Finlandiya bo'yicha faol reliability-4 yozuvlarni nolga tushirish.

**Natija: Finlandiya reliability-4: 4 → 0.** 3 yozuv qayta yozildi (405, 504, 505), 1 yozuv nafaqaga chiqarildi (353 — dublikat). Global hisoblagichlar: faol **539** (−1), nafaqadagi **172**, faol reliability-4 **38**, kelgusi deadline'lar **183**.

Barcha faktlar 2026-10-27 kuni rasmiy sahifalardan birinchi qo'ldan o'qildi (`aalto.fi`, `utu.fi`, `oulu.fi`, `helsinki.fi`). Saqlangan Xelsinki URL'i 404 qaytardi; Aalto/Turku/Oulu sahifalari tirik edi.

---

## 1. Aalto University Excellence Scholarship — id 405 — QAYTA YOZILDI, reliability 10

Rasmiy manba: Aalto "Scholarships and Tuition Fees" sahifasi.

- **Shakli**: to'liq (100%) tuition waiver, daraja normativ muddatiga (bakalavr 3 yil, magistr 2 yil); juda cheklangan son, har dasturning baholash mezonlari bo'yicha eng kuchli arizachilarga; dastur umuman bermasligi ham mumkin. Yashash xarajati qoplanmaydi (kamida €800/oy o'zingizdan).
- **To'lovlar (2025-08-01 dan)**: bakalavr €12,000–15,000/yil; magistr €15,000 (Business), €17,000 (Technology), €20,000 (Art/Architecture).
- **Ariza**: faqat qabul arizasi ichidagi katakcha orqali, ariza davrida; qaror qabul qarori bilan birga; apellyatsiya qilib bo'lmaydi. EU sanktsiya ro'yxati tekshiruvi.
- Qo'shimcha qoidalar: bakalavrga yangi kiruvchilar 21 kunda qabul qilib to'lasa 1-yilga 25% chegirma; Aalto bakalavrini Excellence bilan 3 yilda, o'rtacha ≥3.5 bilan bitirganlar magistrga ham 100% waiver oladi. (Sahifadagi alohida Pekka Mattila grant — kelgusi additions nomzodi.)
- **Kodlash**: titl rasmiy nomiga me'yorlandi ("Scholarship Programme" → "Excellence Scholarship"); `degree_levels` Bachelor's+Master's (eski qator faqat Master's derdi); NULL `EUR/year/variable` (100% waiver); deadline NULL/`not_published` + rounds'da ariza-davr naqshi; status `upcoming`. us 100 sinxron; source 2476 joriy sahifaga.

## 2. University of Turku Merit Scholarship and Early Bird Discount — id 504 — QAYTA YOZILDI, reliability 10

Rasmiy manba: UTU "Tuition fees and scholarships" sahifasi (2026 qabul qilinganlar uchun nashr).

- **1-yilga stipendiya YO'Q** — buning o'rniga magistrantlarga €2,000 Early Bird chegirma (taklifni qabul qilib, qarorlardan keyin 28 kun ichida to'lasa; 2026: 24 aprelgacha; bakalavrga yo'q).
- **Merit Scholarship (2-yildan)**: keyingi yil to'lovining 50%; shartlarni bajargan har bir talabaga beriladi (reyting tanlovi emas): 55 kredit/yil (bakalavr 3-yili uchun 1–2-yillarda 110), o'rtacha baho ≥3.0 (Finlandiya 1–5 shkalasi), kamida 4 kredit fin tili. Bahor raundida alohida ariza (eligible'lar taklif qilinadi).
- To'lovlar asosan €10,000–12,000/yil → waiver odatda €5,000–6,000.
- **Kodlash**: NULL `EUR/year/variable`; 3.0/5 — davom ettirish mezoni, matnda qoldirilib `min_gpa` NULL; deadline NULL/`not_published` + yillik naqsh; us 455; source 997.

## 3. University of Oulu Partial Tuition Fee Waiver Scholarships and Early Bird Discounts — id 505 — QAYTA YOZILDI, reliability 10

Rasmiy manba: Oulu xalqaro abituriyentlar sahifasi (2026-kzuz/2027-bahor qabuli, 2027–28 boshlanishi uchun amaldagi nashr).

- **Early Bird (1-yil)**: natijalardan keyin 3 hafta ichida to'lasa tanlangan dasturlarda 5–30% chegirma (ko'pi 30%; bakalavr dasturlari 30%).
- **Waiver (2-yildan)**: dastur bo'yicha qat'iy 10–40% (bakalavr 20–30%); shart: tasdiqlangan o'quv reja bo'yicha yiliga ≥60 ECTS, jumladan dasturning fin tili kurslari. Bir dasturda (Epidemiology and Biomedical Data Science) ikkalasi ham yo'q.
- To'lovlar: magistr €8,500–14,000/yil, bakalavr €10,000.
- **Kodlash**: NULL `EUR/year/variable`; deadline NULL/`not_published` + naqsh; us 456; source 916.

## 4. University of Helsinki International Master Grant — id 353 — NAFAQAGA CHIQARILDI (dublikat)

- "International Master Grant" nomli mukofot mavjud emas. Rasmiy "Tuition fees and scholarship programme" sahifasi (2026-10-27 o'qildi): dastur faqat **50%/100% tuition waiver**lardan iborat (juda oz, ko'pi 50%), 2 yil, ≥55 ECTS/yil sharti bilan; universitet yashash xarajatiga stipendiya bermasligi alohida aytilgan.
- Bu haqiqiy sxema katalogda **742** yozuvda (reliability 9) to'liq va to'g'ri yoritilgan — 353 ni qayta yozish ikkinchi nusxa yaratardi. Titl yana "grant" so'zi bilan universitetda yo'q yashash mablag'ini va'da qilgandek ko'rinardi → nafaqaga chiqarildi. us 590 o'chirildi; source 2536 rasmiy sahifaga yo'naltirildi (audit).

---

## Tekshiruvlar

- Supabase read-back: 353 `is_active=false/closed`; 405/504/505 rel 10; kodlash/darajalar tasdiqlandi.
- Hisoblagichlar: faol **539**, nafaqadagi **172**, faol reliability-4 **38**, kelgusi deadline **183**; Finlandiya reliability-4 = **0**.
- Mahalliy: `typecheck` ✅, `check:i18n` ✅, `test:render` ✅ 337/337.
- Uydirma miqdor/deadline kiritilmadi; uchalasida ham foizli waiver'lar `EUR/year/variable` + matndagi aniq foizlar bilan kodlandi.

**Qolgan reliability-4 (38)**: Shvetsiya 4; Avstriya, Daniya, Gonkong SAR 3 tadan; Chili, Hindiston, Irlandiya, Meksika, Norvegiya, Saudiya Arabistoni, BAA 2 tadan; yana 11 davlat 1 tadan. Alternatsiya bo'yicha keyingi qadam — **Batch 17** (qo'shish), so'ng Pass 111 (Shvetsiya nomzod).
