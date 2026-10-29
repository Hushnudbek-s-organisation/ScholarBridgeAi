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
import { RecLetterPanel } from "../src/components/RecLetterPanel";
import { MentorMarketplace } from "../src/components/MentorMarketplace";
import { ConsultingSection } from "../src/components/ConsultingSection";
import { DeadlineCenter } from "../src/components/DeadlineCenter";
import { PremiumGate } from "../src/components/PremiumGate";
import { ParentDashboard } from "../src/components/ParentDashboard";
import { ParentShareView } from "../src/components/ParentShareView";
import { LocaleProvider } from "../src/i18n/LocaleProvider";
import { LandingPage } from "../src/components/LandingPage";
import { UniversityExplorer } from "../src/components/UniversityExplorer";
import { ScholarshipHub } from "../src/components/ScholarshipHub";
import { UniversityDetail } from "../src/components/UniversityDetail";
import { DegreeLevelLabel } from "../src/components/DegreeLevelLabel";
import { ProfileModal } from "../src/components/ProfileModal";
import { OnboardingWizard } from "../src/components/OnboardingWizard";
import { DashboardView } from "../src/components/DashboardView";
import { RecommendationStudio } from "../src/components/RecommendationStudio";
import { normalizeDegreeLevel, supportsDegreeLevel } from "../src/lib/degreeLevels";
import { RecommendedPanel } from "../src/components/journey/JourneyControlCenter";
import { AiOrbFaceAvatar } from "../src/components/visa/AiOrbFaceAvatar";
import { DailyStreakCard } from "../src/components/DailyStreakCard";
import { TaskRoadmap } from "../src/components/TaskRoadmap";
import { MatchBreakdownStrip } from "../src/components/MatchBreakdownStrip";
import { SimilarProfiles } from "../src/components/SimilarProfiles";
import { ArrivalPlanPanel } from "../src/components/journey/ArrivalPlanPanel";
import { FaqSection } from "../src/components/FaqSection";
import { AppErrorFallback } from "../src/components/AppErrorFallback";
import { PointsBadge } from "../src/components/PointsBadge";
import { MiniApp } from "../src/components/telegram/MiniApp";
import { TelegramNudge } from "../src/components/telegram/TelegramNudge";

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
const profile = { id: 7, email: "student@example.com" } as any;
const loadMessages = (locale: string) =>
  JSON.parse(readFileSync(new URL(`../src/i18n/messages/${locale}.json`, import.meta.url), "utf8"));
const withEnglishIntl = (node: React.ReactElement) =>
  // eslint-disable-next-line react/no-children-prop
  React.createElement(NextIntlClientProvider, {
    locale: "en",
    messages: loadMessages("en"),
    timeZone: "UTC",
    children: node,
  });
const withEnglishLocale = (node: React.ReactElement) =>
  // eslint-disable-next-line react/no-children-prop
  React.createElement(LocaleProvider, { initialLocale: "en", children: node });
const withIntlLocale = (locale: string, node: React.ReactElement) =>
  // eslint-disable-next-line react/no-children-prop
  React.createElement(NextIntlClientProvider, {
    locale,
    messages: loadMessages(locale),
    timeZone: "UTC",
    children: node,
  });

/** Render and return markup, or the thrown error as a string. */
function render(node: React.ReactElement): { html: string; error: string | null } {
  try {
    return { html: renderToStaticMarkup(node), error: null };
  } catch (e) {
    return { html: "", error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  }
}

const components: [string, (p: any) => React.ReactElement][] = [
  ["PlanningStudio", (p) => withEnglishIntl(React.createElement(PlanningStudio, { activeProfile: p }))],
  ["MentorMarketplace", (p) => withEnglishIntl(React.createElement(MentorMarketplace, { activeProfile: p }))],
  ["ConsultingSection", (p) => withEnglishIntl(React.createElement(ConsultingSection, { activeProfile: p }))],
  ["DeadlineCenter", (p) => withEnglishIntl(React.createElement(DeadlineCenter, { profileId: p?.id ?? null }))],
  ["PremiumGate", (p) => withEnglishIntl(React.createElement(PremiumGate, { profileId: p?.id ?? null, feature: "ai_essay", onUpgrade: () => undefined }, React.createElement("p", null, "premium child")))],
  ["ParentDashboard", (p) => withEnglishIntl(React.createElement(ParentDashboard, { activeProfile: p }))],
  ["ScholarshipHub", (p) => withEnglishIntl(React.createElement(ScholarshipHub, {
    activeProfile: p,
    savedScholarshipIds: new Set<number>(),
    onSaveScholarship: async () => undefined,
    onUnsaveScholarship: async () => undefined,
    autoFocusScholarship: null,
  }))],
  ["ArrivalPlanPanel", (p) => withEnglishIntl(React.createElement(ArrivalPlanPanel, {
    profileId: p?.id ?? null,
    onNavigateTab: () => undefined,
  }))],
  ["FaqSection", () => withEnglishLocale(React.createElement(FaqSection))],
  ["PointsBadge", () => withEnglishIntl(React.createElement(PointsBadge, { points: 120, levelName: "Explorer" }))],
  ["AppErrorFallback", () => React.createElement(AppErrorFallback, { error: new Error("smoke test"), reset: () => undefined })],
  ["TelegramMiniApp", () => React.createElement(MiniApp)],
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
const faq = render(components.find(([name]) => name === "FaqSection")![1](profile)).html;
const pointsBadge = render(components.find(([name]) => name === "PointsBadge")![1](profile)).html;
const errorFallback = render(components.find(([name]) => name === "AppErrorFallback")![1](profile)).html;
const telegramMiniApp = render(components.find(([name]) => name === "TelegramMiniApp")![1](profile)).html;
check("FAQ renders translated message-file questions", faq.includes("What does ScholarBridge help me do?") && faq.includes("How do I know if a scholarship is open to me?"));
check("PointsBadge renders the translated points label", pointsBadge.includes("Points") && !/\bpts\b/.test(pointsBadge));
check("error fallback renders and exposes retry guidance", errorFallback.includes("Something went wrong") && errorFallback.includes("Try again"));
// The loading copy moved into the selected dictionary in the landing-perf pass
// (the literal "Yuklanmoqda…" was inlined and bypassed uz/ru switching), so the
// assertion now follows the key rather than the string.
// The literal "Yuklanmoqda…" moved into the selected dictionary during the
// landing-perf pass (so it follows uz/ru switching), so the assertion checks the
// rendered copy from that dictionary instead of a hardcoded string.
check("Telegram Mini App loading state uses its selected message dictionary", telegramMiniApp.includes("Loading…"));
check("PlanningStudio names the cost calculator", /cost/i.test(planning));
check("PlanningStudio offers a scholarship tab", /scholarship/i.test(planning));
check("PlanningStudio offers a CV tab", /\bCV\b/.test(planning));
check("PlanningStudio offers a comparison tab", /compar/i.test(planning));

const mentors = render(components[1][1](profile)).html;
check("MentorMarketplace labels its overlap heuristic rather than promising an outcome", /heuristic based on available profile fields/i.test(mentors));
check("MentorMarketplace has a translated rate filter", /Maximum hourly rate \(USD\)/i.test(mentors));

const parent = render(components.find(([name]) => name === "ParentDashboard")![1](profile)).html;
check("ParentDashboard offers the share toggle", /Share a read-only summary/i.test(parent));
check("ParentDashboard states what is excluded", /Not included/i.test(parent));
check("ParentDashboard names essays as excluded", /essay drafts/i.test(parent));
check("ParentDashboard names passwords as excluded", /password/i.test(parent));
check("ParentDashboard avoids an unsupported on-track claim", !/\bon track\b/i.test(parent));

const parentShare = render(withEnglishLocale(React.createElement(ParentShareView, { token: "x".repeat(43) })));
check("the bearer link has a translated loading state", parentShare.error === null && /Loading shared summary/i.test(parentShare.html), parentShare.error ?? "loading copy missing");

const consulting = render(components.find(([name]) => name === "ConsultingSection")![1](profile)).html;
check("consulting uses localized copy and makes no reply-time promise", /One-to-one guidance/.test(consulting) && !/1-2 business days/i.test(consulting));
const deadlines = render(components.find(([name]) => name === "DeadlineCenter")![1](null)).html;
check("DeadlineCenter renders a no-profile state instead of remaining in loading", /Choose a student profile/.test(deadlines) && !/Loading deadlines/i.test(deadlines));
const premiumNoProfile = render(components.find(([name]) => name === "PremiumGate")![1](null));
check("PremiumGate fails closed and keeps locked children unmounted", premiumNoProfile.error === null && !/premium child/.test(premiumNoProfile.html) && /View plans/.test(premiumNoProfile.html));

section("3b. Deadline, consulting, mentor and premium copy render in every locale");
for (const locale of ["en", "uz", "ru"]) {
  const messages = loadMessages(locale);
  const mentorLocale = render(withIntlLocale(locale, React.createElement(MentorMarketplace, { activeProfile: null })));
  check(`mentor title and no-profile copy render in ${locale}`, mentorLocale.error === null && mentorLocale.html.includes(messages.mentorMarketplace.title) && mentorLocale.html.includes(messages.mentorMarketplace.noProfile), mentorLocale.error ?? "localized text missing");
  const consultingLocale = render(withIntlLocale(locale, React.createElement(ConsultingSection, { activeProfile: null })));
  check(`consulting title and contact guidance render in ${locale}`, consultingLocale.error === null && consultingLocale.html.includes(messages.consultingPanel.title) && consultingLocale.html.includes(messages.consultingPanel.contactHelper), consultingLocale.error ?? "localized text missing");
  const deadlineLocale = render(withIntlLocale(locale, React.createElement(DeadlineCenter, { profileId: null })));
  check(`deadline title and no-profile copy render in ${locale}`, deadlineLocale.error === null && deadlineLocale.html.includes(messages.deadlineCenter.title) && deadlineLocale.html.includes(messages.deadlineCenter.noProfile), deadlineLocale.error ?? "localized text missing");
  const premiumLocale = render(withIntlLocale(locale, React.createElement(PremiumGate, { profileId: null, feature: "ai_essay", onUpgrade: () => undefined }, React.createElement("p", null, "premium child"))));
  check(`premium gate fallback copy renders in ${locale}`, premiumLocale.error === null && premiumLocale.html.includes(messages.premiumGate.viewPlans) && !premiumLocale.html.includes("premium child"), premiumLocale.error ?? "localized text missing");
}

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

section("4b. Shared Outcomes renders in every supported locale");
for (const locale of ["en", "uz", "ru"]) {
  const messages = loadMessages(locale).similarOutcomes;
  const withoutProfile = render(
    withIntlLocale(locale, React.createElement(SimilarProfiles, { activeProfile: null }))
  );
  check(`Shared Outcomes handles no profile in ${locale}`, withoutProfile.error === null, withoutProfile.error ?? "");
  check(`no-profile copy is localized in ${locale}`, withoutProfile.html.includes(messages.noProfile));

  const initial = render(
    withIntlLocale(locale, React.createElement(SimilarProfiles, { activeProfile: profile }))
  );
  check(`Shared Outcomes loading state renders in ${locale}`, initial.error === null, initial.error ?? "");
  check(`title and loading copy are localized in ${locale}`, initial.html.includes(messages.title) && initial.html.includes(messages.loading));
}

const focusScholarship = render(withEnglishIntl(React.createElement(ScholarshipHub, {
  activeProfile: profile,
  savedScholarshipIds: new Set<number>(),
  onSaveScholarship: async () => undefined,
  onUnsaveScholarship: async () => undefined,
  autoFocusScholarship: { id: 321, title: "Search Focus Regression Grant", requestId: 1 },
})));
check("global scholarship selection renders the existing catalogue with its title in the search input", focusScholarship.error === null && /value="Search Focus Regression Grant"/.test(focusScholarship.html), focusScholarship.error ?? "title not present");

section("5. Rendering is deterministic");

const a = render(components[0][1](profile)).html;
const b = render(components[0][1](profile)).html;
check("the same props give the same markup", a === b);

// ---------------------------------------------------------------------------
section("6. LandingPage renders (i18n-wrapped) and stays honest");

const renderLanding = (locale: string) =>
  render(
    // react-intl types NextIntlClientProvider as IntlConfig & { children: ReactNode },
    // i.e. `children` is a REQUIRED PROP for this component (not a rest argument),
    // so the 2-arg form with children-in-props is the only form that type-checks.
    // eslint-disable-next-line react/no-children-prop
    React.createElement(NextIntlClientProvider, {
      locale,
      messages: loadMessages(locale),
      timeZone: "UTC",
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
const landingText = landingHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const admissionProbabilityIndex = landingText.indexOf("Admission probability");
const admissionProbabilityRow = admissionProbabilityIndex >= 0
  ? landingText.slice(admissionProbabilityIndex, admissionProbabilityIndex + 80)
  : "";
check(
  "landing labels fit separately and leaves admission probability unestimated",
  landingText.includes("Example profile fit") &&
    admissionProbabilityRow.includes("Not estimated") &&
    !/\d+\s*%/.test(admissionProbabilityRow),
  admissionProbabilityRow
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
    /Tasks &amp; Timeline/.test(landingHtml) &&
    /After Admission/.test(landingHtml) &&
    /Account &amp; settings/.test(landingHtml)
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
  "landing demo shows fit as an example, not as an admission probability",
  landingText.includes("Fit — not a probability") &&
    admissionProbabilityIndex >= 0 &&
    !/\d+\s*%/.test(admissionProbabilityRow)
);

// The dashboard preview used to show an "Admissions Index" percentage — a
// second, differently-computed number that read like an admission chance. It
// now shows the same profile-readiness score the Readiness pane uses.
const strengthLabel: Record<string, string> = {
  en: "Profile information coverage",
  uz: "Profil ma’lumotlari qamrovi",
  ru: "Заполненность профиля данными",
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
      timeZone: "UTC",
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
      timeZone: "UTC",
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
      timeZone: "UTC",
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
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();

// Render the exact onboarding choice step rather than only the earlier degree
// step, so a missing nested next-intl key cannot hide behind a successful build.
section("8a. Onboarding direction cards resolve nested messages in every locale");
const onboardingPathIds = ["goal", "interests", "undecided"] as const;
for (const locale of ["en", "uz", "ru"]) {
  const localeMessages = loadMessages(locale) as any;
  const pathMessages = localeMessages.careerDiscovery.path;
  const result = renderLocalized(
    locale,
    React.createElement(OnboardingWizard, {
      profile: { ...profile, onboardingStep: 2, onboardingCompleted: false, studyInterests: null, targetMajor: null },
      onComplete: () => {},
    })
  );
  const markup = text(result.html);
  const visibleText = markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  check(`OnboardingWizard choice step renders in ${locale}`, result.error === null, result.error ?? "");
  const onboardingMessages = localeMessages.onboarding;
  const stepCount = onboardingMessages.stepCount
    .replace("{current}", "3")
    .replace("{total}", "8");
  check(
    `onboarding progress, legal note and controls are localized (${locale})`,
    [
      onboardingMessages.completeProfile,
      stepCount,
      onboardingMessages.consentIntro,
      onboardingMessages.termsLabel,
      onboardingMessages.consentAnd,
      onboardingMessages.privacyLabel,
      onboardingMessages.back,
      onboardingMessages.skip,
      onboardingMessages.continue,
    ].every((copy: string) => visibleText.includes(copy))
  );
  check(
    `OnboardingWizard leaks no careerDiscovery. key text (${locale})`,

    !/\bcareerDiscovery\./.test(markup),
    markup.match(/.{0,24}careerDiscovery\..{0,40}/)?.[0] ?? ""
  );
  check(
    `all three radio choices render with translated title sentences (${locale})`,
    onboardingPathIds.every((id) => {
      const title = pathMessages[id]?.title;
      return typeof title === "string" && title.trim().length >= 12 && title.trim().split(/\s+/u).length >= 3 && visibleText.includes(title);
    })
  );
  check(
    `all three card explanations render as localized copy (${locale})`,
    onboardingPathIds.every((id) => {
      const body = pathMessages[id]?.body;
      return typeof body === "string" && body.trim().length >= 12 && visibleText.includes(body);
    })
  );
  check(
    `the direction group has a translated accessible name and three radios (${locale})`,
    result.html.includes(`role="radiogroup" aria-label="${localeMessages.careerDiscovery.pathTitle}"`) &&
      (result.html.match(/role="radio"/g) ?? []).length === 3 &&
      (result.html.match(/aria-checked="false"/g) ?? []).length === 3
  );

  const selectedResult = renderLocalized(
    locale,
    React.createElement(OnboardingWizard, {
      profile: {
        ...profile,
        onboardingStep: 2,
        onboardingCompleted: false,
        studyInterests: JSON.stringify([{ kind: "area", areaId: "computer_science_it_software" }]),
        targetMajor: null,
      },
      onComplete: () => {},
    })
  );
  const selectedMarkup = selectedResult.html;
  const selectedVisibleText = text(selectedMarkup);
  check(
    `the selected-state status message is localized and leaks no raw key (${locale})`,
    selectedResult.error === null &&
      selectedVisibleText.includes(localeMessages.careerDiscovery.pathSelectedHint) &&
      !/\bcareerDiscovery\./.test(selectedMarkup) &&
      (selectedMarkup.match(/aria-checked="true"/g) ?? []).length === 1
  );
}

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
  check(`onboarding degree choices use paired names and recognise an existing alias (${locale})`, onboarding.error === null && [expected.Bachelor, expected.Master, expected.PhD].every((label) => text(onboarding.html).includes(label)) && onboarding.html.includes("border-indigo-500 bg-indigo-50"), onboarding.error ?? "missing paired choice or selected alias");

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
        // This legacy field is intentionally hostile: the student UI must not
        // show old Reach/Target/Safety tiers even if they remain in stored data.
        matchCategory: "Safety",
        matchReasons: ["Published university-level GPA figure — verify it against the exact programme."],
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
        matchReasons: ["Recorded GPA is available for comparison; verify the award’s current criteria."],
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
  "recommended panel shows catalogue fit without an admissions tier",
  recFull.html.includes("Fit score: 99%") && !/\b(?:Reach|Target|Safety)\b/i.test(text(recFull.html)),
  text(recFull.html).slice(0, 200)
);
check(
  "recommended panel repeats the engine's own evidence line",
  recFull.html.includes("Published university-level GPA figure — verify it against the exact programme.")
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
  "recommended panel is localized (uz fit chip) and shows no old admissions tier",
  text(recUz.html).includes("Moslik balli: 99%") && !/\b(?:Reach|Target|Safety|Ishonchli|Maqsadli)\b/i.test(text(recUz.html)),
  text(recUz.html).slice(0, 200)
);
const recRu = renderLocalized("ru", React.createElement(RecommendedPanel, {
  recommended: recPayload(),
  onNavigateTab: () => {},
}));
check(
  "recommended panel is localized (ru fit chip) and shows no old admissions tier",
  text(recRu.html).includes("Оценка соответствия: 99%") && !/\b(?:Reach|Target|Safety)\b/i.test(text(recRu.html))
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
  "the wizard leaves unanswered financial-aid need unknown",
  /needsFinancialAid: profile\?\.needsFinancialAid \?\? \(profile\?\.needScholarship === true \? true : null\)/.test(wizard) &&
    /value: null, key: "financialAidUnknown"/.test(wizard),
  "the wizard no longer silently defaults unanswered aid need to no"
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
section("9. Daily streak card — compact row, exact numbers, honest rule");

const streakDays = ["2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12"];
const streakFixture = {
  current: 5,
  longest: 12,
  activeToday: true,
  lastActiveDate: "2026-10-12",
  nextMilestone: 7,
  daysToMilestone: 2,
  recentDays: streakDays.map((date, index) => ({ date, active: index >= 2 })),
};

const compactStreak = renderLocalized("en", React.createElement(DailyStreakCard, { streak: streakFixture, compact: true }));
check("compact streak renders", compactStreak.error === null, compactStreak.error ?? "");
check(
  "compact streak is a single labelled row",
  /aria-label="Daily learning streak"/.test(compactStreak.html) && /flex-wrap/.test(compactStreak.html)
);
check(
  "compact streak shows the exact count and the record",
  /\b5\b/.test(compactStreak.html) && /Best: 12/.test(compactStreak.html)
);
check(
  "compact streak names the distance to the next milestone",
  /2 more to 7/.test(compactStreak.html)
);
check(
  "compact streak keeps the honest rule as its tooltip",
  /title="A day counts after a real rewarded action/.test(compactStreak.html) && !/A day counts after/.test(compactStreak.html.replace(/title="[^"]*"/g, ""))
);
check(
  "compact streak is not the oversized card (no 3xl counter, no visible note)",
  !/text-3xl/.test(compactStreak.html)
);
const streakTooltips = [...compactStreak.html.matchAll(/title="([^"]+)"/g)].map((m) => m[1]);
check(
  "every one of the seven days carries its real date and its counted state",
  streakDays.every((day, index) => {
    const formatted = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00.000Z`));
    const expected = `${formatted} — ${index >= 2 ? "rewards activity counted" : "no rewarded activity"}`;
    return streakTooltips.includes(expected);
  }),
  streakTooltips.filter((t) => /—/.test(t)).join(" | ")
);

const fullStreak = renderLocalized("en", React.createElement(DailyStreakCard, { streak: streakFixture }));
check("full streak renders for the rewards page", fullStreak.error === null, fullStreak.error ?? "");
check("full streak spells the rule out in the card", /A day counts after a real rewarded action/.test(fullStreak.html));
check(
  "full streak prints the exact milestone arithmetic",
  /5 of 7 days towards the 7-day milestone/.test(fullStreak.html) && /Last counted day: Oct 12/.test(fullStreak.html)
);

const nullMilestone = renderLocalized("en", React.createElement(DailyStreakCard, {
  streak: { ...streakFixture, current: 400, nextMilestone: null, daysToMilestone: 0 },
  compact: true,
}));
check("a streak past the last milestone still renders", nullMilestone.error === null, nullMilestone.error ?? "");
check(
  "no NaN/null leaks into the markup",
  !/NaN|>null</.test(nullMilestone.html) && !/NaN|>null</.test(compactStreak.html)
);

check(
  "the same streak renders identically twice",
  renderLocalized("en", React.createElement(DailyStreakCard, { streak: streakFixture, compact: true })).html === compactStreak.html
);

check(
  "the card renders in every locale",
  ["en", "uz", "ru"].every((locale) => {
    const out = renderLocalized(locale, React.createElement(DailyStreakCard, { streak: streakFixture, compact: true }));
    return out.error === null && out.html.length > 200;
  })
);

// ---------------------------------------------------------------------------
section("10. Fit-score breakdown strip — the arithmetic, not just the number");

const breakdownFixture = {
  rawScore: 97,
  comparedDimensions: 6,
  totalDimensions: 7,
  evidenceCoveragePct: 86,
  evidenceLevel: "broad" as const,
  components: [
    { key: "base" as const, code: null, points: 70, compared: true },
    { key: "gpa" as const, code: "gpa_above", points: 10, compared: true },
    { key: "english" as const, code: "ielts_above", points: 5, compared: true },
    { key: "standardised_test" as const, code: null, points: 0, compared: false },
    { key: "field" as const, code: "major_strong", points: 8, compared: true },
    { key: "country" as const, code: "country_preferred", points: 4, compared: true },
    { key: "cost" as const, code: "budget_fits", points: 8, compared: true },
    { key: "funding_requirement" as const, code: "full_funding_required", points: -8, compared: true },
  ],
};
const sum = Math.round(breakdownFixture.components.reduce((total, c) => total + c.points, 0) * 10) / 10;
check(
  "the fixture is arithmetically honest (components sum to rawScore)",
  Math.abs(sum - breakdownFixture.rawScore) <= 0.06,
  `sum ${sum} vs raw ${breakdownFixture.rawScore}`
);

const strip = renderLocalized("en", React.createElement(MatchBreakdownStrip, { breakdown: breakdownFixture }));
check("breakdown strip renders", strip.error === null, strip.error ?? "");
check("the neutral base is not shown as a dimension", !/>Base</.test(strip.html));
check(
  "every scored dimension appears with its exact signed points",
  ["GPA", "English", "Field", "Preferred country", "Funding requirement", "+10.0", "+5.0", "+8.0", "+4.0", "-8.0"].every((token) => strip.html.includes(token)),
  strip.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 200)
);
check("negative contributions are shown as negative", /-8\.0/.test(strip.html));
check(
  "a dimension with no data shows a dash, not a fake zero",
  /Standardised test<span>—<\/span>/.test(strip.html) &&
    /No data for this dimension yet/.test(strip.html) &&
    !/Standardised test<span>[+-]?0/.test(strip.html)
);
check(
  "the strip states how much of the score rests on real data",
  /6 of 7 dimensions measured/.test(strip.html) &&
    /Evidence 86%/.test(strip.html) &&
    /Broad coverage/.test(strip.html) &&
    /not admission odds/.test(strip.html)
);
check(
  "no strip is rendered when there is nothing to break down",
  renderLocalized("en", React.createElement(MatchBreakdownStrip, { breakdown: null })).html === "" &&
    renderLocalized("en", React.createElement(MatchBreakdownStrip, {
      breakdown: { ...breakdownFixture, components: [breakdownFixture.components[0]] },
    })).html === ""
);
check(
  "an older API shape (a bare component array) still renders",
  renderLocalized("en", React.createElement(MatchBreakdownStrip, { breakdown: breakdownFixture.components }))
    .html.includes("GPA")
);
check(
  "the strip renders in every locale",
  ["en", "uz", "ru"].every((locale) => {
    const out = renderLocalized(locale, React.createElement(MatchBreakdownStrip, { breakdown: breakdownFixture }));
    return out.error === null && out.html.length > 200;
  })
);

// ---------------------------------------------------------------------------
section("11. Recommendation-letter customization is localized in every supported language");
const recLetterLabels: Record<string, { title: string; university: string; relationship: string; loading: string }> = {
  en: {
    title: "Recommendation letter brief",
    university: "Target university or program",
    relationship: "How does the recommender know you?",
    loading: "Building brief…",
  },
  uz: {
    title: "Tavsiyanoma uchun professional brif",
    university: "Maqsadli universitet yoki dastur",
    relationship: "Tavsiyachi sizni qayerdan taniydi?",
    loading: "Brif tayyorlanmoqda…",
  },
  ru: {
    title: "Профессиональный бриф для рекомендательного письма",
    university: "Целевой университет или программа",
    relationship: "Откуда рекомендатель вас знает?",
    loading: "Бриф готовится…",
  },
};
for (const locale of ["en", "uz", "ru"]) {
  const recLetter = renderLocalized(locale, React.createElement(RecLetterPanel));
  check(`recommendation-letter panel renders in ${locale}`, recLetter.error === null, recLetter.error ?? "");
  check(`recommendation-letter customization labels are translated in ${locale}`,
    recLetter.html.includes(recLetterLabels[locale].title) &&
      recLetter.html.includes(recLetterLabels[locale].university) &&
      recLetter.html.includes(recLetterLabels[locale].relationship) &&
      recLetter.html.includes(recLetterLabels[locale].loading));
  check(`recommendation-letter panel leaks no unresolved key in ${locale}`,
    !/recLetter\.[A-Za-z0-9_.]+/.test(recLetter.html));
}

// ---------------------------------------------------------------------------
section("12. Task roadmap labels render in each supported locale");
for (const locale of ["en", "uz", "ru"]) {
  const taskRoadmap = renderLocalized(locale, React.createElement(TaskRoadmap, { activeProfile: null }));
  const messages = loadMessages(locale).taskRoadmap;
  check(`task roadmap renders in ${locale}`, taskRoadmap.error === null, taskRoadmap.error ?? "");
  check(`task roadmap heading and loading state are localized in ${locale}`,
    taskRoadmap.html.includes(messages.title) &&
      taskRoadmap.html.includes(messages.addTask) &&
      taskRoadmap.html.includes(messages.loading));
  check(`task roadmap leaks no raw namespace keys in ${locale}`,
    !/taskRoadmap\.[A-Za-z0-9_.]+/.test(taskRoadmap.html));
}

// ---------------------------------------------------------------------------
section("12b. AI Face Orb — pure white face, black features, no vendor names");
// The Orb intentionally follows the supplied minimal white-face reference.
// Its face has no colored ring, gradient, specular accent, or tongue; state is
// still communicated by the surrounding status pill/equalizer and lip-sync.
const ORB_STATES = ["IDLE", "LISTENING", "THINKING", "SPEAKING"] as const;
const CLOSED_MOUTH = "M 90 128 C 90 120, 130 120, 130 128 C 130 139, 90 139, 90 128 Z";
const orbRenders = ORB_STATES.map((state) =>
  renderLocalized(
    "en",
    React.createElement(AiOrbFaceAvatar, {
      state,
      level: state === "SPEAKING" ? 0.7 : 0.2,
      statusLabel: `status ${state}`,
      roleLabel: "Consular officer",
      countryFlag: "\u{1F1E9}\u{1F1EA}",
      countryName: "Germany",
    })
  )
);
for (const [i, state] of ORB_STATES.entries()) {
  const r = orbRenders[i];
  check(`orb renders in ${state}`, r.error === null, r.error ?? "");
  check(`orb ${state} is a true 220x220 circle`, r.html.includes('viewBox="0 0 220 220"') && r.html.includes("rounded-full"));
  check(`orb ${state} has a solid white face`, /<circle[^>]*cx="110"[^>]*cy="110"[^>]*r="108"[^>]*fill="#ffffff"/.test(r.html));
  check(`orb ${state} carries the status pill copy`, r.html.includes(`status ${state}`));
  check(`orb ${state} names no AI vendor`, !/(Gemini|Groq|OpenAI|Anthropic|Claude|GPT|gemini|groq|openai)/.test(r.html));
  check(`orb ${state} has no colored face treatment`, !/linearGradient|radialGradient|<stop |stroke=|#f43f5e/.test(r.html));
}
check(
  "orb has two solid black oval eyes and no eye highlights",
  (orbRenders[0].html.match(/<ellipse[^>]*cx="(?:64|156)"[^>]*cy="110"[^>]*rx="17"[^>]*ry="22"[^>]*fill="#000000"/g) ?? []).length === 2 &&
    !orbRenders[0].html.includes("opacity=\"0.85\"")
);
check("orb rests with a small black mouth", orbRenders[0].html.includes(CLOSED_MOUTH) && orbRenders[0].html.includes('fill="#000000"'));
check(
  "orb mouth lip-syncs in speaking state without a non-black tongue",
  orbRenders[3].html.includes('fill="#000000"') && !orbRenders[3].html.includes("#f43f5e") && !orbRenders[3].html.includes(CLOSED_MOUTH)
);
check(
  "two orb instances both render the same minimal face without SVG defs",
  (orbRenders[0].html.match(/<circle[^>]*cx="110"[^>]*cy="110"[^>]*r="108"[^>]*fill="#ffffff"/g) ?? []).length === 1 &&
    !orbRenders[0].html.includes("<defs>")
);
for (const locale of ["uz", "ru"]) {
  const r = renderLocalized(locale, React.createElement(AiOrbFaceAvatar, {
    state: "SPEAKING", level: 0.5, statusLabel: "x", roleLabel: "y",
  }));
  check(`orb renders in ${locale}`, r.error === null, r.error ?? "");
}

// ---------------------------------------------------------------------------
section("13. Public catalog pages localize visible copy and keep active pagination aligned");
const universitiesPageSource = readFileSync(new URL("../src/app/universities/page.tsx", import.meta.url), "utf8");
const scholarshipsPageSource = readFileSync(new URL("../src/app/scholarships/page.tsx", import.meta.url), "utf8");
const paginationSource = readFileSync(new URL("../src/components/Pagination.tsx", import.meta.url), "utf8");
const catalogHeaderSource = readFileSync(new URL("../src/components/PublicCatalogHeader.tsx", import.meta.url), "utf8");
const activeUniversitiesPredicates = universitiesPageSource.match(/from\(universitiesTable\)\s*\.where\(eq\(universitiesTable\.isActive, true\)\)/g) ?? [];
const activeScholarshipsPredicates = scholarshipsPageSource.match(/from\(scholarshipsTable\)\s*\.where\(eq\(scholarshipsTable\.isActive, true\)\)/g) ?? [];
// The provider must receive the server-resolved dictionary, not only the
// locale: the promo strip on these pages is a client component, so without the
// messages it painted English until hydration finished.
const providerWithMessages = /<LocaleProvider initialLocale=\{locale\} initialMessages=\{clientMessagesFor\(locale\)\}>/;
check("universities page resolves locale and wraps its client controls", /getPageLocale/.test(universitiesPageSource) && providerWithMessages.test(universitiesPageSource));
check("scholarships page resolves locale and wraps its client controls", /getPageLocale/.test(scholarshipsPageSource) && providerWithMessages.test(scholarshipsPageSource));
check("both public catalog pages share language/theme navigation", /<PublicCatalogHeader\s*\/>/.test(universitiesPageSource) && /<PublicCatalogHeader\s*\/>/.test(scholarshipsPageSource) && /LanguageSwitcher/.test(catalogHeaderSource) && /ThemeToggle/.test(catalogHeaderSource));
check("public scholarship awards resolve to USD or stay unknown", /resolvedUsdScholarshipAmount\(scholarship\)/.test(scholarshipsPageSource) && /awardCurrency: scholarshipsTable\.awardCurrency/.test(scholarshipsPageSource));
check("university total and page data both filter to active rows", activeUniversitiesPredicates.length >= 2, `found ${activeUniversitiesPredicates.length}`);
check("scholarship total and page data both filter to active rows", activeScholarshipsPredicates.length >= 2, `found ${activeScholarshipsPredicates.length}`);
check("public error states do not render raw exception messages", !/\{message\}/.test(universitiesPageSource) && !/\{message\}/.test(scholarshipsPageSource));
check("both public catalog grids use one mobile column with readable wrapping", /grid-cols-1 gap-4 sm:grid-cols-2/.test(universitiesPageSource) && /grid-cols-1 gap-4 sm:grid-cols-2/.test(scholarshipsPageSource));
check("pagination copy comes from messages and its controls meet the 44px target", /useTranslations\(\"pagination\"\)/.test(paginationSource) && /h-11 min-w-11/.test(paginationSource));
for (const locale of ["en", "uz", "ru"]) {
  const messages = loadMessages(locale);
  check(`public catalog and pagination messages exist in ${locale}`,
    Boolean(messages.publicCatalog?.universityHeading && messages.publicCatalog?.scholarshipHeading &&
      messages.publicCatalog?.independentGuide && messages.publicCatalog?.deadline && messages.publicCatalog?.catalogNavigation &&
      messages.journey?.opAmountUnknown && messages.pagination?.aria && messages.pagination?.goToPage));
}

// ---------------------------------------------------------------------------
section("14a. The new-account Telegram reminder renders without data");

{
  // The card starts hidden (its verdict arrives from the API), so the first
  // paint must not throw — and it must not render anything until told to.
  const nudgeSource = readFileSync(new URL("../src/components/telegram/TelegramNudge.tsx", import.meta.url), "utf8");
  let error: string | null = null;
  let html = "";
  try {
    html = renderToStaticMarkup(
      withEnglishIntl(
        React.createElement(TelegramNudge, { profileId: null, onConnect: () => undefined }) as React.ReactElement
      )
    );
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  check("TelegramNudge renders without a profile and stays silent", error === null && html.trim() === "", error ?? html.slice(0, 80));
  check("the card asks the server for its verdict", nudgeSource.includes("/api/telegram/me") && nudgeSource.includes("d?.nudge?.show === true"));
  check("the card has no browser-side day window", !/ageDays|createdAt/.test(nudgeSource));
}

// ---------------------------------------------------------------------------
section("14. The public site introduces itself (channel post → product)");

const featuresPageSource = readFileSync(new URL("../src/app/features/page.tsx", import.meta.url), "utf8");
const promoSource = readFileSync(new URL("../src/components/PublicFeaturePromo.tsx", import.meta.url), "utf8");
const homeClientSource = readFileSync(new URL("../src/app/HomeClient.tsx", import.meta.url), "utf8");
const detailPages = [
  "../src/app/scholarships/[id]/page.tsx",
  "../src/app/scholarships/page.tsx",
  "../src/app/universities/page.tsx",
  "../src/app/universities/[id]/page.tsx",
].map((path) => [path, readFileSync(new URL(path, import.meta.url), "utf8")] as const);

check("a public /features page exists and reads no session", /export default async function FeaturesPage/.test(featuresPageSource) && !/SESSION_COOKIE|getProfile|api\/auth/.test(featuresPageSource));
check("the features page is reachable from every catalogue page's header", /href="\/features"/.test(catalogHeaderSource));
check("every catalogue page ends with the promo strip", detailPages.every(([, source]) => /<PublicFeaturePromo/.test(source)), detailPages.filter(([, source]) => !/<PublicFeaturePromo/.test(source)).map(([path]) => path).join(", "));
check("the promo strip links to /features and to the one-click start", /href="\/features"/.test(promoSource) && /href="\/\?start=1"/.test(promoSource));
// Resolved on the server and passed as a prop: an effect that set state would
// trip react-hooks/set-state-in-effect, and the wizard would only appear after
// hydration.
const homePageSource = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
check("start=1 opens onboarding directly for a visitor without a session",
  /startParam === "1"/.test(homePageSource) && /startNow=\{startNow\}/.test(homePageSource) &&
  /hasSessionCookie \? "restoring" : startNow \? "wizard" : "landing"/.test(homeClientSource));
check("the features page offers the bot only when the deployment configured one", /getTelegramSettings\(\)/.test(featuresPageSource) && /\^\[A-Za-z0-9_\]\{4,64\}\$/.test(featuresPageSource));

for (const locale of ["en", "uz", "ru"]) {
  const messages = loadMessages(locale);
  const copy = messages.publicFeatures;
  const featureKeys = ["match", "chancing", "deadlines", "documents", "ai", "visa", "money", "telegram"];
  check(`public features copy is complete in ${locale}`,
    Boolean(copy?.metaTitle && copy?.heroTitle && copy?.heroBody && copy?.heroPrimary && copy?.heroSecondary &&
      copy?.freeNote && copy?.promoTitle && copy?.promoBody && copy?.promoCta && copy?.promoStart && copy?.navLabel &&
      copy?.stepOneTitle && copy?.stepTwoTitle && copy?.stepThreeTitle &&
      featureKeys.every((key) => copy?.features?.[key]?.title && copy?.features?.[key]?.body)));
}

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
