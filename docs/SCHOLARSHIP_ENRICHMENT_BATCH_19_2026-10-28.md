# Scholarship Enrichment Batch 19 — Austria national schemes (2026-10-28)

Rejim: Pass 112 dan keyin navbatdagi qo'shish bosqichi. Ikkala sxema ham Pass-112 (Avstriya) tadqiqotidan tug'ildi: katalogda Avstriya bo'yicha atigi 2 faol yozuv bor edi — endi doktorlik darajasidagi ikkita asosiy **milliy** instrument ham qo'shildi. Ko'rilgan, lekin **kiritilmagan** nomzod: Innsbruckdagi Dr. Silvius Magnago stipendiyasi (€1,120/oy, 36 oygacha) — u faqat *tarixiy Tiroldan chiqqan* doktorantlarga ochiq (mahalliy kelib chiqish cheklovi), shuning uchun xalqaro katalogga mos emas.

**Natija:** +2 yozuv (970–971) → faol **543**, nafaqadagi **176**, faol reliability-4 **31**, kelgusi deadline'lar **188**.

Barcha faktlar 2026-10-28 kuni rasmiy sahifalardan birinchi qo'ldan o'qildi (stipendien.oeaw.ac.at + Fellowship Rates 2026 PDF; oead.at dastur sahifasi + FAQ).

---

## 1. DOC Fellowship — Austrian Academy of Sciences (ÖAW) — id 970, reliability 10

Avstriyaning eng tanilgan doktorlik stipendiyasi.

- **Shakli**: **€52,080/yil** (2026 stavka; personal xarajatlar / super-brutto — soliqlar, ijtimoiy badallar va ish beruvchi ulushi ichida) — universitetdagi mehnat shartnomasi yoki "yangi o'z-o'zini band qilgan" maqomida olinadi; yillik to'lovlarda. Davomiyligi **24/30/36 oy**; +€500/yil sayohat, +€1,900/yilgacha bola parvarishi subsidiyasi. Chet elda ≤12 oy tadqiqot safariga va kotutyel (ikki davlat qo'shma rahbarligi)ga ruxsat bor.
- **Darvoza shartlari**: Avstriya universitetida doktorlik (boshlashdan oldin yoki 1-yil ichida ariza); magistratura ≤2 yil oldin bitirilgan (1-iyul kesim sanasi; e'tirof etilgan istisnolar bilan 4 yilgacha); 3 mezondan kamida 2 tasi — chop etilgan ilmiy ish, akademik mobility, ilmiy faollik.
- Yiliga bitta oyna (avgust o'rtasi – 15 sentyabr; 2026-oidi yopildi, keyingisi 2027) → deadline NULL/`not_published`, status `upcoming`. Kodlash: `52080 EUR/year/fixed`. Source 3104; universitetga bog'lanmagan (istalgan Avstriya universiteti).

## 2. Ernst Mach Grant — worldwide (OeAD) — id 971, reliability 9 — HOZIR OCHIQ

Federal hukumatning kiruvchi mobility granti (BMFWF moliyalashtiradi, OeAD yuritadi).

- **Shakli**: **€1,300/oy**, **1–9 oy** tadqiqot safariga; qo'shimcha grant ekani ochiq aytilgan ("own funds required"); turar joy/sug'urta tashkil qilishda yordam; Yevropadan tashqari rivojlanayotgan davlatlardan keluvchilarga **€1,200 gacha** yo'l subsidiyasi.
- **Kim uchun**: Avstriyadan tashqarida doktoranturada o'qiyotganlar, yaqinda bitirganlar (joriy e'londa — bitirayotgan 2025-09-30 dan keyin) va postdok-lektor/tadqiqotchilar; safar boshida ≤35 yosh. Avstriyada oxirgi 6 oyda bo'lganlar / u yerda muntazam talaba / doimiy rezidentlar **haqli emas**; to'liq daraja dasturini moliyalashtirmaydi — faqat mehmon tadqiqot safarlari, avstriyalik rahbarning yozma roziligi shart.
- **Joriy e'lon**: 2027/28 o'quv yilidagi safarlar uchun ariza **2026-yil 1-dekabr, 23:59 CET** gacha ochiq; natijalar 2027-yil iyul boshi; eng erta boshlash — sentyabr 2027 → deadline `2026-12-01/fixed`, status `open`.
- Reliability **9**: yagona "ikkinchi manba" — oylik summa OeAD sahifalarining o'zida yo'q, u grants.at e'loni matnining Avstriya universiteti sahifasidagi (Akbild) va EURAXESSdagi aynan keltirilgan qiymati; qolgan barcha shartlar oead.at dan birinchi qo'ldan. Source 3105.

---

## Yon yozuvlar va tekshiruvlar

- Manbalar: 3104 (ÖAW DOC), 3105 (OeAD Ernst Mach); bog'lanmalar 970→3104, 971→3105; ketma-ketliklar yangilandi (max ID: stipendiyalar 971, manbalar 3105, us 699 — o'zgarmadi, us yozuvi kiritilmadi).
- Supabase read-back: 970 rel 10 (`€52,080/year`, `upcoming`), 971 rel 9 (`€1,300/month`, `open`, deadline `2026-12-01`).
- Hisoblagichlar: faol **543**, nafaqadagi **176**, faol reliability-4 **31**, kelgusi deadline **188**.
- Mahalliy: `typecheck` ✅, `check:i18n` ✅, `test:render` ✅ 337/337.
- Uydirma deadline kiritilmadi (DOC 2027 oynasi hali sanasi bilan e'lon qilinmagan).

**Keyingi qadam:** Pass 113 — navbatdagi reliability-4 klasteri (Daniya / Gonkong SAR — 3 tadan).
