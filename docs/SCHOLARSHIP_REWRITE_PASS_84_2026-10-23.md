# ScholarBridgeAi — stipendiyalarni qayta yozish, 84-pass (Buyuk Britaniya, bare-domain 2-qism)

**Sana:** 2026-10-26
**Loyiha:** `zkdguzbdopfedkffsatk` (Postgres 17)
**Klaster:** Buyuk Britaniyaning 5 ta universiteti — **haqiqiy sahifalar o'qildi**.
**Natija:** bare-domain **43 → 38**.

---

## 1. Tekshirilgan 5 qator (`reliability = 9–10`)

| Qator | Universitet | E'lon qilingan mukofot | `rel.` |
|---|---|---|---|
| **550** | Cardiff | **UG Excellence — GBP 10 000** (faqat 1-kurs, **9 ta** mukofot, **2-aprel 2027** gacha ariza); VC UG 3 500–5 000; VP PG **4 000–10 000** (standart **4 000**; **6 000** — Misr, Qozog'iston, Keniya, Meksika, Pokiston, Janubiy Koreya, Tayvan, AQSh, Vyetnam; **10 000** — Bangladesh, Nigeriya) | **10** |
| **720** | Aberdeen | **PG — GBP 8 000 tuition waiver**, **arizasiz**, avtomatik, **26/27 va 27/28**; **UG — GBP 6 000** har yil. Cheklangan: DPLP, PGDE, Dentistry, Medicine. **O'zbekiston ro'yxatda BOR** | **10** |
| **759** | Surrey | **GBP 5 000** waiver (UG va PG), **ariza asosida**, panel hal qiladi. **8-yanvar 2027** (fevral) / **20-avgust 2027** (sentabr); **CAS chiqqandan keyin berilmaydi** | **10** |
| **769** | York | **Dean's Global Excellence** — **1-kurs to'liq tuition** + **2 va 3-kursda GBP 10 000**; **faqat 6 ta**, **arizasiz**, dekanlar tanlaydi; 2026/27 **yopilgan** | **10** |
| **657** | Queen Mary | **Yanvar 2027 PG — GBP 7 000 gacha**; **Sentabr 2027 — UG GBP 20 000 gacha**, **PG GBP 8 000 gacha**; har maktab uchun alohida shartlar | **9** |

---

## 2. O'zbekiston nomzodi uchun uchta amaliy xulosa

**1) Cardiff'da O'zbekiston "6 000" ro'yxatida YO'Q.**
Cardiff PG mukofoti standart **GBP 4 000**; **6 000** — Misr, Qozog'iston, Keniya, Meksika, Pokiston, Janubiy Koreya, Tayvan, AQSh, Vyetnam; **10 000** — Bangladesh, Nigeriya. O'zbek talaba **4 000** bandini kutishi kerak — bu izohda yozilgan.

**2) Aberdeen'da O'zbekiston ro'yxatda BOR.**
Sahifadagi 200+ davlat ro'yxatida **Uzbekistan** aniq ko'rsatilgan. Ya'ni **GBP 8 000** avtomatik waiver amal qiladi, ariza kerak emas.

**3) York — eng katta imkoniyat, lekin faqat 6 ta.**
1-kurs **to'liq tuition**, keyin 2 va 3-kursda **10 000**. Ariza **yo'q** — har bir offer egasi avtomatik ko'riladi. Lekin **6 ta** joy.

---

## 3. Uch muhim tuzatish

**Cardiff: "to'liq tuition" haqidagi da'vo noto'g'ri edi.**
Qator oldin "UK universitetlari xalqaro bakalavrlarga to'liq tuition bermaydi" deb yozgan edi. **York** buni rad etadi: **1-kurs to'liq tuition**. Bu da'vo **olib tashlandi**.

**Surrey: "baho pog'onalari" haqidagi da'vo noto'g'ri edi.**
Qator "Surrey baho pog'onalari bo'yicha chegirma beradi" deb yozgan edi. Aslida — **tekis GBP 5 000**, panel hal qiladi. Tuzatildi.

**QMUL: "mamlakatga xos" e'tibor noto'g'ri edi.**
Qator "mamlakatga xos mukofotlar bor" deb ogohlantirgan. Aslida tuzilma — **maktab + intake** bo'yicha. Tuzatildi.

---

## 4. Muvaffaqiyatsiz urinishlar

| Manzil | Natija |
|---|---|
| `lancaster.ac.uk/…/lancaster-global-scholarship-masters/` | **404** |
| `lancaster.ac.uk/…/ug-lancaster-global-scholarship/` | **404** |

Lancaster (qator **614**) **o'zgartirilmadi** — ikkala manzil ham 404.

---

## 5. Hisoblagichlar

| Ko'rsatkich | Pass 83 | Pass 84 | O'zgarish |
|---|---|---|---|
| `is_active` | 549 | **549** | 0 |
| **bare-domain** | 43 | **38** | **−5** |
| `source_reliability ≥ 9` | 260 | **278** | **+18** |
| `source_reliability = 4` | 137 | **137** | 0 |
| `amount_usd_value > 5000` | 20 | **20** | 0 |

## 6. Tekshiruv

5 qatorda `bad_desc`, `bad_fields`, `bad_more`, `noncanon`, `bare`, `bad_notes` — **hammasi `false`**.
`tsc` — **0** · `check:i18n` — **passed** · `test:render` — **337 passed, 0 failed**.

## 7. Qolgan 38 bare-domain

- **"Universitetda stipendiya yo'q" halol qaydlari (6)** — domen to'g'ri manzil, tegmaymiz.
- **`reliability = 4` (16)** — sahifa ochilmagan, domen yagona manzil.
- **Milliy dasturlar (7)**: DAAD 861, KNB 579, Rossotrudnichestvo 868, Study in Saudi 859, Phystech 829, McCall MacBain 133, IIT Delhi 477.
- **UK qolganlari (7)**: Lancaster 614, Heriot-Watt 589, Loughborough 616, QUB 658, Exeter 734, St Andrews 327, Edinburgh 131, Leeds 312.
- **Boshqalar**: Paris 1 (718), Lisbon (745), Porto (756), Witwatersrand (762), Barcelona (725), Navarra (750), Cornell (559), Florida (735), Maryland (747), El-Yurt Umidi (862), KSU (908), Open Doors (902 — ongli istisno).

**85-pass** — milliy dasturlar (DAAD, KNB, Rossotrudnichestvo, Study in Saudi, Phystech, McCall MacBain, IIT Delhi).
