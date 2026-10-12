# ScholarBridge AI — Navigation va IA auditi

**Sana:** 2026-10-12  
**Branch:** `arena/bd68830f-scholarbridgeai`  
**Audit usuli:** hujjatdagi da'volar emas, `src/app`, `src/components`, `src/lib`, API guardlari va test scriptlari tekshirildi.

## 1. Kodga asoslangan audit

| Hozirgi element | Hozirgi joylashuv | Holat | Tavsiya etilgan joy | Turi | Mavjud route/komponent | Haqiqiy path |
|---|---|---:|---|---|---|---|
| Dashboard | Home | PASS | Dashboard | Sidebar | `JourneyControlCenter` | `#dashboard` |
| Career discovery / major | Universities hub | PASS | Explore ichida | Tab | `CareerExplorerPanel`, `CareerDiscoveryFlow`, `StudyInterestPicker` | `#universities/careers` |
| University va program search | Universities hub | PASS | Explore ichida | Tab | `UniversityExplorer` | `#universities/search` |
| Program match | Universities hub | PASS | Explore ichida | Tab | `RecommendationStudio` | `#universities/matches` |
| Chancing/outlook | Universities hub | PASS | Explore ichida | Tab | `ChancingPanel` | `#universities/outlook` (`#chancing` alias) |
| Country compare | Universities hub | PASS | Explore ichida | Tab | `CountryComparePanel` | `#universities/countries` |
| Scholarship search | Scholarships hub | PASS | Explore ichida | Tab | `ScholarshipHub` | `#scholarships/browse` |
| Scholarship recommendations | Scholarships hub | PASS | Explore ichida | Tab | `ScholarshipAutopilot` | `#scholarships/recommended` |
| Journey / study plan | My Plan | PASS | My Plan | Tab | `StudyPlanPanel`, Journey Core | `#study-plan/plan` |
| Tasks / deadlines | My Plan | PASS | My Plan | Tabs | `TaskRoadmap`, `DeadlineCenter` | `#tasks/tasks`, `#tasks/deadlines` |
| Goals / readiness | My Plan | PASS | My Plan | Tabs | `GoalPlanner`, `ProfileStrengthPanel` | `#profile/goals`, `#profile/readiness` |
| Financial plan | My Plan | PASS | My Plan | Sidebar destination | `FinancialPlanPanel` | `#funding` |
| Applications tracker | Applications | PASS | Applications | Tab | `ApplicationCenter` | `#applications/tracker` |
| Application workspace | Applications | PASS | Application context | Tab/contextual | `ApplicationWorkspacePanel` | `#applications/workspace` |
| Documents / answer vault | Application Materials | PASS | Applications context | Tab | `DocumentVaultPanel`, `AnswerVault` | `#materials/documents` |
| Essay/SOP / recommendations | Application Materials | PASS | Applications context | Tab | `AiSopStudio`, `EssayRubricStudio`, `RecommendationManagerPanel` | `#materials/essays` |
| Offers / decisions | After Admission | PASS | Applications ichida bo‘lishi ma'qul | Hozir sidebar | `OffersPanel` | `#offers` |
| Offer comparison | Offers/funding komponentlari | PARTIAL | Applications → Offers & Funding | Contextual | `OffersPanel`, compare/cost services | `#offers`, `#post-admission-funding` |
| Visa | After Admission | PASS | Application offer + My Plan konteksti | Hozir sidebar/tab | `VisaCenterPanel`, `VisaSpeakingAssistant` | `#visa/visa` |
| Departure / arrival 7-30-90 / year 1 | Visa & Departure | PASS | My Plan after-admission bosqichi | Tab/contextual | `DepartureChecklist`, `ArrivalPlanPanel` | `#visa/departure` |
| Career development | Courses/Profile/Arrival itemlari | PARTIAL | My Plan bosqichi | Contextual | `CoursesSection`, CV tools, arrival year-1 tasks | bir nechta mavjud pane |
| AI Advisor | Guidance | PASS | Global AI Advisor | Sidebar destination/tab | `AiChatMentor`, `AdmissionsAdvisor` | `#guidance/mentor` (`#advisor` alias) |
| Community / courses | Help & Learning | PASS | Mustaqil faol mahsulot sifatida saqlash | Sidebar destination/tab | `ForumSection`, `CoursesSection` | `#community/*` |
| Parent portal | Account utility | PASS | Utility, rozilik bilan | Utility | `ParentDashboard`, `PremiumGate` | `#parent` |
| Admin | Account utility, faqat admin | PASS | Student nav’dan ajratilgan | Role utility | `AdminPanel`; server admin guardlari | `#admin`, `/api/admin/*` |
| Global search | Navbar / command palette | PASS | Global | Contextual overlay | `CommandPalette`, `/api/search` | Ctrl/⌘+K |
| Notifications | Header/profile utility | PASS | Utility | Contextual | `NotificationBell`, Telegram settings | `#notifications` |
| Breadcrumb | Hub title + tabs/hash | PARTIAL | Faqat chuqur detail sahifalarda | Contextual | URL hash va hub tabs bor; alohida breadcrumb yo‘q | — |
| Mobile navigation | Top bar + 4 bottom items + More | PASS | Saqlash | Mobile global | `Navbar` | app shell |

### Ishlash darajasi bo‘yicha xulosa

- **Real integratsiya:** universitetlar, scholarships, tasks, deadlines, applications, documents, essays, offers, funding, journey, notifications va search API orqali ishlaydi.
- **Halol cheklov:** tashqi universitet portalidan application status avtomatik olinmaydi; foydalanuvchi kiritadi. Tashqi application tugmasi real portalni ochishi kerak, platforma ichida submit bo‘lgandek ko‘rsatilmaydi.
- **Qisman:** career development bitta yaxlit bosqich ko‘rinishida hali birlashtirilmagan; offer comparison mavjud moliyaviy bloklarga tarqalgan; detail breadcrumb komponenti yo‘q.
- **Takror yaratilmadi:** Career Discovery, Journey Core, Tasks, Deadlines, Document Vault, SOP, Visa va Arrival mavjud komponentlar orqali qoladi.

## 2. Yakuniy IA qarori

Repository allaqachon oldingi tekis, taxminan 30–40 bandli navigatsiyadan **6 guruh / 14 destination** modeliga o‘tgan. Uni birdan beshta route’ga majburan almashtirish eski hash-linklar, administrator visibility konfiguratsiyasi va foydalanuvchi odatini xavf ostiga qo‘yadi. Shu sabab minimal, backward-compatible model saqlandi:

1. **Dashboard** — journey, next action, deadline va qisqa holat.
2. **Explore** — Universities & Programs hamda Scholarships; qolganlari tab.
3. **My Plan** — study plan, tasks/deadlines, profile/goals va financial plan.
4. **Applications** — tracker/workspace/materials; offer va visa bilan contextual o‘tishlar.
5. **AI/Help** — Guidance va Community; AI vositalari bitta `guidance/mentor` paneda.
6. **After Admission** — hozir ishlayotgan foydalanuvchilar uchun saqlangan compatibility guruhi; keyingi xavfsiz iteratsiyada Applications/My Plan ichiga ko‘chirish mumkin, legacy aliaslar qolishi shart.

Utility cluster: Premium, alerts, rewards, Parent va vakolatli foydalanuvchi uchun Admin. Ular journey global guruhlari emas.

## 3. Route va compatibility xaritasi

SPA shell `#section/pane` formatidan foydalanadi. `resolveNavTarget` eski IDlarni yangi destination/pane’ga o‘giradi. Misollar:

- `#career` → `#universities/careers`
- `#chancing` → `#universities/outlook`
- `#vault` → `#materials/documents`
- `#sop` → `#materials/essays`
- `#workspace` → `#applications/workspace`
- `#advisor` → `#guidance/mentor`
- `#departure` → `#visa/departure`

Public katalog route’lari `/universities` va `/scholarships` saqlangan. API route’lar o‘zgartirilmadi.

## 4. Desktop va mobile

- Desktop: collapsible guruhlar, faol guruh avtomatik ochiladi, utility/account alohida.
- Phone/tablet: Home, Explore, My Plan, Applications + More; barcha qolgan destination’lar drawer ichida.
- Tabs wrap qiladi va arrow/Home/End keyboard navigatsiyasini qo‘llaydi.
- Ushbu iteratsiyada skip-linkning real targeti tuzatildi: `Navbar`dagi `#main-content` endi `HomeClient`dagi fokuslanadigan `<main>`ga boradi.

## 5. Ushbu iteratsiyada qilingan minimal o‘zgarishlar

- `src/app/HomeClient.tsx`: skip-link uchun `id="main-content"` va programmatik fokus targeti.
- `src/components/hubs/ui.tsx`: NEW/PRO badge matnlari `next-intl` orqali en/uz/ru.
- `src/components/CommandPalette.tsx`: qidiruv loading va PRO/NEW matnlari i18n orqali; search holati yolg‘on natija ko‘rsatmaydi.
- `src/i18n/messages/{en,uz,ru}.json`: `nav.searchLoading` pariteti.

Yangi sahifa, yangi API yoki database migration kerak bo‘lmadi.

## 6. Qolgan xavfsiz keyingi ishlar

1. Offers/Funding’ni `Applications` ichidagi ichki ko‘rinishga ko‘chirishdan oldin real foydalanuvchi telemetry va legacy hash testlarini qo‘shish.
2. Chuqur universitet/application/document detail ko‘rinishlari uchun umumiy breadcrumb; har modalga emas.
3. Career Development uchun mavjud Courses, CV, Profile va year-1 tasklarini yagona My Plan stage sifatida kompozitsiya qilish.
4. Real screen reader va fizik qurilma testi — repository ichidagi statik tekshiruv buning o‘rnini bosa olmaydi.
