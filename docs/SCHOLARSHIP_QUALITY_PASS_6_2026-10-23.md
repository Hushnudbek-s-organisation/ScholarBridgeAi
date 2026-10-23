# Stipendiyalar sifati — 6-pass (2026-10-23)

Bu safar yangi dastur qo'shishdan ko'ra **mavjudlaridagi xatolarni** topishga e'tibor berdim.
Uch xil nuqson topildi va uchtasi ham tuzatildi.

---

## 1. O'lik va noto'g'ri havolalar

| Yozuv | Muammo | Tuzatish |
|---|---|---|
| **HKU Entrance Scholarship** (29) | `/scholarships/` endi qabul bosh sahifasiga yo'naltiradi | `/fees-and-scholarships/scholarships` + ariza sahifasi |
| **NTU Nanyang** (30) | sahifa **404** | jonli Nanyang Global Scholarship sahifasi |
| **NUS** (28) | ikkala havola ham ishlamaydi | to'g'ri fakultet sahifasi |

## 2. Eng jiddiy topilma — NUS noto'g'ri dastur edi 🔴

Bazadagi yozuv **"NUS Global Merit Scholarship"** deb turardi. NUS saytida bu dastur
**faqat Singapur fuqarolari uchun**. Ya'ni o'zbek talabasi bu yozuvni ko'rib, hech qachon
yuta olmaydigan stipendiyaga ariza tayyorlashi mumkin edi.

To'g'ri dastur — **NUS International Undergraduate Scholarship**: Singapurdan boshqa
barcha davlatlar uchun. Yozuv nomi va mazmuni almashtirildi:

- 100% subsidiyalangan kontrakt + **S$5 800** yashash + **S$1 750** kompyuter + **S$5 000** turar joy
- MOE Tuition Grant sharti (3 yil Singapurda ishlash bondi)
- Har semestr GPA ≥ 3.5 bo'lsa yangilanadi
- Alohida ariza yo'q — qabul arizasi orqali ko'rib chiqiladi

## 3. Cambridge Trust — bitta dastur emas, 61 ta

Yozuv "Cambridge Trust International Scholarship", $50 000 va 5-dekabr muddati bilan turardi.
Trust saytida bunday yagona stipendiya **yo'q** — uning qidiruvida **61 ta alohida dastur** bor,
har birining o'z millati/sohasi/kolleji sharti bilan. Yozuv shunga moslab qayta yozildi,
o'ylab topilgan summa va sana o'chirildi.

## 4. 16 ta takroriy yozuv — "+ El-Yurt Umidi" shabloni

PDF importdan qolgan 15 ta yozuv shunday ko'rinishda edi:

> "MIT Need-Based Scholarship **+ El-Yurt Umidi**" — manba `mit.edu` (universitet bosh sahifasi),
> summa "$101 622" — na MIT, na jamg'arma bunday raqam e'lon qiladi.

Har biri **ikkitasini** takrorlaydi: universitetning o'z stipendiyasini va El-Yurt Umidi
dasturini (id 862, `eyuf.uz`). Ya'ni talaba universitet sahifasida **bir xil moliyalashni ikki
marta** ko'rardi.

O'chirilmadi — **arxivlandi** (`is_active = false`), sabab `notes` ga yozildi:

| ID | Nima | ID | Nima |
|---|---|---|---|
| 627 | MIT | 647 | Penn |
| 653 | Imperial | 557 | Columbia |
| 852 | Stanford | 818 | Edinburgh |
| 662 | Oxford | 824 | King's |
| 548 | Cambridge | 582 | Manchester |
| 857 | UCL | 683 | Bristol |
| 804 | Caltech | 788 | Warwick |
| 545 | Berkeley | 617 | LSE |

Tekshirildi: bu 15 universitetning **har birida kamida bitta** boshqa faol stipendiya qoldi,
ya'ni hech bir universitet stipendiyasiz qolmaydi.

Qo'shimcha: **106** (Imperial President's PhD) — 22-id dagi tasdiqlangan yozuvning dublikati,
$55 000 to'qima summasi bilan → arxivlandi.

## 5. Baza holati

| Ko'rsatkich | Oldin | Hozir |
|---|---|---|
| Faol stipendiya | 652 | **635** |
| Xalqaro (universitetga bog'lanmagan) | 73 | **73** |
| Til talabi bo'sh | 0 | **0** |
| To'liq bo'lmagan (6 blok + daraja) | 0 | **0** |
| `source_url` yo'q | 0 | **0** |

Kamayish — **sifat foydasiga**: 17 ta takroriy/to'qima yozuv olib tashlandi,
haqiqiy dasturlar soni o'zgarmadi.

## 6. Qayta bo'lib qolmasligi uchun

`scripts/check-catalog-duplicates.ts` endi **stipendiyalarni ham** tekshiradi:
bir universitetda normallashtirilgan nomi bir xil bo'lgan ikki faol yozuv = xato.
Aynan shu tekshiruv "+ El-Yurt Umidi" qatorlarini ushlagan bo'lardi.

```bash
npm run test:duplicates
```

## 7. Rad etilgan: New Zealand Scholarships

Rasmiy ro'yxat (`nzscholarships.govt.nz/check-eligible-countries`) faqat Tinch okeani
davlatlari va **9 ta Osiyo davlatini** sanaydi: Kambodja, Indoneziya, Laos, Malayziya, Nepal,
Filippin, Tailand, Timor-Leste, Vyetnam. **O'zbekiston yo'q** → qo'shilmadi.

## 8. Navbatda

- 425 ta yozuvga hujjatlar ro'yxatini qo'shish (o'z sahifasidan)
- Qolgan havolalarni tekshirish (640 ta)
- KAS — O'zbekiston uchun yo'l topilsa
