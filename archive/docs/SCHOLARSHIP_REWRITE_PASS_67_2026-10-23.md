# ScholarBridgeAi — stipendiyalarni qayta yozish, 67-pass (Xitoy)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Xitoy — 9 qator qayta yozildi.
**Natija:** **Xitoyda `amount_usd_value > 5000` qator qolmadi (0).**

---

## 1. Tekshirilgan milliy doira — CSC (Chinese Government Scholarship)

Manba: `campuschina.org/content/details3_74776` (China Scholarship Council rasmiy qo'llanmasi).

| Element | E'lon qilingan |
|---|---|
| **Qamrov** | tuition + **bepul yotoqxona** (yoki accommodation subsidy) + **tibbiy sug'urta CNY 800/yil** + **oylik stipendiya** |
| Stipendiya | **bakalavr CNY 2 500/oy**, **magistratura CNY 3 000/oy**, **doktorantura CNY 3 500/oy** |
| Yosh chegarasi | bakalavr **< 25**, magistratura **< 35**, doktorantura **< 40** |
| Til | xitoy tilida magistratura/doktorantura — **HSK 4**; general/senior scholar — **HSK 3**; bakalavr — **CSCA** testi |
| Kanallar | **Bilateral** (o'z davlatidagi idora), **University Program** (Xitoy universiteti), **Designated** (UNESCO/EU/AUN/…), **Exchange** |
| Ariza | `studyinchina.csc.edu.cn` — onlayn forma |

---

## 2. Qayta yozilgan 9 qator

### CSC qatorlari (`reliability = 9`)

| Qator | Avval | Endi |
|---|---|---|
| **31** Peking University CSC | uydirma **USD 15 000**, "2027-03-31", bare-domain | **CSC paketi**: tuition + yotoqxona + **CNY 3 000 (magistratura) / 3 500 (PhD)** + sug'urta; yosh **35/40**; **HSK 4**; University Program yo'nalishi. Muddat **`not_published`** — universitet chaqiruvi o'qilmagan |
| **44** Fudan CSC | uydirma **USD 15 000**, "2027-03-31", bare-domain | Yuqoridagi bilan bir xil tuzilma, Fudan mezbon sifatida |

### Universitet qatorlari (`reliability = 4`) — 7 ta

**118** PKU President · **153** SJTU · **322** USTC · **143** Fudan · **307** ZJU · **358** Wuhan · **478** Nanjing

Har birida: `amount = 0`, `award_amount = NULL`, **`CNY`**, `coverage = Unspecified`, `deadline = not_published`, `notes`da importerning uydirma USD summasi, "February 15/28, March 10/15 annually" shabloni va **o'lik URL** holati.

**Tekshirilgan urinishlar (hammasi muvaffaqiyatsiz):**
- `isd.pku.edu.cn/ENGLISH/Scholarship/` → **404**
- `isc.sjtu.edu.cn/EN/content.aspx` → **404**
- `iczu.zju.edu.cn/iczuen/54/list.htm` → **noto'g'ri bo'lim**
- `whu.edu.cn/en/scholarships/` → universitet **bosh sahifasiga** yo'naltirdi

---

## 3. Defektlar jadvali

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Valyuta xato** | 9/9 | USD → **CNY** |
| 2 | **Uydirma summa** | 31, 44 (15 000), 118 (24 000), 153 (23 000), 322 (23 000), 143 (22 000), 307 (22 000), 358 (22 000), 478 (5 500) | CSC qatorlarida **haqiqiy CNY stavkalar**, qolganlarida **bo'sh** |
| 3 | **Uydirma muddat** | 6 qatorda "annually", 2 qatorda "2027-03-31" | `not_published` |
| 4 | **Bare-domain URL** | 31 (`isd.pku.edu.cn`), 44 (`istudent.fudan.edu.cn`), 118, 143 (`iso.fudan.edu.cn`) va boshqalar | CSC qatorlari `campuschina.org` ga o'tdi (**bare-domain 84 → 83**); qolganlari o'z holida, o'likligi notesda |
| 5 | **Kanonik bo'lmagan daraja** | 31, 44, 118, 143, 153, 307 (`"Master"`), 322, 358 (`"Bachelor"`) | → `"Master's"`, `"Bachelor's"`, `"PhD"` |
| 6 | **Qamrov yozilmagan** | 9/9 | CSC paketi to'liq yozildi; universitet qatorlarida halol `Unspecified` |
| 7 | **`reliability = 10` bo'lgan uydirma** | 9 qator | CSC → **9**, universitetlar → **4** |

---

## 4. Uch muhim topilma

**1) CSC — Xitoyda yagona barqaror, e'lon qilingan mukofot.**
Stipendiya **CNY 3 000/3 500**, yotoqxona bepul, sug'urta **CNY 800**. Universitetlarning "o'z stipendiyalari" odatda shu bazaga **qo'shimcha** yoki undan **kichik** bo'ladi — lekin aynan ularning shartlari e'lon qilinmagan sahifalarda qolib ketgan.

**2) Yosh chegarasi — O'zbekiston nomzodi uchun eng qattiq filtr.**
Magistratura uchun **35**, doktorantura uchun **40**. Bu ma'lumot importer qatorlarida **umuman yo'q** edi.

**3) Til talabi ikki xil.**
Xitoy tilida o'qish — **HSK 4** (magistratura/doktorantura), ingliz tilida — universitetning o'z talabi. Bu ham qatorlarda yozilmagan edi.

---

## 5. Hisoblagichlar

| Ko'rsatkich | Pass 66 | Pass 67 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| `is_active = false` | 117 | **117** | 0 |
| `amount_usd_value > 5000` | 97 | **88** | **−9** |
| shundan **Xitoy** | 9 | **0** | **−9** ✅ |
| `source_reliability = 4` | 65 | **72** | +7 |
| bare-domain | 84 | **83** | **−1** |
| shablon tavsif | 0 | **0** | 0 |

---

## 6. Tekshiruv

9 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bad_json`, `bad_lv`, `bad_notes` — **hammasi `false`**.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

---

## 7. Keyingi qadam

1. **68-pass** — **Janubiy Koreya 6**, **Shvetsiya 6**, **Singapur 6**, **Yangi Zelandiya 5**.
2. Keyin `reliability = 5` bo'lgan 27 AQSh doktorlik qatori, keyin **83** bare-domain.
3. `reliability = 4` qatorlar (Avstraliya 17, Kanada 12, Shveytsariya 6, Xitoy 7) — sahifalar o'qilgach qayta yoziladi.
