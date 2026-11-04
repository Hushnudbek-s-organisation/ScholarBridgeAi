# Brauzer tezligi: oldingi va keyingi o‘lchov

**Sana:** 2026-11-04 · **Branch:** `arena/6db82aa0-scholarbridgeai`

Bu production build ustida ishlaydigan haqiqiy Chromium brauzeridagi **lokal laboratoriya o‘lchovi**. Jonli production sayti, real foydalanuvchi Web Vitals statistikasi yoki Lighthouse bali emas. Avvalgi audit tuzatishlari saqlandi; production ma’lumotlariga tegilmadi, deploy qilinmadi.

## Metodika

- Har bosqichda desktop uchun 3 ta va mobil profil uchun 3 ta yangi, sovuq brauzer konteksti; jadvalda medianalar. Oldin/keyin jami 12 ta o‘lchov.
- Desktop: 1440×1000. Mobil: 390×844, CPU 4× sekinlashtirilgan, 150 ms latency, download 209 715 bayt/sekund (~1,68 Mbit/s), upload 96 000 bayt/sekund (~0,768 Mbit/s). HTTP keshi o‘chirilgan.
- Next production build + `next start`, bir xil app/API va disposable PostgreSQL fixture ma’lumotlari. Backend lokal va isitilgan; bu production serverning cold start o‘lchovi emas.
- Tashqi origin so‘rovlari ikkala bosqichda ham bloklangan. CDN, tashqi rasmlar yoki tashqi provayder tezligi taqqoslanmagan.
- Boshlang‘ich kuzatuv: DOMContentLoaded/sarlavha tayyorligidan keyingi 4 soniya. Shundan so‘ng mavzu almashtirish, kirish oynasi, autentifikatsiya va universitet → stipendiya → universitet navigatsiyasi tekshirilgan.
- FCP/LCP/CLS browser Performance API orqali; bloklanish — shu kuzatuv oynasidagi uzun tasklarning 50 ms dan ortiq qismlari yig‘indisi. Bu **Lighthouse TBT emas**. Interaksiya vaqtlari ham **field INP emas**.
- Mavzu o‘lchovi — holat almashishi + ikki animation frame; butun animatsiyaning tugashi emas. Kirish natijasi — dashboard sarlavhasi ko‘rinishi; barcha fon so‘rovlari tugashi emas. Universitet/stipendiya navigatsiyasi fixture kontenti tayyor bo‘lishini kutadi.

## Natijalar

### Desktop

| Ko‘rsatkich | Oldin | Keyin | Farq |
|---|---:|---:|---:|
| TTFB (ms) | 48 | 63 | 31.9% ko‘p |
| FCP (ms) | 340 | 356 | 4.7% ko‘p |
| LCP (ms) | 1248 | 1008 | 19.2% kam |
| CLS | 0.000 | 0.000 | o‘zgarmadi |
| Uzun task bloklanishi, 4 s oyna (ms) | 200 | 174 | 13.0% kam |
| Decoded JavaScript (KiB) | 1288.9 | 1261.2 | 2.1% kam |
| Mavzu holati + 2 frame (ms) | 1159 | 466 | 59.8% kam |
| Kirish oynasi ko‘rinishi (ms) | 214 | 230 | 7.1% ko‘p |
| Kirish submit → dashboard (ms) | 660 | 690 | 4.5% ko‘p |
| Universitetlar: ilk ochilish (ms) | 1114 | 561 | 49.6% kam |
| Stipendiyalar: ilk ochilish (ms) | 1083 | 477 | 56.0% kam |
| Universitetlar: shu sessiyada qaytish (ms) | 989 | 189 | 80.9% kam |

### Sekinlashtirilgan mobil profil

| Ko‘rsatkich | Oldin | Keyin | Farq |
|---|---:|---:|---:|
| TTFB (ms) | 51 | 28 | 44.9% kam |
| FCP (ms) | 1488 | 1360 | 8.6% kam |
| LCP (ms) | 5588 | 1360 | 75.7% kam |
| CLS | 0.000 | 0.000 | o‘zgarmadi |
| Uzun task bloklanishi, 4 s oyna (ms) | 1441 | 1592 | 10.5% ko‘p |
| Decoded JavaScript (KiB) | 1288.9 | 1261.2 | 2.1% kam |
| Mavzu holati + 2 frame (ms) | 3895 | 1289 | 66.9% kam |
| Kirish oynasi ko‘rinishi (ms) | 754 | 729 | 3.4% kam |
| Kirish submit → dashboard (ms) | 1711 | 1791 | 4.7% ko‘p |
| Universitetlar: ilk ochilish (ms) | 2881 | 2911 | 1.0% ko‘p |
| Stipendiyalar: ilk ochilish (ms) | 1378 | 1014 | 26.4% kam |
| Universitetlar: shu sessiyada qaytish (ms) | 2463 | 851 | 65.4% kam |

### Bundle va natijani talqin qilish

Build diagnostikasidagi landing first-load JS: **1,298,952 → 1,291,510 bayt** (1268.5 → 1261.2 KiB), **0.57% kam**. Bu compressed transfer emas. Kuzatuv oynasidagi decoded JS ikki profilda ham 2.14% kamaydi; compiled first-load va browser resource yig‘indisi turli o‘lchovlar.

Eng katta yutuq — mobil LCP **5,59 → 1,36 soniya (75,7% kam)**, mavzu almashtirish **3,90 → 1,29 soniya (66,9% kam)** va shu sessiyada universitetlarga qaytish **2,46 → 0,85 soniya (65,4% kam)**.

**Hammasi tezlashgani yo‘q:** mobil uzun-task bloklanish proxy’si 1441 → 1592 ms (**10,5% ko‘p**); ilk universitet ochilishi 2881 → 2911 ms deyarli o‘zgarmadi; kirish submit → dashboard 1711 → 1791 ms (**4,7% ko‘p**). Desktop FCP 340 → 356 ms va kirish oynasi 214 → 230 ms bo‘ldi. Shu sabab CPU yoki barcha interaksiyalar bir xil yaxshilandi deb da’vo qilinmaydi. Kichik farqlar uchta sample’li shared-runner o‘lchovida shovqin bo‘lishi ham mumkin. Juda katta lazy-sign-in regressiyasi final variantga kiritilmadi; uning raw dalillari quyida alohida berilgan.

Boshlang‘ich kuzatuv oynasida ikkala profilda CLS 0 bo‘lib qoldi; bu saytning barcha holatlarida CLS doim nol degani emas.

## O‘zgartirishlar

1. **Birinchi ekran JavaScript/animatsiyani kutmaydi.** Landing hero va preview server HTML’ida ko‘rinadi. JavaScript o‘chirilgan mobil brauzerda ham sarlavha va asosiy CTA ko‘rinishi alohida test qilingan.
2. **Yopiq modal komponentlar mount qilinmaydi.** Auth/profile oynalari kerak bo‘lmaganda hook/render ishini bajarmaydi. Kichik, kritik kirish oynasi static import qilinadi: prewarm qilingan lazy variantda ham birinchi Suspense render oynani sezilarli kechiktirgani o‘lchandi. Kod tayyor bo‘ladi, lekin yopiq dialog mount qilinmaydi.
3. **Loading primitive ajratildi.** `PanelSkeleton` uchun butun hub UI moduliga bog‘lanish olib tashlandi; eski import yo‘llarining mosligi re-export orqali saqlandi.
4. **48 ta kampus rasmi darhol yuklanmaydi.** Bitta observer viewportga 160 px qolganda rasm manzilini beradi; `loading="lazy"`, async decode va past fetch priority saqlanadi. Marquee avval pauzada; oxirgi scroll subscriber ketganda RAF, listenerlar va ResizeObserver tozalanadi. Rasm regressiya testi SVG mock bilan defer/load mexanizmini tekshiradi — haqiqiy CDN ishonchliligini emas. JS o‘chirilganda galereya rasmlari yuklanmaydi; no-JS testi hero/CTA bilan cheklangan.
5. **Mavzu almashtirishdagi yalpi animatsiya bekor qilindi.** Har bir descendant, pseudo-element va SVG’ni animatsiyalash o‘rniga asosiy yuzalarning background/border o‘tishlari qisqa muddatga qo‘llanadi.
6. **Bo‘limlar oldingi sahifa animatsiyasini kutmaydi.** `PageTransition` eski hubni darhol almashtiradi va faqat 160 ms kirish animatsiyasini qoldiradi. Nested exit animatsiyalarini kutish ba’zi tez almashishlarda URL yangi bo‘limga o‘tsa ham eski kontentni ushlab qolayotgan edi. Eskirgan pane callback yangi URL’ni qaytarib yuborishidan ham guard qo‘shildi; tez-tez navigatsiya uchun regressiya testi bor.
7. **Idle scheduling haqiqiy minimal kechikishga ega.** `requestIdleCallback` timeout’i minimal kutish emasligi tuzatildi. `SiteTracker` page-view ishini kamida 3 soniyaga kechiktiradi; timer va idle callback uchun cancellation testlari bor. Bu barcha analytics kechiktirilgan degani emas; benchmark brauzeri bot sifatida analytics yubormaydi.
8. **Mobil timeline overflow tuzatildi.** Regressiya tekshiruvida 390 px ekranda hisoblagichlar guruhi 6 px tashqariga chiqishi aniqlandi. Muammo `max-w-full` bilan guruhning o‘zida tuzatildi, butun sahifaga yashiruvchi clipping qo‘yilmadi. Brauzer testi animatsiya tugagach 1 px chegarani tekshiradi; xatolik bo‘lsa geometriya diagnostikasini biriktiradi.

### Rad etilgan optimizatsiya

Navbar va uchta kichik shell/widgetni ham alohida dynamic chunk qilish sinab ko‘rildi. Landing bundle kichraydi, lekin kirish va app-shell tayyorligi sekinlashdi. Faqat byte soni chiroyli ko‘rinishi uchun bu variant qoldirilmadi: shu to‘rtta komponentning static importlari qaytarildi. Katta funksional bo‘limlarning mavjud lazy loading’i saqlandi. Keyin kichik kirish oynasining lazy varianti ham rad etildi: kodni prewarm qilish desktopdagi birinchi ochilish kechikishini yo‘qotmadi. Bu variant [desktop](../data/performance/2026-11-04/rejected-lazy-signin-desktop.json) va [mobile](../data/performance/2026-11-04/rejected-lazy-signin-mobile.json) raw natijalarida alohida saqlangan. Birinchi rad etilgan variantning raw natijalari ham saqlandi: [desktop](../data/performance/2026-11-04/rejected-shell-split-desktop.json), [mobile](../data/performance/2026-11-04/rejected-shell-split-mobile.json). Bular yakuniy natija emas.

## Tekshiruvlar

| Tekshiruv | Yakuniy holat |
|---|---|
| Production build | PASS |
| TypeScript | PASS |
| ESLint baseline | PASS, 0 issue |
| Performance source/bundle guardlari | 15/15 PASS |
| Idle scheduling | 10 assertion PASS |
| Responsive source kontraktlari | 70 PASS; bu script screenshot qilmaydi |
| Dark-mode kontrast/token tekshiruvi | 358 rule, 89 token, 0 unreadable pair |
| Design-system audit | PASS |
| Isolated audit/safety kontraktlari | 27 assertion PASS |
| Funksional Chromium regressiyalari | **14/14 PASS**, 0 failed/skipped/flaky, 220 929 ms |
| Desktop/mobile timing benchmark | 2/2 PASS; har profilda 3 ta cold sample, final bosqichda jami 6 ta |

Funksional testlarning sanitizatsiyalangan ro‘yxati va aniq statistikasi: [`checks.json`](../data/performance/2026-11-04/checks.json). Oraliq urinishlardan birida Chromium o‘lchov boshlanishidan oldin SIGSEGV bilan ishga tushmadi; o‘sha urinishdan timing olinmadi va qayta test qilindi. Yakuniy jadval faqat muvaffaqiyatli yangi o‘lchovlarga tayangan.

`docs/SITE_AUDIT_2026-11-04.md` va uning SHA inventari avvalgi audit vaqtining snapshot’idir. Ushbu performance o‘zgarishlaridan keyin u inventar joriy working tree bilan bir xil deb da’vo qilinmaydi.

## Dalillar va takrorlash

Raw 3 tadan sample, ikkala profil va ikkala bosqich:

- [`before-desktop.json`](../data/performance/2026-11-04/before-desktop.json), [`before-mobile.json`](../data/performance/2026-11-04/before-mobile.json)
- [`after-desktop.json`](../data/performance/2026-11-04/after-desktop.json), [`after-mobile.json`](../data/performance/2026-11-04/after-mobile.json)
- [`comparison.json`](../data/performance/2026-11-04/comparison.json): barcha medianalar va farqlar.
- [`bundle-evidence.json`](../data/performance/2026-11-04/bundle-evidence.json): oldingi/yakuniy build landing diagnostikasi.
- [`after-source.json`](../data/performance/2026-11-04/after-source.json): yakuniy asosiy fayllar SHA-256 va Git HEAD/branch. Bu uncommitted working tree; toza HEAD’ning build’i emas. Baseline avval auditdan o‘tgan working tree’da, performance o‘zgarishlaridan oldin olingan; uning alohida source snapshot’i saqlanmagan.

Keyingi o‘zgarish uchun bir xil sharoitdagi juft o‘lchovni olish:

```bash
# O‘zgartirishdan oldin:
npm run build
PERF_STAGE=before E2E_NEXT_MODE=start npm run test:browser-perf

# O‘zgartirishdan keyin qayta build qilib:
npm run build
E2E_NEXT_MODE=start npm run test:browser-perf
node scripts/summarize-browser-perf.mjs

# Funksional regressiyalar:
E2E_NEXT_MODE=start npm run test:e2e -- \
  e2e/phase12.spec.ts e2e/site-audit.spec.ts e2e/first-paint.spec.ts
```

Wrapper odatda `PERF_STAGE=after` va production start’ni tanlaydi; noto‘g‘ri stage qiymati rad etiladi. `test-results/performance/` vaqtinchalik natijalarini archiver sanali `data/performance/` katalogiga nusxalaydi va bir xil sharoitdagi aynan 3 tadan sample ekanini tekshiradi. Benchmarkni boshqa CPU-og‘ir jarayonlar bilan parallel yurgizmaslik kerak. Oddiy browser suite’da performance testlar opt-in; ular alohida benchmark buyrug‘i bilan bajariladi.

## Cheklovlar va qolgan xarajatlar

- Uchta takror va shared runner: kichik farqlar shovqin bo‘lishi mumkin; statistik kafolat yoki barcha foydalanuvchilar uchun bir xil tezlik va’dasi yo‘q. Jadvalda sekinlashgan yoki o‘zgarmagan natijalar ham yashirilmagan.
- Mobil profil — sekinlashtirilgan desktop Chromium; haqiqiy telefon, foydalanuvchining Tashkent → production tarmog‘i va real DB yuklamasi emas.
- Fixture katalog kichik. Minglab dastur/yozuvli katalog, ko‘p parallel foydalanuvchi va serverless cold start ko‘rsatkichlari isbotlanmagan.
- Kirish interaksiyasi 4 soniyalik boshlang‘ich kuzatuvdan keyin o‘lchanadi. Juda erta bosilgan kirish, returning-session va data-saver holatlari alohida timing profili bilan o‘lchanmagan. Yakuniy variantda kichik kirish kodi static bo‘lib, alohida chunk kelishini kutmaydi.
- Inglizcha to‘liq fallback lug‘at va umumiy client runtime hanuz sezilarli xarajat. Sinxron tarjima consumerlarini buzmaslik uchun lug‘at qisman kesib tashlanmadi; keyingi chuqur namespace/server-boundary refaktor alohida regressiya qamrovini talab qiladi.
- Pullik AI chaqiruvlari, real xarid/to‘lov, kanalga publish va production mutatsiyalari bajarilmadi. AI javob vaqti, tashqi rasm yetkazilishi yoki production API latency bo‘yicha yangi da’vo yo‘q.
