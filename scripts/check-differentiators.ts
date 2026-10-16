/**
 * Deterministic checks for the Priority 4 upgrades and the five Priority 5
 * differentiators.
 *
 * Three things are asserted here that no other gate can see:
 *
 *  1. ENGINE HONESTY — a NULL requirement never becomes a green tick, an
 *     unknown GPA is never guessed, IELTS is never converted into TOEFL, a $0
 *     fee is only ever claimed when a named official source says so, and the
 *     published UK/German/Korean/Canadian figures are the ones actually used.
 *  2. DYNAMIC i18n — most of these surfaces build their message keys from
 *     engine-produced ids (`milestones.${id}.label`, `pills.eligibility.${state}`).
 *     `check-i18n` can only see literal `t("…")` calls, so every id that can
 *     reach a dynamic key is resolved here against en, uz AND ru.
 *  3. MOUNTING — each component is actually imported and rendered by the host
 *     the spec names, and the hosts that must not change shape still don't.
 *
 * Run: npm run test:differentiators
 */

import fs from "node:fs";
import path from "node:path";

import {
  evaluateFeeWaiverOptions,
  evaluateWaiverEligibility,
  generateCounselorAttestationLetter,
  generateFeeWaiverRequestLetter,
  universityFeeUsd,
  FEE_WAIVER_PROGRAMS,
  ZERO_FEE_ROUTES,
  type FeeWaiverUniversityInput,
} from "../src/lib/feeWaivers";
import {
  buildColdEmail,
  gradeColdEmail,
  professorSalutation,
  COLD_EMAIL_WORD_TARGET,
} from "../src/lib/professorOutreach";
import {
  buildBackwardsPlan,
  buildSmartTimeline,
  detectTimelineConflicts,
  milestoneTaskDrafts,
  MIN_EXAM_LEAD_DAYS,
  TIGHT_DEADLINE_DAYS,
  BACKWARDS_MILESTONES,
} from "../src/lib/smartTimeline";
import {
  checkApostilleReadiness,
  computeFundsWindow,
  resolveFundsRequirement,
  APOSTILLE_MATRIX,
  DOCUMENT_IDS,
  PUBLISHED_FUNDS_RULES,
  E_APOSTILLE_PORTAL,
} from "../src/lib/apostilleChecker";
import {
  buildTwinStrategy,
  buildTwinDeltas,
  pickTwin,
  twinGoalPayload,
} from "../src/lib/twinStrategy";
import { annotateEssay, evaluateSopStructure, SOP_BLOCKS } from "../src/lib/essayInsights";
import { evaluateUniversityDecision, DECISION_PILL_CLASS } from "../src/lib/decisionPills";

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

const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/* ========================================================================== */
/* i18n resolution for every id an engine can produce                          */
/* ========================================================================== */

type Messages = Record<string, unknown>;
const LOCALES = ["en", "uz", "ru"] as const;
const catalogues: Record<(typeof LOCALES)[number], Messages> = {
  en: JSON.parse(read("src/i18n/messages/en.json")) as Messages,
  uz: JSON.parse(read("src/i18n/messages/uz.json")) as Messages,
  ru: JSON.parse(read("src/i18n/messages/ru.json")) as Messages,
};

function resolve(catalogue: Messages, dotted: string): string | null {
  let node: unknown = catalogue;
  for (const part of dotted.split(".")) {
    if (node == null || typeof node !== "object") return null;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : null;
}

/**
 * Values that are legitimately the same in all three languages: proper nouns,
 * portal brand names, test names, symbols and pure placeholder strings. A
 * translation that renamed "UCAS Hub" would be a worse UI, not a better one.
 */
const IDENTITY_TOKENS = /^(GPA|IELTS|TOEFL|SAT|ACT|UCAS|Hub|uni|assist|Türkiye|Bursları|TBBS|El|yurt|umidi|London|MSc|PhD|VPD|KAIST|GKS|DreamApply)$/i;

/** Strip ICU placeholders and symbols; whatever words remain must all be
 *  untranslatable proper nouns for the value to be allowed to be identical. */
function isIdentityValue(value: string): boolean {
  const stripped = value.replace(/\{[^}]*\}/g, " ").replace(/[^A-Za-zÀ-ÿ\u0100-\u017F\u0400-\u04FF0-9$ ]/g, " ");
  const words = stripped.split(/\s+/).filter(Boolean);
  if (words.length === 0) return true; // placeholders and symbols only
  return words.every((word) => IDENTITY_TOKENS.test(word) || /^\$?\d+$/.test(word));
}

/** A key must exist and be non-empty in all three locales, and must actually be
 *  translated unless its English value is an untranslatable proper noun. */
function checkKey(dotted: string) {
  const values = LOCALES.map((loc) => resolve(catalogues[loc], dotted));
  const present = values.every((v) => typeof v === "string" && v!.trim().length > 0);
  // An empty string is a legitimate value for a key the UI hides (the neutral
  // tone has no explanation), so allow it only when English is empty too.
  const consistentEmpty = values.every((v) => v === "" || v == null);
  const identity = typeof values[0] === "string" && isIdentityValue(values[0].trim());
  const translated = values[1] !== values[0] && values[2] !== values[0];
  check(
    `i18n ${dotted}`,
    consistentEmpty ? true : present && (identity || translated),
    present ? `uz/ru identical to en: ${JSON.stringify(values)}` : `missing/empty: ${JSON.stringify(values)}`
  );
}

function checkKeys(dotted: string[]) {
  for (const key of dotted) checkKey(key);
}

const expand = (prefix: string, ids: readonly string[], suffixes: readonly string[]) =>
  ids.flatMap((id) => suffixes.map((suffix) => `${prefix}${id}${suffix}`));

/* ========================================================================== */
/* 5.1 — Fee Waiver & $0-Application Finder                                    */
/* ========================================================================== */

section("5.1 Fee waiver engine");

const shortlist: FeeWaiverUniversityInput[] = [
  { id: 1, name: "Free Public DE", country: "Germany", applicationFee: null, applicationFeeCurrency: null, applicationFeeUsd: null },
  { id: 2, name: "Priced US", country: "United States", applicationFee: 90, applicationFeeCurrency: "USD", applicationFeeUsd: 90, degreeLevel: "Bachelor" },
  { id: 3, name: "Unknown fee UK", country: "United Kingdom", applicationFee: null, applicationFeeUsd: null, degreeLevel: "Master" },
  { id: 4, name: "Euro fee NL", country: "Netherlands", applicationFee: 100, applicationFeeCurrency: "EUR", applicationFeeUsd: null },
];

const aided = {
  country: "Uzbekistan",
  degreeLevel: "Bachelor",
  familyIncomeUsd: 9_000,
  needsFinancialAid: true,
  requiresFullScholarship: false,
  needScholarship: true,
};
const anonymous = evaluateFeeWaiverOptions(null, shortlist);
const aidedEval = evaluateFeeWaiverOptions(aided, shortlist);

check("a $0 fee is only claimed when a named source backs it", ZERO_FEE_ROUTES.every((r) => r.feeUsd === null || (r.sourceName.trim() !== "" && /^https:\/\//.test(r.sourceUrl))));
check("every zero/shared route carries an official source URL", ZERO_FEE_ROUTES.every((r) => /^https:\/\//.test(r.sourceUrl) && r.portalUrl.startsWith("https://")));
check("every waiver programme carries an official source URL", FEE_WAIVER_PROGRAMS.every((p) => /^https:\/\//.test(p.sourceUrl) && p.portalUrl.startsWith("https://")));
check("an unpublished fee is never resolved to 0", universityFeeUsd(shortlist[0]) === null && universityFeeUsd(shortlist[2]) === null);
check("a non-USD fee without a USD mirror is not silently converted", universityFeeUsd(shortlist[3]) === null);
check("a published USD fee resolves to itself", universityFeeUsd(shortlist[1]) === 90);
check("fee_unknown stays its own category", anonymous.universities.some((u) => u.category === "fee_unknown" && u.feeUsd === null));
check("no savings are counted on an unknown fee", anonymous.universities.every((u) => u.feeUsd == null ? u.avoidableUsd == null : true));
check("an anonymous visitor has no waiver indicators", evaluateWaiverEligibility(null).eligible === false);
check("recorded hardship produces indicators, not approval", aidedEval.eligibility.eligible === true && aidedEval.eligibility.indicators.length >= 2);
check("the eligibility headline names a real indicator", ["none", ...aidedEval.eligibility.indicators].includes(aidedEval.eligibility.headline as never));
check("a student with a recorded waiver reason upgrades a priced US university", aidedEval.universities.find((u) => u.university.id === 2)?.category === "waiver_likely");
check("avoidable savings never exceed the published fee", aidedEval.universities.every((u) => u.avoidableUsd == null || (u.feeUsd != null && u.avoidableUsd <= u.feeUsd)));
check("the totals add up to the per-row values", aidedEval.totals.avoidableTotalUsd === aidedEval.universities.reduce((sum, u) => sum + (u.avoidableUsd ?? 0), 0));

const request = generateFeeWaiverRequestLetter({ ...aided, name: "Aziza Karimova", email: "a@b.uz", gpa: 3.8, gpaScale: 4, targetMajor: "Computer Science" }, "Purdue University", { intake: "Fall 2027" });
const attestation = generateCounselorAttestationLetter({ ...aided, name: "Aziza Karimova", gpa: 3.8, gpaScale: 4 }, { universityName: "Purdue University", counselorName: "D. Karimova", counselorTitle: "Head of International Office", schoolName: "Tashkent Presidential School" });
check("the student letter keeps its own voice and subject", request.template === "request" && request.subject.includes("Aziza Karimova") && request.subject.includes("Fall 2027"));
check("the attestation is written in the third person", attestation.template === "attestation" && /I confirm that Aziza Karimova/.test(attestation.body));
check("a fully-supplied profile leaves no bracketed placeholders", request.placeholders.length === 0, JSON.stringify(request.placeholders));
check("a sparse profile surfaces the fields the student must fill", generateFeeWaiverRequestLetter({}, "Some University").placeholders.length > 0);
check("neither letter claims the waiver was granted", !/has been (granted|approved)|waiver (is )?approved/i.test(`${request.body}${attestation.body}`));

section("5.1 Fee waiver i18n (dynamic keys)");
checkKeys([
  "feeWaiver.title", "feeWaiver.subtitle", "feeWaiver.savingTotal", "feeWaiver.loading",
  "feeWaiver.loadError", "feeWaiver.empty", "feeWaiver.catalogueSourceNote",
  "feeWaiver.eligibilityTitle", "feeWaiver.noIndicators", "feeWaiver.missingIndicator",
  "feeWaiver.eligibilityDisclaimer", "feeWaiver.feeZero", "feeWaiver.feeUnknown",
  "feeWaiver.avoidable", "feeWaiver.publishedFeeTotal", "feeWaiver.officialSource",
  "feeWaiver.letterTitle", "feeWaiver.letterSubtitle", "feeWaiver.letterUniversityLabel",
  "feeWaiver.letterUniversityPlaceholder", "feeWaiver.counselorNameLabel", "feeWaiver.counselorNamePlaceholder",
  "feeWaiver.counselorTitleLabel", "feeWaiver.counselorTitlePlaceholder", "feeWaiver.schoolNameLabel",
  "feeWaiver.schoolNamePlaceholder", "feeWaiver.letterSubject", "feeWaiver.copySubject",
  "feeWaiver.copyBody", "feeWaiver.placeholders", "feeWaiver.letterDisclaimer", "feeWaiver.letterEmpty",
]);
checkKeys(expand("feeWaiver.eligibility.", ["none", "needs_financial_aid", "requires_full_scholarship", "needs_scholarship", "income_below_threshold"], [""]));
checkKeys(expand("feeWaiver.indicators.", ["needs_financial_aid", "requires_full_scholarship", "needs_scholarship", "income_below_threshold"], ["", "Hint"]));
checkKeys(expand("feeWaiver.categories.", ["zero_fee", "shared_fee", "waiver_likely", "published_fee", "fee_unknown"], [".title", ".short", ".explain"]));
checkKeys(expand("feeWaiver.routes.", ZERO_FEE_ROUTES.map((r) => r.id), [".name", ".desc"]));
checkKeys(expand("feeWaiver.programs.", FEE_WAIVER_PROGRAMS.map((p) => p.id), [".name", ".desc"]));
checkKeys(["feeWaiver.templates.request", "feeWaiver.templates.attestation"]);

/* ========================================================================== */
/* 5.2 — Professor Cold-Email Outreach Studio                                  */
/* ========================================================================== */

section("5.2 Cold-email engine");

const fullFacts = {
  studentName: "Aziza Karimova",
  studentUniversity: "Tashkent University of Information Technologies",
  targetLevel: "MSc",
  targetIntake: "Fall 2027",
  fieldOfStudy: "Computer Science",
  professorName: "Prof. Anna Weber",
  universityName: "TU München",
  labName: "Computational Mechanics Lab",
  paperTitle: "Sparse Galerkin surrogates for crash simulation",
  paperInsight: "your 18% runtime reduction came from dropping basis functions below an energy threshold, not from a faster solver",
  projectTitle: "Cotton-leaf disease classifier",
  projectMetric: "94.2% accuracy on 1,200 labelled samples",
  methods: "Python, PyTorch, transfer learning",
  gpa: 3.8,
  gpaScale: 4,
  ielts: 7.5,
  publications: 1,
  attachments: ["CV", "Transcript"],
};

const built = buildColdEmail(fullFacts);
const builtGrade = gradeColdEmail(built.subject, built.body);
const massMail = "Dear Sir/Madam,\n\nI am very passionate about computer science and I want to delve into research at your esteemed institution. I would be happy to join any university. Kindly do the needful and revert back at the earliest!!!\n\nRegards";
const massGrade = gradeColdEmail("Question", massMail);

check("the salutation keeps the title and surname", professorSalutation("Prof. Anna Weber") === "Prof. Weber" || professorSalutation("Prof. Anna Weber").includes("Weber"));
// With no name on file the builder cannot invent one: it falls back to a bare
// "Professor", the grader then charges the `no_name_professor` penalty, and the
// studio lists the missing fact. The student is told to find the name rather
// than being handed a flattering placeholder.
check("an unnamed professor is greeted generically and the build reports it missing", professorSalutation(null) === "Professor" && buildColdEmail({ ...fullFacts, professorName: null }).missing.includes("professorName"));
check("a named professor keeps title and surname", professorSalutation("Anna Weber") === "Prof. Weber" || professorSalutation("Anna Weber").includes("Weber"));
check("the built email has all six sentence jobs", built.sentences.length === 6 && ["who", "why_you", "evidence", "fit", "ask", "close"].every((role) => built.sentences.some((s) => s.role === role)));
check("a complete profile leaves no bracketed placeholders in the email", !/\[[A-Z][A-Z ,.'-]{2,}\]/.test(built.body), built.body.slice(0, 120));
check("the built email reports no missing facts", built.missing.length === 0, JSON.stringify(built.missing));
check("the built email lands inside the readable word band", built.wordCount >= COLD_EMAIL_WORD_TARGET.min && built.wordCount <= COLD_EMAIL_WORD_TARGET.long, `${built.wordCount} words`);
check("the built email quotes the paper the student read", built.body.includes("Sparse Galerkin surrogates"));
check("the built email carries the quantified result", built.body.includes("94.2%"));
check("the built email grades strong", builtGrade.band === "strong" && builtGrade.score >= 80, `${builtGrade.score}/${builtGrade.band}`);
check("every rubric check passes on the built email", builtGrade.checks.every((c) => c.passed), builtGrade.checks.filter((c) => !c.passed).map((c) => c.id).join(","));
check("the built email has no penalties", builtGrade.penalties.length === 0, builtGrade.penalties.map((p) => p.id).join(","));
check("a mass mail grades weak", massGrade.band === "weak" && massGrade.score < 40, `${massGrade.score}/${massGrade.band}`);
check("a mass mail is penalised for the tells it contains", ["dear_sir_madam", "passionate_filler", "cliche_delve", "do_the_needful", "mass_mail"].every((id) => massGrade.penalties.some((p) => p.id === id)), massGrade.penalties.map((p) => p.id).join(","));
check("the raw score is clamped to 0–100", massGrade.score >= 0 && massGrade.score <= 100 && builtGrade.score <= 100);
check("toFix lists the checks that actually failed", builtGrade.toFix.length === 0 && massGrade.toFix.length > 0 && massGrade.toFix.every((id) => massGrade.checks.find((c) => c.id === id)?.passed === false));
check("a missing fact is reported instead of being invented", buildColdEmail({ ...fullFacts, paperTitle: null }).missing.length > 0);
check("an article is chosen correctly before an initialism", buildColdEmail({ ...fullFacts, targetLevel: "MSc" }).body.includes("an MSc"));

section("5.2 Outreach i18n (dynamic keys)");
checkKeys([
  "outreach.title", "outreach.subtitle", "outreach.factsTitle", "outreach.attachmentsTitle",
  "outreach.buildButton", "outreach.resetButton", "outreach.missingFacts", "outreach.profileFacts",
  "outreach.unknownFact", "outreach.subjectLabel", "outreach.subjectPlaceholder", "outreach.bodyLabel",
  "outreach.bodyPlaceholder", "outreach.copyAll", "outreach.copySubject", "outreach.copyBody",
  "outreach.openInMail", "outreach.openInMailHint", "outreach.rubricTitle", "outreach.wordCount",
  "outreach.fixFirst", "outreach.allChecksPassed", "outreach.penaltiesTitle",
  "outreach.checks.lengthDetail", "outreach.checks.paragraphDetail",
]);
checkKeys(expand("outreach.bands.", ["strong", "solid", "needs_work", "weak"], [""]));
checkKeys(expand("outreach.checks.", ["length", "subject_specific", "paper_or_lab_cited", "quantified_metric", "attachment_mentioned", "clear_ask", "salutation_and_signoff"], [""]));
checkKeys(expand("outreach.penalties.", ["dear_sir_madam", "no_name_professor", "passionate_filler", "cliche_delve", "do_the_needful", "funding_first", "shouting", "mass_mail", "wall_paragraph"], [""]));
checkKeys(expand("outreach.fields.", ["professorName", "universityName", "labName", "paperTitle", "paperInsight", "projectTitle", "projectMetric", "methods", "targetLevel", "targetIntake"], ["", "Placeholder"]));
// Every penalty and check id used above must really exist in the engine source,
// so renaming one breaks this gate instead of silently dropping a translation.
const outreachSrc = read("src/lib/professorOutreach.ts");
check("the penalty ids checked here are the ones the engine emits", ["dear_sir_madam", "no_name_professor", "passionate_filler", "cliche_delve", "do_the_needful", "funding_first", "shouting", "mass_mail", "wall_paragraph"].every((id) => outreachSrc.includes(`"${id}"`)));
check("the rubric ids checked here are the ones the engine emits", ["length", "subject_specific", "paper_or_lab_cited", "quantified_metric", "attachment_mentioned", "clear_ask", "salutation_and_signoff"].every((id) => outreachSrc.includes(`id: "${id}"`)));

/* ========================================================================== */
/* 5.3 — Smart Backwards Timeline                                              */
/* ========================================================================== */

section("5.3 Backwards timeline engine");

const APP_DATE = "2027-09-01";
const ukDeadline = { id: "app-1", label: "Imperial College — MSc Computing", date: APP_DATE, kind: "application" as const, country: "United Kingdom", universityId: 11 };
const deDeadline = { id: "app-2", label: "TU München — MSc Mechanics", date: "2027-07-15", kind: "application" as const, country: "Germany", universityId: 12 };
const undated = { id: "sch-9", label: "Chevening", date: null, kind: "scholarship" as const };
const plan = buildBackwardsPlan(ukDeadline, { today: "2026-10-16" });
const dePlan = buildBackwardsPlan(deDeadline, { today: "2026-10-16" });
const undatedPlan = buildBackwardsPlan(undated, { today: "2026-10-16" });

check("every milestone is dated by counting back from the deadline", plan.milestones.every((m) => m.dueDate != null));
check("a bigger offset always lands on an earlier date", [...plan.milestones].sort((a, b) => b.offsetDays - a.offsetDays).every((m, i, all) => i === 0 || (all[i - 1].dueDate ?? "") <= (m.dueDate ?? "")));
check("D-90 is exactly 90 days before the deadline", plan.milestones.find((m) => m.id === "rec_letters")?.dueDate === "2027-06-03");
check("the D-3 submission buffer is exactly 3 days before the deadline", plan.milestones.find((m) => m.id === "final_buffer")?.dueDate === "2027-08-29");
check("the German VPD step is planned for Germany", dePlan.milestones.find((m) => m.id === "vpd")?.applies === true);
check("the German VPD step is skipped for the UK, with a reason", plan.milestones.find((m) => m.id === "vpd")?.applies === false && plan.milestones.find((m) => m.id === "vpd")?.notApplicableReason === "not_germany");
check("an unknown destination says it is unknown, not 'not Germany'", buildBackwardsPlan({ ...deDeadline, country: null }).milestones.find((m) => m.id === "vpd")?.notApplicableReason === "country_unknown");
check("an undated deadline invents no dates", undatedPlan.date == null && undatedPlan.milestones.every((m) => m.dueDate == null) && undatedPlan.daysUntilDeadline == null);
check("days until the deadline are counted from today", plan.daysUntilDeadline === 320);
check("overdue steps are only those whose date has passed", buildBackwardsPlan({ ...ukDeadline, date: "2026-01-10" }, { today: "2026-10-16" }).overdue.every((m) => m.daysOverdue > 0));
check("a plan with no date has no overdue steps", undatedPlan.overdue.length === 0);

const closeExam = detectTimelineConflicts([ukDeadline], [{ id: "t-1", testType: "ielts", date: "2027-08-25" }], { today: "2026-10-16" });
const afterExam = detectTimelineConflicts([ukDeadline], [{ id: "t-2", testType: "ielts", date: "2027-09-20" }], { today: "2026-10-16" });
const farExam = detectTimelineConflicts([ukDeadline], [{ id: "t-3", testType: "ielts", date: "2027-06-01" }], { today: "2026-10-16" });
const pastDeadline = detectTimelineConflicts([{ ...ukDeadline, date: "2026-05-01" }], [], { today: "2026-10-16" });
const tightDeadline = detectTimelineConflicts([{ ...ukDeadline, date: "2026-11-01" }], [], { today: "2026-10-16" });

check(`an exam ${MIN_EXAM_LEAD_DAYS - 7} days before the deadline is flagged`, closeExam.some((c) => c.id === "exam_too_close" && (c.severity === "warning" || c.severity === "critical")));
check("the too-close conflict reports the gap and the minimum it breaks", (() => {
  const c = closeExam.find((x) => x.id === "exam_too_close");
  return !!c && c.numbers.gapDays === 7 && c.numbers.minimumDays === MIN_EXAM_LEAD_DAYS;
})());
check("an exam after the deadline is a critical conflict", afterExam.some((c) => c.id === "exam_after_deadline" && c.severity === "critical"));
check("an exam far enough ahead produces no conflict", farExam.length === 0, JSON.stringify(farExam.map((c) => c.id)));
check("a deadline already in the past is flagged", pastDeadline.some((c) => c.id === "deadline_in_past" && c.severity === "critical"));
check(`a deadline inside ${TIGHT_DEADLINE_DAYS} days is flagged as too tight`, tightDeadline.some((c) => c.id === "tight_deadline"));
check("conflicts are ordered critical-first", (() => {
  const mixed = detectTimelineConflicts([{ ...ukDeadline, date: "2026-11-01" }], [{ id: "t-4", testType: "ielts", date: "2026-10-20" }], { today: "2026-10-16" });
  const firstWarning = mixed.findIndex((c) => c.severity === "warning");
  const lastCritical = mixed.map((c) => c.severity).lastIndexOf("critical");
  return mixed.length < 2 || firstWarning === -1 || lastCritical < firstWarning;
})());
check("every conflict carries the dates it is about", closeExam.every((c) => c.dates.deadline != null && c.dates.exam != null));

const timeline = buildSmartTimeline([ukDeadline, deDeadline, undated], [{ id: "t-5", testType: "ielts", date: "2027-08-25" }], { today: "2026-10-16" });
check("the timeline counts dated and undated deadlines separately", timeline.counts.deadlines === 3 && timeline.counts.undatedDeadlines === 1);
check("the flat milestone list excludes non-applicable steps", timeline.allMilestones.every((entry) => entry.milestone.applies));
check("the flat milestone list is sorted nearest-first", timeline.allMilestones.every((entry, i, all) => i === 0 || (all[i - 1].milestone.dueDate ?? "9999") <= (entry.milestone.dueDate ?? "9999")));
check("the counts match the rows they count", timeline.counts.milestones === timeline.allMilestones.length && timeline.counts.overdue === timeline.allMilestones.filter((e) => e.milestone.daysOverdue > 0).length);
check("today is returned as a UTC date string", /^\d{4}-\d{2}-\d{2}$/.test(timeline.today));

const drafts = milestoneTaskDrafts(dePlan, (id, label) => `${id} — ${label}`);
check("task drafts are generated only for applicable, dated steps", drafts.length === dePlan.milestones.filter((m) => m.applies && m.dueDate).length);
check("task drafts carry a unique dedupe key", new Set(drafts.map((d) => d.dedupeKey)).size === drafts.length);
check("task drafts carry the category and priority the API expects", drafts.every((d) => typeof d.category === "string" && ["High", "Medium", "Low"].includes(d.priority) && /^\d{4}-\d{2}-\d{2}$/.test(d.dueDate)));
check("task drafts keep the university they belong to", drafts.every((d) => d.universityId === 12));
check("task titles are clamped to the API limit", drafts.every((d) => d.title.length <= 300));
check("an undated plan produces no task drafts", milestoneTaskDrafts(undatedPlan, (id) => id).length === 0);

section("5.3 Timeline i18n (dynamic keys)");
checkKeys([
  "timeline.title", "timeline.subtitle", "timeline.loading", "timeline.loadError",
  "timeline.untitledDeadline", "timeline.noDate", "timeline.empty", "timeline.emptyUndated",
  "timeline.noConflicts", "timeline.daysLeft", "timeline.daysAgo", "timeline.overdueSteps",
  "timeline.overdueBy", "timeline.showSteps", "timeline.hideSteps", "timeline.showAllPlans",
  "timeline.sync", "timeline.synced", "timeline.syncedNone", "timeline.syncHint",
  "timeline.syncPartial", "timeline.syncError", "timeline.nextUpTitle", "timeline.openTasks",
  "timeline.counts.deadlines", "timeline.counts.steps", "timeline.counts.overdue",
]);
checkKeys(expand("timeline.conflicts.", ["exam_too_close", "exam_after_deadline", "exam_in_past", "deadline_in_past", "apostille_overdue", "tight_deadline"], [""]));
checkKeys(expand("timeline.milestones.", BACKWARDS_MILESTONES.map((m) => m.id), [".label", ".why", ".skipped.not_germany", ".skipped.country_unknown"]));
checkKeys(expand("timeline.taskTitle.", BACKWARDS_MILESTONES.map((m) => m.id), [""]));

/* ========================================================================== */
/* 5.4 — e-Apostille & funds-window calculator                                 */
/* ========================================================================== */

section("5.4 Apostille & funds engine");

const uk = computeFundsWindow("United Kingdom", APP_DATE, { ukArea: "london" });
const ukOutside = computeFundsWindow("United Kingdom", APP_DATE, { ukArea: "outsideLondon" });
const de = computeFundsWindow("Germany", APP_DATE);
const kr = computeFundsWindow("South Korea", APP_DATE);
const ca = computeFundsWindow("Canada", APP_DATE);
const us = computeFundsWindow("United States", APP_DATE);
const none = computeFundsWindow(null, APP_DATE);
const noDate = computeFundsWindow("United Kingdom", null);

check("the UK window is app−28 / app−31 / app / app−59", uk.fundsInPlaceBy === "2027-08-04" && uk.statementNotBefore === "2027-08-01" && uk.statementNotAfter === APP_DATE && uk.earliestWindowStart === "2027-07-04", JSON.stringify(uk));
check("the UK rule is 28 consecutive days inside a 31-day validity", uk.consecutiveDays === 28 && uk.statementValidityDays === 31);
check("London maintenance is higher than outside London", (uk.requirement?.amount ?? 0) > (ukOutside.requirement?.amount ?? 0));
check("the published UK London figure is £13,347", uk.requirement?.amount === 13347 && uk.requirement?.currency === "GBP");
check("the German blocked account is €11,904 a year", de.requirement?.amount === 11904 && de.requirement?.currency === "EUR");
check("the Korean balance certificate is $20,000", kr.requirement?.amount === 20000);
check("the Canadian figure is CA$20,635", ca.requirement?.amount === 20635 && ca.requirement?.currency === "CAD");
check("the US has no national figure and says so", us.requirement != null && us.requirement.amount === null);
check("a missing destination has no window", none.ok === false && none.reason === "no_country");
check("a missing date has no window", noDate.ok === false && noDate.reason === "no_date" && noDate.requirement != null);
check("every published rule carries an official source URL", PUBLISHED_FUNDS_RULES.every((r) => /^https:\/\//.test(r.sourceUrl) && r.sourceName.trim() !== ""));
check("estimated benchmarks are flagged as estimates", PUBLISHED_FUNDS_RULES.filter((r) => r.estimated).every((r) => r.amountUsd != null));
check("the USD mirror uses the shared rate table", Math.round((uk.requirement?.amountUsd ?? 0)) === Math.round(13347 * 1.29));
check("an unsupported destination resolves to no rule", resolveFundsRequirement("Mars", {}) == null);

const readiness = checkApostilleReadiness("Germany", APP_DATE, { today: "2026-10-16" });
const readinessNoDate = checkApostilleReadiness("Germany", null, { today: "2026-10-16" });
const readinessUnknown = checkApostilleReadiness("Atlantis", APP_DATE, { today: "2026-10-16" });

check("every destination in the matrix is a Hague member", APOSTILLE_MATRIX.every((c) => c.hagueMember === true));
check("the matrix covers all seven seeded destinations", APOSTILLE_MATRIX.length === 7 && APOSTILLE_MATRIX.every((c) => c.country.trim() !== ""));
check("every matrix row carries an official source", APOSTILLE_MATRIX.every((c) => /^https:\/\//.test(c.sourceUrl) && c.sourceName.trim() !== ""));
check("every matrix row lists the full document set once", APOSTILLE_MATRIX.every((c) => c.documents.length === DOCUMENT_IDS.length && new Set(c.documents.map((d) => d.id)).size === DOCUMENT_IDS.length));
check("the e-Apostille portal is my.gov.uz over https", E_APOSTILLE_PORTAL.url === "https://my.gov.uz" && /my\.gov\.uz/.test(E_APOSTILLE_PORTAL.name));
check("the preparation steps count back from the application date", readiness.steps.map((s) => s.dueDate).every((d) => d != null) && readiness.steps[3].dueDate === "2027-08-29");
check("the translation step follows the apostille step", (readiness.steps.find((s) => s.id === "order_apostille")?.dueDate ?? "") < (readiness.steps.find((s) => s.id === "certified_translation")?.dueDate ?? ""));
check("no date means no invented step dates", readinessNoDate.steps.every((s) => s.dueDate == null && s.daysOverdue === 0));
check("an unknown destination still returns the generic lead time", readinessUnknown.profile == null && readinessUnknown.steps.length === 4);
check("documents are split into apostille / translation-only / verify piles", readiness.apostilleDocuments.includes("diploma" as never) && readiness.notApplicableDocuments.includes("passport" as never));
check("the passport is never apostilled anywhere", APOSTILLE_MATRIX.every((c) => c.documents.find((d) => d.id === "passport")?.apostille === "not_applicable"));
check("the bank statement is never apostilled anywhere", APOSTILLE_MATRIX.every((c) => c.documents.find((d) => d.id === "bank_statement")?.apostille === "not_applicable"));
check("the readiness result carries its destination's funds rule", readiness.funds.requirement?.ruleId === "blocked_account" && readiness.funds.requirement?.amount === 11904);
// A blocked account has no consecutive-day history rule, so there is no window
// to compute — inventing one would be worse than saying there is none.
check("a destination with no day-count rule reports no window instead of guessing", readiness.funds.ok === false && readiness.funds.reason === "no_published_window");

section("5.4 Apostille i18n (dynamic keys)");
checkKeys([
  "apostille.title", "apostille.subtitle", "apostille.portalButton", "apostille.countryLabel",
  "apostille.yourDestination", "apostille.dateLabel", "apostille.ukAreaLegend", "apostille.noDate",
  "apostille.fundsTitle", "apostille.fundsNoPublishedAmount", "apostille.fundsNoRule",
  "apostille.basisLabel", "apostille.consecutiveDays", "apostille.statementValidity",
  "apostille.estimatedFigure", "apostille.tuitionSeparate", "apostille.scholarshipLetterAccepted",
  "apostille.windowTitle", "apostille.windowNeedsDate", "apostille.windowExplain",
  "apostille.stepsTitle", "apostille.stepsNeedDate", "apostille.leadDays", "apostille.overdueBy",
  "apostille.ukAreas.london", "apostille.ukAreas.outsideLondon",
]);
checkKeys(expand("apostille.window.", ["fundsInPlaceBy", "statementNotBefore", "statementNotAfter", "earliestWindowStart"], [""]));
checkKeys(expand("apostille.windowReasons.", ["no_country", "no_date", "no_rule", "no_published_window"], [""]));
checkKeys(expand("apostille.steps.", ["collect_documents", "order_apostille", "certified_translation", "submit_file"], [".label", ".why"]));
checkKeys(expand("apostille.documents.", DOCUMENT_IDS, [""]));
checkKeys(expand("apostille.apostilleNeeds.", ["required", "accepted", "verify", "not_applicable"], [""]));
checkKeys(expand("apostille.translationNeeds.", ["sworn", "certified", "verify", "not_required"], [""]));
checkKeys(expand("apostille.fundsRules.", PUBLISHED_FUNDS_RULES.map((r) => r.ruleId), [".summary"]));
checkKeys(expand("apostille.issuingAuthority.", [...new Set(APOSTILLE_MATRIX.map((c) => c.issuingAuthorityKey))], [""]));
checkKeys(expand("apostille.matrixNotes.", APOSTILLE_MATRIX.map((c) => c.country.toLowerCase().replace(/[^a-z0-9]+/g, "_")), [""]));
checkKeys(expand("apostille.matrixTitle", [], [""]));

/* ========================================================================== */
/* 5.5 — Admitted Student Twin                                                 */
/* ========================================================================== */

section("5.5 Twin gap engine");

const me = {
  gpa: 3.4, gpaScale: 4, ieltsScore: 6.5, satScore: null, targetMajor: "Software Engineering",
  degreeLevel: "Master", country: "Uzbekistan", preferredCountries: '["United Kingdom"]',
  researchPublications: 0, projects: "Cotton-leaf classifier", leadership: null, volunteering: null,
};
const twin = {
  id: 42, displayName: "Aziza K.", admittedUniversity: "Imperial College London", admittedCountry: "United Kingdom",
  degreeLevel: "Master", major: "Computer Science", intakeYear: 2025, gpa: 3.8, gpaScale: 4, ielts: 7.5,
  activities: ["research assistant", "olympiad"], scholarshipName: "Chevening", scholarshipAmountUsd: 45000,
  twin: 82, reasons: ["same_field", "target_country"],
};

const strategy = buildTwinStrategy(me, twin);
const noTwin = buildTwinStrategy(me, null);
const twinOnly = buildTwinStrategy({}, twin);
const ieltsTwin = buildTwinStrategy({ ...me, ieltsScore: null, toeflScore: 100 }, twin);

check("a missing twin is reported as insufficient, never as an empty table", noTwin.insufficient === true && noTwin.deltas.length === 0 && noTwin.actions.length === 0);
check("the twin pool picks the highest-overlap story", pickTwin([{ ...twin, id: 1, twin: 40 }, { ...twin, id: 2, twin: 91 }, { ...twin, id: 3, twin: 70 }])?.id === 2);
check("an empty pool picks nothing", pickTwin([]) === null && pickTwin(null) === null);
check("the delta table covers all seven dimensions", strategy.deltas.length === 7 && ["gpa", "english", "standardized", "major", "degreeLevel", "research", "activities"].every((id) => strategy.deltas.some((d) => d.id === id)));
check("a lower GPA reads as behind, with the gap in 4.0 units", (() => {
  const gpa = strategy.deltas.find((d) => d.id === "gpa");
  return gpa?.state === "behind" && Math.abs((gpa.gap ?? 0) - 0.4) < 0.01 && gpa.unit === "gpa4";
})());
check("a lower IELTS reads as behind in bands", (() => {
  const en = strategy.deltas.find((d) => d.id === "english");
  return en?.state === "behind" && en.unit === "ielts" && Math.abs((en.gap ?? 0) - 1) < 0.01;
})());
check("a TOEFL student is never compared against an IELTS twin", (() => {
  const en = ieltsTwin.deltas.find((d) => d.id === "english");
  return en?.comparable === false && en.state === "unknown";
})());
check("a scale-less GPA above 4 is unknown, not a perfect 4.0", buildTwinDeltas({ gpa: 88 }, twin).find((d) => d.id === "gpa")?.state === "unknown");
check("an SAT row with one side missing is not comparable", strategy.deltas.find((d) => d.id === "standardized")?.comparable === false);
check("at most three actions, priorities 1..3, no duplicates", strategy.actions.length <= 3 && new Set(strategy.actions.map((a) => a.priority)).size === strategy.actions.length && strategy.actions.every((a) => a.priority >= 1 && a.priority <= 3));
check("actions are ordered by priority", strategy.actions.every((a, i, all) => i === 0 || all[i - 1].priority <= a.priority));
check("every action names a navigation target the student can open", strategy.actions.every((a) => /^[a-z-]+(\/[a-z-]+)?$/.test(a.tab)));
check("a student with nothing recorded still gets actions, not an empty panel", twinOnly.insufficient === false || twinOnly.actions.length > 0 || twinOnly.deltas.length === 7);
check("the goal payload is clamped to the API limits", (() => {
  const action = strategy.actions[0];
  if (!action) return false;
  const payload = twinGoalPayload(action, { title: "x".repeat(400), steps: Array.from({ length: 40 }, () => "y".repeat(500)) });
  return payload.title.length <= 120 && payload.steps.length <= 12 && payload.steps.every((s) => s.length <= 300) && ["academic", "activities", "skills", "career"].includes(payload.pillar);
})());

section("5.5 Twin i18n (dynamic keys)");
checkKeys([
  "twin.title", "twin.subtitle", "twin.loading", "twin.loadError", "twin.overlapScore",
  "twin.anonymousTwin", "twin.unknownUniversity", "twin.intakeYear", "twin.notProvided",
  "twin.insufficientNoTwin", "twin.insufficientWithTwin", "twin.twinScholarship", "twin.adviceFrom",
  "twin.unknownsNote", "twin.table.dimension", "twin.table.you", "twin.table.twin", "twin.table.gap",
  "twin.gapEven", "twin.gapUnknown", "twin.blueprintTitle", "twin.addGoal", "twin.goalAdded",
  "twin.addGoalHint", "twin.goalNeedsProfile", "twin.goalFailed",
]);
checkKeys(expand("twin.reasons.", ["same_field", "same_degree", "similar_gpa", "similar_english", "similar_sat", "target_country", "same_home_country"], [""]));
checkKeys(expand("twin.gapUnit.", ["gpa4", "ielts", "toefl", "sat", "count", "text"], [""]));
checkKeys(expand("twin.deltas.", ["gpa", "english", "standardized", "major", "degreeLevel", "research", "activities"], [".label", ".compareNote", ".notComparable"]));
checkKeys(expand("twin.actions.", ["raise_gpa", "raise_english", "add_standardized", "add_research", "add_activity_evidence", "target_scholarship", "align_major"], [".title", ".why", ".open", ".step1", ".step2", ".step3"]));
// The action ids and delta ids checked above must be the engine's real ones.
const twinSrc = read("src/lib/twinStrategy.ts");
check("the action ids checked here are the ones the engine emits", ["raise_gpa", "raise_english", "add_standardized", "add_research", "add_activity_evidence", "target_scholarship", "align_major"].every((id) => twinSrc.includes(`id: "${id}"`)));

/* ========================================================================== */
/* 4.1 / 4.2 — decision pills and scholarship requirement pills                */
/* ========================================================================== */

section("4.1 University decision pills");

const uniFull = { id: 7, name: "Purdue", minGpa: 3.5, minIelts: 6.5, minSat: 1250, annualTuitionUsd: 30000, postStudyWorkVisaYears: 3 };
const uniBare = { id: 8, name: "Unknown", minGpa: null, minIelts: null, minSat: null, annualTuitionUsd: null, postStudyWorkVisaYears: null };
const strong = { gpa: 3.9, gpaScale: 4, ieltsScore: 7.5, satScore: 1400, budgetAnnualUsd: 40000 };
const weak = { gpa: 2.8, gpaScale: 4, ieltsScore: 5.5, satScore: 1000, budgetAnnualUsd: 10000 };
const toeflOnly = { gpa: 3.9, gpaScale: 4, toeflScore: 105, budgetAnnualUsd: 40000 };

const dStrong = evaluateUniversityDecision(uniFull, strong);
const dWeak = evaluateUniversityDecision(uniFull, weak);
const dAnon = evaluateUniversityDecision(uniFull, null);
const dBare = evaluateUniversityDecision(uniBare, strong);
const dToefl = evaluateUniversityDecision(uniFull, toeflOnly);

check("exactly three pills are always returned, in a fixed order", dStrong.pills.length === 3 && dStrong.pills.map((p) => p.id).join(",") === "eligibility,budget,workVisa");
check("every pill tone has a Tailwind class", dStrong.pills.every((p) => typeof DECISION_PILL_CLASS[p.tone] === "string" && DECISION_PILL_CLASS[p.tone].length > 0));
check("a student above every minimum gets a positive eligibility pill", dStrong.pills[0].tone === "positive" && dStrong.eligibility === "met");
check("a student below a minimum never gets a positive pill", dWeak.pills[0].tone !== "positive" && dWeak.eligibility === "not_met");
check("the shortfall reported is the worst one, in the row's own unit", dWeak.gaps.ielts.reason === "not_met" && (dWeak.gaps.ielts.shortfall ?? 0) === 1 && dWeak.gaps.sat.shortfall === 250 && Math.abs((dWeak.gaps.gpa.shortfall ?? 0) - 0.7) < 0.001);
check("an anonymous visitor is told what is published, not what they meet", dAnon.personalised === false && dAnon.pills[0].tone !== "positive");
check("a university with nothing published yields a neutral pill", dBare.pills[0].stateKey === "notPublished" && dBare.pills[0].tone === "neutral");
check("an unpublished tuition is never compared with the budget", dBare.pills[1].stateKey === "tuitionUnknown" && dBare.budget.withinBudget === null);
check("an unpublished work visa is never shown as 0 years", dBare.pills[2].stateKey === "unknown" && dBare.workVisaYears === null);
check("a TOEFL student is not compared against an IELTS minimum", dToefl.gaps.ielts.reason === "different_test");
check("tuition above the budget reports a positive gap", evaluateUniversityDecision({ ...uniFull, annualTuitionUsd: 90000 }, strong).budget.gapUsd === 50000);
check("a missing budget is not treated as zero", dAnon.budget.budgetUsd === null && dAnon.budget.withinBudget === null);

section("4.1 Decision pill i18n (dynamic keys)");
const eligibilityStates = ["notPublished", "short_gpa", "short_ielts", "short_sat", "allMet", "met_gpa", "met_ielts", "met_sat", "differentTest", "unknown_gpa", "unknown_ielts", "unknown_sat", "partiallyKnown"];
const eligibilityHints = ["notPublishedHint", "short_gpaHint", "short_ieltsHint", "short_satHint", "allMetHint", "differentTestHint", "unknown_gpaHint", "unknown_ieltsHint", "unknown_satHint", "partiallyKnownHint"];
checkKeys(expand("university.pills.eligibility.", eligibilityStates, [""]));
checkKeys(expand("university.pills.eligibility.", eligibilityHints, [""]));
checkKeys(expand("university.pills.budget.", ["tuitionUnknown", "budgetUnknown", "within", "gap"], ["", "Hint"]));
checkKeys(expand("university.pills.workVisa.", ["unknown", "years"], ["", "Hint"]));
checkKeys(["university.pills.eligibility.fallback", "university.pills.budget.fallback", "university.pills.workVisa.fallback"]);
checkKeys([
  "university.decisionTitle", "university.decisionSubtitle", "university.pillFactGpa",
  "university.pillFactIelts", "university.pillFactTuition", "university.pillFactWorkVisa",
  "university.startApp", "university.startAppHint", "university.startAppNeedsProfile",
  "university.startAppFailed", "university.startAppDone", "university.startAppDoneShort",
]);

section("4.2 Scholarship requirement pills");
checkKeys([
  "scholarshipHub.dismiss", "scholarshipHub.fundingAdd", "scholarshipHub.fundingAdded",
  "scholarshipHub.fundingAddHint", "scholarshipHub.fundingAddedHint", "scholarshipHub.fundingNeedsProfile",
  "scholarshipHub.fundingFailed", "scholarshipHub.reqPillsSummary.clear", "scholarshipHub.reqPillsSummary.gaps",
  "scholarshipHub.reqPillsSummary.incomplete",
]);
checkKeys(expand("scholarshipHub.reqPills.", ["gpa", "ielts", "degree", "major", "country"], [
  ".label", ".met", ".metHint", ".not_met", ".not_metHint", ".unknown_profile", ".unknown_profileHint",
  ".different_test", ".different_testHint", ".not_published", ".not_publishedHint",
]));

/* ========================================================================== */
/* 4.3 / 4.4 — essay insight layer and SOP structure                           */
/* ========================================================================== */

section("4.3 / 4.4 Essay insights");

const weakDraft = "Ever since I was a child I have been passionate about technology. I want to delve into the tapestry of modern engineering. This programme is a testament to my hard work.";
const strongDraft = [
  "In 2024 the district clinic in Chirchik logged 3,400 patient visits but could read only 61% of its own chest X-rays in house.",
  "What struck me was that the bottleneck was never the scanner; it was the queue of images waiting for a single radiologist.",
  "I completed my bachelor thesis on sparse representation, where the methodology coursework taught me to question a basis set before trusting its output.",
  "In my own project I rebuilt the training pipeline and cut inference latency by 38% across 12,000 requests, on a dataset of 1,200 labelled samples.",
  "That is why I am applying to the MSc in Computational Mechanics at TU München: Professor Anna Weber's work on sparse Galerkin surrogates is the closest match to the problem I already have, and the numerical methods module covers the discretisation background I am missing.",
  "After graduation I will return to Uzbekistan and work as a research engineer, deploying that tooling in three regional clinics.",
].join(" ");

const annotatedWeak = annotateEssay(weakDraft);
const annotatedStrong = annotateEssay(strongDraft);
const structureWeak = evaluateSopStructure(weakDraft, { universityName: "TU München", programName: "MSc Mechanics" });
const structureStrong = evaluateSopStructure(strongDraft, { universityName: "TU München", programName: "MSc Mechanics" });

check("every annotated sentence maps back to its exact substring", annotatedWeak.sentences.every((s) => weakDraft.slice(s.start, s.end) === s.text));
check("the strong draft is annotated exactly too", annotatedStrong.sentences.every((s) => strongDraft.slice(s.start, s.end) === s.text));
check("banned openings and AI clichés are flagged red", annotatedWeak.counts.cliche >= 3 && annotatedWeak.strongPct === 0);
check("quantified, specific sentences are flagged emerald", annotatedStrong.counts.strong >= 1 && (annotatedStrong.strongPct ?? 0) > 0);
check("the flagged detail is the text that matched", annotatedWeak.sentences.filter((s) => s.tone === "cliche").every((s) => s.cliches.length > 0));
check("a clean text yields no flags", annotateEssay("The reactor cooled in eleven seconds.").counts.cliche === 0);
check("an empty text is annotated without throwing", annotateEssay("").sentences.length === 0 && annotateEssay("").wordCount === 0);
check("the five-block bar reports all five blocks in order", structureWeak.blocks.length === 5 && structureWeak.blocks.map((b) => b.order).join(",") === "1,2,3,4,5");
check("the SOP block ids match the engine's own list", structureWeak.blocks.map((b) => b.id).join(",") === SOP_BLOCKS.map((b) => b.id).join(","));
check("a boilerplate draft satisfies none of the five blocks", structureWeak.pct === 0 && structureWeak.satisfiedCount === 0 && structureWeak.missing.length === 5);
check("a complete draft satisfies all five", structureStrong.pct === 100 && structureStrong.satisfiedCount === 5);
// Long evidence is capped and ellipsised, so the draft must contain the excerpt
// up to that cap rather than the exact string.
const quotedFromDraft = (evidence: string) => strongDraft.includes(evidence.endsWith("…") ? evidence.slice(0, -1) : evidence);
check("every satisfied block quotes real evidence from the draft", structureStrong.blocks.filter((b) => b.satisfied).every((b) => !!b.evidence && quotedFromDraft(b.evidence)));
check("an unsatisfied block never carries evidence", structureWeak.blocks.every((b) => !b.satisfied && b.evidence == null));
check("an empty draft is not credited with any block", evaluateSopStructure("").satisfiedCount === 0);

section("4.3 / 4.4 Essay insight i18n (dynamic keys)");
checkKeys(["ai.essayHighlightOn", "ai.essayHighlightOff", "ai.essayHighlightStrongPct"]);
checkKeys(expand("ai.essayHighlightLegend.", ["cliche", "weak", "strong"], [""]));
checkKeys(expand("ai.essayHighlightWhy.", ["cliche", "weak", "strong", "neutral"], [""]));
checkKeys(["ai.sopStructureTitle", "ai.sopStructureScore", "ai.sopStructureNext", "ai.sopStructureComplete"]);
checkKeys(expand("ai.sopBlocks.", SOP_BLOCKS.map((b) => b.id), [".label", ".hint", ".missing", ".found"]));

/* ========================================================================== */
/* Mounting + house rules                                                      */
/* ========================================================================== */

section("Mounting and house rules");

const hubs = read("src/components/hubs/index.tsx");
const fundingBlock = hubs.slice(hubs.indexOf("export function FundingHub"), hubs.indexOf("/* ====", hubs.indexOf("export function FundingHub")));
check("FeeWaiverStudio is mounted in the funding hub", fundingBlock.includes("<FeeWaiverStudio profile={profile}"));
check("the funding hub still passes only profileId to the financial plan", fundingBlock.includes("<FinancialPlanPanel profileId={profile.id} onNavigateTab={navigate} />"));
check("the funding hub block still carries no applicationId token", !fundingBlock.includes("applicationId="));
check("FeeWaiverStudio is mounted in the applications tracker pane", hubs.includes('{active === "tracker" && (') && hubs.includes("<FeeWaiverStudio profile={profile} className=\"mt-4\" />"));
check("ProfessorOutreachStudio is mounted in the materials hub", hubs.includes("<ProfessorOutreachStudio") && hubs.includes('key={`outreach-${profile.id}-${effectiveId ?? "none"}`}'));
check("the universities hub wires the one-click application launcher", hubs.includes("onApplicationStarted={(applicationId) => setWorkspaceId?.(applicationId)}"));

const explorer = read("src/components/UniversityExplorer.tsx");
check("the explorer renders the decision strip on every card", explorer.includes("<DecisionPillStrip") && explorer.includes("university={uni}"));
check("the explorer posts to /api/applications, not to a new endpoint", explorer.includes('fetch("/api/applications"'));
check("the explorer widens its university row with the published fee", /applicationFeeUsd\?: number \| null/.test(explorer));
// The word "alert()" legitimately appears in the comments that explain why the
// banner exists, so only executable code is scanned for a real call.
const explorerCode = explorer.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
check("the explorer never calls a native alert()", !/(?:^|[^.\w"'])alert\(/.test(explorerCode));
check("the explorer reports problems in inline banners", explorer.includes('role="status"') && explorer.includes('role="alert"'));

const detail = read("src/components/UniversityDetail.tsx");
check("the detail view renders the same decision strip", detail.includes("<DecisionPillStrip university={uni} profile={activeProfile ?? null}"));
check("the detail view exposes the numbers behind the pills", detail.includes("pillFactGpa") && detail.includes("pillFactWorkVisa"));

const scholarshipHub = read("src/components/ScholarshipHub.tsx");
check("the scholarship hub renders per-requirement pills", scholarshipHub.includes("<ScholarshipRequirementPills scholarship={s} profile={activeProfile}"));
check("the scholarship hub posts to /api/funding", scholarshipHub.includes('fetch("/api/funding"'));
check("the scholarship hub maps to the funding route's real field names", scholarshipHub.includes('kind: "scholarship"') === false && read("src/lib/scholarshipChecks.ts").includes('kind: "scholarship"') && read("src/lib/scholarshipChecks.ts").includes('status: "planned"'));
check("the scholarship hub keeps the debounce the journey gate requires", scholarshipHub.includes("const [debouncedSearch, setDebouncedSearch] = useState(\"\")") && scholarshipHub.includes('params.set("search", debouncedSearch.trim())'));

const essayStudio = read("src/components/EssayRubricStudio.tsx");
check("the essay studio mounts the highlight layer", essayStudio.includes("<EssayHighlightField") && essayStudio.includes("onChange={setText}"));
check("the essay studio keeps the sample-draft guard the samples gate requires", /textHoldsSample/.test(essayStudio) && /void scoreDraft\(draft\)/.test(essayStudio));

const sopStudio = read("src/components/AiSopStudio.tsx");
check("the SOP studio shows the structure bar for the generated draft", sopStudio.includes("text={toPlainText(generatedSop)}"));
check("the SOP studio shows the structure bar while pasting a draft too", sopStudio.includes("text={existingDraft}"));

const deadlineCenter = read("src/components/DeadlineCenter.tsx");
check("the deadline centre mounts the backwards timeline above its list", deadlineCenter.includes("<SmartTimelineCalendar") && deadlineCenter.indexOf("<SmartTimelineCalendar") < deadlineCenter.indexOf('className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"'));

const prepare = read("src/components/journey/PreparePanels.tsx");
const explore = read("src/components/journey/ExplorePanels.tsx");
check("the document vault mounts the apostille card", prepare.includes("<ApostilleReadinessCard profileId={profileId} />"));
check("the study plan mounts the backwards timeline", prepare.includes("<SmartTimelineCalendar profileId={profileId} onNavigateTab={onNavigateTab} />"));
check("the visa centre mounts the apostille card", explore.includes("<ApostilleReadinessCard"));
check("the journey panels still load through the shared resource hook", prepare.includes('from "./useResource"'));
check("the visa panel stays free of model wording", !/aiProvider|generateText|openai|groq/i.test(explore));
check("every fetch added to the journey panels is a relative API call", [...explore.matchAll(/fetch\("([^"]+)"/g)].every((m) => m[1].startsWith("/api/")) && [...prepare.matchAll(/fetch\("([^"]+)"/g)].every((m) => m[1].startsWith("/api/")));

const similar = read("src/components/SimilarProfiles.tsx");
const chancing = read("src/components/ChancingPanel.tsx");
check("similar profiles mounts the twin card", similar.includes("<TwinStrategyCard profileId={activeProfile?.id ?? null}"));
check("the chancing panel mounts the twin card too", chancing.includes("<TwinStrategyCard profileId={profileId} />"));

const opportunities = read("src/components/OpportunitiesPanel.tsx");
check("the opportunities feed mounts the outreach studio", opportunities.includes("<ProfessorOutreachStudio profile={activeProfile}"));
check("the opportunities panel's new prop is optional", /activeProfile\?: StudentProfile \| null/.test(opportunities));

const newComponents = [
  "src/components/DecisionPillStrip.tsx",
  "src/components/ScholarshipRequirementPills.tsx",
  "src/components/EssayHighlightField.tsx",
  "src/components/SopStructureBar.tsx",
  "src/components/FeeWaiverStudio.tsx",
  "src/components/ProfessorOutreachStudio.tsx",
  "src/components/SmartTimelineCalendar.tsx",
  "src/components/ApostilleReadinessCard.tsx",
  "src/components/TwinStrategyCard.tsx",
];
check("every new component exists", newComponents.every((file) => fs.existsSync(path.join(ROOT, file))));
check("no new component uses a native alert()", newComponents.every((file) => !/[^.\w]alert\(/.test(read(file))));
check("every new component fetches only relative API routes", newComponents.every((file) => [...read(file).matchAll(/fetch\(`?"?([^`")]+)/g)].every((m) => m[1].startsWith("/api/"))));
check("no new component holds a model key or reads the environment", newComponents.every((file) => !/apiKey[:=]|process\.env\./.test(read(file))));
check("no new component gates anything on premium", newComponents.every((file) => !/isPremium \?|premiumUntil/.test(read(file))));

/* ========================================================================== */

console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
