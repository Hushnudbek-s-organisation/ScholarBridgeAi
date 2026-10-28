# Scholarship Rewrite Pass 113 — Denmark (2026-10-28)

Rejim: 1 tozalash ↔ 1 qo'shish almashinuvi bo'yicha Pass 113 (Batch 19 dan keyin). Maqsad — Daniya bo'yicha faol reliability-4 yozuvlarni nolga tushirish.

**Natija: Daniya reliability-4: 3 → 0.** 1 yozuv qayta yozildi (413), 2 yozuv nafaqaga chiqarildi (377, 414). Global hisoblagichlar: faol **541** (−2), nafaqadagi **178**, faol reliability-4 **28**, kelgusi deadline'lar **189** (+1).

Saqlangan uchala URL ham o'lik chiqdi (404/500) — qarorlar 2026-10-28 kuni chaqirilgan joriy rasmiy sahifalar asosida qabul qilindi.

---

## 1. Danish State Scholarships at Aarhus University — id 413 — QAYTA YOZILDI, reliability 10

Rasmiy manbalar: `masters.au.dk/scholarships-and-grants` + "Payment of monthly grants" sahifasi.

- **Shakli**: Danish davlati moliyalashtiradigan, AU ning o'z fondi yo'q; faqat to'lov to'laydigan (non-EU/EEA/Shveysariyadan tashqaridagi) eng iqtidorli magistr arizachilariga. Tarkibi fakultetga qarab: **Arts va Aarhus BSS — tuition waiver + oylik yashash granti**; **Natural/Technical Sciences — faqat waiver** (100%). Odatda har dasturga atigi **1–2 ta**.
- **Mexanizm — alohida ariza yo'q**: magistraturaga ariza topshirsangiz (yozgi qabul **15 yanvar**, qishki **15 sentyabr**gacha), universitet stipendiyaga **avtomatik** baholaydi; qo'shimcha hujjat yuklash taqiqlanadi ("upload qilmang" deb yozilgan). Taklif qabul xati bilan keladi, qabul qilish muddati juda qisqa; Nat/Tech da jarayon 1 aprel / 1 noyabrgacha davom etishi mumkin — qaroringiz waiver'ga bog'liq bo'lsa, qabul taklifini shu sanalargacha rad etmang.
- **Kodlash**: deadline `2027-01-15` (keyingi darvoza), status `upcoming`; NULL `DKK/year/variable` (oylik grant summasi sahifalarda chop etilmagan — o'ylab topilmadi). us 183, source 2489 jonli sahifaga.

## 2. UCPH International PhD Scholarship — id 377 — NAFAQAGA CHIQARILDI (uydirilgan nom / vakansiya portali)

- Bunday nomdagi dastur **yo'q**. Daniyada (butun mamlakat bo'ylab) PhD — bu **mehnat munosabati**: UCPH ning o'z staff sahifalari PhD fellow'ni akademik xodimlar toifasi (asosiy maosh + phd qo'shimchasi + pensiya, AC jamoa shartnomasi) sifatida ko'rsatadi.
- Moliyalashtirilgan pozitsiyalar ish portaliga (`employment.ku.dk/phd/`) bittalab, har biri o'z loyihasi va muddati bilan qo'yiladi — yagona "xalqaro stipendiya" mavjud emas. Saqlangan URL fetch'da HTTP 500 qaytaradi.
- Aylanuvchi vakansiya taxtasini bitta stipendiya deb ko'rsatish talabalarni chalg'itadi → pensiya. us 512 o'chirildi; source 2558 vakansiya portaliga yo'naltirildi (audit uchun).

## 3. DTU PhD Salaried Fellowships — id 414 — NAFAQAGA CHIQARILDI (bandlik modeli)

- DTU ning o'zi so'zma-so'z yozadi: *"PhD students in Denmark are considered employees and earn salary, pension, holidays..."* — odatda 3 yillik to'liq bandlik shartnomasi (maosh ~DKK 34,000/oy, 2024-yil aprel darajasi, pensiya bilan).
- Kirish yo'li — stipendiya e'loni emas, vakansiya: "How to apply for a PhD at DTU" sahifasi nomzodlarni **Vacancies** ro'yxatidagi oldindan belgilangan loyihalarga yo'naltiradi. Umumiy miqdor/deadline/mualliflik to'plami yo'q → pensiya. us 447 o'chirildi; source 2511 DTU rasmiy sahifasiga yo'naltirildi.

---

## Tekshiruvlar

- Supabase read-back: 413 rel 10, deadline `2027-01-15`, `DKK`; 377/414 `is_active=false/closed`.
- Hisoblagichlar: faol **541**, nafaqadagi **178**, faol reliability-4 **28**, kelgusi deadline **189**; Daniya reliability-4 = **0**.
- Mahalliy: `typecheck` ✅, `check:i18n` ✅, `test:render` ✅ 337/337.
- Uydirma miqdor kiritilmadi (AU oylik granti summasi rasmiy sahifalarda yo'q — NULL qoldirildi).

**Qolgan reliability-4 (28)**: Gonkong SAR 3 ta; Chili, Hindiston, Irlandiya, Meksika, Norvegiya, Saudiya Arabistoni, BAA 2 tadan; yana 11 davlat 1 tadan. Alternatsiya bo'yicha keyingi qadam — **Batch 20** (qo'shish), so'ng Pass 114.
