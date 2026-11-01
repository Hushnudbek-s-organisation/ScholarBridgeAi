# Scholarship Rewrite Pass 108 — 2026-10-27

## Maqsad

Belgium (Belgiya) bo'yicha faol `source_reliability = 4` qoldiqlarini (4 ta yozuv) rasmiy manbalardan tekshirish. Pass 108 oldidan: 537 faol, 167 retired, 50 ta faol reliability-4, 176 kelajak deadline. Sessiya boshida sandbox yana `b6085bb` ga qaytgan edi; barcha kuzatilmagan fayllar `27635b1` bloblari bilan baytma-bayt tekshirilib, `git reset --hard` bilan xavfsiz tiklandi.

## Ko'rib chiqilgan yozuvlar

- 144 — KU Leuven Master Mind Scholarship (URL boshqa sxema — Science@Leuven'ga ishorat qilardi)
- 410 — Ghent University Top-Up Grants and BOF Fellowship (ikki sxema bitta yozuvda)
- 412 — VUB International Master Scholarship (URL — 404 katalog)
- 479 — UCLouvain International Excellence Scholarship (URL — ro'yxatga olish portali)

## Qayta yozilgan yozuv

### 144 — Master Mind Scholarship at KU Leuven (reliability 9)

KU Leuven'ning rasmiy 2027-2028 Master Mind sahifasi + English Proficiency Tests sahifasi birinchi qo'ldan o'qildi. Tuzilishi: Flamand Ta'lim vazirligining flagman sxemasi uchun KU Leuven marshruti — shu bilan 144 mavjud Master Mind oilasiga qo'shildi (markaziy 411, Ghent 581, VUB 785). Shartlar: **€10,750 grant** + EEA tarifi bo'yicha tuition (~€1,200/yil — non-EEA ustama bekor qilinadi); 60/120 ECTS bo'yicha 1–2 yil; siklda KU Leuven uchun 3 ta stipendiya; ariza **2026-yil 15-oktabrdan 2027-yil 15-yanvar** (23:59 CET) — `deadline_date=2027-01-15`, `open`. Bir ariza Inspiring the Outstanding va mintaqaviy KU Leuven stipendiyalariga ham nomzodlikni ochadi; nominatsiya 10-martda, natija mart oxirida.

**Nega rel 9:** KU Leuven 2027-2028 ma'lumotini "preliminary, subject to change, pending confirmation no later than January 2027" deb belgilagan va €10,750 ni "dastur uzunligini qoplash uchun" deb yozgan (2026-2027 sahifasidagi aniq "€10,225 per academic year + full waiver" iborasisiz). €10,750 `EUR/year/fixed` sifatida saqlandi (Master Mind qatori bilan mos), lekin o'qish matнда ochiq yozildi. `min_ielts` NULL: KU Leuven umumiy minimumi 6.5, oldingi Master Mind sikli 7.0 talab qilgan — 2027-2028 uchun scholarship darajasidagi aniq son yanvarda tasdiqlanadi (ikkalasi ham matнда). us 46 sinxronlandi.

## Retired yozuvlar

### 410 — Ghent University Top-Up Grants and BOF Fellowship

Saqlangan URL 404; UGent'ning Global South grantlar tizimidagi sxema/sharh sahifalari ham olib tashlangan va joriy rasmiy "Scholarship possibilities for candidates from the Global South" sahifasida (fetch qilingan) Top-up Grants endi yo'q — faqat VLIRUOS ICP Connect (29 mamlakat bilan cheklangan, O'zbekiston ichida yo'q), IFS va alohida BOF doktorantura havolasi qoldirilgan. Top-up Grants haqida qoldiq ma'lumotlar faqat agregatorlarda "qotgan" nusxalar — NZIDRS precedentiga ko'ra sxema yopilgan/tekshirib bulmaydigan deb retired qilindi. Sarlavha ham magistratura granti bilan BOF doktorantura fellowship'ini aralashtirgan edi. us 623 withdrawn.

### 412 — VUB International Master Scholarship

Bunday nomli sxema mavjud emas: VUB rasmiy ro'yxati Master Mind (785 bazada bor), Erasmus Mundus, Photonics stipendiyalari, ICP, CSC va kichik dastur darajadagi grantlarni sanaydi; saqlangan URL ham 404 edi. Uylab topilgan soyabon nom → retired. Jonli sxemalar (masalan, Photonics) alohida tekshirilib, kelgusi batchlarda qo'shilishi mumkin.

### 479 — UCLouvain International Excellence Scholarship

UCLouvain'ning rasmiy FAQ ochiq yozadi: *"UCLouvain does not grant scholarships to international bachelor's or master's students."* Saqlangan URL ro'yxatga olish portali; sarlavha (Bachelor's+Master's+PhD) uylab topilgan — retired, us 498 withdrawn. Shu bilan birga haqiqiy yangi sxema ko'rindi: **EPL (Louvain Engineering) Excellence Scholarships** — xalqaro magistrantlar (Engineering/CS/Data Science) uchun to'liq tuition; bu 479 emas, alohida fakultet sxemasi — kelgusi additions batch nomzodiga qo'yildi (birinchi qo'ldan tekshirish bilan).

## Manbalar va bog'liqlik

- 2559 (144) → KU Leuven Master Mind 2027-2028 rasmiyligi; 2647 (410) → UGent Global South joriy sahifasi; 2694 (412) → VUB joriy scholarships ro'yxati; 832 (479) → UCLouvain FAQ ("does not grant scholarships" bayonoti). Kolliziya 0.
- `university_scholarships`: 46 sinxron (KU Leuven), 623 va 498 withdrawn.

## Hisoblagichlar va tekshiruv

- Faol: **534** (537 − 3 retirement) · Retired: **170**
- Faol reliability-4: **46** (50 − 4) — Belgiyada **0** qoldi
- Kelajak deadline'lar: **177** (176 + 1: 144→2027-01-15)
- `npm run typecheck`, `npm run check:i18n` o'tdi; `npm run test:render` — **✅ 337 passed, 0 failed**

## Halollik qaydi

Tozalash tugamadi: bazada hali ham 46 ta faol reliability-4 yozuv bor (eng kattalari: Finland, France, Sweden — 4 tadan; Austria, Denmark, Hong Kong SAR — 3 tadan). Keyingi qadam — Batch 15.
