# ScholarBridgeAi — stipendiyalarni qayta yozish, 48-pass *(navbat yopildi)*

**Sana:** 2026-10-25
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Qozog'iston, Tailand, Kolumbiya, Argentina, Braziliya — 3 qator qayta yozildi, 2 qator nafaqaga chiqarildi.

> ## 🎯 Asosiy natija: shablon qatorlari **0**
> Ark boshida `description ~ 'offers .*Maximum award:'` shartiga mos **205** qator bor edi. Pass 43 navbatida 27 ta qolgan edi. Endi **0**. Har bir qator o'z provayderining rasmiy sahifasi bilan tekshirilgan.

---

## 1. Nima qilindi

| Qator | Avval | Endi |
|---|---|---|
| **534** Al-Farabi KazNU | "Kazakhstan Government Scholarship for Central Asia & KazNU Grant", uydirma **USD 3 200**, "Mar–May / Aug" | **"Kazakhstan Government Scholarship for Foreign Citizens (Al-Farabi KazNU as host)"** — **asosiy tuzatish: KazNU chet elliklarga stipendiya bermaydi, pul oladi.** O'z sahifasida: ro'yxat yil bo'yi, kontrakt butun o'qish davriga, **birinchi o'quv yilining 100 %i 5 kun ichida**, qabul oynalari **30-iyul** va **5-dekabr**. Yagona bepul yo'l — **Ta'lim vazirligining davlat granti**. Uchinchi yo'l — "Khalkyna" fondining 10 granti (1 mln tenge gacha + 40 000 tenge/oy) |
| **555** Chulalongkorn | "Scholarships for International Students", uydirma **USD 2 000**, "Jan–Mar", 3 daraja | **"Chula LINK Scholarship"** — xalqaro **magistratura/PhD** talabalari uchun (Tailand pasporti bo'lmasligi shart): **kontrakt + oylik yashash nafaqasi + borish-kelish aviachiptasi**. **Joriy chaqiruv 31-oktabr 2026 gacha ochiq** (baho: "closing soon"). Yonida ASEAN/Non-ASEAN dasturi — 16 000 bath/oy + turar joy, GPA 2.75/3.25, yosh ≤40 |
| **712** Universidad Nacional de Colombia | "Scholarships", uydirma **USD 1 250**, "Apr–Jun", 3 daraja | **"Beca de Posgrado va to'lov imtiyozlari"** — ichki tizim (Akord 028/2010): **Grado de Honor** yo'li orqali avtomatik qabul + **100 % ma'muriy va akademik to'lovlardan ozod** + **semestrga 9 minimal ish haqi** (magistratura) / **15** (PhD, tibbiyot). Lekin faqat **UNAL ichidagi** talabalarga; bakalavrga kirish **ispan tilida yozma imtihon** orqali |
| **693** Universidad de Buenos Aires | "UBA Scholarships", uydirma **USD 1 300** | **Nafaqaga chiqarildi** — UBA bakalavrda **umuman kontrakt olmaydi** ("gratuitos tanto para argentinos como para extranjeros"), ya'ni qoplaydigan to'lov yo'q; kiruvchi xalqaro talabalar uchun stipendiya **yo'q**; barcha "becas" — UBA talabalarini chet elga yuborish uchun |
| **777** USP (Braziliya) | "USP International Student Scholarships", uydirma **USD 875** | **Nafaqaga chiqarildi** — USP o'z sahifasida: "qabul qiladi, kontrakt olmaydi, **shuning uchun stipendiya bermaydi**"; yotoqxona ham yo'q; "bolsas" — USP talabalarini chet elga yuborish uchun (R$28 000 Afrika/Osiyo, R$14 000 Lotin Amerikasi) |

`university_scholarships`: **185**, **177**, **178** yangilandi; **161** va **175** → `No`.

---

## 2. Topilgan xatolar (defektlar jadvali)

| № | Xato turi | Qayerda | Tuzatish |
|---|---|---|---|
| 1 | **Teskari asos** (eng jiddiy) | 534, 693, 777 | KazNU chet elliklarga **pul oladi**; UBA va USP esa **umuman to'lov olmaydi**. Uchala holatda ham "stipendiya" degan narsa yo'q |
| 2 | **Ichki vs kirish stipendiyasi** | 712 | UNAL mukofotlari faqat o'z talabalari uchun, qabuldan **keyin** beriladi |
| 3 | **Daraja darajalari** | 555 (3 daraja), 712 (3 daraja) | Chula — **magistratura/PhD**; UNAL — **magistratura/PhD** |
| 4 | **Uydirma USD summalar** | 534 (3 200), 555 (2 000), 712 (1 250), 693 (1 300), 777 (875) | Hammasida `amount_usd_value = 0`; valyutalar **KZT / THB / COP / ARS / BRL** |
| 5 | **Muddat o'ylab topilgan** | 534, 555, 712, 693, 777 | KazNU — 30-iyul / 5-dekabr; Chula — **31-oktabr 2026**; UNAL — `not_published` (fakultet kalendari); UBA/USP — chaqiruv yo'q |
| 6 | **Uydirma IELTS/GPA** | hammasi | `min_ielts = NULL`, `min_gpa = NULL`. Faqat KazNU'ning "Healthcare" dasturi uchun haqiqiy IELTS 5.0 e'lon qilingan (matnda) |
| 7 | **Manba — yalang'och domen** | hammasi | Real sahifalar: `farabi.university/...`, `inter.chula.ac.th/...`, `posgrados.unal.edu.co/becas`, `uba.ar/internacionales/contenido.php?id=430`, `sites.usp.br/prpg/en/alunos-estrangeiros-2` |

---

## 3. Hisoblagichlar

| Ko'rsatkich | Pass 47 oxiri | Pass 48 oxiri |
|---|---|---|
| **Shablon tavsifli qatorlar** | 9 | **0** ✅ |
| Yalang'och domenli `website_url` | 66 | **61** |
| Faol stipendiyalar | 562 | **560** |
| Nafaqaga chiqarilganlar | 104 | **106** |

---

## 4. Navbatdagi ishlar (shablon navbati yopilgandan keyin)

1. **`amount_usd_value > 5000` bo'lgan 238 faol qator** — bular shablon navbatiga kirmagan, lekin hali tekshirilmagan qatorlar. Eng katta guruh. Ular orasida valyuta xatolari (EUR/GBP/INR summalari USD deb yozilgan), takroriy mukofotlar va mavjud bo'lmagan stipendiyalar bor. Keyingi katta ish — shu 238 ni klasterlab tekshirish.
2. **61 yalang'och domen** — `website_url` hali domen ildizi bo'lgan qatorlar.
3. **Qator 343** (UNAM International Postgraduate Scholarship) — 707 dan boshqa instrument, uydirma USD 15 000 bilan turadi.
4. **41 UK qatori** `amount_usd_value > 5000` — 29-passda qayta tekshirilmagan.
5. **UTP Graduate Assistantship**, **Cambridge Trust**, **Radboud Encouragement**, **Groningen Eric Bleumink** — hali yozilmagan haqiqiy mukofotlar.
6. **UNAM ikki marta** (universitet 91 va 176) — dublikat universitet.

---

## 5. Sifat darvozalari

| Tekshiruv | Natija |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run check:i18n` | **i18n check passed** (3 310 `t()` chaqiruvi) |
| `npm run test:render` | **✅ 337 passed, 0 failed** |
| Qattiq tekshiruv (5 qator) | hammasi `false` |

---

## 6. Manbalar (2026-10-25)

`farabi.university/students/inostrannym-studentam?lang=en` · `inter.chula.ac.th/funding-opportunity/40290/` · `posgrados.unal.edu.co/becas/` · `uba.ar/internacionales/contenido.php?id=430` · `sites.usp.br/prpg/en/alunos-estrangeiros-2/` (UBA va USP matni indekslangan rasmiy sahifalardan; `source_reliability` 7 va 8)

SQL: `supabase/scholarship_rewrite_pass48_2026-10-23.sql`
