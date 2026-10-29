# Scholarship Rewrite Pass 131 — Buyuk Britaniya merit oilasi: shablon minima'si tozalovi (2026-10-29)

## Bu pass'da nima qilindi

Pass 129–130 va Batch 37 dan keyin qolgan 74 ta past-ishonchlilik (rel ≤ 8) minima'li yozuv mamlakat bo'yicha sanaldi; eng katta guruh — **Buyuk Britaniya, 10 ta yozuv**: 546 Birmingham, 573 Durham, 615 Leeds, 639 Nottingham, 666 Sheffield, 670 Southampton, 675 Swansea, 744 Leicester, 758 Strathclyde, 760 Sussex.

**Shablon izi:** hammasida `english_requirements` = "IELTS 7.0 or equivalent English test" yoki "IELTS 6.5 or equivalent English test", minima juftliklari esa 3.6/7, 3.3/7, 3.3/6.5, 3/6.5 — AQSh shkalasidagi GPA raqamlari. Britaniya universitetlari bunday mukofotlarni AQSh GPA'si bilan o'lchamaydi: mezon — A-level ekvivalentlari, kursga kirish talablari yoki avtomatik chegirma. Barcha 10 ta yozuv 2026-10-23 da rasmiy sahifalardan tasdiqlangan bo'lib, o'z description'lari aynan shu mexanizmni tasvirlaydi; tuzilmaviy raqamlar yozuvlarning o'zi bilan zid edi.

**To'rt yozuv bugun birinchi qo'ldan qayta o'qildi** (yangi manbalar 3167–3170, havolalar 465–468, `last_verified_at` yangilandi):

- **Durham (573):** tanlov ariza javoblari va akademik yutuqlar asosida; abituriyent dastur kirish talablarini bajarishi/oshib ketishi kerak — GPA/IELTS raqami yo'q.
- **Nottingham (639):** AAA yoki xalqaro ekvivalent → avtomatik £5,000; ariza ham yo'q.
- **Sheffield (666):** yiliga £2,500 avtomatik chegirma; davom etish sharti — 60% UK o'rtacha bali (AQSh GPA'si emas).
- **Leicester (744):** standart A-level kirish talabidan ikki baho yuqori ekvivalent → avtomatik £5,000/yil.

Qolgan oltitasi (546, 615, 670, 675, 758, 760) o'zlarining tasdiqlangan matnlari asosida tozalandi; ularning `last_verified_at`'i o'zgartirilmadi, notes'da shaffof qayd etildi.

**Yon-jadval:** barcha 10 qatorda "Typical academic profile: GPA X+, IELTS Y+." shablon gapi bor edi — regex bilan olib tashlandi (qoldiq 0).

**Kuzatuv (harakat qilinmadi):** Durham sahifasi bakalavriat bilan birga magistratura yo'lini ham ko'rsatadi; 573 yozuvi asosan bakalavriatga qaratilgan. Kengaytirish kerak bo'lsa, alohida enrichment'da ko'riladi.

## Natija

- 10 ta yozuvda `min_gpa`/`min_ielts` NULL; ingliz tili matni kurs darajasidagi formulaga almashtirildi.
- Rel ≤ 8 + minima mavjud yozuvlar: **74 → 64** (Pass 129 dan beri 94 → 64).
- Hisoblagichlar o'zgarmadi: **546 faol / 205 iste'fodagi / 1 ta rel-4 (876) / 208 kelajak-deadline**. Uydirma miqdor yoki deadline kiritilmadi.

## Qoldiq navbatlar

- Navbatga ko'ra keyingi bosqich — **Batch 38** (qo'shimcha/boyitish).
- Minima navbati davom etadi (64 ta): keyingi yirik guruhlar — Malaysia 7, Australia 6, US 5, Hong Kong/India/South Korea 4 tadan.
