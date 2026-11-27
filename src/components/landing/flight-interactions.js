import I18N from "./flight-copy.json";

// Interactions from the public landing design. Inputs and card content are local examples.
export function mountFlightLanding(root, initialLocale, switchLocale, authLabels) {
  const controller = new AbortController();
  const { signal } = controller;
  const byId = id => root.querySelector("#" + id);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let headlineSwap = 0;
    let currentLang = initialLocale;
    let rotIndex = 0;

    const PRESETS = {
      aziza: { gpa: 4.8, ielts: 7.5, budget: 8 },
      jasur: { gpa: 4.5, ielts: 7.0, budget: 0 },
      madina: { gpa: 4.9, ielts: 8.0, budget: 15 }
    };

    const CATALOGUE_PROGRAMMES = [
      {
        name: "Alpine Institute",
        sub: 'Informatics',
        minGpa: 4.3, minIelts: 6.5, cost: 2, badgeType: "emerald"
      },
      {
        name: "Danube Scholarship",
        sub: 'Scholarship example',
        minGpa: 4.0, minIelts: 6.0, cost: 0, isFullGrant: true, badgeType: "gold"
      },
      {
        name: "Helvetia Tech",
        sub: 'Computer Science',
        minGpa: 4.7, minIelts: 7.5, cost: 4, badgeType: "cyan"
      },
      {
        name: "Seoul Science Fellowship",
        sub: 'AI & Computing',
        minGpa: 4.4, minIelts: 6.5, cost: 0, isFullGrant: true, badgeType: "gold"
      },
      {
        name: "Pacific Computing College",
        sub: 'Computing',
        minGpa: 4.8, minIelts: 7.5, cost: 12, badgeType: "emerald"
      }
    ];

    const gpaSlider = byId("gpaSlider");
    const ieltsSlider = byId("ieltsSlider");
    const budgetSlider = byId("budgetSlider");

    function computeFitAndMatches() {
      const dict = I18N[currentLang] || I18N.uz;
      const gpa = parseFloat(gpaSlider.value);
      const ielts = parseFloat(ieltsSlider.value);
      const budget = parseInt(budgetSlider.value, 10);

      byId("gpaValLabel").textContent = `${gpa.toFixed(1)} / 5.0`;
      byId("ieltsValLabel").textContent = ielts.toFixed(1);
      byId("budgetValLabel").textContent = budget === 0 ? dict.budget_zero : `≤ $${budget}k/${dict.budget_unit}`;

      const gpaNorm = Math.min(1, Math.max(0, (gpa - 3.0) / 2.0));
      const ieltsNorm = Math.min(1, Math.max(0, (ielts - 5.0) / 3.5));
      const budgetBonus = budget >= 12 ? 0.14 : budget >= 6 ? 0.115 : 0.09;
      const overallFit = Math.min(98, Math.max(70, Math.round((gpaNorm * 0.50 + ieltsNorm * 0.495 + budgetBonus) * 100)));

      byId("liveFitScore").textContent = `${overallFit}%`;
      const inlineFit = byId("inlineFitText");
      if (inlineFit) inlineFit.textContent = `${overallFit}%`;

      const circumference = 226.2;
      const offset = circumference - (overallFit / 100) * circumference;
      byId("fitGaugeCircle").style.strokeDashoffset = offset.toFixed(1);

      const scored = CATALOGUE_PROGRAMMES.map((p) => {
        let score = 86 + Math.round((gpa - p.minGpa) * 14) + Math.round((ielts - p.minIelts) * 8);
        if (budget < p.cost) score -= 14;
        return { ...p, fit: Math.min(97, Math.max(72, score)) };
      }).sort((a, b) => b.fit - a.fit).slice(0, 3);

      byId("liveMatchList").innerHTML = scored.map((item) => {
        const badgeLabel = item.isFullGrant ? `${dict.match_grant_badge} · ${item.fit}%` : `${item.fit}% ${dict.match_fit_suffix}`;
        const badgeStyle = item.badgeType === "gold"
          ? "background:var(--gold-soft);color:var(--gold);border:1px solid rgba(245,208,138,0.35)"
          : item.badgeType === "cyan"
            ? "background:var(--accent-soft);color:var(--accent);border:1px solid rgba(56,189,248,0.35)"
            : "background:var(--emerald-soft);color:var(--emerald);border:1px solid rgba(52,211,153,0.35)";
        const subText = item.sub;
        return `
          <div class="match-row">
            <div>
              <span class="match-row__title">${item.name}</span>
              <span class="match-row__sub">${subText}</span>
            </div>
            <span class="match-badge" style="${badgeStyle}">${badgeLabel}</span>
          </div>
        `;
      }).join("");
    }

    [gpaSlider, ieltsSlider, budgetSlider].forEach((s) => {
      s.addEventListener("input", () => {
        root.querySelectorAll(".preset-pill").forEach((b) => b.classList.remove("is-active"));
        computeFitAndMatches();
      }, { signal });
    });

    root.querySelectorAll(".preset-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        root.querySelectorAll(".preset-pill").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        const p = PRESETS[btn.dataset.preset];
        if (p) {
          gpaSlider.value = p.gpa;
          ieltsSlider.value = p.ielts;
          budgetSlider.value = p.budget;
          computeFitAndMatches();
        }
      }, { signal });
    });

    // Altimeter ticks
    const tickCount = 13;
    byId("altimeterTicks").innerHTML = Array.from({ length: tickCount }, (_, i) =>
      `<span class="altimeter-tick ${i % 3 === 0 ? "is-major" : ""}"></span>`
    ).join("");

    // Localized 6 Workspace Windows (3 top row, 3 bottom row)
    function getWorkspaceWindows(lang) {
      if (lang === "en") {
        return {
          top: [
            {
              tag: "01 // PERSONAL DASHBOARD",
              title: "Unified Command Center",
              metric: "Live Dashboard ↗",
              html: `<img loading="lazy" decoding="async" class="window-thumb-img" src="/landing/flight/dashboard.webp" alt="ScholarBridge Dashboard" />`
            },
            {
              tag: "02 // FULL SCHOLARSHIPS",
              title: "100% Grants & Stipends",
              metric: "Stipendium · DAAD · GKS ↗",
              html: `
                <div style="display:flex;flex-direction:column;gap:7px;font-size:12px">
                  <div style="padding:9px 12px;border-radius:12px;background:rgba(245,208,138,0.12);display:flex;justify-content:space-between">
                    <strong>Danube Scholarship</strong><span style="color:var(--gold)">100% Grant</span>
                  </div>
                  <div style="padding:9px 12px;border-radius:12px;background:rgba(52,211,153,0.12);display:flex;justify-content:space-between">
                    <strong>DAAD Germany</strong><span style="color:var(--emerald)">€934/mo + Tuition</span>
                  </div>
                  <div style="padding:9px 12px;border-radius:12px;background:rgba(56,189,248,0.12);display:flex;justify-content:space-between">
                    <strong>GKS Korea</strong><span style="color:var(--accent)">Airfare + 100%</span>
                  </div>
                </div>
              `
            },
            {
              tag: "03 // AI SOP REVIEW",
              title: "Motivation Essay Critique",
              metric: "Score: 9.1 / 10 ↗",
              html: `
                <div style="display:flex;flex-direction:column;gap:7px;font-size:12px">
                  <div style="padding:9px 12px;border-radius:12px;background:rgba(255,255,255,0.05);display:flex;justify-content:space-between">
                    <span>Clarity of goals &amp; evidence</span><strong style="color:var(--emerald)">9.4 / 10</strong>
                  </div>
                  <div style="padding:9px 12px;border-radius:12px;background:rgba(255,255,255,0.05);display:flex;justify-content:space-between">
                    <span>Programme alignment</span><strong style="color:var(--gold)">8.9 / 10</strong>
                  </div>
                </div>
              `
            }
          ],
          bottom: [
            {
              tag: "04 // AI ADVISOR",
              title: "Scholly AI Grounded Q&A",
              metric: "Official rules only ↗",
              html: `
                <div style="display:flex;flex-direction:column;gap:8px;font-size:12px">
                  <div style="padding:9px 12px;border-radius:12px;background:rgba(255,255,255,0.06)">
                    “Which CS programmes in Germany accept IELTS 7.0?”
                  </div>
                  <div style="padding:9px 12px;border-radius:12px;background:rgba(52,211,153,0.12);color:var(--emerald);display:flex;align-items:center;gap:8px">
                    <img src="${LOCAL_ASSETS.scholly}" alt="Scholly" style="width:24px;height:24px" />
                    <span>Compare language and funding requirements in the catalogue.</span>
                  </div>
                </div>
              `
            },
            {
              tag: "05 // WEEKLY ROADMAP",
              title: "Deadline & Document Tracker",
              metric: "14 days left ↗",
              html: `
                <div style="display:flex;flex-direction:column;gap:7px;font-size:12px">
                  <div style="padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.04);display:flex;justify-content:space-between">
                    <span>● Official transcript translation</span><strong style="color:var(--emerald)">Done</strong>
                  </div>
                  <div style="padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.04);display:flex;justify-content:space-between">
                    <span>● Stipendium grant cutoff</span><strong style="color:var(--accent)">14d left</strong>
                  </div>
                </div>
              `
            },
            {
              tag: "06 // VISA & DEPARTURE",
              title: "Embassy Interview Practice",
              metric: "F-1 & Schengen ↗",
              html: `
                <div style="padding:12px;border-radius:14px;background:rgba(0,0,0,0.32);font-size:12px">
                  <div style="color:var(--gold);font-family:var(--font-mono);font-size:10.5px;margin-bottom:4px">● EMBASSY QUESTION REHEARSAL</div>
                  <div style="color:#fff;margin-bottom:6px">“Why did you choose TU Munich for your degree?”</div>
                  <div style="color:var(--emerald)">✓ Clear answer · Financial proof verified</div>
                </div>
              `
            }
          ]
        };
      }
      if (lang === "ru") {
        return {
          top: [
            {
              tag: "01 // ЛИЧНЫЙ КАБИНЕТ",
              title: "Главная панель управления",
              metric: "Live Кабинет ↗",
              html: `<img loading="lazy" decoding="async" class="window-thumb-img" src="/landing/flight/dashboard.webp" alt="ScholarBridge Dashboard" />`
            },
            {
              tag: "02 // ПОЛНЫЕ ГРАНТЫ",
              title: "100% Гранты и стипендии",
              metric: "Stipendium · DAAD · GKS ↗",
              html: `
                <div style="display:flex;flex-direction:column;gap:7px;font-size:12px">
                  <div style="padding:9px 12px;border-radius:12px;background:rgba(245,208,138,0.12);display:flex;justify-content:space-between">
                    <strong>Danube Scholarship</strong><span style="color:var(--gold)">100% Грант</span>
                  </div>
                  <div style="padding:9px 12px;border-radius:12px;background:rgba(52,211,153,0.12);display:flex;justify-content:space-between">
                    <strong>DAAD Германия</strong><span style="color:var(--emerald)">€934/мес + Обучение</span>
                  </div>
                  <div style="padding:9px 12px;border-radius:12px;background:rgba(56,189,248,0.12);display:flex;justify-content:space-between">
                    <strong>GKS Корея</strong><span style="color:var(--accent)">Перелет + 100%</span>
                  </div>
                </div>
              `
            },
            {
              tag: "03 // AI ПРОВЕРКА SOP",
              title: "Анализ мотивационного письма",
              metric: "Оценка: 9.1 / 10 ↗",
              html: `
                <div style="display:flex;flex-direction:column;gap:7px;font-size:12px">
                  <div style="padding:9px 12px;border-radius:12px;background:rgba(255,255,255,0.05);display:flex;justify-content:space-between">
                    <span>Четкость целей и аргументов</span><strong style="color:var(--emerald)">9.4 / 10</strong>
                  </div>
                  <div style="padding:9px 12px;border-radius:12px;background:rgba(255,255,255,0.05);display:flex;justify-content:space-between">
                    <span>Соответствие программе вуза</span><strong style="color:var(--gold)">8.9 / 10</strong>
                  </div>
                </div>
              `
            }
          ],
          bottom: [
            {
              tag: "04 // AI КОНСУЛЬТАНТ",
              title: "Вопросы и ответы Scholly AI",
              metric: "Официальные данные ↗",
              html: `
                <div style="display:flex;flex-direction:column;gap:8px;font-size:12px">
                  <div style="padding:9px 12px;border-radius:12px;background:rgba(255,255,255,0.06)">
                    «Какие IT-программы в Германии доступны с IELTS 7.0?»
                  </div>
                  <div style="padding:9px 12px;border-radius:12px;background:rgba(52,211,153,0.12);color:var(--emerald);display:flex;align-items:center;gap:8px">
                    <img src="${LOCAL_ASSETS.scholly}" alt="Scholly" style="width:24px;height:24px" />
                    <span>TU Munich, RWTH Aachen и Saarland — по официальным правилам.</span>
                  </div>
                </div>
              `
            },
            {
              tag: "05 // ПЛАН ПО НЕДЕЛЯМ",
              title: "Контроль дедлайнов и документов",
              metric: "Осталось 14 дней ↗",
              html: `
                <div style="display:flex;flex-direction:column;gap:7px;font-size:12px">
                  <div style="padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.04);display:flex;justify-content:space-between">
                    <span>● Перевод диплома и оценок</span><strong style="color:var(--emerald)">Готово</strong>
                  </div>
                  <div style="padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.04);display:flex;justify-content:space-between">
                    <span>● Дедлайн гранта Stipendium</span><strong style="color:var(--accent)">14 дней</strong>
                  </div>
                </div>
              `
            },
            {
              tag: "06 // ВИЗА И ВЫЛЕТ",
              title: "Подготовка к интервью в посольстве",
              metric: "F-1 & Schengen ↗",
              html: `
                <div style="padding:12px;border-radius:14px;background:rgba(0,0,0,0.32);font-size:12px">
                  <div style="color:var(--gold);font-family:var(--font-mono);font-size:10.5px;margin-bottom:4px">● ТРЕНИРОВКА ВОПРОСОВ ПОСОЛЬСТВА</div>
                  <div style="color:#fff;margin-bottom:6px">«Почему вы выбрали именно университет TU Munich?»</div>
                  <div style="color:var(--emerald)">✓ Ответ четкий · Финансовые документы проверены</div>
                </div>
              `
            }
          ]
        };
      }
      return {
        top: [
          {
            tag: "01 // SHAXSIY KABINET",
            title: "Asosiy Boshqaruv Paneli",
            metric: "Live Dashboard ↗",
            html: `<img loading="lazy" decoding="async" class="window-thumb-img" src="/landing/flight/dashboard.webp" alt="ScholarBridge Dashboard" />`
          },
          {
            tag: "02 // TO‘LIQ GRANTLAR",
            title: "100% Grant va Stipendiyalar",
            metric: "Stipendium · DAAD · GKS ↗",
            html: `
              <div style="display:flex;flex-direction:column;gap:7px;font-size:12px">
                <div style="padding:9px 12px;border-radius:12px;background:rgba(245,208,138,0.12);display:flex;justify-content:space-between">
                  <strong>Danube Scholarship</strong><span style="color:var(--gold)">100% Grant</span>
                </div>
                <div style="padding:9px 12px;border-radius:12px;background:rgba(52,211,153,0.12);display:flex;justify-content:space-between">
                  <strong>DAAD Germany</strong><span style="color:var(--emerald)">€934/oy + Kontrakt</span>
                </div>
                <div style="padding:9px 12px;border-radius:12px;background:rgba(56,189,248,0.12);display:flex;justify-content:space-between">
                  <strong>GKS Korea</strong><span style="color:var(--accent)">Aviachipta + 100%</span>
                </div>
              </div>
            `
          },
          {
            tag: "03 // AI SOP TEKSHIRUVI",
            title: "Motivatsion Xat Tahlili",
            metric: "Baho: 9.1 / 10 ↗",
            html: `
              <div style="display:flex;flex-direction:column;gap:7px;font-size:12px">
                <div style="padding:9px 12px;border-radius:12px;background:rgba(255,255,255,0.05);display:flex;justify-content:space-between">
                  <span>Maqsad va dalillar aniqligi</span><strong style="color:var(--emerald)">9.4 / 10</strong>
                </div>
                <div style="padding:9px 12px;border-radius:12px;background:rgba(255,255,255,0.05);display:flex;justify-content:space-between">
                  <span>Universitetga moslik</span><strong style="color:var(--gold)">8.9 / 10</strong>
                </div>
              </div>
            `
          }
        ],
        bottom: [
          {
            tag: "04 // AI MASLAHATCHI",
            title: "Scholly AI Savol-Javob",
            metric: "Rasmiy ma’lumotlar ↗",
            html: `
              <div style="display:flex;flex-direction:column;gap:8px;font-size:12px">
                <div style="padding:9px 12px;border-radius:12px;background:rgba(255,255,255,0.06)">
                  “IELTS 7.0 bilan Germaniyada qaysi IT dasturlar bor?”
                </div>
                <div style="padding:9px 12px;border-radius:12px;background:rgba(52,211,153,0.12);color:var(--emerald);display:flex;align-items:center;gap:8px">
                  <img src="${LOCAL_ASSETS.scholly}" alt="Scholly" style="width:24px;height:24px" />
                  <span>TU Munich, RWTH Aachen va Saarland — rasmiy talablar asosida.</span>
                </div>
              </div>
            `
          },
          {
            tag: "05 // HAFTALIK REJA",
            title: "Dedlayn va Hujjatlar Nazorati",
            metric: "14 kun qoldi ↗",
            html: `
              <div style="display:flex;flex-direction:column;gap:7px;font-size:12px">
                <div style="padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.04);display:flex;justify-content:space-between">
                  <span>● Diplom va baholar tarjimasi</span><strong style="color:var(--emerald)">Tayyor</strong>
                </div>
                <div style="padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.04);display:flex;justify-content:space-between">
                  <span>● Stipendium grant dedlayni</span><strong style="color:var(--accent)">14 kun</strong>
                </div>
              </div>
            `
          },
          {
            tag: "06 // VIZA VA PARVOZ",
            title: "Elchixona Suhbatiga Tayyorgarlik",
            metric: "F-1 & Schengen ↗",
            html: `
              <div style="padding:12px;border-radius:14px;background:rgba(0,0,0,0.32);font-size:12px">
                <div style="color:var(--gold);font-family:var(--font-mono);font-size:10.5px;margin-bottom:4px">● ELCHIXONA SAVOLI MASHQI</div>
                <div style="color:#fff;margin-bottom:6px">“Nega aynan TU Munich universitetini tanladingiz?”</div>
                <div style="color:var(--emerald)">✓ Javob aniq · Moliyaviy hujjat tasdiqlangan</div>
              </div>
            `
          }
        ]
      };
    }

    function renderWin(w) {
      return `
        <article class="ui-window-card liquid-glass" data-open-modal="signup">
          <div>
            <div class="window-chrome">
              <div class="window-dots">
                <span class="window-dot window-dot--r"></span>
                <span class="window-dot window-dot--y"></span>
                <span class="window-dot window-dot--g"></span>
              </div>
              <span class="window-title-pill">${w.tag}</span>
            </div>
            <div class="window-body">${w.html}</div>
          </div>
          <div class="window-foot">
            <h4>${w.title}</h4>
            <span>${w.metric}</span>
          </div>
        </article>
      `;
    }

    function renderMarqueeWindows(lang) {
      const wins = getWorkspaceWindows(lang);
      byId("marqueeRowTop").innerHTML = [...wins.top, ...wins.top].map(renderWin).join("");
      byId("marqueeRowBottom").innerHTML = [...wins.bottom, ...wins.bottom].map(renderWin).join("");
    }

    // Complete Language Switcher
    function applyLanguage(lang) {
      currentLang = lang;
      for (const signIn of root.querySelectorAll("[data-flight-sign-in]")) signIn.textContent = authLabels[lang].signIn;
      const menu = root.querySelector("[data-flight-menu]");
      if (menu) menu.setAttribute("aria-label", authLabels[lang].menu);
      const dict = I18N[lang] || I18N.uz;
      root.querySelectorAll("[data-i18n]").forEach((el) => {
        const k = el.getAttribute("data-i18n");
        if (dict[k]) el.textContent = dict[k];
      });
      root.querySelectorAll("[data-lang]").forEach((b) => {
        const selected = b.getAttribute("data-lang") === lang;
        b.classList.toggle("is-active", selected);
        b.setAttribute("aria-pressed", String(selected));
      });
      const slot = byId("heroRotatingWord");
      if (slot && dict.rot_words) {
        slot.textContent = dict.rot_words[rotIndex % dict.rot_words.length];
      }
      computeFitAndMatches();
      renderMarqueeWindows(lang);
    }

    root.querySelectorAll("[data-lang]").forEach((b) => {
      b.addEventListener("click", () => switchLocale(b.getAttribute("data-lang")), { signal });
    });

    const headline = reduced.matches ? 0 : window.setInterval(() => {
      const slot = byId("heroRotatingWord");
      const dict = I18N[currentLang] || I18N.uz;
      if (document.hidden || !slot || !dict.rot_words) return;
      slot.classList.add("is-swapping");
      headlineSwap = window.setTimeout(() => {
        rotIndex = (rotIndex + 1) % dict.rot_words.length;
        slot.textContent = dict.rot_words[rotIndex];
        slot.classList.remove("is-swapping");
      }, 250);
    }, 2900);

    // 4-Scene Background Switcher + Scroll Crossfade
    let activeSceneIdx = 0;
    let manualOverrideUntil = 0;

    function setActiveScene(idx, manual = false) {
      activeSceneIdx = idx;
      if (manual) manualOverrideUntil = Date.now() + 7000;
      for (let i = 0; i < 4; i++) {
        const l = byId(`sceneLayer${i}`);
        if (!l) continue;
        if (i === idx && !l.style.backgroundImage) l.style.backgroundImage = 'url("/landing/flight/bg' + i + '.webp")';
        l.classList.toggle("is-active", i === idx);
      }
      root.querySelectorAll(".scene-pill[data-scene]").forEach((b) => {
        b.classList.toggle("is-active", parseInt(b.dataset.scene, 10) === idx);
      });
    }

    root.querySelectorAll(".scene-pill[data-scene]").forEach((b) => {
      b.addEventListener("click", () => setActiveScene(parseInt(b.dataset.scene, 10), true), { signal });
    });

    const flightPath = byId("scrollFlightCurve");
    const flightActive = byId("scrollFlightActive");
    const flightJet = byId("flightJet");
    const totalLen = flightPath ? flightPath.getTotalLength() : 2000;
    if (flightActive) {
      flightActive.style.strokeDasharray = `${totalLen}`;
      flightActive.style.strokeDashoffset = `${totalLen}`;
    }

    let scrollFrame = 0;
    function updateScroll() {
      scrollFrame = 0;
      const scrollY = window.scrollY || window.pageYOffset;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, scrollY / maxScroll));

      const pctInt = Math.round(progress * 100);
      byId("altimeterPct").textContent = `${String(pctInt).padStart(3, "0")} %`;
      const activeTick = Math.round(progress * (tickCount - 1));
      root.querySelectorAll(".altimeter-tick").forEach((t, idx) => {
        t.classList.toggle("is-near", Math.abs(idx - activeTick) <= 1);
      });

      if (Date.now() > manualOverrideUntil) {
        const target = progress < 0.28 ? 0 : progress < 0.58 ? 1 : progress < 0.84 ? 2 : 3;
        if (target !== activeSceneIdx) setActiveScene(target, false);
      }

      if (!reduced.matches && flightPath && flightJet) {
        const drawLen = totalLen * progress;
        if (flightActive) flightActive.style.strokeDashoffset = `${Math.max(0, totalLen - drawLen)}`;
        const pt = flightPath.getPointAtLength(drawLen);
        const nextPt = flightPath.getPointAtLength(Math.min(totalLen, drawLen + 8));
        const angle = Math.atan2(nextPt.y - pt.y, nextPt.x - pt.x) * (180 / Math.PI);
        const sx = (pt.x / 1440) * window.innerWidth;
        const sy = (pt.y / 900) * window.innerHeight;
        flightJet.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) rotate(${angle.toFixed(1)}deg)`;
      }
    }

    function requestScroll() { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); }
    window.addEventListener("scroll", requestScroll, { passive: true, signal });
    window.addEventListener("resize", requestScroll, { signal });

    // Subtle Starfield Canvas
    const canvas = byId("constellationCanvas");
    const ctx = canvas.getContext("2d");
    let pts = [];
    function initCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      pts = Array.from({ length: 28 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.5 + 0.6
      }));
    }
    function drawCanvas() {
      if (!ctx || document.hidden) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fill();
      }

    }
    const stars = ctx && !reduced.matches && window.innerWidth >= 768 ? window.setInterval(drawCanvas, 100) : 0;
    window.addEventListener("resize", () => { initCanvas(); drawCanvas(); }, { signal });
    initCanvas();
    drawCanvas();
    applyLanguage(initialLocale);
    updateScroll();
    return () => {
      controller.abort();
      clearInterval(stars);
      clearInterval(headline);
      clearTimeout(headlineSwap);
      cancelAnimationFrame(scrollFrame);
    };
}
