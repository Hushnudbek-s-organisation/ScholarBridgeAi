import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
let passed = 0;
function check(name, condition) {
  assert.ok(condition, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

const wizard = read("src/components/OnboardingWizard.tsx");
const stepBlock = wizard.match(/const STEPS = \[[\s\S]*?\];/)?.[0] ?? "";
check("onboarding has exactly three steps", (stepBlock.match(/titleKey:/g) ?? []).length === 3);
check("onboarding merges direction and destinations", stepBlock.includes('titleKey: "direction"') && stepBlock.includes('titleKey: "destinations"'));
check("advanced onboarding steps are no longer rendered", !/step === [3-7]/.test(wizard) && !wizard.includes("SmartAutofillBox"));
check("interest selection never disables Next or Skip", !wizard.includes("step2Invalid") && wizard.includes("showError={false}") && wizard.includes("const nextDisabled = saving || (step === 0 && step0Invalid)"));
check("completion persists step three", (wizard.match(/persist\(3, true\)/g) ?? []).length === 2);
check("legacy resume mapping is explicit", wizard.includes("requestedStartStep === 0 ? 0 : requestedStartStep <= 2 ? 1 : 2"));
check("wizard still validates malformed interests on the server", read("src/app/api/profiles/route.ts").includes('code: "study_interests_invalid"') && read("src/app/api/profiles/[id]/route.ts").includes('code: "study_interests_invalid"'));
check("profile APIs persist only the three-step range", read("src/app/api/profiles/route.ts").includes("Number(body.onboardingStep) || 0, 0), 3") && read("src/app/api/profiles/[id]/route.ts").includes("max: 3, integer: true"));

const sheet = read("src/components/ui/BottomSheet.tsx");
check("bottom sheet reuses dialog focus, Escape, restoration and scroll lock", sheet.includes("useDialogFocusTrap({ open, dialogRef, onEscape: onClose })") && sheet.includes('role="dialog"') && sheet.includes('aria-modal="true"'));
check("bottom sheet has safe-area padding and a 44px close target", sheet.includes("env(safe-area-inset-bottom)") && sheet.includes("h-11 w-11"));
const explorer = read("src/components/UniversityExplorer.tsx");
check("university phone filters use a sheet, not an inline wall", explorer.includes("<BottomSheet") && explorer.includes('id="university-filter-sheet"') && explorer.includes('renderUniversityFilters("mobile-university")') && !explorer.includes('mobileFiltersOpen ? "grid"'));
check("university desktop and mobile filter IDs are distinct", explorer.includes('renderUniversityFilters("university")') && explorer.includes("mobile-university") && explorer.includes("${idPrefix}-max-tuition"));
const scholarship = read("src/components/ScholarshipHub.tsx");
const scholarshipFilters = read("src/components/ScholarshipFilters.tsx");
check("scholarship phone filters use the same sheet and parent state", scholarship.includes("<BottomSheet") && scholarship.includes("filters={filters}") && scholarship.includes("onChange={setFilters}"));
check("scholarship filter IDs preserve a desktop default and a mobile prefix", scholarshipFilters.includes('idPrefix = "scholarship-filter"') && scholarship.includes('idPrefix="mobile-scholarship-filter"'));

const compare = read("src/components/CountryComparePanel.tsx");
check("country comparison uses vertical phone cards", compare.includes('className="mt-4 space-y-3 md:hidden"') && compare.includes("<dl") && compare.includes('key={`mobile-${c.country}`}'));
check("country table remains on larger screens with the same data", compare.includes("hidden overflow-x-auto md:block") && (compare.match(/c\.workRights/g) ?? []).length >= 4 && (compare.match(/c\.scholarships\.totalUsd/g) ?? []).length === 2);

const responsive = read("src/hooks/useResponsivePerPage.ts");
check("pagination understands the 1536px catalogue breakpoint", responsive.includes('"(min-width: 1536px)"') && responsive.includes('[768, 1024, 1280, 1536]'));
for (const [name, source] of [["university", explorer], ["scholarship", scholarship]]) {
  check(`${name} catalogue keeps one tablet column, two at lg and three at 2xl`, source.includes("grid-cols-1") && source.includes("lg:grid-cols-2 2xl:grid-cols-3") && !source.includes("md:grid-cols-2 lg:grid-cols-3") && !source.includes("md:grid-cols-2 xl:grid-cols-3"));
}
check("university cards align headings, metrics and bottom actions", explorer.includes("group flex h-full flex-col") && explorer.includes("line-clamp-2 min-h-10") && explorer.includes("mb-3 mt-auto grid") && explorer.includes("flex shrink-0 items-center gap-1.5 border-t"));
check("scholarship cards align headings, metrics and bottom actions", scholarship.includes("flex h-full flex-col") && scholarship.includes("line-clamp-3 min-h-[4.125rem]") && scholarship.includes("mt-auto grid grid-cols-2") && scholarship.includes("flex shrink-0 flex-wrap"));

const profile = read("src/components/ProfileModal.tsx");
check("profile editor has four mounted tab panels", ["account", "academics", "finance", "experience"].every((id) => profile.includes(`id: "${id}"`) && profile.includes(`id="profile-panel-${id}"`) && profile.includes(`hidden={activeSection !== "${id}"}`)));
check("profile editor has explicit validation and persistent actions", profile.includes("noValidate") && profile.includes("showValidationError") && profile.includes("shrink-0 border-t border-slate-200 bg-white"));
check("profile interests are optional while malformed non-empty values are rejected", profile.includes("formData.studyInterests.length > 0 && !isStudyInterestSelectionValid") && profile.includes("showError={false}"));
check("profile tabs support arrow, Home and End keys", ["ArrowRight", "ArrowLeft", "Home", "End"].every((key) => profile.includes(`event.key === "${key}"`)));

const sop = read("src/components/AiSopStudio.tsx");
const visa = read("src/components/VisaSpeakingAssistant.tsx");
const loading = read("src/components/ui/LoadingStages.tsx");
check("SOP drafting and reviewing both expose staged activity", (sop.match(/<LoadingStages/g) ?? []).length === 2 && sop.includes("isDrafting ?") && sop.includes("isReviewing ?"));
check("visa interview analysis exposes staged activity", visa.includes("<LoadingStages") && visa.includes('t("analysisStage3")'));
check("AI activity uses real elapsed time and no fabricated progress bar", loading.includes("Date.now()") && loading.includes("elapsedSeconds") && !loading.includes("progressbar") && !loading.includes("aria-valuenow"));

const dashboardApi = read("src/app/api/dashboard/route.ts");
const dashboard = read("src/components/journey/JourneyControlCenter.tsx");
check("dashboard API exposes full starter activity counts", ["savedUniversities", "savedScholarships", "applications"].every((key) => dashboardApi.includes(`activity: {`) && dashboardApi.includes(`${key}:`)));
check("starter tasks use real completion thresholds", dashboard.includes("starterActivity.savedUniversities >= 3") && dashboard.includes("starterActivity.savedScholarships >= 1") && dashboard.includes("starterActivity.applications > 0"));
check("three starter tasks navigate to real destinations", dashboard.includes("<DashboardFirstSteps") && ['tab: "universities"', 'tab: "scholarships"', 'tab: "applications"'].every((value) => dashboard.includes(value)));

const globals = read("src/app/globals.css");
check("brand and AI heroes are centralized semantic treatments", globals.includes(".sb-brand-hero") && globals.includes(".sb-ai-hero"));
for (const file of ["src/components/ProfileModal.tsx", "src/components/AiChatMentor.tsx", "src/components/DashboardView.tsx"]) {
  check(`${file} uses the shared brand hero`, read(file).includes("sb-brand-hero"));
}
check("premium CTA no longer introduces a gold gradient theme", !read("src/components/PremiumGate.tsx").includes("yellow-") && !read("src/components/PremiumGate.tsx").includes("from-amber"));
check("SOP studio uses violet for AI rather than ad-hoc purple", !sop.includes("purple-") && sop.includes("bg-violet-600"));
check("wide app shell uses the 2xl container", read("src/app/HomeClient.tsx").includes("max-w-screen-2xl") && !read("src/app/HomeClient.tsx").includes("max-w-7xl"));

// Visible copy in the three identified modules must come from messages. Raw
// canonical status VALUES remain in JS, but no raw language text reaches JSX.
for (const file of ["src/components/ProfileModal.tsx", "src/components/AiSopStudio.tsx", "src/components/ApplicationTracker.tsx"]) {
  const source = read(file);
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visible = [];
  const visit = (node) => {
    if (ts.isJsxText(node) && /[A-Za-z]/.test(node.text)) visible.push(node.text.trim());
    if (ts.isStringLiteral(node) && ts.isJsxAttribute(node.parent) && ["placeholder", "title", "aria-label"].includes(node.parent.name.getText()) && /[A-Za-z]/.test(node.text)) {
      visible.push(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  check(`${file} has no hardcoded visible language strings`, visible.length === 0);
}

for (const locale of ["en", "uz", "ru"]) {
  const m = JSON.parse(read(`src/i18n/messages/${locale}.json`));
  check(`${locale} includes every new UX message group`,
    m.onboarding.stepTitles.direction && m.onboarding.stepTitles.destinations &&
    m.profile.editor.sections.account && m.profile.editor.sections.experience && m.profile.editor.passwordChangeError &&
    m.ai.sopStudio.networkError && m.ai.sopStudio.reviewStage3 &&
    m.applications.tracker.uniStatus.Submitted && m.applications.tracker.scholarshipStatus.Awarded &&
    m.journey.firstSteps.universitiesCta && m.journey.firstSteps.applicationCta &&
    m.visa.analysisStage3 && m.common.showResults && m.common.elapsedSeconds
  );
}

console.log(`\n${passed} second-audit UX checks passed.`);
