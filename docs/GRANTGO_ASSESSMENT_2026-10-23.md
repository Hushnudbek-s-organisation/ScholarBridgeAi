# GrantGO.uz — tashqi ma'lumot manbai sifatida baholash

**Sana:** 2026-10-23
**Manba:** <https://grantgo.uz/>
**Savol:** saytdagi katta scholarship bazasidan ScholarBridge uchun ma'lumot olish mumkinmi?

---

## 1. Sayt nima taklif qiladi

`grantgo.uz` — O'zbekiston uchun mo'ljallangan grant/stipendiya **agregatori**: u o'zi dastur
tashkilotchisi emas, balki turli manbalardan yig'ib, o'zbek tilida qayta hikoya qiladi.

| Ko'rsatkich | Qiymat (2026-10-23 holatiga) |
|---|---|
| Jami e'lon | **1 581** |
| Bakalavr darajasi | 182 |
| Magistratura darajasi | 315 |
| PhD darajasi | 143 |
| Qolgani | almashinuv, konferensiya, amaliyot, yozgi maktab, volontyorlik, tanlov, malaka oshirish |

Darajalar bir-birini qoplaydi (bitta e'lon bir vaqtda magistratura + PhD bo'lishi mumkin),
shuning uchun 182 + 315 + 143 = 640 yig'indi 1 581 dan kichik — bu normal.

Har bir e'lon sahifasida quyidagilar bor:

- sarlavha, davlat (bayroq bilan), muddat sanasi va "N kun qoldi";
- daraja(lar) va moliyalashtirish turi;
- "Tavsif", "Kimlar uchun mo'ljallangan", "Imtiyozlar", "Topshirish jarayoni" bo'limlari;
- **"Muhim tafsilotlar"** bloki — dastur tili, imkoniyat turi, daraja, moliyalashtirish,
  format (onlayn/offlayn), davomiylik, ariza to'lovi;
- **"Rasmiy havola"** — dasturning asl (ingliz tilidagi) saytiga havola;
- e'lon rasmi (`grantgo-asset.s3.eu-central-1.amazonaws.com`).

Ya'ni har bir yozuv o'zining **asosiy manbasiga** havola beradi — bu bizning
"har bir yozuvda `source_url` bo'lishi shart" qoidasiga mos keladi.

---

## 2. Texnik imkoniyat: nima olinadi, nima olinmaydi

| Yo'l | Holat | Izoh |
|---|---|---|
| `https://grantgo.uz/sitemap.xml` | **ochiq** | barcha `/grant/<slug>` va `/grants/...` SEO sahifalari ro'yxati — katalog indeksini olish mumkin |
| E'lon sahifasi `/grant/<slug>` | **ochiq, serverda render** | to'liq matn, sana, daraja, rasmiy havola olinadi |
| Ro'yxat sahifasi `/grants` | faqat 1-sahifa serverda | "Yana ko'rsatish" tugmasi JS orqali yuklaydi, `?page=2` bir xil natija qaytaradi |
| Ommaviy API | **topilmadi** | `/api/grants?page=2` bo'sh javob qaytardi |
| JSON-LD / structured data | yo'q | lekin "Muhim tafsilotlar" bloki amalda tayyor jadval |

**Xulosa:** har bir sahifani birma-bir o'qish — texnik jihatdan **mumkin**. 1 581 sahifani
avtomatik yig'ish uchun esa headless brauzer yoki ularning XHR endpointini teskari muhandislik
qilish kerak bo'ladi.

Muhim cheklov: bu loyihaning sandbox muhitida shell'da tashqi internet **yo'q**
(`curl https://grantgo.uz` → `000`), faqat sahifa-fetch vositasi ishlaydi. Demak ommaviy
yig'ish bu yerda emas, internetga chiqadigan serverda (masalan o'z VPS'da) bajarilishi kerak.

---

## 3. Huquqiy tomon — bu eng muhim qism

`https://grantgo.uz/robots.txt` quyidagini e'lon qiladi:

```
User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /
```

va alohida bloklarda quyidagi botlarga `Disallow: /` qo'yilgan:
`ClaudeBot`, `anthropic-ai`, `Claude-Web`, `GPTBot`, `Google-Extended`, `CCBot`,
`cohere-ai`, `MistralAI-Training`, `KimiBot`, `meta-externalagent`, `Applebot-Extended`,
`Bytespider`, `Amazonbot`, `Diffbot`, `Omgili`, `PetalBot`, `QualifiedBot`, `YouBot` va boshqalar.

Bundan kelib chiqadigan amaliy xulosalar:

1. **AI agent bilan ommaviy yig'ish ularning e'lon qilgan siyosatiga zid** — sayt AI
   kraulerlarini aniq nomma-nom taqiqlagan.
2. Tavsif matnlari — GrantGO'ning **o'z tahririy matni** (mualliflik huquqi obyekti).
   1 581 yozuvni nusxalab o'z bazamizga ko'chirish huquqiy jihatdan xavfli.
3. `use=reference` ruxsati bor — ya'ni **manba sifatida ko'rsatib foydalanish** (o'qish,
   topilmani aniqlash, havola berish) mumkin, **ko'chirib-olib bazaga quyish** emas.

Shu sababli quyidagi ish tartibi tavsiya etiladi:

> GrantGO — **topilma manbai** (qaysi dastur borligini bilish uchun).
> Yakuniy yozuv esa **dasturning rasmiy saytidan** tekshirilib, **o'z qisqa izohimiz** bilan
> yoziladi. Bu loyihada allaqachon qo'llanayotgan usul bilan bir xil.

---

## 4. Bizning baza bilan qiyoslash

Bizda hozir **639 faol scholarship**: 590 tasi `university_id` bilan bog'langan, **49 tasi
umumiy** (universitetga bog'lanmagan). Oxirgi 49 ta — aynan xalqaro dasturlar uchun joy.

GrantGO'dagi yirik xalqaro dasturlarni bazamizdan qidirdim:

| Dastur | Bizda (2026-10-23) |
|---|---|
| Erasmus Mundus (DENSYS, CYBERSURE, GLOCAL, EACH …) | **0** |
| Chevening (UK) | **0** |
| Fulbright (US) | **0** |
| Eiffel Excellence (France) | **0** |
| Friedrich Ebert Foundation (Germany) | **0** |
| Yenching Academy (China) | **0** |
| Honjo Foundation (Japan) | **0** |
| DAAD (Germany) | 12 |
| MEXT (Japan) | 11 |
| Gates Cambridge | 2 (bor) |
| Lester B. Pearson (Toronto) | 1 (bor) |
| KAIST | 2 (bor) |

**Asosiy topilma:** bizning kamchiligimiz — universitet ichidagi stipendiyalarda emas
(358/358 universitet qamrab olingan), balki **universitetga bog'lanmagan yirik xalqaro
dasturlarda**. GrantGO aynan shu bo'shliqni ko'rsatib beradi.

---

## 5. Uch variant

### A. Discovery + rasmiy tekshiruv *(tavsiya etiladi)*
1. Sitemap'dan e'lon ro'yxatini olish (faqat sarlavha + havola).
2. Ichidan bizda yo'q, **universitet/xalqaro fond** dasturlarini tanlash (balki 80–150 ta).
3. Har birini **rasmiy saytidan** tekshirish: muddat, summa, daraja, talablar.
4. `scholarships` jadvaliga o'z izohimiz bilan yozish, `source_url` = rasmiy sayt,
   `notes`da GrantGO ham eslatiladi.

Hech qanday matn nusxalanmaydi; huquqiy xavf yo'q; bizning "to'qib yozmaslik" qoidasi saqlanadi.
Kamchilik: sekin (har bir dastur uchun alohida tekshiruv).

### B. Hamkorlik
GrantGO bilan bog'lanib ruxsat yoki API so'rash (ular Telegram kanali `@GrantGoUz` orqali
faol). Kelishuv bo'lsa — to'liq katalog, yangilanishlar va rasm manbalari qonuniy yo'l bilan
keladi. O'zbek loyihasi O'zbek loyihasi bilan kelishishi osonroq.

### C. To'liq skrep *(tavsiya etilmaydi)*
1 581 sahifani headless brauzer bilan yig'ish. Texnik jihatdan bajariladi, lekin:
robots.txt'dagi AI-bot taqiqi, mualliflik huquqi, matnlarni qayta ishlatish xavfi,
hamda sayt tuzilishi o'zgarsa skrep buziladi. Bu variantni tanlamaslik kerak.

---

## 6. Xulosa

- **Ha**, saytdan ma'lumot olish texnik jihatdan mumkin: sitemap ochiq, e'lon sahifalari
  serverda render qilinadi, har birida rasmiy havola bor.
- **Yo'q**, to'liq bazani nusxalab ko'chirish tavsiya etilmaydi: `ai-train=no`,
  AI-botlar bloklangan, tavsiflar ularning tahririy matni.
- **Eng foydali qismi** — ularning katalogi bizdagi bo'shliqni ko'rsatadi:
  Erasmus Mundus, Chevening, Fulbright, Eiffel, Yenching, Honjo kabi xalqaro dasturlar
  bizda umuman yo'q.
- Keyingi qadam sifatida **A variantini** taklif qilaman: 20–30 ta xalqaro dasturdan
  boshlab, har birini rasmiy manbadan tekshirib qo'shish.
