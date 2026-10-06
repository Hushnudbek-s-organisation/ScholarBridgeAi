/**
 * Render smoke test for the Phase 3–4 client components.
 *
 * `npm run build` proves these files COMPILE. It does not prove they RENDER:
 * a component can typecheck perfectly and still throw on first paint because
 * it called `.map` on undefined, read a property of a null object, or hit a
 * conditional branch that only exists when data is absent.
 *
 * These components fetch in useEffect, and effects do not run during
 * server rendering — so this exercises exactly the initial paint: the
 * no-profile state and the loading state. That is the path a user hits first,
 * and the one most likely to crash on a null activeProfile.
 *
 * Run: npm run test:render
 */

import React from "react";
import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { PlanningStudio } from "../src/components/PlanningStudio";
import { MentorMarketplace } from "../src/components/MentorMarketplace";
import { ParentDashboard } from "../src/components/ParentDashboard";
import { LandingPage } from "../src/components/LandingPage";
import { UniversityExplorer } from "../src/components/UniversityExplorer";
import { UniversityDetail } from "../src/components/UniversityDetail";
import { DegreeLevelLabel } from "../src/components/DegreeLevelLabel";
import { ProfileModal } from "../src/components/ProfileModal";
import { OnboardingWizard } from "../src/components/OnboardingWizard";
import { DashboardView } from "../src/components/DashboardView";
import { RecommendationStudio } from "../src/components/RecommendationStudio";
import { normalizeDegreeLevel, supportsDegreeLevel } from "../src/lib/degreeLevels";
import { RecommendedPanel } from "../src/components/journey/JourneyControlCenter";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

/** The component prop shape. Only `id` is read by the fetch calls. */
const profile = { id: 7 } as any;

/** Render and return markup, or the thrown error as a string. */
function render(node: React.ReactElement): { html: string; error: string | null } {
  try {
    return { html: renderToStaticMarkup(node), error: null };
  } catch (e) {
    return { html: "", error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  }
}

const components: [string, (p: any) => React.ReactElement][] = [
  ["PlanningStudio", (p) => React.createElement(PlanningStudio, { activeProfile: p })],
  ["MentorMarketplace", (p) => React.createElement(MentorMarketplace, { activeProfile: p })],
  ["ParentDashboard", (p) => React.createElement(ParentDashboard, { activeProfile: p })],
];

// ---------------------------------------------------------------------------
section("1. No component throws with no profile selected");

for (const [name, make] of components) {
  const { html, error } = render(make(null));
  check(`${name} renders without a profile`, error === null, error ?? "");
  check(`${name} produces markup`, html.length > 50, `only ${html.length} chars`);
}

section("2. No component throws with a profile selected");

for (const [name, make] of components) {
  const { html, error } = render(make(profile));
  check(`${name} renders with a profile`, error === null, error ?? "");
  check(`${name} produces markup`, html.length > 50, `only ${html.length} chars`);
}

section("3. Each component says what it is");

const planning = render(components[0][1](profile)).html;
check("PlanningStudio names the cost calculator", /cost/i.test(planning));
check("PlanningStudio offers a scholarship tab", /scholarship/i.test(planning));
check("PlanningStudio offers a CV tab", /\bCV\b/.test(planning));
check("PlanningStudio offers a comparison tab", /compar/i.test(planning));

const mentors = render(components[1][1](profile)).html;
check("MentorMarketplace explains the sorting", /sorted by how closely/i.test(mentors));
check("MentorMarketplace has a rate filter", /Max hourly rate/i.test(mentors));

const parent = render(components[2][1](profile)).html;
check("ParentDashboard offers the share toggle", /Share a read-only summary/i.test(parent));
check("ParentDashboard states what is withheld", /never see/i.test(parent));
check("ParentDashboard names essays as withheld", /essay drafts/i.test(parent));
check("ParentDashboard names passwords as withheld", /password/i.test(parent));

section("4. The no-profile state is handled, not crashed");

// The bug this guards against: a component that dereferences activeProfile.id
// during render instead of inside the effect.
const noProfile = render(components[0][1](null));
check("PlanningStudio survives a null profile", noProfile.error === null, noProfile.error ?? "");
// The actual copy is "Sign in to build your plan." — what matters is that it
// explains itself rather than rendering an empty cost table.
check(
  "PlanningStudio explains itself instead of rendering a table",
  /sign in to build your plan/i.test(noProfile.html),
  noProfile.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120)
);
check(
  "PlanningStudio renders no cost rows without a profile",
  !/Estimated cost per year/i.test(noProfile.html)
);

section("5. Rendering is deterministic");

const a = render(components[0][1](profile)).html;
const b = render(components[0][1](profile)).html;
check("the same props give the same markup", a === b);

// ---------------------------------------------------------------------------
section("6. LandingPage renders (i18n-wrapped) and stays honest");

const loadMessages = (locale: string) =>
  JSON.parse(readFileSync(new URL(`../src/i18n/messages/${locale}.json`, import.meta.url), "utf8"));
const renderLanding = (locale: string) =>
  render(
    // react-intl types NextIntlClientProvider as IntlConfig & { children: ReactNode },
    // i.e. `children` is a REQUIRED PROP for this component (not a rest argument),
    // so the 2-arg form with children-in-props is the only form that type-checks.
    // eslint-disable-next-line react/no-children-prop
    React.createElement(NextIntlClientProvider, {
      locale,
      messages: loadMessages(locale),
      children: React.createElement(LandingPage, { onStart: () => {}, onSignIn: () => {} }),
    })
  );

const demoBadge: Record<string, string> = {
  en: "Demo · sample data",
  uz: "Demo · namunaviy ma'lumot",
  ru: "Демо · данные-пример",
};

for (const locale of ["en", "uz", "ru"]) {
  const { html, error } = renderLanding(locale);
  check(`LandingPage renders in ${locale}`, error === null, error ?? "");
  check(`LandingPage produces substantial markup in ${locale}`, html.length > 3000, `only ${html.length} chars`);
  // React escapes ' as &#x27; in static markup; normalize before comparing.
  const normalized = html.replace(/&#x27;/g, "'");
  check(
    `landing dashboard mock is labeled as demo (${locale})`,
    normalized.includes(demoBadge[locale]),
    demoBadge[locale]
  );
}

const landingHtml = renderLanding("en").html;
check("landing has a Sign in button (not 'Log in')", /Sign in/.test(landingHtml) && !/Log in/.test(landingHtml));
check("landing has the hero heading", /Your path to university/.test(landingHtml));
check("landing lists the how-it-works steps", /Build your profile/.test(landingHtml) && /Find your fit/.test(landingHtml));
check(
  "landing keeps admission estimate honest (no invented probability)",
  /Admission estimate/.test(landingHtml) && /intentionally does not invent a probability/i.test(landingHtml)
);
check("landing footer links to privacy and terms", /\/privacy/.test(landingHtml) && /\/terms/.test(landingHtml));
// The footer carries the honest small print the app itself shows above its
// Terms / Privacy links — the marketing page must not be more confident than
// the product.
check(
  "landing footer explains that the guide is independent and can be wrong",
  /independent guide/i.test(landingHtml) &&
    /not affiliated with any university/i.test(landingHtml) &&
    /can be wrong or out of date/i.test(landingHtml)
);
// Regression guard for the dashboard preview: it used to advertise the
// pre-reorganization sidebar (~30 flat links). It is now derived from
// NAV_SECTIONS, so the six groups and the account cluster must be present.
check(
  "landing dashboard preview mirrors the current navigation",
  /Study Plan &amp; Tests/.test(landingHtml) &&
    /After Admission/.test(landingHtml) &&
    /Account &amp; settings/.test(landingHtml) &&
    /University Portfolio Strategy/.test(landingHtml)
);
check(
  "landing dashboard preview no longer shows the old flat sidebar links",
  !/Tasks &amp; Roadmap/.test(landingHtml) && !/mockSidebar/.test(landingHtml)
);

// Landing-page self-check (2026-10): the marketing page must be as honest and
// as consistent as the product it advertises.
const anchorIds = ["how", "features", "chancing", "roadmap"];
check(
  "every landing anchor link has a matching section id",
  anchorIds.every((id) => landingHtml.includes(`id="${id}"`)),
  anchorIds.filter((id) => !landingHtml.includes(`id="${id}"`)).join(", ")
);
check(
  "landing still scopes the admission estimate to evidence (never a number)",
  /Admission estimate/.test(landingHtml) && !/Admission estimate<\/span>\s*<[^>]*>\s*\d/.test(landingHtml)
);

// The dashboard preview used to show an "Admissions Index" percentage — a
// second, differently-computed number that read like an admission chance. It
// now shows the same profile-readiness score the Readiness pane uses.
const strengthLabel: Record<string, string> = {
  en: "Readiness",
  uz: "Tayyorlik",
  ru: "Готовность",
};
const noRawKeys: Record<string, boolean> = {};
for (const locale of ["en", "uz", "ru"]) {
  const { html } = renderLanding(locale);
  const text = html.replace(/<[^>]+>/g, " ");
  // A missing message renders as "landing.someKey" — a raw key in the visible
  // text means the page ships with placeholder copy.
  noRawKeys[locale] = !/\b(landing|dashboard|nav|meta|hubs|degrees)\.[a-z][A-Za-z0-9]*/.test(text);
  check(`landing leaks no unresolved message keys (${locale})`, noRawKeys[locale]);
  check(
    `landing dashboard mock uses the localized readiness label (${locale})`,
    html.includes(strengthLabel[locale]),
    strengthLabel[locale]
  );
  check(`landing no longer advertises an "Admissions Index" (${locale})`, !/Admissions Index/.test(html));
}

// ---------------------------------------------------------------------------
section("7. UniversityExplorer & UniversityDetail render in every locale");

// DashboardView must not compute its own second strength number: on the first
// paint (effects have not run) the ring shows a neutral dash, and the card is
// labelled as profile readiness — never as an admission index.
for (const locale of ["en", "uz", "ru"]) {
  const dash = render(
    // eslint-disable-next-line react/no-children-prop
    React.createElement(NextIntlClientProvider, {
      locale,
      messages: loadMessages(locale),
      children: React.createElement(DashboardView, {
        profile: { id: 7, name: "Test Student", gpa: 3.6, gpaScale: 4, ieltsScore: 7, budgetAnnualUsd: 30000, degreeLevel: "Master", targetMajor: "Computer Science" } as any,
        onNavigateTab: () => {},
        savedUniCount: 0,
        savedScholarshipCount: 0,
        savedProgramCount: 0,
        taskCount: 0,
        onEditProfile: () => {},
      }),
    })
  );
  const dashText = dash.html.replace(/<[^>]+>/g, " ");
  check(`DashboardView renders (${locale})`, dash.error === null, dash.error ?? "");
  check(`DashboardView waits for the shared strength score (${locale})`, dashText.includes("—"));
  check(`DashboardView does not label the ring as an admission index (${locale})`, !/Admissions Index/.test(dashText));
}

// Both components fetch in useEffect, so SSR shows the initial paint: the
// explorer's filter shell and the detail's loading state. That initial paint
// is where useTranslations + useLocaleContext must resolve correctly in
// en/uz/ru, so we assert a locale-specific string lands in the markup.
const renderExplorer = (locale: string, p: any) =>
  render(
    // eslint-disable-next-line react/no-children-prop
    React.createElement(NextIntlClientProvider, {
      locale,
      messages: loadMessages(locale),
      children: React.createElement(UniversityExplorer, {
        activeProfile: p,
        savedUniIds: new Set<number>(),
        onSaveUniversity: () => Promise.resolve(),
        onUnsaveUniversity: () => Promise.resolve(),
      }),
    })
  );
const renderDetail = (locale: string) =>
  render(
    // eslint-disable-next-line react/no-children-prop
    React.createElement(NextIntlClientProvider, {
      locale,
      messages: loadMessages(locale),
      children: React.createElement(UniversityDetail, {
        universityId: 1,
        activeProfile: null,
        onBack: () => {},
      }),
    })
  );

const explorerTitle: Record<string, string> = {
  en: "Global University &amp; Program Explorer",
  uz: "Global universitet va dasturlar eksploryeri",
  ru: "Глобальный поиск университетов и программ",
};
const detailLoading: Record<string, string> = {
  en: "Loading university",
  uz: "Universitet yuklanmoqda",
  ru: "Загрузка университета",
};

for (const locale of ["en", "uz", "ru"]) {
  const ex = renderExplorer(locale, null);
  check(`UniversityExplorer renders in ${locale}`, ex.error === null, ex.error ?? "");
  check(
    `UniversityExplorer title is localized (${locale})`,
    ex.html.includes(explorerTitle[locale]),
    explorerTitle[locale]
  );

  const exProfile = renderExplorer(locale, profile);
  check(
    `UniversityExplorer renders with a profile in ${locale}`,
    exProfile.error === null,
    exProfile.error ?? ""
  );

  const det = renderDetail(locale);
  check(`UniversityDetail renders in ${locale}`, det.error === null, det.error ?? "");
  check(
    `UniversityDetail loading state is localized (${locale})`,
    det.html.includes(detailLoading[locale]),
    detailLoading[locale]
  );
}


// ---------------------------------------------------------------------------
section("8. Degree aliases, paired labels and honest unspecified states (SSR only)");

const renderLocalized = (locale: string, node: React.ReactElement) => {
  const props = { locale, messages: loadMessages(locale), timeZone: "UTC", children: node };
  return render(React.createElement(NextIntlClientProvider, props));
};
const text = (html: string) => html.replace(/&#x27;/g, "'");
const degreeLabels: Record<string, { Bachelor: string; Master: string; PhD: string; all: string; unspecified: string }> = {
  en: { Bachelor: "Bachelor (undergraduate)", Master: "Master (graduate)", PhD: "PhD (doctoral)", all: "All degree levels", unspecified: "Level: not specified" },
  uz: { Bachelor: "Bakalavr (bakalavriat)", Master: "Magistr (magistratura)", PhD: "PhD (doktorantura)", all: "Barcha darajalar", unspecified: "Daraja: ko'rsatilmagan" },
  ru: { Bachelor: "Бакалавр (бакалавриат)", Master: "Магистр (магистратура)", PhD: "PhD (докторантура)", all: "Все уровни обучения", unspecified: "Уровень: не указан" },
};
const aliases: [string, "Bachelor" | "Master" | "PhD"][] = [
  ["Undergraduate degree", "Bachelor"],
  ["Graduate degree", "Master"],
  ["Doctoral degree", "PhD"],
];

for (const locale of ["en", "uz", "ru"]) {
  const expected = degreeLabels[locale];
  for (const [alias, canonical] of aliases) {
    const label = renderLocalized(locale, React.createElement(DegreeLevelLabel, { value: alias }));
    check(`degree alias ${alias} has its paired label (${locale})`, label.error === null && text(label.html) === expected[canonical], label.error ?? label.html);

    const explorer = renderExplorer(locale, { ...profile, degreeLevel: alias });
    const selected = new RegExp(`<option(?=[^>]*value="${canonical}")(?=[^>]*selected)[^>]*>`);
    check(`Explorer's locked ${alias} control selects ${canonical} (${locale})`, explorer.error === null && selected.test(explorer.html) && explorer.html.includes(expected[canonical]) && /<select[^>]*disabled/.test(explorer.html), explorer.error ?? "canonical option not selected");
  }

  for (const value of [null, "", "   ", "Unknown"]) {
    const badge = renderLocalized(locale, React.createElement(DegreeLevelLabel, { value, showPrefix: true }));
    check(`card degree ${JSON.stringify(value)} is explicitly unspecified (${locale})`, badge.error === null && text(badge.html) === expected.unspecified, badge.error ?? badge.html);
  }
  const all = renderLocalized(locale, React.createElement(DegreeLevelLabel, { value: " aLL " }));
  check(`All stays distinct from unspecified (${locale})`, all.error === null && text(all.html) === expected.all);
  const multiple = renderLocalized(locale, React.createElement(DegreeLevelLabel, { value: "Bachelor / Master" }));
  check(`multi-level labels are not invented as All (${locale})`, multiple.error === null && text(multiple.html) === `${expected.Bachelor} / ${expected.Master}`);
  const unknownExplorer = renderExplorer(locale, { ...profile, degreeLevel: "Uncatalogued level" });
  check(`an unrecognised profile level remains selected and labelled (${locale})`, unknownExplorer.error === null && /<option(?=[^>]*value="Uncatalogued level")(?=[^>]*selected)[^>]*>/.test(unknownExplorer.html));
  const allExplorer = renderExplorer(locale, { ...profile, degreeLevel: "All" });
  check(`an All profile has an actual selected All option (${locale})`, allExplorer.error === null && /<option(?=[^>]*value="All")(?=[^>]*selected)[^>]*>/.test(allExplorer.html));

  const modal = renderLocalized(locale, React.createElement(ProfileModal, { isOpen: true, isNew: true, profile: null, onClose: () => {}, onSave: async () => {} }));
  check(`profile degree choices have paired names, not changed option values (${locale})`, modal.error === null && ["Bachelor", "Master", "PhD"].every((level) => modal.html.includes(`<option value="${level}"`)) && [expected.Bachelor, expected.Master, expected.PhD].every((label) => text(modal.html).includes(label)), modal.error ?? "missing degree choice");
  const onboarding = renderLocalized(locale, React.createElement(OnboardingWizard, { profile: { ...profile, onboardingStep: 1, degreeLevel: "Undergraduate degree" }, onComplete: () => {} }));
  check(`onboarding degree choices use paired names and recognise an existing alias (${locale})`, onboarding.error === null && [expected.Bachelor, expected.Master, expected.PhD].every((label) => text(onboarding.html).includes(label)) && onboarding.html.includes("border-indigo-600 bg-indigo-50"), onboarding.error ?? "missing paired choice or selected alias");

  // Initial paints of the other consumers. Effects and browser interactions
  // are deliberately not claimed here; this sandbox has no browser.
  const dashboard = renderLocalized(locale, React.createElement(DashboardView, {
    profile: { ...profile, name: "", email: "", degreeLevel: "Undergraduate degree", targetMajor: "", gpa: 0, gpaScale: 4, budgetAnnualUsd: 0, preferredCountries: "[]", needScholarship: false },
    onNavigateTab: () => {}, savedUniCount: 0, savedScholarshipCount: 0, savedProgramCount: 0, taskCount: 0, onEditProfile: () => {},
  }));
  check(`dashboard displays the paired degree name (${locale})`, dashboard.error === null && text(dashboard.html).includes(expected.Bachelor), dashboard.error ?? "missing paired badge");
  const recommend = renderLocalized(locale, React.createElement(RecommendationStudio, { activeProfile: null }));
  check(`recommendation studio still renders (${locale})`, recommend.error === null && recommend.html.length > 50, recommend.error ?? "");
  const editor = renderLocalized(locale, React.createElement(ProfileModal, { isOpen: true, isNew: false, profile, onClose: () => {}, onSave: async () => {} }));
  check(`existing profile editor remains a separate modal (${locale})`, editor.error === null && editor.html.includes("Edit Academic Profile") && editor.html.includes("Save Profile Changes") && editor.html.includes("Extracurriculars"), editor.error ?? "missing editor fields");
}

for (const [name, condition] of [
  ["unknown university level is visible, not assumed to offer All", supportsDegreeLevel(null, "Bachelor") && normalizeDegreeLevel(null) === null],
  ["unknown requested level does not fabricate a conflict", supportsDegreeLevel("Master", "Unknown")],
  ["an explicit graduate-only row conflicts with undergraduate", !supportsDegreeLevel("Graduate degree", "Undergraduate degree")],
  ["a doctoral-only row conflicts with Master", !supportsDegreeLevel("Ph.D.", "Master’s")],
  ["All is preserved for every requested alias", aliases.every(([alias]) => supportsDegreeLevel("All", alias))],
  ["a partially unknown list remains unspecified", supportsDegreeLevel("Master / unclassified", "Bachelor") && normalizeDegreeLevel("Master / unclassified") === null],
  ["a postgraduate diploma is not inferred to be a Master", normalizeDegreeLevel("Postgraduate diploma") === "Diploma" && !supportsDegreeLevel("Postgraduate diploma", "Master")],
  ["local-language aliases are recognised", normalizeDegreeLevel("Бакалавриат") === "Bachelor" && normalizeDegreeLevel("Magistratura") === "Master"],
  ["paired names canonicalise without conflating explicit multiple levels", normalizeDegreeLevel("Bachelor (undergraduate)") === "Bachelor" && !supportsDegreeLevel("Master / PhD", "Bachelor")],
] as [string, boolean][]) {
  check(name, condition);
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
section("15. Recommended for you is built from the profile, not from popularity");

/** The API payload shape, with only the fields the panel reads. */
function recPayload(overrides: Record<string, unknown> = {}) {
  return {
    personalised: true,
    basis: ["countries", "gpa"],
    missing: [],
    universities: [
      {
        id: 3,
        name: "Technical University of Munich (TUM)",
        country: "Germany",
        city: "Munich",
        flagEmoji: "DE",
        worldRanking: 22,
        programMajor: "Informatics & Data Engineering",
        sourceUrl: "https://www.tum.de",
        minGpa: 3.2,
        minIelts: 6.5,
        annualTuition: null,
        annualTuitionUsd: null,
        verificationStatus: "unverified",
        lastVerifiedAt: null,
        saved: true,
        matchScore: 99,
        matchCategory: "Safety",
        matchReasons: ["GPA 3.72 well above the 3.2 minimum"],
        matchIssues: [],
      },
    ],
    scholarships: [
      {
        id: 1,
        title: "Fulbright Foreign Student Program",
        provider: "United States Department of State",
        country: "United States",
        amountUsdValue: 55000,
        awardAmount: null,
        awardCurrency: null,
        awardPeriod: null,
        awardBasis: "full_tuition",
        deadlineDate: "2026-10-15",
        minGpa: 3.3,
        eligibleCountries: null,
        verificationStatus: "unverified",
        tuitionCoverage: "Full tuition",
        sourceUrl: "https://foreign.fulbrightonline.org",
        lastVerifiedAt: null,
        gpaOk: true,
        gpaProvided: true,
        matchScore: 98,
        matchReasons: ["GPA 3.72 well above the 3.3 minimum"],
        matchIssues: [],
        countryEligibility: "unknown",
      },
    ],
    opportunities: [
      {
        id: 1,
        title: "Google Summer of Code",
        provider: "Google",
        country: null,
        type: "internship",
        deadlineDate: null,
        url: "https://summerofcode.withgoogle.com",
        inPreferredCountry: false,
      },
    ],
    ...overrides,
  } as any;
}

const recFull = renderLocalized("en", React.createElement(RecommendedPanel, {
  recommended: recPayload(),
  onNavigateTab: () => {},
}));
check("recommended panel renders a full profile payload", recFull.error === null, recFull.error ?? "");
check(
  "recommended panel shows the engine fit score and band, not a generic label",
  recFull.html.includes("Fit 99%") && recFull.html.includes("Safety"),
  recFull.html.slice(0, 200)
);
check(
  "recommended panel repeats the engine's own evidence line",
  recFull.html.includes("GPA 3.72 well above the 3.2 minimum")
);
check(
  "recommended panel states an unknown citizenship rule instead of implying eligibility",
  recFull.html.includes("Citizenship rule not in our data")
);

const recEmpty = renderLocalized("en", React.createElement(RecommendedPanel, {
  recommended: recPayload({
    personalised: false,
    basis: [],
    missing: ["degreeLevel", "major", "countries", "gpa"],
    universities: [],
    scholarships: [],
    opportunities: [],
  }),
  onNavigateTab: () => {},
}));
check(
  "empty profile: no university cards and no fit score at all",
  !recEmpty.html.includes("Fit ") && !recEmpty.html.includes("Technical University of Munich")
);
check(
  "empty profile: names the exact profile fields to add",
  recEmpty.html.includes("your target major") && recEmpty.html.includes("your GPA")
);
check(
  "empty profile: says the list is not popularity-based",
  recEmpty.html.includes("never from popularity")
);

const recUz = renderLocalized("uz", React.createElement(RecommendedPanel, {
  recommended: recPayload(),
  onNavigateTab: () => {},
}));
check(
  "recommended panel is localized (uz chip + band)",
  text(recUz.html).includes("Moslik 99%") && text(recUz.html).includes("Ishonchli"),
  text(recUz.html).slice(0, 200)
);
const recRu = renderLocalized("ru", React.createElement(RecommendedPanel, {
  recommended: recPayload(),
  onNavigateTab: () => {},
}));
check(
  "recommended panel is localized (ru chip)",
  text(recRu.html).includes("Соответствие 99%")
);

// ---------------------------------------------------------------------------
section("Profile editors never pre-answer the student's questions");

// A form that OPENS with "Master / Computer Science / 4.0 / scholarship needed"
// silently writes those answers into the profile the moment the student saves
// anything — the profile then drives every score with data nobody entered.
const profileModal = readFileSync(new URL("../src/components/ProfileModal.tsx", import.meta.url), "utf8");
const wizard = readFileSync(new URL("../src/components/OnboardingWizard.tsx", import.meta.url), "utf8");
const sopStudio = readFileSync(new URL("../src/components/AiSopStudio.tsx", import.meta.url), "utf8");

check(
  "the profile modal starts with no degree, major or scale chosen",
  !/degreeLevel: "Master"/.test(profileModal) &&
    !/targetMajor: "Computer Science"/.test(profileModal) &&
    !/gpaScale: 4\.0,/.test(profileModal),
  "found an invented default in ProfileModal"
);
check(
  "the profile modal does not claim a scholarship need nobody expressed",
  /needScholarship: false,/.test(profileModal) &&
    !/needScholarship: true,/.test(profileModal),
  "found needScholarship: true as a default"
);
check(
  "an unset GPA scale is saved as NULL, not as 4.0",
  /gpaScale: rest\.gpaScale === "" \? null/.test(profileModal),
  "the scale is not NULL-safe"
);
check(
  "the wizard does not pre-tick the scholarship step",
  /needScholarship: profile\?\.needScholarship \?\? false/.test(wizard) &&
    !/needScholarship: form\.needScholarship \|\| true/.test(wizard),
  "the wizard answers the scholarship question for the student"
);
check(
  "the SOP studio does not write for an invented major",
  !/targetMajor \|\| "Computer Science"/.test(sopStudio),
  "SOP defaults to Computer Science"
);

// ---------------------------------------------------------------------------
// Shipped surface: no design scratch page, and a sitemap that names every
// public page. `/preview` was a leftover "hero redesign — before/after" demo
// page: unlinked, listed nowhere, and it threw a 500 for anyone who typed the
// URL (it rendered UniversityDetail outside the intl provider). It is gone.
check(
  "no design-scratch preview page ships under /preview",
  !existsSync(new URL("../src/app/preview/page.tsx", import.meta.url))
);
const sitemapSource = readFileSync(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");
const publicPages = ["/universities", "/scholarships", "/terms", "/privacy"];
check(
  "the sitemap lists every public page, not just the landing page",
  publicPages.every((p) => sitemapSource.includes(`${p}`)) && sitemapSource.includes("${SITE_URL}/`"),
  publicPages.filter((p) => !sitemapSource.includes(p)).join(", ")
);
check(
  "every page the sitemap lists actually exists as a route",
  ["universities", "scholarships", "terms", "privacy"].every((dir) =>
    existsSync(new URL(`../src/app/${dir}/page.tsx`, import.meta.url))
  )
);
check(
  "nothing behind sign-in is advertised to crawlers",
  !/dashboard|admin|visa|essays/.test(sitemapSource)
);

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
