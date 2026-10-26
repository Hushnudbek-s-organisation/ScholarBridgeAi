# ScholarBridgeAi — Stipendiyalarni qayta yozish, 40-pass: Tayvan

**Sana:** 2026-10-25 · **Baza:** `zkdguzbdopfedkffsatk` · **Tarmoq:** `arena/99b0c7fe-scholarbridgeai`
**Qamrov:** 3 qator qayta yozildi, 3 ta `university_scholarships` kartasi yangilandi. O'chirilgan qator yo'q.
Bu pass bilan **Tayvan klasteri yopildi**: shablon qator **3 → 0**.

---

## 1. Klasterning asosiy xulosasi

Tayvan Norvegiyaning aksi: bu uchta grant **haqiqiy**, **institutsional** va o'qish to'lovidan ozod qilishdan tashqari **NT dollarida oylik stipendiya** to'laydi. Uch qatordagi xato — **miqyos**: o'ylab topilgan USD 2 125–2 250 turgan joyda aslida **oyiga NT$30 000–40 000** bor.

| № | Qator | Eski yozuv | Tekshirilgan haqiqat |
|---|---|---|---|
| 632 | **NCKU (Tainan)** | USD 2 125, yanvar–fevral | **Distinguished International**: to'lovdan ozod + oylik (bakalavr **NT$8 000**, magistr **NT$10 000**, PhD **NT$16 000** + rahbar NT$4 000); **VCS**: PhD 1–4 kursga **NT$30 000/oy** |
| 633 | **NTHU (Hsinchu)** | USD 2 125, yanvar–fevral | **Type A**: to'lov + oylik (magistr/bakalavr **NT$5 000**, PhD **NT$10 000–40 000**); **Type B**: faqat to'lov. Muddat **1-yanvar – 15-mart** / **15-avgust – 16-oktabr** |
| 642 | **NYCU (Hsinchu/Taipei)** | USD 2 250, yanvar–fevral | Stipendiya diapazoni: bakalavr **5–21 ming**, magistr **7–25 ming**, PhD **15–30 ming** + to'lovdan ozod *yoki* mahalliy tarif. **Elite PhD: NT$33 000/oy** |

---

## 3. Eng qimmatli topilmalar

**a) Stipendiya va to'lov granti — alohida qaror.** NYCU buni ochiq yozadi: oylik stipendiya va to'lov granti **alohida yoki birga** berilishi mumkin. Shu sababli bir universitetda ikki talaba juda boshqa paket olishi mumkin — eski qatorlar esa bitta «$2 250» raqam bilan buni yashirgan.

**b) Ariza — qabul bilan birga.** NCKU va NYCU'da alohida stipendiya arizasi **yo'q**: qabul hujjatlari ko'rib chiqiladi va natija **qabul xati bilan** keladi. NTHU'da esa aynan o'sha onlayn tizimda «scholarship» bandini belgilash kerak.

**c) Uchta istisno pulga ta'sir qiladi:**
- **NCKU**: Tayvan davlat agentligidan grant olgan talaba bu grantni ham ololmaydi.
- **NTHU**: davlat granti olganlar, **ish vizasi yoki ARC** egalari loyiq emas; kvant yarimo'tkazgich yo'nalishi bo'yicha ham cheklov bor.
- **NYCU**: **mandarin tili kurslari** (bakalavr 4 ta, magistratura/doktorantura 2 ta) — stipendiya sharti.

**d) Yangilanish — har yil.** NTHU va NCKU'da grant **har yili** qayta ko'rib chiqiladi; «bir marta olib, oxirigacha» modeli emas.

---

## 4. `university_scholarships` kartalari

3 ta karta yangilandi: 211, 209, 245.

---

## 5. Hisoblagichlar

| Ko'rsatkich | Pass 39 oxiri | Pass 40 oxiri |
|---|---|---|
| Shablon tavsiflar | 36 | **33** |
| Yalang'och domen `website_url` | 96 | **93** |
| Faol stipendiyalar | 567 | **567** |
| Arxiv qatorlar | 99 | **99** |
| Tayvanda qolgan shablon qatorlar | 3 | **0** |

Qayta yozilgan qatorlar jami: 186 → **189** (567 faol qatordan 33.3%).

---

## 6. Sifat darvozalari

- `npx tsc --noEmit` → **0 xato**
- `npm run check:i18n` → **passed**
- `npm run test:render` → **✅ 337 passed, 0 failed**
- 3 qator uchun qattiq tekshiruv (`bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bare`, `bad_json`) — **hammasi `false`**

---

## 7. Manbalar (2026-10-25 da ochilgan)

`oia.ncku.edu.tw/p/404-1032-229890.php?Lang=en` · `admissions.oia.ncku.edu.tw/doc/view/sn/8` · `apply.nthu.edu.tw/en/article/102-nthu-scholarship` · `oga.site.nthu.edu.tw/p/412-1524-18035.php?Lang=en` · `imba.nthu.edu.tw/nthu-international-student-scholarship.html` · `dee.nycu.edu.tw/upload_files/news/c5009f1e07fe4c919609f48e80b2f9c3.pdf` · `oia.nycu.edu.tw` — scholarship pages

---

## 8. Keyingi navbat

1. **Chili (2 qator)** — keyingi pass.
2. Keyin qolgan kichik guruhlar va katta dum.
3. Ochiq qolganlar: Cambridge Trust, Radboud Encouragement, Eric Bleumink, UTP Graduate Assistantship, Buyuk Britaniyaning 41 ta tasdiqlanmagan qatori.
