type GuideLocale = "uz" | "en" | "ru";
type Copy = [uz: string, en: string, ru: string];

const help = {
  next: ["Bu kartada navbatdagi ish ko‘rsatiladi. Arizalar oynasiga o‘tish uchun «Davom etish»ni bosing.", "This card shows your next action. Select Continue to open the applications workspace.", "Здесь показан следующий шаг. Нажмите «Продолжить», чтобы перейти к заявкам."],
  continue: ["Bu tugma arizalar ish oynasini ochadi. U yerda arizani tanlab, hujjatlar ro‘yxati va holatini ko‘rasiz.", "This opens the applications workspace. Choose an application there to see its checklist and status.", "Эта кнопка открывает рабочее пространство заявок. Выберите заявку, чтобы увидеть список документов и статус."],
  plan: ["Bu ariza uchun tayyorgarlik ro‘yxati. Profil, universitet yoki hujjatlar qatorini bosib kerakli bo‘limga o‘ting.", "This is your application preparation checklist. Select Profile, University, or Documents to open that section.", "Это план подготовки заявки. Нажмите на профиль, университет или документы, чтобы открыть раздел."],
  tasks: ["Bu bugungi vazifalar ro‘yxati. Vazifa yonidagi tugma tegishli ish oynasini ochadi.", "This list shows today’s tasks. Use the button beside a task to open the relevant workspace.", "Здесь показаны задачи на сегодня. Нажмите кнопку рядом с задачей, чтобы открыть нужный раздел."],
  deadlines: ["Bu ariza muddatlari taqvimi. Oylar orasida strelkalar bilan o‘ting, belgilangan sanani bosib muddat tafsilotini ko‘ring.", "This calendar shows application deadlines. Use the arrows to change months and select a marked date to see its deadline.", "Это календарь сроков подачи. Стрелки переключают месяцы, а отмеченные даты открывают сведения о сроке."],
  applications: ["Bu arizalaringiz holati bo‘yicha qisqa hisobot. Tafsilotlar uchun arizalar ish oynasini oching.", "This summarizes your applications by status. Open the applications workspace for details.", "Это сводка заявок по статусам. Откройте рабочее пространство заявок, чтобы посмотреть подробности."],
  recommendations: ["Bu tavsiyalar bo‘limi. Universitetlar, grantlar yoki imkoniyatlar yorlig‘ini tanlang, so‘ng kartani oching.", "This section shows recommendations. Choose the Universities, Scholarships, or Opportunities tab, then open a card.", "Здесь собраны рекомендации. Выберите вкладку университетов, стипендий или возможностей, затем откройте карточку."],
  tuition: ["Bu yillik kontraktning yuqori chegarasi. Byudjetingizni belgilash uchun slayderni suring.", "This sets the maximum annual tuition. Move the slider to set your budget limit.", "Это верхний предел стоимости обучения за год. Передвиньте ползунок, чтобы задать бюджет."],
  country: ["Bu mamlakat filtri. Faqat tanlagan mamlakatingizdagi natijalarni ko‘rish uchun ro‘yxatdan mamlakatni tanlang.", "This is the country filter. Choose a country from the list to see results for that country.", "Это фильтр по стране. Выберите страну из списка, чтобы увидеть результаты по ней."],
  universityType: ["Bu universitet turi filtri. Davlat yoki xususiy universitetlarni alohida ko‘rish uchun ro‘yxatdan tanlang.", "This filters universities by type. Choose public or private to narrow the list.", "Это фильтр по типу вуза. Выберите государственные или частные университеты, чтобы сузить список."],
  degree: ["Bu ta’lim darajasi filtri. Bakalavr, magistratura yoki doktoranturani tanlang. Profil belgilagan daraja tahrirlanmaydigan bo‘lishi mumkin.", "This filters by degree level. Choose bachelor’s, master’s, or doctoral study. Your profile may lock the selection.", "Это фильтр по уровню образования. Выберите бакалавриат, магистратуру или докторантуру. Профиль может фиксировать выбор."],
  searchUniversity: ["Bu universitetlar qidiruvi. Natijalarni topish uchun universitet, yo‘nalish yoki shahar nomini yozing.", "This searches the university catalog. Enter a university, major, or city to find relevant results.", "Это поиск по каталогу вузов. Введите название университета, специальность или город."],
  sort: ["Bu saralash menyusi. Natijalar qaysi tartibda chiqishini ro‘yxatdan tanlang.", "This is the sort menu. Choose the order in which results should appear.", "Это меню сортировки. Выберите порядок отображения результатов."],
  filters: ["Bu filtrlar oynasini ochadi. Natijalarni toraytirish uchun kerakli shartlarni tanlang.", "This opens the filters. Choose options to narrow the results.", "Эта кнопка открывает фильтры. Выберите условия, чтобы сузить результаты."],
  university: ["Bu katalogdagi universitet kartasi. Dasturlar, talablar va xarajatlar bo‘yicha batafsil ma’lumotni ko‘rish uchun kartadagi tafsilotlar tugmasini bosing.", "This is a university catalog card. Use its details button to see available program, requirement, and cost information.", "Это карточка университета. Откройте подробности, чтобы посмотреть сведения о программах, требованиях и стоимости."],
  fit: ["Bu profil ma’lumotlaringiz dastur talablariga qanchalik mos kelishini ko‘rsatadi. Moslik tafsilotlarini kartadan ochib, talablarni ko‘ring.", "This shows how recorded profile details compare with program requirements. Open the card to review the requirements behind the comparison.", "Это сравнение данных профиля с требованиями программы. Откройте карточку, чтобы посмотреть требования."],
  language: ["Bu sayt tili sozlamasi. Menyudan UZ, EN yoki RU ni tanlang.", "This sets the site language. Choose UZ, EN, or RU in the menu.", "Это настройка языка сайта. Выберите UZ, EN или RU в меню."],
  notifications: ["Bu bildirishnomalar tugmasi. Oxirgi bildirishnomalarni ko‘rish uchun qo‘ng‘iroqni bosing.", "This opens your notifications. Select the bell to see recent updates.", "Это кнопка уведомлений. Нажмите на колокольчик, чтобы увидеть последние обновления."],
  interview: ["Bu viza suhbati mashqini boshlash tugmasi. Avval mamlakatni, keyin John yoki Rica’ni tanlang.", "This starts visa interview practice. Pick a country first, then choose John or Rica.", "Это запуск тренировки визового собеседования. Сначала выберите страну, затем John или Rica."],
  dock: ["Bu pastki navigatsiya paneli. Kerakli guruhni bosib, ichidan bo‘limni tanlang.", "This is the bottom navigation. Open a group and choose a section.", "Это нижняя панель навигации. Откройте группу и выберите нужный раздел."],
  searchSite: ["Bu sayt bo‘ylab qidiruv. Bo‘lim yoki funksiya nomini yozing va natijadan kerakli joyni oching.", "This searches the site. Type a section or feature name, then open a result.", "Это поиск по сайту. Введите название раздела или функции, затем откройте результат."],
  dashboard: ["Bu bosh sahifaga qaytish tugmasi. Uni bosib vazifalar, muddatlar va arizalar holatini bir joyda ko‘ring.", "This returns you to your dashboard, where you can see tasks, deadlines, and application status.", "Эта кнопка возвращает на главную, где видны задачи, сроки и статусы заявок."],
  workspaceChart: ["Bu arizalarning status bo‘yicha taqsimoti. Ranglar va sonlardan nechta ariza qaysi bosqichda ekanini ko‘rasiz.", "This chart breaks down applications by status. Use the colors and counts to see how many are at each stage.", "Этот график группирует заявки по статусу. Цвета и числа показывают количество заявок на каждом этапе."],
  workspaceList: ["Bu arizalar ro‘yxati. Qidiruv yoki filtrdan foydalaning, keyin tafsilotlarni ko‘rish uchun qatorni tanlang.", "This is the list of applications. Search or filter it, then select a row to see its details.", "Это список заявок. Воспользуйтесь поиском или фильтром, затем выберите строку для просмотра подробностей."],
  workspaceChecklist: ["Bu ariza hujjatlari ro‘yxati. Tayyor bandlarni belgilab, nechta band qolganini kuzating.", "This is the application document checklist. Mark completed items to track what is left.", "Это список документов для заявки. Отмечайте готовые пункты, чтобы отслеживать оставшиеся."],
  workspaceStatus: ["Bu ariza statusi filtri. Muayyan bosqichdagi arizalarni ko‘rish uchun ro‘yxatdan statusni tanlang.", "This filters applications by status. Choose a status to see applications at that stage.", "Это фильтр заявок по статусу. Выберите статус, чтобы увидеть заявки на этом этапе."],
  workspacePrograms: ["Bu hamkor tashkilotlar dasturlari. Dastur kartasidan ariza yarating yoki mavjud arizani oching.", "These are programs from partner organizations. Use a program card to create or open an application.", "Это программы партнёров. Откройте карточку, чтобы создать или посмотреть заявку."],
} satisfies Record<string, Copy>;

const byLocale = { uz: 0, en: 1, ru: 2 } as const;
const interactive = "button, a[href], input:not([type='hidden']), select, textarea, summary, [role='button'], [role='tab'], [role='switch'], [role='slider']";
const content = "[data-scholly-help], label, article, [role='progressbar'], progress, [role='img'], img, h1, h2, h3, h4, p, [aria-labelledby], section, nav";
const ignored = ".sb-scholly, .sb-scholly-inspector, [inert]";

export function pickPageElement(raw: EventTarget | null): Element | null {
  if (!(raw instanceof Element) || raw.closest(ignored)) return null;
  const control = raw.closest(interactive);
  if (control) return control;
  const label = raw.closest("label");
  if (label?.control) return label.control;
  const hidden = raw.closest("[aria-hidden='true']");
  const visible = hidden ? hidden.parentElement : raw;
  const element = visible?.closest(content) ?? visible;
  return element && !element.matches("html, body, #main-content") ? element : null;
}

function compact(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, 96);
}

function labelOf(element: Element) {
  const names = element.getAttribute("aria-labelledby")?.split(/\s+/).map(id => document.getElementById(id)?.textContent).join(" ");
  const name = compact(names || element.getAttribute("aria-label") || element.getAttribute("title"));
  if (name) return name;
  if (element instanceof HTMLImageElement) return compact(element.alt);
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    return compact(element.labels?.[0]?.firstChild?.textContent) || compact(element.getAttribute("placeholder"));
  }
  const heading = element.querySelector("h1,h2,h3,h4");
  return compact(heading?.textContent || (element.matches(interactive) || element.children.length === 0 ? element.textContent : ""));
}

const basic = {
  button: ["Bu tugma. Belgilashni tugatgach, yorlig‘idagi amalni bajarish uchun uni bosing.", "This is a button. After leaving selection mode, press it to perform the action shown on its label.", "Это кнопка. Выйдите из режима выбора и нажмите её, чтобы выполнить указанное действие."],
  menu: ["Bu menyu tugmasi. Uni bosib, ichidan kerakli bandni tanlang.", "This opens a menu. Press it and choose an item.", "Эта кнопка открывает меню. Нажмите её и выберите пункт."],
  link: ["Bu havola. Uni bosib, ko‘rsatilgan sahifa yoki bo‘limga o‘ting.", "This is a link. Select it to open the indicated page or section.", "Это ссылка. Нажмите её, чтобы перейти на указанную страницу или в раздел."],
  select: ["Bu tanlov menyusi. Uni ochib, kerakli variantni tanlang.", "This is a selection menu. Open it and choose an option.", "Это список выбора. Откройте его и выберите подходящий вариант."],
  text: ["Bu matn maydoni. Unga maydon yorlig‘ida so‘ralgan ma’lumotni yozing.", "This is a text field. Enter the information requested in its label.", "Это текстовое поле. Введите данные, указанные в его названии."],
  search: ["Bu qidiruv maydoni. Kerakli kalit so‘zni yozing va natijalarni ko‘ring.", "This is a search field. Type a keyword to find matching results.", "Это поле поиска. Введите ключевое слово, чтобы найти совпадения."],
  range: ["Bu slayder. Qiymatni o‘zgartirish uchun tutqichni suring yoki strelka tugmalaridan foydalaning.", "This is a slider. Drag the handle or use the arrow keys to change the value.", "Это ползунок. Перетащите его или используйте клавиши со стрелками."],
  check: ["Bu belgilash bandi. Holatini o‘zgartirish uchun katakni bosing.", "This is a checkbox. Select it to change its checked state.", "Это флажок. Нажмите на него, чтобы изменить состояние."],
  tab: ["Bu yorliq. Tegishli tarkibni ko‘rish uchun uni tanlang.", "This is a tab. Select it to show its content.", "Это вкладка. Выберите её, чтобы открыть соответствующее содержимое."],
  progress: ["Bu jarayon ko‘rsatkichi. U bajarilgan ish yoki joriy holatni ko‘rsatadi.", "This is a progress indicator. Read it to see completion or the current status.", "Это индикатор прогресса. Он показывает степень выполнения или текущий статус."],
  image: ["Bu rasm. U yonidagi ma’lumotga tegishli.", "This image illustrates the nearby content.", "Это изображение относится к соседнему содержимому."],
  info: ["Bu ma’lumot qismi. Tafsilotlar yoki amallar uchun uning atrofidagi yozuv va tugmalarga qarang.", "This part displays information. Look at the surrounding text and controls for details or available actions.", "Здесь отображается информация. Посмотрите соседний текст и кнопки, чтобы узнать подробности и доступные действия."],
  disabled: ["Bu amal hozir faol emas. Yonidagi izohni yoki oldingi bosqichni tekshiring.", "This control is currently disabled. Check its nearby hint or the preceding step.", "Элемент сейчас недоступен. Посмотрите подсказку рядом или предыдущий шаг."],
} satisfies Record<string, Copy>;

function fallbackFor(element: Element): Copy {
  if (element.matches("select")) return basic.select;
  if (element.matches("a[href]")) return basic.link;
  if (element.matches("[role='tab']")) return basic.tab;
  if (element.matches("button[aria-expanded], [role='button'][aria-expanded], summary")) return basic.menu;
  if (element.matches("button, [role='button']")) return basic.button;
  if (element.matches("input[type='range'], [role='slider']")) return basic.range;
  if (element.matches("input[type='checkbox'], [role='switch']")) return basic.check;
  if (element.matches("input[type='search']")) return basic.search;
  if (element.matches("input, textarea")) return basic.text;
  if (element.matches("progress, [role='progressbar']")) return basic.progress;
  if (element.matches("img, [role='img']")) return basic.image;
  return basic.info;
}

export function explainPageElement(element: Element, locale: GuideLocale) {
  const index = byLocale[locale];
  const control = element.matches(interactive);
  const marked = control ? element : element.closest("[data-scholly-help]") ?? element;
  const key = marked.getAttribute("data-scholly-help") ?? "";
  const curated = Object.hasOwn(help, key) ? help[key as keyof typeof help] : undefined;
  const label = labelOf(element) || (marked !== element ? labelOf(marked) : "");
  const answer = curated?.[index] ?? fallbackFor(element)[index];
  return { label, answer: !curated && element.matches(":disabled, [aria-disabled='true']") ? basic.disabled[index] : answer };
}
