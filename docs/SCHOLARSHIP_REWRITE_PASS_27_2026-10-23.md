# Grant yozuvlarini qayta yozish — 27-pass: Polsha (2026-10-23)

Polsha klasteri yopildi. Mamlakatda endi **bitta to'g'ri yozuv** — o'n bitta raqobatlashuvchi o'rniga.

SQL eslatma: [`supabase/scholarship_rewrite_pass27_2026-10-23.sql`](../supabase/scholarship_rewrite_pass27_2026-10-23.sql)

---

## 1. Naqsh — katalogdagi eng yomoni

**O'nta** qator `"<Universitet> & NAWA Stefan Banach"` ko'rinishida qurilgan edi. Ya'ni **bitta milliy dastur** o'nta universitetga yopishtirilgan — har biriga **o'z uydirma dollari** ($3 000 – $16 800), har biri **bosh domen**ga havola, va **hech biri** dasturga qanday kirishni to'g'ri aytmagan.

## 2. Haqiqiy dastur — **id 867** (qayta yozildi)

NAWA'ning o'z sahifalari, rasmiy **2026 call PDF** va study.gov.pl dan tasdiqlandi:

| | |
|---|---|
| **Oylik stipendiya** | **PLN 2 500** — yiliga 12 oygacha |
| **Kontrakt** | davlat universitetlarida **to'liq bepul** |
| **Yo'l puli** | bir martalik **PLN 2 500** |
| **Tayyorlov kursi** | NAWA to'laydi, oyiga **PLN 1 700** |
| **Til** | polyak yoki ingliz yo'li; ingliz yo'lida polyak tili va madaniyati kursi |

### 🔴 O'zbekiston uchun eng muhim fakt
**O'zbekiston 36 mamlakat ro'yxatida BOR** (Polsha taraqqiyot yordami doirasi). Va **O'zbekiston kirgan guruh** gumanitar va ijtimoiy fanlarda ham o'qishi mumkin — faqat o'z ona tilida filologiya bundan mustasno.

### Cheklovlar
- Faqat **magistratura** (second-cycle)
- Polsha fuqaroligi **bo'lmasligi** kerak
- Allaqachon magistr darajasi **bo'lmasligi** kerak

### Raqobat
Oxirgi tanlovda **3 587 ariza → 443 grant** (har sakkiztadan biri).

### ⚠️ Muddat tuzog'i
2026 chaqiruvi **8-may 2026, 15:00 CEST** da yopildi — **lekin mamlakat guruhi kvotasi to'lishi bilan ertaroq yopilishi mumkin**. Eski qatorlarda bu umuman yo'q edi.

## 3. Bekor qilingan o'nta

| id | Universitet | Uydirma summa |
|---|---|---|
| 766 | Warsaw | $16 800 |
| 800 | Gdańsk Tech | $3 400 |
| 802 | AGH Kraków | $3 200 |
| 809 | Jagiellonian | $4 000 |
| 810 | Wrocław | $3 200 |
| 820 | AMU Poznań | $3 000 |
| 825 | PUT Poznań | $3 200 |
| 827 | WUT | $3 600 |
| 830 | Łódź Tech | $3 000 |
| 850 | Wrocław Tech | $3 400 |

Har biriga alohida izoh yozildi. **Muhim:** uydirma raqamlar haqiqiy Banach qiymatidan **~10 barobar kam** edi (PLN 30 000/yil ≈ $7 500 + bepul kontrakt).

O'nta `university_scholarships` kartochkasi ham milliy yozuvga **qayta yo'naltirildi** (`availability_status = 'No'`, `official_url` NAWA'ga).

## 4. Holat

| Ko'rsatkich | Oldin | Hozir |
|---|---|---|
| Shablon tavsif | 129 | **119** |
| Bosh domen URL | 181 | **171** |
| Faol grantlar | 597 | **587** |
| Qayta yozilgan | 125 / 597 (20.9%) | **126 / 587 (21.5%)** |
| Polshada shablon | 10 | **0** ✅ |
| Polshada faol yozuv | 11 | **1** (to'g'ri) |

`tsc --noEmit` ✅ · `check:i18n` ✅ · `test:render` 337/0 ✅ · id 867 barcha 12 qattiq tekshiruvdan o'tdi ✅.

## 5. Yopilgan klasterlar

| Klaster | Natija |
|---|---|
| Türkiye | 8 yozildi, 4 retired |
| Rossiya | 4 yozildi, 5 retired, 1 yangi |
| Xitoy | 9 yozildi, 2 retired |
| Koreya | 3 yozildi, 3 retired |
| Malayziya | 8 yozildi, 5 retired |
| Olmoniya | 8 yozildi, 4 retired, 11 tuzatildi |
| Yaponiya | 2 yozildi, 9 retired, 1 yangi, 8 tuzatildi |
| Niderlandiya | 6 yozildi, 8 retired, 2 yorliq olib tashlandi |
| **Polsha** | **1 yozildi, 10 retired** |

## 6. Keyingi navbat

**AQSh (19)**, **Buyuk Britaniya (13)**, **Avstraliya (10)**, **Italiya (10)**, **Kanada (8)**. 119 shablon va 171 bosh domen qoldi.
