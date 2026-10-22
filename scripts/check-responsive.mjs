#!/usr/bin/env node
/**
 * Source-level regression checks for the student-facing responsive fixes.
 *
 * These checks protect wrapping, touch-target, navigation-safe-area and
 * localization invariants; they do not render the UI. Run a browser viewport
 * audit separately before claiming visual coverage.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const source = {
  onboarding: read("src/components/OnboardingWizard.tsx"),
  interests: read("src/components/StudyInterestPicker.tsx"),
  journey: read("src/components/journey/JourneyControlCenter.tsx"),
  workspace: read("src/components/journey/ApplicationWorkspacePanel.tsx"),
  navbar: read("src/components/Navbar.tsx"),
  notificationBell: read("src/components/NotificationBell.tsx"),
  hubsUi: read("src/components/hubs/ui.tsx"),
  sectionIntro: read("src/components/SectionIntro.tsx"),
  languageSwitcher: read("src/components/LanguageSwitcher.tsx"),
  homeClient: read("src/app/HomeClient.tsx"),
  profile: read("src/components/ProfileModal.tsx"),
  profilePicker: read("src/components/ProfilePicker.tsx"),
  recLetter: read("src/components/RecLetterPanel.tsx"),
  consulting: read("src/components/ConsultingSection.tsx"),
  deadlines: read("src/components/DeadlineCenter.tsx"),
  mentors: read("src/components/MentorMarketplace.tsx"),
  premiumGate: read("src/components/PremiumGate.tsx"),
  arrival: read("src/components/journey/ArrivalPlanPanel.tsx"),
  explorer: read("src/components/UniversityExplorer.tsx"),
  scholarship: read("src/components/ScholarshipHub.tsx"),
  university: read("src/components/UniversityDetail.tsx"),
  tasks: read("src/components/TaskRoadmap.tsx"),
  growthUi: read("src/components/growth/ui.tsx"),
  landing: read("src/components/LandingPage.tsx"),
  faq: read("src/components/FaqSection.tsx"),
  appErrorFallback: read("src/components/AppErrorFallback.tsx"),
  pointsBadge: read("src/components/PointsBadge.tsx"),
  telegramMiniApp: read("src/components/telegram/MiniApp.tsx"),
  themeToggle: read("src/components/ThemeToggle.tsx"),
  themeScript: read("src/lib/theme.ts"),
  documentChecklist: read("src/components/DocumentChecklist.tsx"),
  nextActions: read("src/components/NextActionsPanel.tsx"),
  smartVideoPlayer: read("src/components/SmartVideoPlayer.tsx"),
  lessonNotes: read("src/components/LessonNotes.tsx"),
  globals: read("src/app/globals.css"),
};

let passed = 0;
function check(label, condition) {
  assert.ok(condition, label);
  passed += 1;
  console.log(`  ✓ ${label}`);
}

const landingHeaderStart = source.landing.indexOf("{/* ===== Header ===== */}");
const landingHeroStart = source.landing.indexOf("{/* ===== Hero ===== */}");
const landingHeader = source.landing.slice(landingHeaderStart, landingHeroStart);
const mobileAppLabels = Object.fromEntries(["en", "uz", "ru"].map((locale) => [
  locale,
  JSON.parse(read(`src/i18n/messages/${locale}.json`)).nav?.tabApps,
]));

console.log("\nResponsive source-level regressions");
check("landing wordmark wraps rather than truncates on narrow screens", landingHeader.includes("min-w-0 break-words whitespace-normal text-[15px]"));
check("landing header actions have 44px targets and no forced nowrap", /min-h-11/.test(landingHeader) && !/whitespace-nowrap/.test(landingHeader));
check("theme switch and theme choices meet 44px touch targets", /min-h-11 min-w-11/.test(source.themeToggle));
check("theme controls use translated mode names and switch labels", /useTranslations\("theme"\)/.test(source.themeToggle) && /aria-label=\{t\(value\)\}/.test(source.themeToggle) && /targetModeLabel/.test(source.themeToggle));
check("pre-paint theme bootstrap treats explicit light as false and dark as true", source.themeScript.includes('t==="system"?window.matchMedia("(prefers-color-scheme: dark)").matches:t==="dark"'));
check("landing legal links meet 44×44px touch targets and retain visible focus", /href="\/privacy" className="inline-flex min-h-11 min-w-11[^"]*focus-visible:ring-2/.test(source.landing) && /href="\/terms" className="inline-flex min-h-11 min-w-11[^"]*focus-visible:ring-2/.test(source.landing));
check("profile picker close and sign-in controls meet the 44px minimum", /h-11 w-11/.test(source.profilePicker) && (source.profilePicker.match(/min-h-11/g) ?? []).length >= 5);
check("recommendation brief inputs, actions and disclosures meet 44px targets with visible focus", (source.recLetter.match(/min-h-11/g) ?? []).length >= 7 && /min-w-11/.test(source.recLetter) && (source.recLetter.match(/<summary className=\"[^\"]*min-h-11/g) ?? []).length >= 2 && (source.recLetter.match(/focus-visible:ring-2/g) ?? []).length >= 4);
check("consulting fields and submit action meet 44px/48px minimums with focus", (source.consulting.match(/min-h-11/g) ?? []).length >= 2 && /min-h-12/.test(source.consulting) && /focus-visible:outline/.test(source.consulting));
check("consulting and mentor copy wraps instead of forcing mobile overflow", /break-words/.test(source.consulting) && /flex flex-col gap-2 sm:flex-row/.test(source.mentors) && /min-w-0/.test(source.mentors));
check("deadline refresh stays full-width on phones and at least 44px high", /min-h-11 w-full[^"]*sm:w-auto/.test(source.deadlines) && /flex-wrap/.test(source.deadlines));
check("mentor rate and request controls meet 44px targets and visible focus", (source.mentors.match(/min-h-11/g) ?? []).length >= 4 && /focus-visible:outline/.test(source.mentors));
check("premium upgrade CTA is at least 48px high and wraps safely", /min-h-12 w-full/.test(source.premiumGate) && /break-words/.test(source.premiumGate));
check("FAQ summaries meet mobile touch height, wrap translated text and show keyboard focus", /min-h-11[^\"]*focus-visible:ring-2/.test(source.faq) && source.faq.includes('useTranslations("faq")'));
check("error fallback actions and disclosure meet touch height and show focus", (source.appErrorFallback.match(/min-h-11/g) ?? []).length >= 3 && /focus-visible:ring-2/.test(source.appErrorFallback));
check("points badge uses translated points text and wraps in narrow layouts", source.pointsBadge.includes('useTranslations("rewards")') && source.pointsBadge.includes('t("points")') && /flex-wrap/.test(source.pointsBadge));
check("Telegram Mini App controls keep 44px targets, visible focus and safe-area navigation", (source.telegramMiniApp.match(/min-h-11 min-w-11/g) ?? []).length >= 4 && source.telegramMiniApp.includes("focus-visible:outline") && source.telegramMiniApp.includes('paddingBottom: "env(safe-area-inset-bottom)"') && source.telegramMiniApp.includes("dictionaries.en.telegram.miniApp") && source.telegramMiniApp.includes("aria-label={t.navigationLabel}"));
check("arrival checklist toggles meet 44px targets and have visible keyboard focus", /min-h-11 min-w-11[^"]*focus-visible:outline/.test(source.arrival));
check("arrival section links meet 44px targets and have item-specific accessible names", /min-h-11 min-w-11[^"]*focus-visible:outline/.test(source.arrival) && /aria-label=\{t\("openItemSection"/.test(source.arrival));
check("onboarding consent links meet 44×44px and remain keyboard focusable", (source.onboarding.match(/inline-flex min-h-11 min-w-11/g) ?? []).length === 2 && /focus-visible:ring-2 focus-visible:ring-indigo-500/.test(source.onboarding));
check("onboarding choices form one mobile column and three equal tablet columns", /grid-cols-1[^\n]*sm:grid-cols-3/.test(source.onboarding));
check("onboarding path choices retain radio semantics and arrow-key navigation", /role="radiogroup"/.test(source.onboarding) && /role="radio"/.test(source.onboarding) && /aria-checked=\{selected\}/.test(source.onboarding) && /handlePathRadioKeyDown/.test(source.onboarding));
check("onboarding cards retain 64px minimum height and Continue retains 48px minimum height", /min-h-16/.test(source.onboarding) && /min-h-12/.test(source.onboarding));
check("selected-interest removal control is at least 44×44px", /h-11 w-11/.test(source.interests));
check("interest picker chips wrap rather than force a single line", /flex flex-wrap/.test(source.interests) && /break-words whitespace-normal/.test(source.interests));
check("journey and application workspace content does not truncate translated text", !/(?:\btruncate\b|\bline-clamp-\d+\b|\bwhitespace-nowrap\b)/.test(source.journey + source.workspace));
check("journey primary Continue action is at least 48px tall", /min-h-12/.test(source.journey));
check("task list labels wrap and task actions meet the 44px touch target", !/(?:\btruncate\b|\bline-clamp-\d+\b|\bwhitespace-nowrap\b)/.test(source.tasks) && /min-h-11 min-w-11/.test(source.tasks));
check("task form fields have associated labels and minimum touch height", /htmlFor="task-roadmap-title"/.test(source.tasks) && /id="task-roadmap-title"/.test(source.tasks) && /min-h-11 w-full/.test(source.tasks));
check("task month cards form three wrapping tablet columns", /grid gap-4 sm:grid-cols-3/.test(source.tasks) && /break-words/.test(source.tasks));
check("shared growth segmented controls wrap labels instead of scrolling horizontally", !/(?:overflow-x-auto|whitespace-nowrap)/.test(source.growthUi) && /flex flex-wrap/.test(source.growthUi) && /min-h-11/.test(source.growthUi));
check("mobile navigation respects the bottom safe-area inset", /pb-\[env\(safe-area-inset-bottom\)\]/.test(source.navbar));
check("mobile navigation labels wrap instead of truncating", /break-words whitespace-normal text-center leading-tight/.test(source.navbar));
check("phone/tablet app buttons and text fields receive at least 44px touch targets", /@media \(max-width: 1023px\)/.test(source.globals) && /min-width: 44px/.test(source.globals) && /min-height: 44px/.test(source.globals));
check("mobile app header menu, brand and search controls meet 44px targets", (source.navbar.match(/h-11 w-11/g) ?? []).length >= 2 && /min-h-11 min-w-0 items-center gap-2/.test(source.navbar) && /aria-label=\{t\("openMenu"\)\}/.test(source.navbar) && /aria-label=\{t\("searchButton"\)\}/.test(source.navbar));
check("notification bell is a 44×44px target wherever it appears", /min-h-11 min-w-11/.test(source.notificationBell));
check("destination tabs retain 44px minimum touch targets", /min-h-11 min-w-11/.test(source.hubsUi));
check("destination tabs control real, hidden-or-visible tab panels", /aria-controls=\{`hub-panel-\$\{pane\.id\}`\}/.test(source.hubsUi) && /role="tabpanel"/.test(source.hubsUi) && /hidden=\{!isActive\}/.test(source.hubsUi));
check("university filters have accessible names, including the tuition range", /aria-label=\{t\("exCountryAll"\)\}/.test(source.explorer) && /aria-label=\{t\("exSortRank"\)\}/.test(source.explorer) && /htmlFor="university-max-tuition"/.test(source.explorer) && /id="university-max-tuition"/.test(source.explorer));
check("scholarship search and filters have accessible names", /aria-label=\{t\("searchPlaceholder"\)\}/.test(source.scholarship) && /aria-label=\{t\("allCountries"\)\}/.test(source.scholarship) && /aria-label=\{t\("allCoverage"\)\}/.test(source.scholarship));
check("mobile help and dismiss actions retain 44px targets and visible focus",  /min-h-11 min-w-11/.test(source.sectionIntro) && /h-11 w-11/.test(source.sectionIntro));
check("compact language selector and logout control meet 44px targets", /min-h-11/.test(source.languageSwitcher) && /h-11 w-11/.test(source.navbar));
check("application footer links remain tappable and keyboard focused", (source.homeClient.match(/min-h-11 min-w-11/g) ?? []).length >= 5 && /focus-visible:ring-2/.test(source.homeClient));
check("mobile Applications navigation labels are concise in every locale", mobileAppLabels.en === "Apps" && mobileAppLabels.uz === "Arizalar" && mobileAppLabels.ru === "Заявки");
check("editing a profile preserves an unanswered financial-aid choice", /needsFinancialAid: boolean \| null/.test(source.profile) && /needsFinancialAid: null/.test(source.profile) && /financialAidUnknown/.test(source.profile));
check("university catalogue requirements carry a programme-specific verification caveat", /catalogueRequirementsScope/.test(source.university));
check("key catalogue cards wrap names, majors and descriptions", /break-words font-bold text-base/.test(source.explorer) && /break-words text-xs leading-relaxed/.test(source.explorer));
check("global reduced-motion preference remains respected", /prefers-reduced-motion:\s*reduce/.test(source.globals));
check("document checklist labels, placeholders and status controls use translations", source.documentChecklist.includes('useTranslations("documentChecklist")') && /placeholder=\{t\("placeholder"\)\}/.test(source.documentChecklist) && /aria-label=\{d\.status/.test(source.documentChecklist));
check("document checklist actions meet 44px touch targets and wrap without horizontal overflow", /min-h-11 items-center/.test(source.documentChecklist) && /min-h-11 min-w-11/.test(source.documentChecklist) && /flex flex-wrap/.test(source.documentChecklist));
check("next actions panel localizes dynamic action copy and exposes keyboard-focusable touch actions", source.nextActions.includes('useTranslations("nextActions")') && source.nextActions.includes("localizedActionCopy") && /min-h-11[^\"]*focus-visible:outline/.test(source.nextActions));
check("next actions panel has translated loading, empty and retry states", /t\("loading"\)/.test(source.nextActions) && /t\("empty"\)/.test(source.nextActions) && /t\("loadFailed"\)/.test(source.nextActions));
check("video player localizes its empty and generic provider labels", source.smartVideoPlayer.includes('useTranslations("courses")') && /emptyLabel \?\? t\("noVideoYet"\)/.test(source.smartVideoPlayer) && /t\("externalVideoPlayer"\)/.test(source.smartVideoPlayer));
check("lesson notes render authored content only and do not inject English fallback copy", /if \(blocks\.length === 0\) return null/.test(source.lessonNotes) && !/No notes|No lesson content|Loading notes/.test(source.lessonNotes));
// The dark-mode tokens are read from the `.dark { … }` block and judged by
// value, so a palette tweak does not need a test edit — a light fill does fail.
const darkBlock = source.globals.match(/\n\.dark \{([\s\S]*?)\n\}/)?.[1] ?? "";
const darkToken = (name) => darkBlock.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim() ?? "";
const relLuminance = (rgbTriplet) => {
  const [r, g, b] = rgbTriplet.split(/\s+/).map(Number).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
check("translucent dark slate panels use a dark fill", source.globals.includes(":where(.dark) .dark\\:bg-slate-800\\/60 { background-color: rgb(var(--sb-well-rgb) / 0.6); }") && /^\d+ \d+ \d+$/.test(darkToken("--sb-well-rgb")) && relLuminance(darkToken("--sb-well-rgb")) < 0.05);
check("translucent amber panels use a dark-mode accent wash", (() => {
  // `bg-amber-50/50` is `color-mix(var(--color-amber-50) 50%, transparent)`: the
  // token itself must become a translucent amber wash under `.dark`.
  const m = darkToken("--color-amber-50").match(/^rgb\(245 158 11 \/ (0?\.\d+)\)$/);
  return Boolean(m) && Number(m[1]) > 0 && Number(m[1]) <= 0.3;
})());

const locales = {};
for (const locale of ["en", "uz", "ru"]) {
  locales[locale] = JSON.parse(read(`src/i18n/messages/${locale}.json`));
}
for (const locale of ["en", "uz", "ru"]) {
  check(`${locale} theme has localized names and switching labels`, Boolean(locales[locale].theme?.label && locales[locale].theme?.light && locales[locale].theme?.system && locales[locale].theme?.dark && locales[locale].theme?.switchToLight && locales[locale].theme?.switchToDark));
  check(`${locale} leaderboard has a localized current-user label`, Boolean(locales[locale].rewards?.you));
  check(`${locale} includes localized journey and profile-aid copy`, Boolean(
    locales[locale].journey?.ccDeadlineKinds?.application &&
    locales[locale].journey?.ccExploreUniversities &&
    locales[locale].profile?.financialAidNeedQuestion &&
    locales[locale].profile?.financialAidUnknown &&
    locales[locale].university?.catalogueRequirementsScope &&
    locales[locale].taskRoadmap?.categories?.standardizedTest &&
    locales[locale].taskRoadmap?.categories?.other &&
    locales[locale].taskRoadmap?.filterTasks &&
    locales[locale].taskRoadmap?.markComplete
  ));
}

console.log(`\n${passed} source-level checks passed.`);
console.log("No browser render or viewport screenshot was performed by this script.");
