# Scholarship Rewrite Pass 127 — 2026-10-29

Rotatsiya bo'yicha tozalash bosqichi: navbatdagi dublikatlar ro'yxati — 31/849, 44/554 va "UBC 49/65". Birinchi ikkitasi chinakam ikkilangan yozuvlar bo'lib chiqdi; UBC masalasi esa butunlay boshqacha xato bo'lib chiqdi (quyida).

## 1) 31/849 — Peking University CSC: 849 nafaqaga, 31 saqlanib qoldi

Ikkala yozuv ham bitta narsani — Peking Universitetidagi Xitoy Hukumat Grantini (CSC) — tasvirlagan va ikkalasi ham 2026-10-26 da bitta rasmiy CSC qo'llanmasidan (campuschina.org) qayta tekshirilgan edi: to'liq o'qish to'lovi, bepul yotoqxona yoki subsidiya, yiliga CNY 800 tibbiy sug'urta, oyiga CNY 2 500 / 3 000 / 3 500 stipendiy. Ikkita yozuv bitta sxema uchun ortiqcha.

- **849 nafaqaga chiqarildi** (rel 9, `closed`): sarlavha dublikat ekanini ko'rsatadi, matn o'qiguvchini 31-yozuvga yo'naltiradi. Yon jadvaldagi payvandlangan qator (us 379) o'chirildi.
- **31 saqlanib qoldi va birlashtirildi**: daraja darajalari bakalavrdan PhD gacha kengaytirildi (avval faqat magistr/PhD edi); 849 dagi qimmatli tafsilotlar — Type A / Type B farqi (Type B da stipendiya bo'lmasligi mumkinligi haqidagi ogohlantirish) va aviachipta qoplanmasligi — ko'chirildi; `award_basis` `fixed → variable` qilindi. Ishonchlilik (rel 9) va `last_verified_at` o'zgarmadi — shartlar bo'yicha yangi sahifa o'qilmadi.
- Qayd: 31 dagi Peking ISD havolasi (manba 2717) 2026-10-29 da sinovdan o'tkazilganda **404** qaytardi — bu yozuv izohiga kiritildi; ishlayotgan manba — CSC qo'llanmasi. Pekingning o'z chaqiruvi hali ham universitet saytida tasdiqlanishi kerak.
- us 21 holati `'Yes' → 'available'` normallashtirildi.

## 2) 44/554 — Fudan University CSC: 554 nafaqaga, 44 saqlanib qoldi

Xuddi shu manzara: ikkala yozuv ham Fudandagi CSC ni bitta qo'llanmadan tekshirgan. 554 ning import tarixida Shanghai Government Scholarship ham qatorga payvandlangan bo'lgan (2026-10-23 da ajratilgan).

- **554 nafaqaga chiqarildi**; payvandlangan yon-qator us 39 ("CSC & Shanghai Gov Sch...") o'chirildi. Fudan uchun alohida Shanghai Government Scholarship yozuvi qo'shilsa, u o'zining birinchi qo'l tekshiruvini talab qiladi — bu passda qo'shilmadi.
- **44 saqlanib qoldi va birlashtirildi**: daraja darajalari kengaytirildi, Type A/B + aviachipta + "SGS alohida sxema" ko'rsatgichi qo'shildi, `award_basis` normallashtirildi. Rel 9 va `last_verified_at` o'zgarishsiz.

## 3) "UBC 49/65" — dublikat emas, noto'g'ri havola bo'lib chiqdi

Tekshiruv kutilmagan natija berdi:

- Grantlar jadvalida **65-ID mavjud emas**; 49-ID esa Monash (Avstraliya, rel 10). "49/65" aslida **`universities` jadvalidagi IDlar** ekan: 49 = University of British Columbia, 65 = University of Alberta — ikkita alohida, qonuniy universitet, dublikat yo'q.
- Haqiqiy xato: **356-yozuv (UBC International Scholars Program) ikkala joyda ham Alberta ga (65) biriktirilgan** edi — ham `scholarships.university_id`, ham yon-qator us 592. Natijada UBC granti Alberta sahifasida, 721-yozuv yonida ko'rinardi.
- Tuzatish: ikkala ko'rsatgich ham **49 (UBC)** ga o'tkazildi. Endi UBC da 3 grant + 3 yon-qator (142, 356, 602), Alberta da 1 tadan. Universitet qatori o'chirilmadi; boshqa jadvallarga tegilmadi. Kanada klasteri tekshirildi — boshqa adashgan ko'rsatgich topilmadi (boshqa klasterlar audit qilinmadi).

## Tekshirildi, harakat qilinmadi

- Yangi manba yaratilmadi: Pass 127 da atigi bitta fetch bajarildi (Peking ISD — 404), u ham faqat izohda qayd etildi. Dublikat dispozitsiyalari ikkala qatorning 2026-10-26 dagi tasdiqlangan matniga tayandi.
- `universities` dublikatlari boshqa juftliklarda qidirilmadi — bu alohida audit mavzusi.

## Natija (qattiq tekshiruv)

- **544 faol / 197 nafaqada** (oldingi 546/195 dan −2/+2) / **1 rel-4 (876 CTU)** / **199 kelajak-muddat** (o'zgarmadi).
- Maks IDlar o'zgarmadi: grantlar 993, manbalar 3153, `university_scholarships` 711, havolalar 427 (bu passda INSERT bo'lmedi, setval shart emas).
- Mahalliy tekshiruvlar: typecheck ✓, check:i18n ✓, render 337/337 ✓.

Keyingi qadam: **Enrichment Batch 34**. Tozalash tomonida: 876 (CTU sayti qaytganda); mumkin bo'lgan keyingi audit — `university_id` nomutanosibliklarini boshqa klasterlarda qidirish.
