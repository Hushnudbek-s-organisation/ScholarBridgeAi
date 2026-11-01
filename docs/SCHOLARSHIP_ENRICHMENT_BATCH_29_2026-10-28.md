# Boyitish Batch 29 (2026-10-28) — CONICET (yangi yozuv), 730 Braziliya uplift, ANID Magíster rad etildi, Chalmers qayta tekshirildi

## Mazmun

Batch 29 Pass 122 dan keyin Lotin Amerikasi chizig'ini davom ettirdi: Pass 122 da pensiyaga chiqarilgan ixtiro qilingan tarkibiy yozuv 400 ("UBA Doctoral Fellowship CONICET Track") ko'rsatkan haqiqiy sxema — **CONICET Beca Interna Doctoral** — rasmiy bases o'qilib, alohida yangi yozuv **991** sifatida qo'shildi; Braziliyaning saqlanib qolgan faol yozuvi **730** (CAPES / CNPq / FAPESP, rel 8) rel 10 darajasiga ko'tarildi (eskirgan miqdorlar va importer minima olib tashlandi); **ANID Beca de Magíster Nacional** (990 ning magistrlik juftligi) baholandi va **rad etildi** — chet elliklarga Chilida doimiy yashash (permanencia definitiva) talabi tufayli; **421 Chalmers** uchinchi bor qayta tekshirildi — sahifa hali ham yangilanmagan, rel 9 qoldi.

| Yozuv | Harakat | Natija |
|---|---|---|
| `991` Beca Interna Doctoral (CONICET) | **YANGI** | Argentina, PhD, 60 oylik oylik stipendiya, rel 10 |
| `730` CAPES / CNPq / FAPESP (Unicamp) | Uplift | rel 8 → rel 10 |
| us `217` (Unicamp katalog qatori) | Qayta yozildi | ENEM-davri eskirgan matn almashtirildi |
| ANID Beca de Magíster Nacional | **Rad etildi** | Chet elliklar faqat permanencia definitiva bilan |
| `421` Chalmers | Qayta tekshiruv | Yozuvda o'zgarish yo'q, rel 9 qoldi |

Sanag'ichlar: **550 → 551 faol / 188 pensiyaga chiqqan / 9 rel-4 / 199 kelajak deadline**. Max id: scholarships 991, sources 3137, university_scholarships 711 (o'zgarishsiz), links 403. Lokal tekshiruvlar **337/337**.

## Dalillar (2026-10-28 da bevosita o'qilgan)

### CONICET — 991 asosi

- `convocatorias.conicet.gov.ar/becas/convocatoria-vigente/` (manba **3135**, Pass 122 da yaratilgan va qayta ishlatildi), chunk 0–1: 2026 chaqiruvida **1,000 ta Beca Interna Doctoral** ko'zda tutilgan; arizalar **27 iyul–21 avgust 2026**, SIGEVA orqali; **60 oy, 2027-04-01 dan**; kvotaning 70% ustuvor mavzu/hududlarga, 30% merit tartibida; qardosh chiziqlar — Finalización de Doctorado (24 oy), Postdoctorales (36 oy) va co-funded variantlar.
- **Bases Becas Internas Doctorales 2026** (rasmiy PDF, yangi manba **3136**), chunk 0–1 (3 tadan):
  - "destinadas a egresadas/os de universidades argentinas **o extranjeras**" — Argentina yoki chet el universitetlari bitiruvchilari uchun.
  - Chet eldagi g'oliblar haqida alohida band: "los beneficiarios extranjeros que se encuentran residiendo en el exterior... deberán realizar el trámite migratorio correspondiente para ingresar a la República Argentina, **no pudiendo hacerlo como turistas**. El CONICET **no financiará pasajes**, aranceles del trámite migratorio ni otros gastos relacionados con el traslado." — ya'ni chet ellik g'olib bo'la oladi va ko'chishi kerak, lekin safar/immigratsiya xarajatlari qoplanmaydi.
  - 60 oy, yangilanmaydi; 6 oy ichida doktoranturaga yozilish jarayonini boshlash dalili, 36 oyga qadar qabul dalili (aks holda beca bekor qilinadi); **yosh chegarasi yo'q**; mehnat munosabati emas, pensiya badallari yo'q; faqat ish rejasiga bag'ishlanish (cheklangan dars berish / 12 soatgacha sog'liqni saqlash navbatchiligi ruxsat etilgan); birinchi yilda ish joyi/director o'zgartirilmaydi.
  - Talablar: bitiruvchi yoki ko'pi bilan 5 ta fan qolgan (boshlanishgacha tamomlashi shart); ko'pi bilan 5 sahifalik original tadqiqot rejasi **faqat ispan tilida**; director qoidalari (birdaniga ko'pi bilan 3 ta erta bosqich doktoral becario; 3-darajagacha qarindoshlik taqiqlangan; CONICET becariolari director bo'la olmaydi); doktorantura CONEAU akkreditatsiyasidan o'tgan (yoki topshirilgan) bo'lishi; bitta nomzod — bitta ariza; ilgari CONICET yoki boshqa (milliy/chet el) muassasadan doktoral grant olganlar bu toifaga topshira olmaydi (Finalización chizig'iga yo'naltiriladi); ariza faqat elektron — SIGEVA-CONICET, deadline hujjat raqamining oxirgi raqamiga ko'ra 18–21 avgust oralig'ida pikselma-piksel.
  - **Stipendiya (estipendio) miqdori o'qilgan bases bo'limlarida keltirilmagan** — shuning uchun hech qanday ARS raqami kiritilmadi (`award NULL, ARS, month, variable`), matnda miqdor CONICET reglament/resolutsiyalarida belgilanishi aytildi. PDF chunk 2 (baholash mezonlari tafsiloti) o'qilmadi.

### 730 — CAPES / CNPq / FAPESP uplift

- **CAPES rasmiy "Programas Institucionais no País" sahifasi** (gov.br/capes, yangi manba **3137**), chunk 0: Demanda Social — CAPES tan olgan, 3–5 baho olgan dasturlar uchun kvotalar; PROEX — 6–7 baho olgan excellencia dasturlari; PROAP qo'llab-quvvatlash. Kvotalar universitet/dasturlarga oqib borishi tasdiqlandi.
- Unicamp PRPG `/bolsas/` slug 404 qaytdi (sayt migratsiyasi) — 2026-10-23 tekshiruvidagi Unicamp xalqaro ofis application URL saqlanib qoldi, website/source CAPES sahifasiga ko'chirildi.
- **Olib tashlanganlar:** eskirgan CNPq raqamlari (magistr R$1,500/oy, doktor R$2,200/oy — bitta Unicamp institut sahifasidan o'qilgan, agentliklarning keyingi qayta ko'rib chiqishlaridan oldingi); importer `min_gpa=3.0`, `min_ielts=6.5` va "IELTS 6.5" matni; bo'sh accommodation; `["All"]` eligibility. Hozirgi agentlik jadval qiymatlari (portaria bilan o'zgarishi tufayli) atayin kodlanmadi.
- us **217** to'liq qayta yozildi: avvalgisi bakalavriat qabul imtihonlari (ENEM/Vestibular) matni, "Moderate Scholarship (10–30% value)", covers_tuition=true/living=false (ag'darilgan) edi; endi kvota-stipendiya haqiqatiga mos.

### ANID Magíster — nega rad etildi

- 2027 chaqiruv sahifasi bor, lekin placeholder: "Concurso Próximo — Inicio: octubre 2026, Cierre: noviembre 2026, Fallo: marzo 2027", hujjatlar ochilish sanasida chiqadi.
- Umumiy tavsif sahifasi (`capital-humano-2/magister-nacional/`) parvarishsiz (sarlavhada "doctorados" copy-paste xatosi), chet ellik bandi yo'q.
- **2026 chaqiruv sahifasi** hal qiluvchi bo'ldi: "Podrán postular a este concurso personas chilenas y extranjeras. **Estas últimas deberán contar con permanencia definitiva en Chile vigente.**" + talablar ro'yxatida "Personas chilenas o extranjeras **con residencia definitiva en Chile vigente**". Ya'ni Doctorado ("con o sin permanencia definitiva", yozuv 990) dan farqli o'laroq, Magíster chet ellikdan **Chili doimiy yashash ruxsatini** talab qiladi — O'zbekistondan topshirmoqchi bo'lgan o'quvchimiz foydalana olmaydi. Yangi yozuvlar uchun auditoriya foydalana olishi bar (POSCO pretsedenti) — **qo'shilmadi**. Qo'shimcha faktlar: akkreditatsiyalangan magíster dasturlari, ko'pi bilan 2 yil; biznes/moliya/marketing dasturlari chiqarib tashlangan.

### 421 Chalmers — uchinchi qayta tekshiruv

Rasmiy sahifa bugun ham: "The scholarship page is not yet updated with the information regarding Chalmers scholarships offered in 2027 admission round." + "application period ... late November 2026 until Mid-January 2027". Yozuv rel 9 qolmoqda; DB ga yozilmadi. 2027 shartlari e'lon qilingach qayta qo'lga olinadi.

## Kodlash qarorlari

- **991**: `deadline_date NULL + not_published + upcoming` (2026 chaqiruv yopiq, 2027 sanalari e'lon qilinmagan); rounds da yopilgan 2026 sikl va yillik namuna; `min_gpa/min_ielts NULL` (bases da yo'q); university_id NULL (ish joyi nomzod tomonidan taklif qilinadi); us qatori yo'q; linklar (991,3135), (991,3136); yangi manba 3136.
- **730**: award `NULL BRL month variable`; status `open` (dasturlar tanlovi yil davomida); `not_published + rounds`; PEC-PG faqat eslatma (termsiz) — alohida yozuv sifatida kelajakda baholanishi mumkin; link (730,3137); us 217 sinxron.
- ANID Magíster uchun DB yozuvi yo'q — rad etish faqat shu hujjatda qayd etildi (POSCO modeli); 990 ga tegilmadi.
- Uydirma miqdor yoki deadline kiritilmadi; USD ga aylantirish yo'q (`amount_usd_value=0`).

## Texnik eslatma

Batch boshida uchta WRITE `42703` xatosi bilan rad etildi (noto'g'ri ustun nomlari yozilgan edi — hech narsa yozilmadi). `information_schema` dan haqiqiy sxema o'qilib (masalan `title`, `coverage_type`, `source_reliability`, `rounds`, `award_basis`; sources da `publisher/notes` yo'q), 730/990/3133/3135 to'liq qatorlaridan konvensiyalar ko'chirildi va yozuvlar to'g'ri shaklda qayta bajarildi. Replay SQL faqat muvaffaqiyatli bajarilgan operatorlarni o'z ichiga oladi.

## Fayllar

- `supabase/scholarship_enrichment_batch29_2026-10-28.sql` — bajarilgan operatorlarning qayta tiklanishi (manbalar 3136/3137, 730 UPDATE, 991 INSERT, linklar 401–403, us 217 UPDATE, setval).
