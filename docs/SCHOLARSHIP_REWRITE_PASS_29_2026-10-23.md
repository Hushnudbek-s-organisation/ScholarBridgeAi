# Grant yozuvlarini qayta yozish — 29-pass: Buyuk Britaniya (2026-10-23)

Buyuk Britaniya klasteri yopildi: shablonda **0** qator qoldi.

SQL eslatma: [`supabase/scholarship_rewrite_pass29_2026-10-23.sql`](../supabase/scholarship_rewrite_pass29_2026-10-23.sql)

---

## 1. Naqsh

**13 ta** qator ham bitta shaklda edi: **bosh domen**, **uydirma USD** va muddat **"Jan 25 (UCAS)"**.

⚠️ **25-yanvar** — bu UCAS'ning *ariza* muddati, **grant muddati emas**. Bu chalkashlik har bir qatorni bir xil xato qilgan.

## 2. To'rtta tasdiqlangan grant

### 11 — Gates Cambridge
| | |
|---|---|
| **Hajm** | Yiliga **~70 ta** to'liq grant, **~2/3 PhD**ga |
| **Kim uchun** | **UKdan tashqari** barcha mamlakatlar |
| **Kontrakt** | University Composition Fee to'liq |
| **Nafaqa** | **£23 152** — 12 oy (2026–27), PhD uchun **4 yilgacha** |
| **Qo'shimcha** | Borish-qaytish aviabilet + viza + IHS |

**Ko'pchilik bilmaydigan ixtiyoriy mablag'lar:**
- Akademik rivojlanish: **£750 – £4 000** (konferensiyalar)
- Bolalar nafaqasi: **£12 793** (1 bola) / **£18 244** (2+)
- PhD field-work, tug'ruq/tarbiya ta'tili, qiyinchilik yordami

**❌ Qoplanmaydi:** bench fees, ilmiy uskunalar.
**⚠️ UKRI kabi davlat granti olinsa** — avval uni olish kerak, Trust kontraktni to'lamaydi.

**Tanlov 4 mezonda:** intellektual qobiliyat · kurs tanlash sababi · **boshqalar hayotini yaxshilashga intilish** · **yetakchilik salohiyati**. Oxirgi ikkitasi oddiy stipendiyadan ajratadi.

### 542 — Bath International Excellence
- **300 tagacha** grant · **£8 000/yil** · 3 yilga **£24 000** cap
- **1-davra: 14-fevral 2027** · **2-davra: 31-mart 2027**
- ❌ Mart arxitektura dasturiga tegishli emas · ❌ amaliyot/yangi o'qish yilida chegirma yo'q

### 671 — St Andrews International Undergraduate Scholarship
| | |
|---|---|
| **Summa** | **£10 000/yil gacha** — har yil |
| **Mezon** | **EHTIYOJ**, merit emas |
| **Oyna** | 17-avgust 2026 → **27-yanvar 2027** |
| **Natija** | 17-mart 2027 haftasi |

**🔴 Eng jiddiy xato:** eski qator **to'liq kontrakt $33 000** deb yozgan va `Full Tuition` belgisi qo'ygan.

Aslida:
- Bu grant **£10 000/yil** va **ehtiyojga** qarab
- 2027-yil kontrakti **£34 910** → chegirma **~29%**, 100% emas
- **To'liq kontraktli** grant bor, lekin u **boshqa** — **International Excellence**, butun qabulda **BITTA joy**

### 634 — Newcastle Vice-Chancellor International
- **£7 000/yil**, butun o'qish davomida, **avtomatik**
- Newcastle **o'zi yozadi**: barcha grantlari **qisman**, to'liq moliyalashtirish emas
- **Excellence** sxemasi: **50% gacha**, faqat **30 ta**, **ABB** talab
- ⚠️ **Mamlakat ro'yxati** bor — ro'yxatda bo'lmasa, baholaringiz qanday bo'lsa ham grant yo'q

## 3. Bekor qilingan bitta

**109** — "Cambridge Trust **and** Gates Cambridge" — **ikki xil tashkilot** birlashtirilgan. Gates — id 11; **Cambridge Trust** esa alohida, ancha katta dasturlar to'plami (kollej va donorlar moliyalashtiradi, o'z muddatlari va minglab kichik grantlari bilan). U alohida yozuvga loyiq, hali yozilmagan.

## 4. O'nta qator — halol qilindi

`550` Cardiff · `589` Heriot-Watt · `614` Lancaster · `616` Loughborough · `657` QMUL · `658` QUB · `720` Aberdeen · `734` Exeter · `759` Surrey · `769` York

Har birida:
- `amount_usd_value = 0`, `award_amount = NULL`
- Muddat: "granт muddati emas — UCAS sanasi bilan adashtirmang"
- Tavsif: **"tekshirilmagan, raqam da'vo qilinmaydi"** deb ochiq yozildi
- `notes`da tasdiqlangan alternativalar ko'rsatildi

**Nega o'chirilmadi:** bu grantlar deyarli albatta mavjud. O'chirish haqiqiy qamrovni yo'qotardi. Lekin ularni *ishonchli ko'rinadigan* raqam bilan qoldirish bundan ham yomonroq.

## 5. Holat

| Ko'rsatkich | Oldin | Hozir |
|---|---|---|
| Shablon tavsif | 109 | **96** |
| Bosh domen URL | 160 | **155** |
| Faol grantlar | 578 | **577** |
| Qayta yozilgan | 129 / 578 (22.3%) | **133 / 577 (23.1%)** |
| UK'da shablon | 13 | **0** ✅ |

`tsc --noEmit` ✅ · `check:i18n` ✅ · `test:render` 337/0 ✅.

## 6. Ochiq qolgani (halol ro'yxat)

- **Cambridge Trust** grantlari — alohida yozuv sifatida yozilmagan
- 10 ta UK universitetining grant sahifalari — chuqur havolalar tekshirilmagan (bosh domen qoldirildi, **uydirma havola yozilmadi**)
- UKda `amount_usd_value > 5000` bo'lgan **41** qator — oldingi passlarda yozilgan, bu passda tekshirilmagan

## 7. Keyingi navbat

**AQSh (19)**, **Avstraliya (10)**, **Kanada (8)**. 96 shablon va 155 bosh domen qoldi.
