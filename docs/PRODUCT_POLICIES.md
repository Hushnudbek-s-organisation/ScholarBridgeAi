# Mahsulot siyosatlari (qarorlar va ular sababi)

Bu hujjat 2026-09 auditidagi "mahsulot qarori yo'q" topilmalariga (A15 va boshqalar)
o'ta aniq, kodda ishlashga majbur siyosat qo'yadi. Har bir siyosat qaysi kod
qismida amalga oshirilgani va qaysi test uni qo'lga olishi bilan yozilgan —
qayta ishlashda kod va siyosat ajrashmasligi uchun.

Yakuniy holat rejasidan (2026-10):
- Deadlines (muddatlar) — ikkala kanalda BEPUL.
- Visa AI — anonim amaliyotga ruxsat, kvota qo'llanmaydi (qashshoq nazorat),
  lekin har so'rov `ai_usage`ga qayd etiladi.
- Sertifikatlar — ro'yxati Premium (courses_full), tekshiruv havolasi BOPIS.

---

## 1. Deadlines (ilova muddatlari) — ikkala kanalda bepul

**Qaror:** Deadlines ro'yxati web (Application Center) va Telegram (`/deadlines`)
ikkalasida **bepul foydalanuvchiga to'liq ochiq**. Bir xil ma'lumot, bir xil
plan talabi — auditdagi nomuvofiqlik (A15) shu qaror bilan yopiladi.

**Sabab:** Muddatlar — platformaning "0→1 va'dasi": yangi talaba ilovaga kirdi
mi, yo'qmi, unga "nima, qachargacha" degan asosiy javob darhol berilishi
kerak. Uni Premium ortida yashirish — birinchi qadamming o'zini sotuvga
aylantiradi va Telegram/web farqini (bot bepul, web premium) tushunarsiz
qilardi.

**Qanday ishlaydi (kod):**
- Web: `GET /api/deadlines` — premium gate YO'Q (`src/app/api/deadlines/route.ts`).
  Profil bor — shaxsiy muddatlar; profil yo'q — ma'lum umumiy muddatlar.
- Telegram: `/deadlines` — `src/lib/telegram/bot.ts` → `deadlines()` →
  `app.listDeadlines(...)`. 10 ta eng yaqin muddat, urgensiya belgisi bilan.
  Shu yerda ham premium tekshiruvi yo'q.
- **Premium qoldirilgan qism:** kengaytirilgan eslatma oraliqlari
  (`notifications_advanced`) — Pro sozlamasi. Ro'yxat o'zi — ochildan.

**Qo'lda olingan test:** `scripts/check-integration.ts` → 12-bo'lim
("deadlines: a FREE account gets the full deadline list from the web API",
"the web API has no premium gate", "the Telegram /deadlines list is FREE").
Bu testlar premium gate qayta kiritilsa CI'da qizil bo'ladi.

---

## 2. Visa AI (muloqot + javob tahlili) — anonim ruxsat, kvota qo'llanmaydi, xarajat yoziladi

**Qaror:**
1. **Anonim amaliyotga ruxsat.** Visa suhbatga kirish uchun akkaunt shart emas —
   "qiziqdim, sinab ko'rdim" holati saqlanadi.
2. **Kunlik AI kvota visa uchun QO'LLANMAYDI.** Bu xatolik emas, siyosat:
   visa muloqot 1 ta qadam, lekin muvaffaqiyatli ariza bir necha marta
   suhbat+taahlilni talab qiladi; har qadamda "limit tugadi" degan
   xabar ko'rsatishni mahsulot qarori qilib bekor qildi.
3. **Amaliy chegaralar (hamma uchun):** IP/sessiya rate limit
   (`LIMITS.visaAnonymous` / `visaSigned`) — bot spami va server xarajatini
   tutadi; har bir muvaffaqiyatli so'rov `ai_usage` jadvaliga qayd etiladi
   (kim: profil yoki null; qancha token; qancha pul) — admin statistikasi
   uchun to'liq.
4. **Tahlil natijasida doim ogohlantirish.** `/api/visa/analyze` javobida
   "bu AI bahosi, rasmiy qaror emas" matni qaytadi (i18n bilan) — foydalanuvchi
   ehtimollik raqamini hech qachon kafolat deb o'qimaydi.

**Sabab:** Visa — eng yuqori qo'shimcha qiymatli, eng qiziqarli funksiya.
Uni kvota ortida yashirish konversiyani tuzatadi; xarajat esa `ai_usage`
uchun to'liq ko'rinadi, yani admin limitni keyinchalik o'zgartira oladi —
qaror qaytariladigan qaror.

**Qanday ishlaydi (kod):**
- `src/app/api/visa/chat/route.ts` — sessiya YOKI anonim; `checkAiQuota`
  chaqirilishi MAQSDAN TASHQARIDA (yuklamaydi); `logAIUsage` — chaqiriladi
  (profileId = sessiya yoki null), javobdan OLDIN kutiladi (statistika aniq).
- `src/app/api/visa/analyze/route.ts` — xuddi shu; `aiAvailable` +
  `chanceDisclaimer` javobda.
- Qisqa ro'yxat: `checkAiQuota` siyosati `taskProviderConfigKey("visa")`
  orqali boshqariladi; "visa" topshirig'i uchun `ai_free_requests_per_day=0`
  qo'yilsa ham visa 200 qaytaradi — test bunu tekshiradi.

**Qo'lda olingan test:** `scripts/check-integration.ts` → 12-bo'lim:
"visa chat: a signed-in interview turn is answered", "usage lands in ai_usage
against the CALLER", "anonymous practice still works ... null profile",
"the daily AI quota is intentionally NOT applied (multi-step policy)",
"visa analyze: the model answer keeps its disclaimer and rubric".

---

## 3. Sertifikatlar — ro'yxat Premium, tekshiruv bopis

**Qaror:**
1. **O'z sertifikatlari ro'yxati** (`GET /api/certificates`) — Premium
   `courses_full` (kurs mazmunidagi kabi). Sertifikat = kursni tugatganlikning
   isboti, kurs esa Premium — ikkalasi bir qo'lga.
2. **Bopis tekshiruv** (`GET /api/certificates/verify?code=...`) — HEC QACHON
   premium YO'Q, sessiya YO'Q. Ish beruvchi / maslahatchi havolani ochib,
   sertifikat haqiqiy ekanini 2 soniyada tekshiradi — bu funksiyaning
   asosiy qo'shimcha qiymati, uni yashirish mantiqsiz.
3. **O'quvchi uchun UI:** "Mening sertifikatlarim" paneli (Kurslar bo'limida):
   ro'yxat, ko'rish/chop etish, tekshiruv havolasini nusxalash. Havola
   `/certificates/<kod>` saytiga olib boradi (3 tilda).

**Qanday ishlaydi (kod):**
- `src/app/api/certificates/route.ts` — `requireProfileAccess` + `premiumGate(courses_full)`.
- `src/app/api/certificates/verify/route.ts` — public, code bo'yicha.
- `src/components/MyCertificatesPanel.tsx` — ro'yxat + ko'rish + nusxalash;
  premium bo'lmasa — samimiy "Premium'da ochiladi" holati (soxta ma'lumot yo'q).
- `src/app/certificates/[code]/page.tsx` — bopis tekshiruv sahifasi
  (valid/invalid, kim, qaysi kurs, qachon).
- Sertifikat avtomatik: kursning barcha darslari + barcha viktorinalari
  topshirilgach (`src/lib/certificates.ts` → `maybeIssueCertificate`).

**Qo'lda olingan test:** 2026-10 E2E (Bekzod demo profili, demo kurs):
6 dars + 6 viktorina → sertifikat `SBC-...` avtomatik berildi → ro'yxat API 200
→ bopis tekshiruv `valid:true` (sessiya SIZSIZ) → noto'g'ri kod 404 →
`/certificates/<kod>` sahifasi 200. Integratsiya testlarida sertifikat
endpointlari §12'da qo'shimcha polda ushlab turiladi (anonim ro'yxat 403).

---

## 4. Qaror qaytarilsa nima qilish

Har bir siyosat 2 qismdan iborat: **kod** + **test**. Siyosatni o'zgartirish
(masalan, deadline'ni premium qilish) shu tartibda:
1. Kodni o'zgartiring (gate qo'shing / olib tashlang).
2. 12-bo'lim testini yangi siyosatga moslang (hozirgi test eski siyosatni
   "qo'lga oladi" — shu yo'l bilan "kod va siyosat ajrashdi" xatoligi qayta
   tug'ilmasligi kafolatlanadi).
3. Bu hujjattagi qaror va "sabab" qatorlarini yozib qo'ying.
