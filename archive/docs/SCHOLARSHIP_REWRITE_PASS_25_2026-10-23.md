# Grant yozuvlarini qayta yozish — 25-pass: Yaponiya (2026-10-23)

Yaponiya klasteri yopildi: faol yapon qatorlarida shablon tavsif **0**, `"& MEXT"` sarlavhali qator **0**.

SQL eslatma: [`supabase/scholarship_rewrite_pass25_2026-10-23.sql`](../supabase/scholarship_rewrite_pass25_2026-10-23.sql)

---

## 1. Asosiy topilma — MEXT alohida yozuvga ega emas edi

Katalogdagi **har bir** yapon qatori `"<Universitet> & MEXT"` ko'rinishida qurilgan edi. Ya'ni **Yaponiya hukumatining milliy stipendiyasi** universitetning o'z granti sifatida ko'rsatilgan.

Aslida MEXT — **Ta'lim vazirligi** dasturi; unga **Yaponiya elchixonasi** orqali yoki **universitet nominatsiyasi** orqali ariza beriladi. Universitetning "scholarships" sahifasida unga ariza yo'q.

**Yangi yozuv — id 906.** Uch mustaqil rasmiy manbadan tasdiqlangan (*Study in Japan* portali, MEXT'ning 2026 Research Students yo'riqnomasi PDF, Kyoto universiteti sahifasi) — **uchalasi bir xil** raqam beradi:

| Toifa | Oylik stipendiya |
|---|---|
| Bakalavr / yapon tili / KOSEN / kasb-hunar | **¥117 000** |
| Research student (tayyorlov / no-degree) | **¥143 000** |
| Magistratura / professional | **¥144 000** |
| **Doktorantura** | **¥145 000** |
| Young Leaders Program | **¥242 000** |

+ mintaqaviy qo'shimcha **¥2 000–3 000/oy**
+ **barcha** kontrakt, kirish va ro'yxatdan o'tish to'lovlari
+ **borish-qaytish aviabilet**

**Muhim ogohlantirish** (MEXT o'zi aytadi): birinchi to'lov kelgandan **1–1,5 oy keyin** keladi — shu sababli **~$2 000** olib kelish tavsiya qilinadi.

## 2. Ikkinchi topilma — Hokkaido granti **to'xtatilgan**

Hokkaido universitetining **o'z** Office of International Affairs sahifasida:

> **"Hokkaido University President's Fellowship *New recruitment suspended from 2024*"**

Ya'ni **448** va **821** qatorlari mavjud bo'lmagan grantga ariza taklif qilgan. Ikkalasi **retired**. `notes`da Hokkaido'da **haqiqatan ochiq** narsa yozildi:
- **Special Grant Program** — o'z hisobidan o'qiydigan doktorantlarga (kontrakt + stipendiya yoki RA maoshi)
- **Clark Scholarship** — **¥50 000/oy**, 1 yilgacha, doktorantlarga (ELMS tizimi orqali e'lon qilinadi)

## 3. Qayta yozilgan ikkitasi

### 449 — Nagoya G30 Undergraduate Scholarship
| | |
|---|---|
| Kontrakt | **4 yil to'liq** (¥535 800/yil) |
| Ro'yxat to'lovi | ¥282 000 **qaytariladi** |
| Stipendiya | **¥500 000 — 4 yilga jami**, yiliga emas |

**Shart:** agar talaba **¥500 000/yil** yoki undan ko'p boshqa grant olsa — G30 granti **yo'qoladi**. Ariza faqat qabul arizasi bilan; o'qishga kirgandan keyin ariza berib **bo'lmaydi**.

### 491 — Waseda Partial Tuition-Waiver Scholarship
Waseda — **xususiy** universitet, kontrakti **¥1 200 000–1 650 000/yil** (milliynikidan 2–3 barobar qimmat). Grant: **yillik kontraktning 50% i, 1 yil**. Stipendiya **yo'q**.

Yonidagi grantlar ham yozildi:
- **Azusa Ono Memorial** — ¥360 000
- **Global Leader** — ¥1 000 000
- **Reserved Scholarship** — ¥500 000/yil × 2 yil
- **JASSO Honors** — ¥48 000/oy (milliy, Waseda'niki emas)

Cheklov: davlat hisobidan o'qiydigan yoki chet davlat granti olgan talaba **ariza bera olmaydi**.

## 4. Yana 8 qatorda summa nolga tushirildi

`137, 146, 393, 447, 450, 457, 470, 488` — **$5 300–26 000** hech qayerda e'lon qilinmagan → **0**, har biriga alohida izoh.

## 5. Holat

| Ko'rsatkich | Oldin | Hozir |
|---|---|---|
| Shablon tavsif | 144 | **136** |
| Bosh domen URL | 195 | **188** |
| Faol grantlar | 613 | **605** (9 retired, 1 yangi) |
| Qayta yozilgan | 113 / 613 (18.4%) | **119 / 605 (19.7%)** |
| Yaponiyada shablon | 8 | **0** ✅ |
| Yaponiyada "& MEXT" | 9 | **0** ✅ |
| Yaponiyada $5 000+ | 8 | **0** ✅ |

`tsc --noEmit` ✅ · `check:i18n` ✅ · `test:render` 337/0 ✅ · 14 qatorning qattiq tekshiruvlari ✅.

## 6. Yopilgan klasterlar

| Klaster | Natija |
|---|---|
| Türkiye | 8 yozildi, 4 retired |
| Rossiya | 4 yozildi, 5 retired, 1 yangi |
| Xitoy | 9 yozildi, 2 retired |
| Koreya | 3 yozildi, 3 retired |
| Malayziya | 8 yozildi, 5 retired |
| Olmoniya | 8 yozildi, 4 retired, 11 tuzatildi |
| **Yaponiya** | **2 yozildi, 9 retired, 1 yangi, 8 tuzatildi** |

## 7. Keyingi navbat

**Kanada**, **Niderlandiya**, **Buyuk Britaniya**, **Avstraliya**. 136 shablon va 188 bosh domen qoldi.
