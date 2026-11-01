# Boyitish Batch 31 (2026-10-28) — TIAS Indoneziya (yangi 993, O'zbekiston ro'yxatda), 541 mikro-tuzatish, CTU/PEC-PG/UM yana keyinga qoldirildi

## Mazmun

Batch 31 Pass 124 da yuzaga chiqqan **Indonesian AID Scholarship (TIAS)** ni alohida tekshirib, yangi yozuv **993** sifatida qo'shdi: rasmiy portalning birinchi qo'l o'qilishi **O'zbekiston ustuvor davlatlar ro'yxatida** ekanini tasdiqladi (lekin sxema davlat xizmatchilari / hukumat nomzodlari uchun — elchixona orqali kirish). Yonida ikkita mikro-tuzatish: **541** (Ganesha Talent) dan tegishli bo'lmagan importer minima olib tashlandi va Pass-110 dan qolgan **505** dagi "programe" xatosi tuzatildi. CTU (876/875), PEC-PG va UM (500) — fetch devorlari sabab yana keyinga qoldirildi.

> **Texnik hodisa:** batch boshida sandbox git yana reset bo'ldi (lokal HEAD bazaviy `b6085bb` ga qaytdi, 116 ta doc/SQL fayli untracked bo'lib qoldi). Xavfsiz tiklanish bajarildi: `git fetch` → barcha 116 fayl origin blobi bilan **baytma-bayt bir xil** ekani tekshirildi (DIFFER 0, NOT-ON-ORIGIN 0) → nusxalar o'chirildi → `git reset --hard origin/...` (`6cd0e66`) → toza holat tasdiqlandi. Hech qanday ish yo'qolmadi.

| Yozuv | Harakat | Natija |
|---|---|---|
| `993` The Indonesian AID Scholarship (TIAS) | **YANGI** | rel 10; O'zbekiston eligibil; hukumat nominatsiyasi |
| `541` Ganesha Talent-International Fellowship | Mikro-tuzatish | min_gpa/min_ielts → NULL; rel 7 o'zgarmadi |
| us `228` (541 katalog qatori) | Sinxron | 'Yes' → 'available' |
| `505` | Imlo tuzatish | "programe" → "programme" |
| 876/875 CTU, PEC-PG, 500 UM | Qayta urinish → qoldirildi | Fetch devorlari o'zgarishsiz |

Sanag'ichlar: **548 → 549 faol / 192 pensiyaga chiqqan / 5 rel-4 / 199 kelajak deadline**. Max id: scholarships 993, sources 3144, university_scholarships 711, links 414. Tekshiruvlar **337/337**.

## Dalillar (2026-10-28 da bevosita o'qilgan)

### 993 — TIAS

- **Rasmiy portal `tias.kemenkeu.go.id/landing/`** (yangi manba **3143**), chunk 0–2 (4 tadan):
  - Sxema: Indonesian AID (Moliya vazirligi) granti; **ustuvor hudud davlatlari** — Tashqi ishlar vazirligi 15/2020 dekreti. Bayroqlar ro'yxati va matn ro'yxatining ikkalasida ham **Uzbekistan** bor (~57 davlat).
  - Nishon auditoriya: **davlat xizmatchilari yoki tavsiya etilgan rasmiylar**; tanlov selektiv. Ariza mexanizmi: dastur tanlanadi → **Indoneziya elchixonasi orqali portalga kirish so'raladi** → onlayn ariza → ma'muriy + akademik baholash.
  - Darajalar/muddatlar: Diploma ≤36 oy, Bakalavr/Amaliy bakalavr ≤48 oy, Magistr/Amaliy magistr ≤24 oy, Doktorantura ≤48 oy; oldindan — **BIPA** indonez tili kursi (majburiy, ≤6 oy, Level 1 sertifikat) + matrikulyatsiya (≤4 oy); buddy va madaniyatlararo dasturlar.
  - Qoplama (16 band, **summa keltirilmagan** — shu sabab kodlanmadi): tuition, matrikulyatsiya, tanlov xarajati, borish-qaytish chiptasi, viza, tibbiy sug'urta, oylik yashash + turar joy nafaqalari, settle-in, tadqiqot va ta'lim fondlari, xalqaro seminar va jurnal nashri xarajatlari, buddy, BIPA va ingliz tili kurslari.
  - Talablar (daraja bo'yicha to'liq): hukumat nominatsiyasi; fuqarolik; harbiy emas/xizmatda emas; pasport ≥18 oy; yaxshi xulq ma'lumoti; tibbiy guvohnoma + tanlovdan keyingi ko'rik; **uyga qaytib ≥2 yil xizmat**; ≥2 yil davlat sektori tajribasi afzal; rahbar ruxsat xati; yosh chegaralari 31-iyulga: **25/30/42/47**; ingliz tili: TOEFL ITP **477**/IELTS **5.5** (doktorantura **530/6.0**), 2 yillik amal, prediction testlar (Duolingo) qabul qilinadi, ingliz/indonez mediumda voz kechiladi — ikki xil raqam bo'lgani uchun faqat matnda; doktorantura: bo'lajak rahbar tavsiyasi, SoP + dissertatsiya taklifi, avvalgi doktorlik yo'q, barcha tadqiqot Indoneziyada.
  - Portal tekshiruv paytida **2026-yilgi tanlovning 2-partiya natijalarini** e'lon qilayotgan edi → status `upcoming`, keyingi oyna e'lon qilinmagan.
- **ITB "TIAS at ITB" sahifasi** (yangi manba **3144**): xuddi shu qoplama ro'yxati + ITB dagi o'nlab dasturlar (bakalavr 10, magistr 23, doktor 27) — mezbon tomondan tasdiq.
- ITB admission dagi 2025-yilgi TIAS sahifasi endi 404; booklet PDF (intake 2026) va landing chunk 3 o'qilmadi; portaldagi universitet/dastur jadvallari JS siz bo'sh chiqadi (shuning uchun mezbon misoli ITB sahifasidan).

### 541 mikro-tuzatish (yangi fetchsiz, yozuvning o'z tekshirilgan matnidan)

`min_gpa=3.0 / min_ielts=5.5` GT-IF ga tegishli emas edi: qatorning `english_requirements` i (2026-10-25 o'qishidan) "fellowship alohida ingliz bali qo'ymaydi" deydi; GPA 3.00 esa matnda ikkinchi planda tilga olingan region-cheklangan bakalavr grantiga oid. Ikkalasi NULL qilindi, bo'sh accommodation tozalandi, us 228 dagi 'Yes' → 'available'. **Uplift qilinmadi (rel 7 qoldi):** GT-IF chaqiruv kanali bugun o'qib bo'lmadi — partnership sahifasi (Pass 124 da qayta o'qilgan) hamon "deadline TBA" deydi, rasmiy sayt havolasi login tizimiga ketadi, eski `sps.itb.ac.id/gta` esa SPITM restrukturizatsiyasidan keyin 404 (bugun tekshirildi).

### Qoldirilganlar (bugun qayta urinildi)

- **CTU 876/875:** international.cvut.cz endi "Service temporarily unavailable" qaytaradi (avval HTTP 500) — xostning o'zi ishdan chiqqan/migratsiyada bo'lishi mumkin; birinchi qo'l o'qishsiz shartlar kodlanmaydi (Pass 124 dagi notes yetarli, takroriy yozuv qilinmadi).
- **PEC-PG:** CAPES "Multinacional" sahifasi ochildi, lekin markdown nusxada faqat ulashish havolalari chiqdi — PEC-PG sahifasi/hamkor davlatlar topilmadi; hamon aniqlanmagan.
- **UM 500:** aasd xosti yana HTTP 500 — uplift navbatda qoladi.
- **505:** "(programe must offer…)" → "(programme must offer…)" (Pass-110 qoldig'i yopildi).

## Kodlash qarorlari

- 993: ko'p komponentli to'liq paket, summalar e'lon qilinmagan → `award NULL, IDR, month, variable`; darajaga xos ikki ingliz minimumi faqat matnda (`min_ielts NULL`); `min_gpa NULL`; `upcoming + not_published + rounds`; university_id NULL (ko'p universitetli milliy sxema), us qatori yo'q; linklar (993,3143), (993,3144).
- Uydirma miqdor/deadline yo'q; `amount_usd_value=0`; 31-iyul — yosh chegarasi sanasi, deadline sifatida taqdim etilmadi.

## Fayllar

- `supabase/scholarship_enrichment_batch31_2026-10-28.sql` — bajarilgan operatorlar (manbalar 3143/3144, 993 INSERT, 541 mikro-tuzatish, us 228, 505 imlo, linklar 413–414, setval).
