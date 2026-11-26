import I18N from "./flight-copy.json";

// Public catalogue records, with explicit scope for the only numerical tuition
// included here. Cross-programme requirements are left to the catalogue.
const examples = [
  { name: "KAIST Scholarship", category: "scholarships", id: 995, degrees: ["Bachelor"], country: "South Korea", tuitionGrant: true },
  { name: "Stipendium Hungaricum Scholarship Programme", category: "scholarships", id: 860, degrees: ["Bachelor", "Master", "PhD"], country: "Hungary", tuitionGrant: true },
  { name: "ETH Zurich Excellence Scholarship & Opportunity Programme (ESOP)", category: "scholarships", id: 13, degrees: ["Master"], country: "Switzerland", tuitionGrant: true },
  { name: "University of Pennsylvania (UPenn)", category: "universities", id: 11, degrees: ["Bachelor"], majors: ["Computer Science", "Business", "Engineering"], country: "United States", tuition: 65_670 },
  { name: "University of Oxford", category: "universities", id: 4, degrees: ["Bachelor", "Master", "PhD"], majors: ["Computer Science", "Engineering"], country: "United Kingdom" },
  { name: "Massachusetts Institute of Technology (MIT)", category: "universities", id: 1, degrees: ["Bachelor", "Master", "PhD"], majors: ["Computer Science", "Engineering"], country: "United States" },
];

export function mountFlightLanding(root, initialLocale, switchLocale, authLabels) {
  const controller = new AbortController();
  const { signal } = controller;
  const byId = (id) => root.querySelector("#" + id);
  const gpa = byId("gpaSlider");
  const ielts = byId("ieltsSlider");
  const budget = byId("budgetSlider");
  const degree = byId("fitDegree");
  const major = byId("fitMajor");
  const list = byId("liveMatchList");
  const dict = I18N[initialLocale] ?? I18N.uz;

  function renderResults() {
    byId("gpaValLabel").textContent = Number(gpa.value).toFixed(1) + " / 5.0";
    byId("ieltsValLabel").textContent = Number(ielts.value).toFixed(1);
    const maxTuition = Number(budget.value) * 1_000;
    byId("budgetValLabel").textContent = maxTuition === 0
      ? dict.budget_zero
      : "≤ $" + budget.value + "k/" + dict.budget_unit;

    const grantOnly = maxTuition === 0;
    const matches = examples.filter((item) => (
      item.degrees.includes(degree.value) &&
      (!grantOnly || item.tuitionGrant) &&
      (item.tuition == null || item.tuition <= maxTuition) &&
      (!major.value || !item.majors || item.majors.includes(major.value))
    ));

    list.replaceChildren(...matches.slice(0, 3).map((item) => {
      const link = document.createElement("a");
      link.className = "match-row";
      link.href = "/" + item.category + "/" + item.id;
      const title = document.createElement("span");
      title.className = "match-row__title";
      title.textContent = item.name;
      const badge = document.createElement("span");
      badge.className = "match-badge";
      badge.textContent = dict[item.category === "scholarships" ? "fit_grant" : "fit_university"];
      link.append(title, badge);
      return link;
    }));
    if (!matches.length) list.textContent = dict.fit_empty;
    const universityParams = new URLSearchParams({ degree: degree.value });
    if (major.value) universityParams.set("major", major.value);
    if (maxTuition > 0) universityParams.set("maxTuition", String(maxTuition));
    byId("fitUniversityLink").href = "/universities?" + universityParams;
    byId("fitScholarshipLink").href = "/scholarships?" + new URLSearchParams({
      degree: degree.value,
      ...(grantOnly ? { coverage: "full" } : {}),
    });
  }

  for (const field of [gpa, ielts, budget, degree, major]) {
    field.addEventListener("input", renderResults, { signal });
  }
  for (const button of root.querySelectorAll("[data-lang]")) {
    const selected = button.dataset.lang === initialLocale;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.addEventListener("click", () => switchLocale(button.dataset.lang), { signal });
  }

  for (const button of root.querySelectorAll("[data-flight-sign-in]")) {
    button.textContent = authLabels[initialLocale].signIn;
  }
  root.querySelector("[data-flight-menu]")?.setAttribute("aria-label", authLabels[initialLocale].menu);
  for (const element of root.querySelectorAll("[data-i18n]")) {
    const value = dict[element.dataset.i18n];
    if (typeof value === "string") element.textContent = value;
  }
  byId("heroRotatingWord").textContent = dict.rot_words[0];
  renderResults();
  return () => controller.abort();
}
