# ScholarBridgeAi — Stipendiyalarni qayta yozish, 38-pass: Indoneziya

**Sana:** 2026-10-25 · **Baza:** `zkdguzbdopfedkffsatk` · **Tarmoq:** `arena/99b0c7fe-scholarbridgeai`
**Qamrov:** 3 qator qayta yozildi, 3 ta `university_scholarships` kartasi yangilandi. O'chirilgan qator yo'q.
Bu pass bilan **Indoneziya klasteri yopildi**: shablon qator **3 → 0**.

---

## 1. Klasterning asosiy xulosasi

Uch qator ham universitet nomi bilan «scholarship» deb yozilgan, lekin Indoneziyada xalqaro talabani moliyalashtiradigan haqiqiy pul **ikki joyda**: **milliy KNB** sxemasi va **bitta nomlangan institutsional grant** (UI GREAT). Har uch qatorda bir xil to'qima raqam bor edi — **USD 875**.

---

## 2. Aniqlangan kamchiliklar

| № | Qator | Eski yozuv | Tekshirilgan haqiqat |
|---|---|---|---|
| 541 | **ITB (Bandung)** | USD 875, 3 daraja, aprel–iyun | **Ganesha Talent-International Fellowship (GT-IF)**: magistratura/doktorantura, to'lovni qoplaydi, yashash nafaqasi **bo'lishi mumkin**; qiymat va muddat **e'lon qilinmagan** |
| 579 | **UGM** | USD 875, 3 daraja | Pul UGMники emas — **KNB (Hukumat sxemasi)**. 47 host-universitet, 112 davlat, **2 299 talaba/alumni, 107 davlatdan**. To'liq paket; yosh chegarasi 21/35/40, GPA 3.25 |
| 713 | **Universitas Indonesia** | USD 875, 3 daraja | **UI GREAT**: to'lov 4 semestrga bekor, viza/KITAS, aviabilet IDR 10 mln, settlement IDR 1.5 mln, sug'urta, **IDR 3 500 000/oy** yashash nafaqasi |

---

## 3. Eng qimmatli topilmalar

**a) KNB — Indoneziyaning asosiy yo'li.** Milliy sxema, 2006 yildan beri 107 davlatdan 2 299 kishi. 2026 sikl: **2-fevral – 31-mart**, natijalar **19-iyun**; keyin o'rin bo'shaganligi sababli II–IV qo'shimcha e'lonlar sentabrgacha davom etgan. Ikki mexanik shart hal qiladi: **Indoneziya elchixonasidan tavsiyanoma** (onlayn ro'yxatdan o'tishni busiz tugatib bo'lmaydi) va **bir pog'ona past diplom** — magistr egasi magistraturaga ariza bera olmaydi.

**b) UI GREAT — eng saxiy institutsional grant.** To'lov 4 semestrga bekor + viza + aviabilet + settlement + sug'urta + **IDR 3 500 000/oy**. Muhim nuance: ariza **admission.ui.ac.id** orqali, va UI GREAT Letter of Statement **ro'yxatdan o'tish to'lovi kvitansiyasini almashtiradi** — ya'ni ariza to'lovi to'lanmaydi.

**c) ITB'da to'rtta dastur aralashgan.** GT-IF (ITB o'zi), KNB (vazirlik), TIAS (Moliya vazirligi), va **ITB International Undergraduate Scholarship** — to'liq grant (IDR 4 700 000/oy + IDR 10 mln settlement), lekin faqat **ASEAN, Osiyo-Tinch okeani va Afrika** partner davlatlariga. O'zbekiston uchun ochiq deb hisoblash mumkin emas — tavsifda shu yozildi.

**d) «Noma'lum» — noma'lum bo'lib qoldi.** GT-IF uchun ITB qiymat ham, muddat ham e'lon qilmagan. Raqam o'ylab topilmadi: `award_amount = NULL`, `deadline_type = 'not_published'`.

**e) Bitta istisno qayd etildi.** `579` qatorida `website_url` — `https://knb.kemdiktisaintek.go.id/`, ya'ni portalning bosh sahifasi. Bu «yalang'och domen» tekshiruvida belgilanadi, lekin bu yerda u **haqiqiy manba sahifasi** (jadval, talablar, e'lonlar shu sahifada). Sun'iy chuqur havola o'ylab topilmadi.

---

## 4. `university_scholarships` kartalari

3 ta karta yangilandi: 228, 221, 207.

---

## 5. Hisoblagichlar

| Ko'rsatkich | Pass 37 oxiri | Pass 38 oxiri |
|---|---|---|
| Shablon tavsiflar | 42 | **39** |
| Yalang'och domen `website_url` | 101 | **99** |
| Faol stipendiyalar | 570 | **570** |
| Arxiv qatorlar | 96 | **96** |
| Indoneziyada qolgan shablon qatorlar | 3 | **0** |

Qayta yozilgan qatorlar jami: 180 → **183** (570 faol qatordan 32.1%).

---

## 6. Sifat darvozalari

- `npx tsc --noEmit` → **0 xato**
- `npm run check:i18n` → **passed**
- `npm run test:render` → **✅ 337 passed, 0 failed**
- 3 qator uchun qattiq tekshiruv: `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bad_json` — **hammasi `false`**; `bare` faqat `579` da `true` (KNB portalining bosh sahifasi, yuqorida izohlangan).

---

## 7. Manbalar (2026-10-25 da ochilgan)

`knb.kemdiktisaintek.go.id/` — rasmiy portal va 2026 tanlov jadvali · `international.ui.ac.id/ui-great-batch-2/` · `international.ui.ac.id/scholarships/` · `partnership.itb.ac.id/scholarships/` · `finaid.itb.ac.id/itb-international-undergraduate-scholarship` · `admission.itb.ac.id/info/KNB` · host-universitet sahifalari (`its.ac.id`, `ums.ac.id`, `unej.ac.id`, `pmb.uii.ac.id`) — yosh chegaralari, GPA 3.25 va elchixona tavsiyanomasi

---

## 8. Keyingi navbat

1. **Norvegiya (3 qator)** — keyingi pass.
2. Keyin **Tayvan (3)**, **Chili (2)** va kichik dum.
3. Ochiq qolganlar: Cambridge Trust, Radboud Encouragement, Eric Bleumink, UTP Graduate Assistantship, Buyuk Britaniyaning 41 ta tasdiqlanmagan qatori.
