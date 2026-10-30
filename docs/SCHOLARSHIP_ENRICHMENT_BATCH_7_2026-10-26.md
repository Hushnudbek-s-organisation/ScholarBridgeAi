# Scholarship Enrichment — Batch 7 (hukumat stipendiyalari: HKPFS, Ozarbayjon, Kanada, DAAD EPOS, Singapur, ICCR, Bruney)

**Sana:** 2026-10-26
**Reja:** 1 cleanup → 1 additions navbatma-navbat. Pass 100 (cleanup) tugaganidan ke yingi additions bosqichi. Har bir nomzod faqat rasmiy sahifasi o'sha kuni fetch qilib o'rganilgandan ke yin qo'shildi; O'zbekiston uchun muvofiqligi hujjatlashtirilgan holda tasdiqlandi.

---

## 1. Audit natijasi (nomzodlar bo'yicha)

| nomzod | Rasmiy manba (fetch qilingan) | O'zbekistonga UZ Eligibleligi | Qaror |
|---|---|---|---|
| **Hong Kong PhD Fellowship Scheme (HKPFS)** | `cerg1.ugc.edu.hk/hkpfs` (RGC) | "irrespective of their country of origin" — hamma uchun ochiq | **Qo'shildi (927)** |
| **Heydar Aliyev International Education Grant (Ozarbayjon)** | `edu.gov.az` + rasmiy "Application_Call_2026-27" PDF | OIC a'zolari ro'yxatida "Uzbekistan" aniq yozilgan | **Qo'shildi (926)** |
| **Canada Graduate Research Scholarship – Doctoral (CGRS D)** | `nserc-crsng.canada.ca` (Canada.ca) | xalqaro talabalar 15% kvotagacha, Kanada muassasasida doktoranturada o'qiyotgan bo'lishi shart | **Qo'shildi (929)** — Vanier merosxo'ri |
| Vanier Canada Graduate Scholarships | `canada.ca` | "Vanier is no longer accepting applications" (davlat e'loni) | **Rad etildi: dastur tugagan**; o'rniga CGRS D qo'shildi |
| **DAAD EPOS (Germaniya)** | `www2.daad.de` EPOS sahifasi + DAC davlatlar ro'yxati PDF | DAC ro'yxatida "Uzbekistan" aniq bor (LMIC) | **Qo'shildi (928)** — 861 (DAAD Study Scholarships)dan alohida dastur |
| **A\*STAR Graduate Scholarship (AGS)** | `a-star.edu.sg/scholarships` | barcha fuqarolarga ochiq, **ammo** xalqaro ariza beruvchilar Singapur avtonom universitetida bakalavr/magistrni tugatgan bo'lishi SHART | **Qo'shildi (930)** — cheklov sarlavha darajasidagi maydonlarda ham yirik ko'rsatiladi |
| SINGA (Singapore International Graduate Award) | — | eski SINGA sahifalari A\*STAR'ning yangi saytida "Page Not Found"; rasmiy scholarship ro'yxatida yo'q | **Qo'shilmadi** — dastur hozir taklif etilmayapti deb hujjatlashtirildi; o'rniga AGS (cheklovi bilan) |
| **ICCR (Hindiston)** | `iccr.gov.in` "Scholarship Programme 2026-27" | nomlar jadvalida **Uzbekistan: 12 slots** (Atal Bihari Vajpayee GSS) + **5 slots** (Cultural Exchange, without airfare) | **Qo'shildi (931)** |
| **Brunei BDGS** | `mfa.gov.bn/Pages/scholarship.aspx` + portal `apps.katalyst.gov.bn` | "citizens of, but not limited to, ASEAN, Commonwealth and OIC" — O'zbekiston OIC a'zosi | **Qo'shildi (932)** |
| Australia Awards (Avstraliya) | `australiaawards.gov.au` "Participating countries" | Ro'yxatda Markaziy Osiyo davlatlari yo'q; O'zbekiston ishtirokchi emas | **Rad etildi: UZ hamkor davlat emas** |
| GREAT Scholarships (Buyuk Britaniya) | `britishcouncil.org` 2026-27 sahifasi | 18 davlat ro'yxatida O'zbekiston yo'q | **Rad etildi: UZ ro'yxatda yo'q** |

**Keyingi batchga qoldirilgan (audit qilinmagan):** Serbiya "World in Serbia", Meksika AMEXCID, Tailand TIPP, Tayvan MOFA/ICDF.

**Allaqachon mavjudligi tasdiqlangani (qayta qo'shilmadi):** Indoneziya KNB (579), Qozog'iston davlat dasturi (534), Malayziya MIS (603), Polsha NAWA Banach (867), Rossiya Open Doors (902) va kvota (868), Rhodes (7), Gates Cambridge (11), Clarendon (23/107), Italiya MAECI (864), Niderlandiya NL Scholarship (593), Latviya (508).

---

## 2. Qo'shilgan yozuvlar (926–932)

### 926 — Heydar Aliyev International Education Grant (Ozarbayjon)
- **Dastur:** Ozarbayjon Prezidenti farmoni bilan ta'sis etilgan; IHT (OIC), Qo'shilmaslik harakati (NAM), rivojlanayotgan kichik orol davlatlar (SIDS) va Ozarbayjon bilan madaniy aloqador davlatlar; yiliga 100 grant, 5 yil davom etadi. Bakalavr/Magistr/PhD + tibbiyot/rezidentura/tayyorgarlik kurslari.
- **Moliyaviy paket (rasmiy 2026-27 chaqiriq PDF):** tuition + til-tayyorgarlik (davlat to'lovi darajasida), yiliga 1 marta econom klass chipta, **800 AZN/oy** (yiliga 10 oy), 200 AZN/yil tibbiy yordam, viza/yashash ruxsati xarajatlari.
- **Maydonlar:** `award 800 AZN/month fixed`, `amount_usd_value = 0`. IELTS: bakalavr 5.0 / magistr-PhD 5.5, lekin ingliz tilida o'qiganlar uchun muqobil yo'l bor → `min_ielts = NULL` (matnda yozilgan). GPA kamida 70/100 → `min_gpa = NULL` (matnda). Yosh chegaralari chaqiriqda ko'rsatilgan (35/40/45/50, 15 sentyabr holatiga).
- **Davr:** 2026 chaqirig'i tugagan (nominatsiyalar 16 fev–15 apr; SIACAS 1–10 iyun) → `deadline_date = NULL`, `not_published`, `closed`, rounds yozildi (2027-28 chaqiriq kutiladi).

### 927 — Hong Kong PhD Fellowship Scheme (HKPFS)
- **Omili:** Research Grants Council (2009 dan); 8 ta Gongkong universitetida PhD; kelib chiqish davlatidan qat'iy nazar ochiq; 2027/28 da 400 fellowship.
- **Moliya (2026/27 miqyos):** **344 400 HKD/yil** stipendiya + 14 400 HKD/yil konferensiya safar nafaqasi (3 yilgacha).
- **Maydonlar:** `award 344400 HKD/year fixed`, `amount_usd_value = 0`. Ariza ochiq: HKPFS referral number 2026-yil 1 dekabr 12:00 gacha, universitet arizasi 1 dekabr 23:59 gacha → `deadline_date = 2026-12-01`, `open`. `min_gpa/min_ielts = NULL` (universitetlar o'zlari belgilaydi).

### 928 — DAAD EPOS (Germaniya)
- **Omili:** rivojlanayotgan davlatlardan mutaxassislar uchun English-medium magistratura/doktorantura kurslari; kamida **2 yil** tegishli ish tajribasi (bakalavrdan keyin), eng so'nggi diplom odatda 6 yildan eski bo'lmasligi; ariza to'g'ridan-to'g'ri 3 tagacha ro'yxatdagi kursga.
- **Moliya:** magistratura 992 €/oy; doktorantura 1 300 €/oy (2026 fevraldan 1 400 €), sug'urta to'lovlari, safar xarajati, mumkin bo'lgan ijara/oila qo'shimchalari; davomiylik 12–42 oy.
- **Maydonlar:** daraja/vaqt bo'yicha bosqichli → `award NULL (variable)`, `amount_usd_value = 0`. Kursga qarab muddat → `deadline_date = NULL`, `not_published`, `upcoming`. DAAD stipendiya bazasiga havola berilgan (kurslar ro'yxati uchun).

### 929 — Canada Graduate Research Scholarship – Doctoral (CGRS D)
- **Dastur:** Vanier dasturi tugatilgani davlat saytida e'lon qilingan; ushbu yozuv — uning tri-agency doktorantura merosxo'ri. **40 000 CAD/yil, 36 oy**. Xalqaro talabalar faqat ariza vaqtida muvofiq Kanada muassasasi doktorantura dasturida ro'yxatdan o'tgan bo'lsagina qatnashadi (15% xalqaro kvota).
- **Maydonlar:** `award 40000 CAD/year fixed`, `amount_usd_value = 0`. Agentlik muddati 17 oktyabr, lekin muassasa ichki muddatlari oldinroq va 2026 davri o'tgan → `deadline_date = NULL`, `not_published`, `closed`, rounds yozildi.

### 930 — A\*STAR Graduate Scholarship (AGS)
- **Omili:** A\*STAR Research Institute + Singapur avtonom universitetida PhD; 4 trek (STEM, Semiconductor, Quantum, Computing); 4 yilgacha: tuition + oylik nafaqa (xalqarolar: STEM S$3 600/oy; mahsus treklar S$5 000/oy) + kitob/kompyuter/konferensiya/dissertatsiya nafaqalari + 12 oy xorijdagi safar.
- **Muhim cheklov:** xalqaro arizachilar Singapur avtonom universitetida bakalavr/magistrni tugatgan/tugatayotgan bo'lishi shart → O'zbekistondan to'g'ridan-to'g'ri ariza beruvchilar uchun MUVOFIQ EMAS; Singapurda o'qiyotgan O'zbekiston fuqarolari uchun mos. SPR bo'lmagan xorijiylar PhD dan keyin 3 yil Singapurdagi kompaniyalarda xizmat majburiyati.
- **Maydonlar:** trek bo'yicha har xil → `award NULL (variable)`, `amount_usd_value = 0`. Sellar: 1 noy–1 fev va 1 iyun–10 avg → `deadline_date = 2027-02-01`, `upcoming`. `min_gpa/min_ielts = NULL`.
- **SINGA haqida:** A\*STAR saytidagi eski SINGA sahifalari 404 qaytaradi, rasmiy ro'yxatda yo'q — qo'shilmadi, sababi shu hujjat va 930-noteda qayd etildi.

### 931 — ICCR Scholarships for Uzbek Nationals (Hindiston)
- **Omili:** ICCR 2026-27: 18 sxema, 4541 slot. O'zbekiston: Atal Bihari Vajpayee General Scholarship Scheme — **12 slot**; Dr. S. Radhakrishnan Cultural Exchange — **5 slot** (aviabiletsiz guruh; airfare faqat Meksika/Turkmaniston uchun). Medical/law/integrated taqiqlangan.
- **Moliya:** stipendiya + HRA + contingent allowances + thesis allowance + tuition/OCF universitetga to'lanadi; hostel/mess/depozitlar talabaning o'zidan. Rasmiy sahifada INR raqamlari yo'q ("Norms attached") → `award NULL (variable)`, `amount_usd_value = 0`.
- **Maydonlar:** 2026 davri (portal 27 fev ochilgan, aprel yopilgan) o'tgan → `deadline_date = NULL`, `not_published`, `closed`; ariza kanali `a2ascholarships.iccr.gov.in` application_url ga yozildi. `min_gpa/min_ielts = NULL`.

### 932 — Government of Brunei Darussalam Scholarship (BDGS)
- **Dastur:** Tashqi ishlar vazirligi (MFA) boshqaradi; 5 ta muassasa (UBD, UNISSA, UTB, KUPU SB, Politeknik Brunei) BDGS dastur ro'yxatlarida Diploma/Bakalavr/Magistr; ASEAN/Commonwealth/OIC a'zo davlatlari fuqarolari (O'zbekiston — OIC a'zosi). Yosh: 18–25 (bakalavr/diplom), magistr ≤35.
- **Moliyaviy paket (rasmiy e'londan):** tuition va qabul/imtihon/ro'yxatga olish to'lovlaridan ozodlik; borib-kelish econom samolyot chiptalari; **BND 500/oy** shaxsiy nafaqa; **BND 150/oy** ovqat nafaqasi; **BND 600/yil** kitob nafaqasi; talabalar turar-joyi (residential college); tugagach, yuk nafaqasi (ASEANdan tashqariga BND 500); keng qamrovli sug'urta. Yon stipendiya, haq to'lanadigan ish va oila nafaqalari mumkin emas.
- **Maydonlar:** Komponent paket → `award NULL (variable)`, `amount_usd_value = 0`. 2026/2027 portali yopiq → `deadline_date = NULL`, `not_published`, `upcoming`. IELTS 6.0 — lekin GCE/IGCSE/TOEFL 550 alternativlari bor → `min_ielts = NULL` (matnda).

**Umumiy:** hamma yozuvlar `verification_status = verified`, `source_reliability = 10`, `is_active = true`, `amount_usd_value = 0` (USD-denominated emas). `university_scholarships` qatorlari qo'shilmadi — bu batchdagi barcha mukofotlar ko'p-muassasali hukumat dasturlari (bir universitetga bog'liq emas).

---

## 3. yon jadvallar

- `sources` 3061–3067 (barchasi `is_official = true`, `is_verified = true`) qo'shildi va `scholarship_sources` orqali bog'landi:
  926→3061 (edu.gov.az), 927→3062 (cerg1.ugc.edu.hk), 928→3063 (www2.daad.de), 929→3064 (nserc-crsng.canada.ca), 930→3065 (www.a-star.edu.sg), 931→3066 (iccr.gov.in), 932→3067 (www.mfa.gov.bn).
- ID tekshiruvi (ehtiyot chorasi): parallel INSERTlar kutilganidek juftliklar ichida teskari tartibda qaytdi (HKPFS=927, Ozarbayjon=926, EPOS=928, CGRS-D=929) — linklar title-tekshirilgan xaritalamasiga asoslanib qo'yildi.

## 4. Hisoblagichlar (hard-check)

```
faol 540 → 547 (+7) | nafaqadagi 137 | faol rel4 103 (o'zgarmadi) | UK rel4 12 | kelajakdagi deadline 165 (+2)
```

## 5. Tekshiruvlar

`tsc --noEmit` ✅ · `check:i18n` ✅ (`t()` 3310, o'tdi) · `test:render` ✅ 337/337.

## 6. Keyingi qadamlar

- **Pass 101 (cleanup):** UK klasterining qolgan rel4 yozuvlari — 368 Aston, 369 Bath, 383 Leicester, 384 UEA, 385 Liverpool, 387 Essex, 388 Kent, 389 Queen's Belfast, 390 Portsmouth, 406 Lancaster, 455 KCL, 498 QMUL.
- **Batch 8 (additions):** Serbiya "World in Serbia", Meksika AMEXCID, Tailand TIPP, Tayvan MOFA/ICDF — har biri rasmiy chaqiriq + O'zbekiston muvofiqligi tekshiruvi bilan.
- Katalog vazifalari: Adelaide University yozuvi + 328 relink; Flinders yozuvi + 442 relink.
