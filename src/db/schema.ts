import { pgTable, serial, text, integer, bigint, doublePrecision, boolean, timestamp, date, numeric, index, unique, uniqueIndex, foreignKey, check, AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const studentProfiles = pgTable("student_profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  // Sign up / sign in: scrypt hash of the account password (never plain text).
  // NULL for legacy profiles until a password is set (or ADMIN_PASSWORD seeds
  // one for the admin account).
  passwordHash: text("password_hash"),
  // NULL = the student has not said yet. The app must never invent academic
  // data (spec §19): a default of "Master"/"Computer Science" made every
  // recommendation look personalised for a profile the student never filled in.
  degreeLevel: text("degree_level"),
  targetMajor: text("target_major"),
  // Structured, locale-independent selections from the study-interest picker.
  // Nullable for existing profiles and callers that still only send targetMajor.
  studyInterests: text("study_interests"),
  // Academic + financial values are NULL until the student enters them. The
  // old column defaults (3.5 GPA, IELTS 7.0, SAT 1350, $25 000 budget, a
  // fabricated activity list) were indistinguishable from real answers, so
  // every score, match and recommendation silently used them.
  gpa: doublePrecision("gpa"),
  gpaScale: doublePrecision("gpa_scale"),
  ieltsScore: doublePrecision("ielts_score"),
  toeflScore: integer("toefl_score"),
  satScore: integer("sat_score"),
  greScore: integer("gre_score"),
  budgetAnnualUsd: integer("budget_annual_usd"),
  preferredCountries: text("preferred_countries"),
  needScholarship: boolean("need_scholarship").notNull().default(false),
  extracurriculars: text("extracurriculars"),
  workExperienceYears: integer("work_experience_years"),
  researchPublications: integer("research_publications").default(0),
  preferredLocale: text("preferred_locale").notNull().default("en"),
  isAdmin: boolean("is_admin").notNull().default(false),
  // --- Referral system ---
  referralCode: text("referral_code").unique(),
  referredBy: integer("referred_by").references((): AnyPgColumn => studentProfiles.id, { onDelete: "set null" }),
  referralPoints: integer("referral_points").notNull().default(0),
  referralRewarded: boolean("referral_rewarded").notNull().default(false),
  // --- Referral-gifted premium (stackable 30-day grants) ---
  isPremium: boolean("is_premium").notNull().default(false),
  premiumUntil: timestamp("premium_until"),
  // --- Parent dashboard access (supabase/add_mentors_parent.sql) ---
  // The student grants this; it is read-only and never exposes the password,
  // essays or private messages.
  parentShareEnabled: boolean("parent_share_enabled").notNull().default(false),
  parentShareEmail: text("parent_share_email"),
  parentShareToken: text("parent_share_token"),
  parentShareCreatedAt: timestamp("parent_share_created_at"),
  // --- Complete profile (supabase/add_profile_chancing_applications.sql) ---
  // Everything here is NULL until the student fills it in — the app must never
  // invent academic data (spec §19).
  // Academic
  actScore: integer("act_score"),
  duolingoScore: integer("duolingo_score"),
  apCourses: text("ap_courses"), // JSON array
  ibCourses: text("ib_courses"), // JSON array
  aLevelSubjects: text("a_level_subjects"), // JSON array
  courseworkNotes: text("coursework_notes"),
  // Personal
  country: text("country"),
  age: integer("age"),
  graduationYear: integer("graduation_year"),
  // Financial
  familyIncomeUsd: integer("family_income_usd"),
  needsFinancialAid: boolean("needs_financial_aid"),
  requiresFullScholarship: boolean("requires_full_scholarship"),
  // Extracurriculars (structured JSON arrays)
  leadership: text("leadership"),
  volunteering: text("volunteering"),
  sports: text("sports"),
  clubs: text("clubs"),
  researchExperience: text("research_experience"),
  projects: text("projects"),
  // Achievements
  olympiads: text("olympiads"),
  awards: text("awards"),
  competitions: text("competitions"),
  certificates: text("certificates"),
  // Goals
  targetUniversities: text("target_universities"),
  careerGoal: text("career_goal"),
  // Anonymous outcomes dataset consent
  dataShareConsent: boolean("data_share_consent").notNull().default(false),
  dataShareConsentAt: timestamp("data_share_consent_at"),
  // --- Onboarding wizard progress ---
  onboardingStep: integer("onboarding_step").notNull().default(0),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const universities = pgTable("universities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  city: text("city"),
  flagEmoji: text("flag_emoji").notNull().default("🌐"),
  // Legacy summary field. Detailed rankings live in university_rankings.
  worldRanking: integer("world_ranking"),
  degreeLevel: text("degree_level").notNull().default("All"), // legacy summary; prefer programs.degree_level
  programMajor: text("program_major"), // legacy summary; detailed subjects live in programs
  canonicalName: text("canonical_name"),
  shortName: text("short_name"),
  countryCode: text("country_code"),
  qsRankYear: integer("qs_rank_year"),
  dataSource: text("data_source"),
  // --- Financial (NULL = not verified, spec §14) ---
  // Legacy USD columns (kept — DO NOT drop)
  annualTuitionUsd: integer("annual_tuition_usd"),
  annualLivingEstUsd: integer("annual_living_est_usd"),
  accommodationCostUsd: integer("accommodation_cost_usd"),
  // Generic currency columns (source of truth, mirror `programs` pattern)
  annualTuition: numeric("annual_tuition").$type<number>(),
  tuitionCurrency: text("tuition_currency").notNull().default("USD"),
  tuitionPeriod: text("tuition_period").notNull().default("year"),
  annualLivingEst: numeric("annual_living_est").$type<number>(),
  livingCostCurrency: text("living_cost_currency").notNull().default("USD"),
  livingCostPeriod: text("living_cost_period").notNull().default("year"),
  accommodationCost: numeric("accommodation_cost").$type<number>(),
  accommodationCostCurrency: text("accommodation_cost_currency").notNull().default("USD"),
  accommodationCostPeriod: text("accommodation_cost_period").notNull().default("year"),
  applicationFee: integer("application_fee"),
  applicationFeeCurrency: text("application_fee_currency").notNull().default("USD"),
  // --- Academic requirements (NULL = not officially specified) ---
  minGpa: doublePrecision("min_gpa"),
  minIelts: doublePrecision("min_ielts"),
  minSat: integer("min_sat"),
  acceptanceRate: doublePrecision("acceptance_rate"),
  postStudyWorkVisaYears: doublePrecision("post_study_work_visa_years"),
  // --- Institutional info (confirmed present in Supabase) ---
  foundedYear: integer("founded_year"),
  universityType: text("university_type"),
  address: text("address"),
  internationalStudentsCount: integer("international_students_count"),
  internationalStudentsPercentage: doublePrecision("international_students_percentage"),
  // --- Links ---
  officialWebsiteUrl: text("official_website_url"),
  admissionsUrl: text("admissions_url"),
  internationalAdmissionsUrl: text("international_admissions_url"),
  undergraduateAdmissionsUrl: text("undergraduate_admissions_url"),
  applicationUrl: text("application_url"),
  description: text("description").notNull(),
  highlights: text("highlights").notNull().default("[]"),
  websiteUrl: text("website_url").notNull(),
  imageUrl: text("image_url"),
  // --- Source verification (spec §8) ---
  sourceUrl: text("source_url"),
  lastVerifiedAt: timestamp("last_verified_at"),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  sourceReliability: integer("source_reliability").notNull().default(7),
  isActive: boolean("is_active").notNull().default(true),
}, (table) => [
  uniqueIndex("uq_universities_canonical_name_ci")
    .on(sql`lower(btrim(${table.canonicalName}))`)
    .where(sql`${table.canonicalName} is not null and btrim(${table.canonicalName}) <> ''`),
]);

export const scholarships = pgTable("scholarships", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  provider: text("provider").notNull(),
  country: text("country").notNull(),
  coverageType: text("coverage_type").notNull().default("Unspecified"),
  // Legacy USD-only value; NULL means no fixed USD amount is published.
  amountUsdValue: integer("amount_usd_value"),
  awardAmount: numeric("award_amount").$type<number>(),
  awardCurrency: text("award_currency"),
  awardPeriod: text("award_period"), // total | year | month | one_time | variable
  awardBasis: text("award_basis"), // fixed | range | full_tuition | need_based | variable
  deadline: text("deadline"),
  degreeLevels: text("degree_levels").notNull().default("[]"), // empty means eligibility is not specified
  eligibleMajors: text("eligible_majors").notNull().default("[]"), // empty means eligibility is not specified
  minGpa: doublePrecision("min_gpa"),
  minIelts: doublePrecision("min_ielts"),
  financialNeedBased: boolean("financial_need_based").default(false),
  meritBased: boolean("merit_based").default(true),
  description: text("description").notNull(),
  requirements: text("requirements").notNull(),
  websiteUrl: text("website_url").notNull(),
  // NULL means a global award not tied to one university.
  universityId: integer("university_id").references(() => universities.id, { onDelete: "set null" }),
  // --- Dynamic lifecycle (spec §4) ---
  eligibleCountries: text("eligible_countries").default("[]"),
  fundingType: text("funding_type").default(""),
  tuitionCoverage: text("tuition_coverage").default(""),
  livingAllowance: integer("living_allowance"),
  travelAllowance: integer("travel_allowance"),
  accommodation: text("accommodation").default(""),
  applicationFee: integer("application_fee"),
  englishRequirements: text("english_requirements").default(""),
  requiredDocuments: text("required_documents").default("[]"),
  applicationUrl: text("application_url"),
  // --- Dates & recurrence (spec §4, §7) ---
  openingDate: date("opening_date"),
  deadlineDate: date("deadline_date"),
  deadlineType: text("deadline_type").notNull().default("unknown"),
  deadlineRangeStart: date("deadline_range_start"),
  deadlineRangeEnd: date("deadline_range_end"),
  rounds: text("rounds").default("[]"),
  recurrence: text("recurrence").notNull().default("none"),
  expectedOpeningPeriod: text("expected_opening_period"),
  expectedDeadlinePeriod: text("expected_deadline_period"),
  applicationStatus: text("application_status").notNull().default("unknown"),
  // --- Verification (spec §8, §11) ---
  lastVerifiedAt: timestamp("last_verified_at"),
  lastUpdatedAt: timestamp("last_updated_at"),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  sourceReliability: integer("source_reliability").notNull().default(7),
  sourceUrl: text("source_url"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
}, (table) => [index("idx_scholarships_university").on(table.universityId)]);

export const savedUniversities = pgTable("saved_universities", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  universityId: integer("university_id").references(() => universities.id, { onDelete: "cascade" }).notNull(),
  matchCategory: text("match_category").notNull().default("Match"),
  matchScore: integer("match_score").notNull().default(85),
  status: text("status").notNull().default("Shortlisted"),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("uq_saved_universities_profile_university").on(table.profileId, table.universityId)]);

export const savedPrograms = pgTable("saved_programs", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  programId: integer("program_id").references(() => universityPrograms.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("uq_saved_programs_profile_program").on(table.profileId, table.programId)]);

export const savedScholarships = pgTable("saved_scholarships", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  scholarshipId: integer("scholarship_id").references(() => scholarships.id, { onDelete: "cascade" }).notNull(),
  status: text("status").notNull().default("Saved"),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("uq_saved_scholarships_profile_scholarship").on(table.profileId, table.scholarshipId)]);

export const applicationTasks = pgTable("application_tasks", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  universityId: integer("university_id").references(() => universities.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  category: text("category").notNull().default("Document Prep"),
  dueDate: text("due_date").notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  priority: text("priority").notNull().default("Medium"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiEvaluations = pgTable("ai_evaluations", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  evaluationType: text("evaluation_type").notNull().default("Profile Analysis"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


// ---------------------------------------------------------------------------
// 1. FORUM / COMMUNITY
// ---------------------------------------------------------------------------
export const forumCategories = pgTable("forum_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const forumThreads = pgTable("forum_threads", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => forumCategories.id, { onDelete: "cascade" }).notNull(),
  authorId: integer("author_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  isLocked: boolean("is_locked").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const forumReplies = pgTable("forum_replies", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").references(() => forumThreads.id, { onDelete: "cascade" }).notNull(),
  authorId: integer("author_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  parentReplyId: integer("parent_reply_id").references((): AnyPgColumn => forumReplies.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const forumLikes = pgTable("forum_likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const forumReports = pgTable("forum_reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// ---------------------------------------------------------------------------
// 2. VIDEO COURSES / LESSONS / QUIZZES / CERTIFICATES
// ---------------------------------------------------------------------------
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  instructorName: text("instructor_name").notNull().default("ScholarBridge Academy"),
  level: text("level").notNull().default("Beginner"),
  thumbnailUrl: text("thumbnail_url").notNull().default(""),
  isPublished: boolean("is_published").notNull().default(true),
  // --- Video platform expansion (spec §26) ---
  categoryId: integer("category_id").references((): AnyPgColumn => courseCategories.id, { onDelete: "set null" }),
  instructorId: integer("instructor_id").references((): AnyPgColumn => instructors.id, { onDelete: "set null" }),
  studentExperience: text("student_experience").notNull().default(""),
  durationTotalSeconds: integer("duration_total_seconds").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const courseModules = pgTable("course_modules", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").references(() => courseModules.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  videoUrl: text("video_url").notNull(),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  content: text("content").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const lessonProgress = pgTable("lesson_progress", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  lessonId: integer("lesson_id").references(() => lessons.id, { onDelete: "cascade" }).notNull(),
  watchedSeconds: integer("watched_seconds").notNull().default(0),
  isCompleted: boolean("is_completed").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").references(() => lessons.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull().default("Lesson Quiz"),
  passThreshold: integer("pass_threshold").notNull().default(70),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").references(() => quizzes.id, { onDelete: "cascade" }).notNull(),
  question: text("question").notNull(),
  options: text("options").notNull().default("[]"),
  correctOptionIndex: integer("correct_option_index").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").references(() => quizzes.id, { onDelete: "cascade" }).notNull(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  score: integer("score").notNull().default(0),
  answers: text("answers").notNull().default("[]"),
  passed: boolean("passed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const certificates = pgTable("certificates", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  courseId: integer("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
  certificateCode: text("certificate_code").notNull().unique(),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 3. PAYMENTS (Payme + Click) & SUBSCRIPTIONS
// ---------------------------------------------------------------------------
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "set null" }),
  provider: text("provider").notNull(),
  providerTransactionId: text("provider_transaction_id").notNull().default(""),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull().default("UZS"),
  status: text("status").notNull().default("pending"),
  purpose: text("purpose").notNull().default("subscription"),
  relatedEntityId: integer("related_entity_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  plan: text("plan").notNull().default("premium"),
  status: text("status").notNull().default("active"),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  paymentId: integer("payment_id").references(() => payments.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 4. REFERRALS & GAMIFICATION
// ---------------------------------------------------------------------------
export const userPoints = pgTable("user_points", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull().unique(),
  totalPoints: integer("total_points").notNull().default(0),
  currentLevel: integer("current_level").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pointsLedger = pgTable("points_ledger", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  relatedEntityId: integer("related_entity_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const levels = pgTable("levels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  minPoints: integer("min_points").notNull().default(0),
  iconUrl: text("icon_url").notNull().default("🏅"),
});

export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  iconUrl: text("icon_url").notNull().default("🎖️"),
  criteria: text("criteria").notNull().default("points"),
});

export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  badgeId: integer("badge_id").references(() => badges.id, { onDelete: "cascade" }).notNull(),
  awardedAt: timestamp("awarded_at").defaultNow().notNull(),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerProfileId: integer("referrer_profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  referredProfileId: integer("referred_profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }),
  referralCode: text("referral_code").notNull().unique(),
  status: text("status").notNull().default("pending"),
  pointsAwarded: integer("points_awarded").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 5. DATA INTEGRITY & OPERATIONS (spec §5, §9, §10, §11)
// ---------------------------------------------------------------------------

/** Key-value app configuration (prices, limits, schedules, feature mapping). */
export const appConfig = pgTable("app_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * AI provider credentials managed from the admin panel (spec §12, §16).
 * API keys are stored ENCRYPTED (AES-256-GCM, "enc:v1:" prefix) — the raw key
 * is only ever decrypted server-side for the duration of a request and is
 * never returned by any API. `model` overrides the provider's default model.
 */
export const aiProviderCredentials = pgTable("ai_provider_credentials", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull().unique(), // openrouter | openai | anthropic | groq
  apiKeyEnc: text("api_key_enc"), // encrypted payload, never plaintext
  model: text("model"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Audit / change history for scholarships & universities (spec §11). */
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // university | scholarship
  entityId: integer("entity_id").notNull(),
  fieldChanged: text("field_changed").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  source: text("source"),
  actor: text("actor").notNull().default("ADMIN"), // ADMIN | AUTOMATED_SYSTEM | AI | EXTERNAL_SOURCE
  verificationStatus: text("verification_status").notNull().default("unverified"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Scheduled/manual refresh jobs (spec §9). */
export const refreshJobs = pgTable("refresh_jobs", {
  id: serial("id").primaryKey(),
  jobType: text("job_type").notNull(), // scholarship | university | all
  status: text("status").notNull().default("pending"), // pending | running | success | failed
  trigger: text("trigger").notNull().default("manual"), // manual | scheduled | cron
  itemsProcessed: integer("items_processed").notNull().default(0),
  itemsChanged: integer("items_changed").notNull().default(0),
  error: text("error"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 6. NOTIFICATIONS (spec §20)
// ---------------------------------------------------------------------------
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // scholarship_opened | deadline_approaching | deadline_changed | milestone_due | ai_limit | payment_event | ...
  title: text("title").notNull(),
  body: text("body").notNull(),
  link: text("link"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull().unique(),
  inApp: boolean("in_app").notNull().default(true),
  email: boolean("email").notNull().default(false),
  push: boolean("push").notNull().default(false),
  types: text("types").notNull().default("[\"scholarship_opened\",\"deadline_approaching\",\"deadline_changed\",\"milestone_due\",\"requirement_gap\",\"essay_improved\"]"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 7. AI USAGE & COST CONTROL (spec §16)
// ---------------------------------------------------------------------------
export const aiUsage = pgTable("ai_usage", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "set null" }),
  taskType: text("task_type").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  costEstimate: doublePrecision("cost_estimate").notNull().default(0),
  status: text("status").notNull().default("success"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // The daily AI quota counts one profile's requests in the last 24 hours on
  // every AI call — without this index that is a full scan of ai_usage.
  index("idx_ai_usage_profile_created").on(table.profileId, table.createdAt),
]);

// ---------------------------------------------------------------------------
// 8. APPLICATION DOCUMENTS (spec §24)
// ---------------------------------------------------------------------------
export const applicationDocuments = pgTable("application_documents", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  entityType: text("entity_type").notNull(), // university | scholarship | general
  entityId: integer("entity_id"),
  documentType: text("document_type").notNull(), // passport | transcript | diploma | recommendation | statement | cv | test_score | financial | portfolio | custom
  label: text("label").notNull(),
  isRequired: boolean("is_required").notNull().default(false),
  status: text("status").notNull().default("missing"), // missing | uploaded | not_required
  fileUrl: text("file_url"),
  deadlineDate: date("deadline_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // --- Document checker (supabase/add_documents_essays.sql) ---
  /** Passports, IELTS/TOEFL results and bank letters expire — the checker needs the date. */
  expiresAt: date("expires_at"),
  fileName: text("file_name"),
  fileSizeBytes: integer("file_size_bytes"),
  uploadedAt: timestamp("uploaded_at"),
});

/**
 * Essay versions (Phase 2, item #8).
 *
 * Every draft is kept so the student can see what changed between version 2 and
 * version 5, and so a rubric score can be compared over time. The rubric fields
 * are COMPUTED by src/lib/essay.ts — the model writes `aiFeedback`, never the
 * numbers.
 */
export const essayVersions = pgTable(
  "essay_versions",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    universityId: integer("university_id").references(() => universities.id, { onDelete: "set null" }),
    essayType: text("essay_type").notNull().default("sop"), // sop | personal_statement | why_us | supplemental | scholarship
    title: text("title").notNull().default(""),
    content: text("content").notNull().default(""),
    wordCount: integer("word_count").notNull().default(0),
    charCount: integer("char_count").notNull().default(0),
    versionNumber: integer("version_number").notNull().default(1),
    rubricHook: integer("rubric_hook"),
    rubricStructure: integer("rubric_structure"),
    rubricSpecificity: integer("rubric_specificity"),
    rubricLanguage: integer("rubric_language"),
    rubricFit: integer("rubric_fit"),
    rubricTotal: integer("rubric_total"),
    aiFeedback: text("ai_feedback"),
    // #24 Peer review — the author explicitly opens a version for other
    // students to review; closed by default, never inferred.
    openForReview: boolean("open_for_review").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_essay_versions_profile").on(table.profileId),
    index("idx_essay_versions_profile_type").on(table.profileId, table.essayType, table.versionNumber),
  ]
);

// ---------------------------------------------------------------------------
// 9. EDUCATIONAL VIDEO PLATFORM (spec §26)
// ---------------------------------------------------------------------------

/** Course instructors (real students who share their experience). */
export const instructors = pgTable("instructors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  bio: text("bio").notNull().default(""),
  photoUrl: text("photo_url"),
  university: text("university"),
  program: text("program"),
  country: text("country"),
  scholarshipName: text("scholarship_name"),
  isVerifiedStudent: boolean("is_verified_student").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Course categories. */
export const courseCategories = pgTable("course_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Course progress history for certificates (spec §26). */
export const courseEnrollments = pgTable("course_enrollments", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  courseId: integer("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
  progressPct: integer("progress_pct").notNull().default(0),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 10. CONSULTING (spec §27)
// ---------------------------------------------------------------------------
export const consultingRequests = pgTable("consulting_requests", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  topic: text("topic").notNull(),
  message: text("message").notNull().default(""),
  preferredContact: text("preferred_contact").notNull().default(""),
  status: text("status").notNull().default("new"), // new | in_review | scheduled | completed | declined
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 11. UNIVERSITY DISCOVERY — RELATED TABLES (spec §15)
// ---------------------------------------------------------------------------

/** Programs offered at a university. */
/**
 * Programs — mapped to the EXISTING database table `programs`
 * (the database is the source of truth; no rename, no view).
 */
export const universityPrograms = pgTable("programs", {
  id: serial("id").primaryKey(),
  universityId: integer("university_id").references(() => universities.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  field: text("field"), // Computer Science, AI, Business...
  degree: text("degree_level"), // DB column name (Bachelor's | Master's | PhD)
  durationYears: numeric("duration").$type<number>(), // DB column `duration numeric`
  durationUnit: text("duration_unit").notNull().default("years"),
  studyMode: text("study_mode"), // full-time | part-time | online
  language: text("language"),
  tuitionAmount: numeric("annual_tuition").$type<number>(), // DB column `annual_tuition numeric`
  tuitionCurrency: text("tuition_currency").notNull().default("USD"),
  tuitionPeriod: text("tuition_period").notNull().default("year"),
  description: text("description"),
  programUrl: text("official_url"), // DB column name
  applicationUrl: text("application_url"),
  isVerified: boolean("is_verified").notNull().default(false),
  sourceUrl: text("source_url"),
  lastVerifiedAt: timestamp("last_verified_at"),
  isActive: boolean("is_active").notNull().default(true),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_programs_university").on(table.universityId),
  uniqueIndex("uq_programs_university_name_degree").on(
    table.universityId,
    sql`lower(btrim(${table.name}))`,
    sql`lower(btrim(coalesce(${table.degree}, '')))`
  ),
  // A UNIQUE CONSTRAINT, not a unique index: the composite FK
  // application_cycles(program_id, university_id) → programs(id, university_id)
  // must be creatable by `drizzle-kit push` on a FRESH database, and drizzle
  // adds that FK before it creates standalone indexes. A constraint declared
  // in the table definition is created atomically with `programs`, so the FK
  // always has its matching key. (full_schema.sql uses the same constraint.)
  unique("uq_programs_id_university").on(table.id, table.universityId),
]);

/** Program-level academic requirements. */
/**
 * Program requirements — mapped to the EXISTING wide-column layout of the
 * database (`min_ielts`, `min_gpa`, ...). The API normalizes these into
 * requirementType rows for the frontend. No verification flags are invented:
 * `verification_status` and `source_url` come straight from the DB.
 */
export const programRequirements = pgTable("program_requirements", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => universityPrograms.id, { onDelete: "cascade" }).notNull(),
  minIelts: doublePrecision("min_ielts"),
  minToefl: doublePrecision("min_toefl"),
  minDet: doublePrecision("min_det"),
  minSat: integer("min_sat"),
  minAct: integer("min_act"),
  minGpa: doublePrecision("min_gpa"),
  ibRequirement: text("ib_requirement"),
  aLevelRequirement: text("a_level_requirement"),
  apRequirement: text("ap_requirement"),
  subjectRequirements: text("subject_requirements"),
  portfolioRequired: boolean("portfolio_required").notNull().default(false),
  interviewRequired: boolean("interview_required").notNull().default(false),
  recommendationRequired: boolean("recommendation_required").notNull().default(false),
  personalStatementRequired: boolean("personal_statement_required").notNull().default(false),
  otherRequirements: text("other_requirements"),
  academicYear: text("academic_year"),
  sourceUrl: text("source_url"),
  lastVerifiedAt: timestamp("last_verified_at"),
  verificationStatus: text("verification_status").notNull().default("unverified"),
}, (table) => [
  index("idx_program_requirements_program").on(table.programId),
  uniqueIndex("uq_program_requirements_program_year")
    .on(table.programId, table.academicYear)
    .where(sql`${table.academicYear} is not null`),
]);

/** Application cycles / deadlines (multiple rounds, exact or estimated). */
/**
 * Application cycles — mapped to the EXISTING database layout.
 * The DB has no `cycle_year`; the API derives a display year from
 * `academic_year` ("2027-2028" -> 2027) or leaves it null — never guessed.
 */
export const applicationCycles = pgTable("application_cycles", {
  id: serial("id").primaryKey(),
  universityId: integer("university_id").references(() => universities.id, { onDelete: "cascade" }).notNull(),
  programId: integer("program_id"),
  academicYear: text("academic_year"), // e.g. "2027-2028"
  intake: text("intake"), // Fall | Spring | Summer | Winter
  applicationType: text("application_type"), // Early Action | Early Decision | Regular Decision | International Undergraduate | Transfer | Direct Application
  openingDate: date("opening_date"),
  deadline: date("deadline"),
  deadlineTimezone: text("deadline_timezone"),
  applicationFee: numeric("application_fee").$type<number>(),
  applicationFeeCurrency: text("application_fee_currency").notNull().default("USD"),
  applicationUrl: text("application_url"),
  sourceUrl: text("source_url"),
  sourceId: integer("source_id").references((): AnyPgColumn => sources.id, { onDelete: "set null" }),
  lastVerifiedAt: timestamp("last_verified_at"),
  verificationStatus: text("verification_status").notNull().default("unverified"),
}, (table) => [
  index("idx_application_cycles_university_year").on(table.universityId, table.academicYear),
  index("idx_application_cycles_program").on(table.programId),
  foreignKey({
    name: "application_cycles_program_university_fkey",
    columns: [table.programId, table.universityId],
    foreignColumns: [universityPrograms.id, universityPrograms.universityId],
  }).onDelete("cascade"),
]);

/** Verified sources for a university (spec §13). */
/** University→source links — mapped to existing DB layout (id, university_id, source_id, source_type). */
export const universitySources = pgTable("university_sources", {
  id: serial("id").primaryKey(),
  universityId: integer("university_id").references(() => universities.id, { onDelete: "cascade" }).notNull(),
  sourceId: integer("source_id").references((): AnyPgColumn => sources.id, { onDelete: "set null" }),
  sourceType: text("source_type").notNull().default("university_evidence"),
});

// ---------------------------------------------------------------------------
// 12. SOURCES & SOURCE LINKS (spec §6, §7, §9, §10)
// ---------------------------------------------------------------------------

/** Verified sources (official university pages, QS, etc.). */
export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  domain: text("domain"),
  sourceType: text("source_type").notNull().default("unclassified"),
  accessedAt: timestamp("accessed_at"),
  isOfficial: boolean("is_official").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("uq_sources_url").on(table.url)]);

/** One row per institution, ranking publisher, ranking edition, and year. */
export const universityRankings = pgTable("university_rankings", {
  id: serial("id").primaryKey(),
  universityId: integer("university_id").references(() => universities.id, { onDelete: "cascade" }).notNull(),
  rankingProvider: text("ranking_provider").notNull(), // QS | THE | ARWU | U.S. News
  rankingName: text("ranking_name").notNull(),
  rankingYear: integer("ranking_year").notNull(),
  rank: integer("rank"), // NULL for unranked; never encode as zero
  rankLabel: text("rank_label"), // e.g. "=101" or "201-250" where source uses bands
  score: numeric("score").$type<number>(),
  sourceId: integer("source_id").references(() => sources.id, { onDelete: "set null" }),
  verifiedAt: timestamp("verified_at"),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uq_university_ranking_edition")
    .on(table.universityId, table.rankingProvider, table.rankingName, table.rankingYear),
  index("idx_university_rankings_year_rank").on(table.rankingYear, table.rank),
]);

/** Program → source links. */
export const programSources = pgTable("program_sources", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => universityPrograms.id, { onDelete: "cascade" }).notNull(),
  sourceId: integer("source_id").references(() => sources.id, { onDelete: "set null" }),
  sourceType: text("source_type").notNull().default("program_evidence"), // program | admission_requirement | tuition | application evidence
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Scholarship → source links. */
export const scholarshipSources = pgTable("scholarship_sources", {
  id: serial("id").primaryKey(),
  scholarshipId: integer("scholarship_id").references(() => scholarships.id, { onDelete: "cascade" }).notNull(),
  sourceId: integer("source_id").references(() => sources.id, { onDelete: "set null" }),
  sourceType: text("source_type").notNull().default("scholarship_evidence"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 13. SITE ANALYTICS — anonymous traffic tracking (Admin → Analytics)
// ---------------------------------------------------------------------------

/**
 * One row per tracked event: a page view, an in-app screen (tab) view or a
 * signup. Visitors are identified by an anonymous first-party cookie
 * (`sb_vid`) — no personal data is collected for guests, and `profile_id`
 * is only filled when the visitor is signed in.
 *
 * ADDITIVE TABLE: it is created with `CREATE TABLE IF NOT EXISTS` by
 * `src/lib/visits.ts` (and can also be created manually with
 * `supabase/add_analytics.sql`). No existing table is ever altered or
 * dropped — if the table cannot be created, tracking silently disables
 * itself and the rest of the app keeps working.
 */
export const siteVisits = pgTable(
  "site_visits",
  {
    id: serial("id").primaryKey(),
    visitorId: text("visitor_id").notNull().default(""),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull().default("page_view"), // page_view | screen_view | signup
    path: text("path").notNull().default("/"),
    screen: text("screen"), // in-app section: dashboard | universities | admin | ...
    referrer: text("referrer"), // normalized source domain ("direct", "google.com", ...)
    userAgent: text("user_agent"),
    device: text("device").notNull().default("desktop"), // desktop | mobile | tablet | bot
    locale: text("locale"),
    country: text("country"), // only when the host provides a geo header
    isFirstVisit: boolean("is_first_visit").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("site_visits_created_at_idx").on(table.createdAt),
    index("site_visits_visitor_id_idx").on(table.visitorId),
    index("site_visits_event_type_created_at_idx").on(table.eventType, table.createdAt),
  ]
);


/**
 * Universal application tracker (supabase/add_profile_chancing_applications.sql).
 *
 * One row per (student, university/program, round). Status walks the real
 * application lifecycle so the roadmap, deadline calendar and analytics all
 * read from the same source of truth.
 */
export const applications = pgTable(
  "applications",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    universityId: integer("university_id").references(() => universities.id, { onDelete: "set null" }),
    universityName: text("university_name").notNull().default(""),
    programName: text("program_name"),
    applicationRound: text("application_round"), // ED | EA | RD | Rolling | Winter | Summer
    intakeTerm: text("intake_term"), // Fall 2027 | Spring 2027
    deadline: date("deadline"),
    status: text("status").notNull().default("not_started"),
    submittedAt: timestamp("submitted_at"),
    applicationFeePaid: boolean("application_fee_paid").notNull().default(false),
    feeAmount: integer("fee_amount"),
    portalUrl: text("portal_url"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_applications_profile").on(table.profileId),
    index("idx_applications_university").on(table.universityId),
    index("idx_applications_deadline").on(table.deadline),
  ]
);

/**
 * Application outcomes — ScholarBridge's OWN admissions dataset.
 *
 * Every result is stored, rejections included: a model trained only on
 * acceptances learns "every strong student gets in". Rows with
 * `shareConsent = true` may be used (anonymously) to improve the chancing
 * engine; rows without consent are never used outside the owner's account.
 */
export const applicationOutcomes = pgTable(
  "application_outcomes",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id").references(() => applications.id, { onDelete: "cascade" }).notNull(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    universityId: integer("university_id").references(() => universities.id, { onDelete: "set null" }),
    result: text("result").notNull(), // accepted | rejected | waitlisted | deferred | withdrawn
    decidedAt: date("decided_at"),
    scholarshipAmountUsd: integer("scholarship_amount_usd"),
    scholarshipName: text("scholarship_name"),
    notes: text("notes"),
    // Profile snapshot at decision time — the training row for the model.
    snapshotGpa: doublePrecision("snapshot_gpa"),
    snapshotGpaScale: doublePrecision("snapshot_gpa_scale"),
    snapshotIelts: doublePrecision("snapshot_ielts"),
    snapshotToefl: integer("snapshot_toefl"),
    snapshotSat: integer("snapshot_sat"),
    snapshotAct: integer("snapshot_act"),
    snapshotMajor: text("snapshot_major"),
    snapshotCountry: text("snapshot_country"),
    snapshotExtracurriculars: text("snapshot_extracurriculars"),
    shareConsent: boolean("share_consent").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_outcomes_application").on(table.applicationId),
    index("idx_outcomes_profile").on(table.profileId),
    index("idx_outcomes_university_result").on(table.universityId, table.result),
    index("idx_outcomes_consent").on(table.shareConsent),
  ]
);

/** IELTS / SAT / TOEFL / Duolingo test dates for the unified calendar. */
export const testBookings = pgTable(
  "test_bookings",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    testType: text("test_type").notNull(), // ielts | toefl | sat | act | duolingo | gre
    testDate: date("test_date").notNull(),
    location: text("location"),
    registered: boolean("registered").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_test_bookings_profile").on(table.profileId),
    index("idx_test_bookings_date").on(table.testDate),
  ]
);

/**
 * Mentors (Phase 4 — mentor marketplace).
 *
 * Distinct from `instructors`, who teach courses. A mentor is someone who has
 * already walked the exact path the student is planning: same country, same
 * university, often the same scholarship. That lived path is the thing a
 * rules engine cannot produce.
 */
export const mentors = pgTable(
  "mentors",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "set null" }),
    displayName: text("display_name").notNull(),
    headline: text("headline").notNull().default(""),
    bio: text("bio").notNull().default(""),
    photoUrl: text("photo_url"),
    country: text("country"),
    city: text("city"),
    university: text("university"),
    program: text("program"),
    degreeLevel: text("degree_level"),
    scholarshipName: text("scholarship_name"),
    expertise: text("expertise").notNull().default("[]"), // JSON array
    languages: text("languages").notNull().default("[]"), // JSON array
    hourlyRateUsd: integer("hourly_rate_usd"),
    freeSessions: boolean("free_sessions").notNull().default(false),
    isVerified: boolean("is_verified").notNull().default(false),
    verificationNote: text("verification_note"),
    isActive: boolean("is_active").notNull().default(true),
    ratingAverage: doublePrecision("rating_average"),
    ratingCount: integer("rating_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_mentors_active").on(table.isActive, table.isVerified),
    index("idx_mentors_country").on(table.country),
  ]
);

/** Mentor contact requests. */
export const mentorRequests = pgTable(
  "mentor_requests",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    mentorId: integer("mentor_id").references(() => mentors.id, { onDelete: "cascade" }).notNull(),
    topic: text("topic").notNull(),
    message: text("message").notNull().default(""),
    status: text("status").notNull().default("pending"), // pending | accepted | declined | completed | cancelled
    scheduledAt: timestamp("scheduled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_mentor_requests_profile").on(table.profileId),
    index("idx_mentor_requests_mentor").on(table.mentorId, table.status),
  ]
);

// ---------------------------------------------------------------------------
// #26/#27/#28 — Personalized opportunities: competitions, research,
// internships, summer schools. A curated, admin-managed catalog — the
// platform never scrapes third-party lists.
// ---------------------------------------------------------------------------

export const opportunities = pgTable(
  "opportunities",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull().default("competition"), // competition | research | internship | summer_school
    title: text("title").notNull(),
    provider: text("provider").notNull().default(""),
    country: text("country"), // null = international
    fields: text("fields").notNull().default('["All"]'), // JSON list, e.g. ["Computer Science"]
    level: text("level").notNull().default("any"), // high_school | undergrad | grad | phd | any
    deadlineDate: date("deadline_date"), // null = recurring/unknown — never guessed
    url: text("url").notNull().default(""),
    description: text("description").notNull().default(""),
    isVerified: boolean("is_verified").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_opportunities_type").on(table.type),
    index("idx_opportunities_deadline").on(table.deadlineDate),
  ]
);

// #24 — Peer review of essays the author opened for review.
export const essayReviews = pgTable(
  "essay_reviews",
  {
    id: serial("id").primaryKey(),
    essayVersionId: integer("essay_version_id").references(() => essayVersions.id, { onDelete: "cascade" }).notNull(),
    authorProfileId: integer("author_profile_id").notNull(),
    reviewerProfileId: integer("reviewer_profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    hook: integer("hook"),
    structure: integer("structure"),
    specificity: integer("specificity"),
    language: integer("language"),
    fit: integer("fit"),
    total: integer("total"),
    comment: text("comment").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_essay_reviews_version").on(table.essayVersionId),
    index("idx_essay_reviews_reviewer").on(table.reviewerProfileId),
  ]
);

// ---------------------------------------------------------------------------
// Growth features (supabase/add_growth_features.sql). Ideas taken from
// AdmitYogi/AdmitSee (success stories), ScholarshipOwl (scholarship autopilot,
// reusable answers), Crimson (goal planner) and ApplyBoard (departure
// checklist) — adapted, not copied. Every catalogue here is admin-managed.
// The same DDL runs lazily from `src/lib/growth/db.ts` so a deploy never
// needs a manual migration first.
// ---------------------------------------------------------------------------

/** Admitted-student stories: user-submitted, admin-moderated. */
export const successStories = pgTable(
  "success_stories",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "set null" }),
    displayName: text("display_name").notNull().default("Anonymous"),
    homeCountry: text("home_country"),
    admittedUniversity: text("admitted_university").notNull(),
    admittedCountry: text("admitted_country"),
    otherAdmits: text("other_admits").notNull().default("[]"), // JSON list of names
    degreeLevel: text("degree_level"),
    major: text("major"),
    intakeYear: integer("intake_year"),
    gpa: doublePrecision("gpa"),
    gpaScale: doublePrecision("gpa_scale"),
    ielts: doublePrecision("ielts"),
    toefl: integer("toefl"),
    sat: integer("sat"),
    activities: text("activities").notNull().default("[]"), // JSON list
    awards: text("awards").notNull().default("[]"), // JSON list
    essayTitle: text("essay_title"),
    essayExcerpt: text("essay_excerpt"),
    advice: text("advice"),
    scholarshipName: text("scholarship_name"),
    scholarshipAmountUsd: integer("scholarship_amount_usd"),
    status: text("status").notNull().default("pending"), // pending | approved | rejected
    isVerified: boolean("is_verified").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    adminNote: text("admin_note"),
    views: integer("views").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_success_stories_status").on(table.status),
    index("idx_success_stories_profile").on(table.profileId),
  ]
);

/** Admin library of goals students can adopt (Academic / Activities / Skills / Career). */
export const goalTemplates = pgTable("goal_templates", {
  id: serial("id").primaryKey(),
  pillar: text("pillar").notNull().default("academic"), // academic | activities | skills | career
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  steps: text("steps").notNull().default("[]"), // JSON list of step strings
  level: text("level").notNull().default("any"), // any | high_school | undergrad | grad
  estWeeks: integer("est_weeks"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** A student's adopted (or custom) goal with its own step progress. */
export const studentGoals = pgTable(
  "student_goals",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    templateId: integer("template_id").references(() => goalTemplates.id, { onDelete: "set null" }),
    pillar: text("pillar").notNull().default("academic"),
    title: text("title").notNull(),
    steps: text("steps").notNull().default("[]"), // JSON [{ text, done }]
    status: text("status").notNull().default("active"), // active | done
    targetDate: date("target_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_student_goals_profile").on(table.profileId)]
);

/** Admin-managed common application questions ("write once, reuse everywhere"). */
export const answerPrompts = pgTable("answer_prompts", {
  id: serial("id").primaryKey(),
  category: text("category").notNull().default("general"), // general | motivation | career | leadership | challenge | community
  question: text("question").notNull(),
  hint: text("hint").notNull().default(""),
  wordLimit: integer("word_limit"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** The student's saved answer to one prompt. */
export const answerVault = pgTable(
  "answer_vault",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    promptId: integer("prompt_id").references(() => answerPrompts.id, { onDelete: "cascade" }).notNull(),
    answer: text("answer").notNull().default(""),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("uq_answer_vault_profile_prompt").on(table.profileId, table.promptId)]
);

/** Scholarship autopilot decisions: hidden ("not for me") or applied. */
export const scholarshipDecisions = pgTable(
  "scholarship_decisions",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    scholarshipId: integer("scholarship_id").references(() => scholarships.id, { onDelete: "cascade" }).notNull(),
    status: text("status").notNull(), // hidden | applied
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("uq_scholarship_decisions_profile_sch").on(table.profileId, table.scholarshipId)]
);

/** Admin-managed "after the offer" checklist items, grouped by phase. */
export const checklistItems = pgTable("checklist_items", {
  id: serial("id").primaryKey(),
  phase: text("phase").notNull().default("offer"), // offer | visa | money | housing | travel | arrival
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  linkTab: text("link_tab"), // optional in-app section id
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Which checklist items a student has ticked. */
export const studentChecklist = pgTable(
  "student_checklist",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    itemId: integer("item_id").references(() => checklistItems.id, { onDelete: "cascade" }).notNull(),
    doneAt: timestamp("done_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("uq_student_checklist_profile_item").on(table.profileId, table.itemId)]
);

// ---------------------------------------------------------------------------
// TELEGRAM BOT — sign-in codes + notification delivery
// (supabase/add_telegram.sql; created lazily by src/lib/telegram/db.ts)
// ---------------------------------------------------------------------------

/** One Telegram chat linked to one ScholarBridge account. */
export const telegramLinks = pgTable("telegram_links", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull().unique(),
  // Telegram ids can exceed 32 bits — stored as text.
  telegramUserId: text("telegram_user_id").notNull().unique(),
  chatId: text("chat_id").notNull(),
  username: text("username"),
  firstName: text("first_name"),
  languageCode: text("language_code"),
  notifyEnabled: boolean("notify_enabled").notNull().default(true),
  mutedTypes: text("muted_types").notNull().default("[]"), // JSON array of notification types
  blocked: boolean("blocked").notNull().default(false), // user blocked the bot
  linkedAt: timestamp("linked_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
  lastMessageAt: timestamp("last_message_at"),
  // Bot paging: the last search the user ran ({ kind, q, page }) so compact
  // callback buttons (`pg:u:2`) never have to carry the query text.
  lastQuery: text("last_query"),
  // JSON array of reminder offsets in days (null → DEFAULT_REMINDER_DAYS).
  reminderDays: text("reminder_days"),
});

/**
 * A sign-in (or "connect Telegram") attempt. The browser keeps a secret
 * nonce; Telegram only ever sees the public start token. The 6-digit code the
 * bot sends is valid only together with that nonce, so codes cannot be
 * guessed across other people's attempts.
 */
export const telegramLoginRequests = pgTable("telegram_login_requests", {
  id: serial("id").primaryKey(),
  startToken: text("start_token").notNull().unique(),
  nonceHash: text("nonce_hash").notNull(),
  purpose: text("purpose").notNull().default("login"), // login | link
  profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }), // link: who asked
  status: text("status").notNull().default("pending"), // pending | code_sent | used | failed | locked
  failReason: text("fail_reason"),
  telegramUserId: text("telegram_user_id"),
  chatId: text("chat_id"),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  languageCode: text("language_code"),
  codeHash: text("code_hash"),
  codeExpiresAt: timestamp("code_expires_at"),
  codesSent: integer("codes_sent").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  ip: text("ip"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

/** Delivery log for the admin panel (codes are never stored). */
export const telegramMessages = pgTable(
  "telegram_messages",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "set null" }),
    chatId: text("chat_id"),
    kind: text("kind").notNull(), // code | notification | broadcast | test | login_alert | reply
    type: text("type"),
    preview: text("preview"),
    status: text("status").notNull(), // sent | failed
    error: text("error"),
    // Failed notification deliveries keep what is needed to retry them.
    retryPayload: text("retry_payload"),
    attempts: integer("attempts").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_telegram_messages_created").on(table.createdAt)]
);

/**
 * Processed webhook update ids — Telegram re-delivers an update when a
 * response is slow, so the id is claimed with INSERT … ON CONFLICT before any
 * work happens (works across server instances and restarts). Pruned by the
 * reminder sweep after 7 days.
 */
export const telegramUpdates = pgTable(
  "telegram_updates",
  {
    updateId: bigint("update_id", { mode: "number" }).primaryKey(),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
  },
  (table) => [index("idx_telegram_updates_received").on(table.receivedAt)]
);

/**
 * Platform ownership (singleton, id = 1) — who owns this ScholarBridge
 * instance inside the app. Separate from infrastructure/third-party accounts
 * (hosting, Supabase, BotFather, AI providers), which the app cannot move.
 * Mirrors src/lib/ownership/ddl.ts (applied lazily) and
 * supabase/add_ownership.sql.
 */
export const platformOwnership = pgTable(
  "platform_ownership",
  {
    id: integer("id").primaryKey().default(1),
    ownerProfileId: integer("owner_profile_id").references(() => studentProfiles.id, { onDelete: "restrict" }).notNull(),
    source: text("source").notNull().default("bootstrap"), // bootstrap | transfer
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [check("platform_ownership_id_check", sql`${table.id} = 1`)]
);

/** Ownership transfer requests + history (see src/lib/ownership/state.ts). */
export const ownershipTransfers = pgTable(
  "ownership_transfers",
  {
    id: serial("id").primaryKey(),
    fromProfileId: integer("from_profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    toProfileId: integer("to_profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    status: text("status").notNull().default("pending"), // pending | accepted | completed | rejected | expired | cancelled
    retainPreviousAdmin: boolean("retain_previous_admin").notNull().default(true),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    decidedAt: timestamp("decided_at"),
    decidedBy: integer("decided_by").references(() => studentProfiles.id, { onDelete: "set null" }),
  },
  (table) => [
    uniqueIndex("ownership_transfers_one_open").on(sql`(true)`).where(sql`status IN ('pending', 'accepted')`),
    index("ownership_transfers_to_idx").on(table.toProfileId, table.status),
    check("ownership_transfers_status_check", sql`${table.status} IN ('pending', 'accepted', 'completed', 'rejected', 'expired', 'cancelled')`),
    check("ownership_transfers_check", sql`${table.fromProfileId} <> ${table.toProfileId}`),
  ]
);

// ===========================================================================
// JOURNEY CORE (reorganization, 2026-09-29)
// ---------------------------------------------------------------------------
// Adds the missing pieces of the end-to-end journey — study plan, document
// vault, test planner, activity portfolio, requirements engine, offers &
// funding, the central deadline table and the generic external-learning
// provider contract.
//
// EVERYTHING IS ADDITIVE. No existing table above is altered or dropped, and
// none of the tables here duplicate `student_profiles`, `universities`,
// `scholarships`, `applications` or `notifications` — they extend them.
// The lazy DDL that creates them lives in `src/lib/journey/ddl.ts`
// (mirrored in `supabase/add_journey_core.sql`).
// ===========================================================================

/** My Study Plan (spec §12) — a dated, phase-based plan for one goal. */
export const studyPlans = pgTable(
  "study_plans",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    title: text("title").notNull(),
    targetMajor: text("target_major"),
    targetCountry: text("target_country"),
    degreeLevel: text("degree_level"),
    intakeTerm: text("intake_term"),
    goalYear: integer("goal_year"),
    fundingGoal: text("funding_goal"),
    status: text("status").notNull().default("active"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_study_plans_profile").on(table.profileId)]
);

/** The ten phases of a study plan (spec §12). */
export const studyPlanPhases = pgTable(
  "study_plan_phases",
  {
    id: serial("id").primaryKey(),
    planId: integer("plan_id").references(() => studyPlans.id, { onDelete: "cascade" }).notNull(),
    phaseKey: text("phase_key").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("pending"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_study_plan_phases_plan").on(table.planId),
    uniqueIndex("uq_study_plan_phases_key").on(table.planId, table.phaseKey),
  ]
);

/**
 * Document Vault (spec §7) — one upload, reused by every application.
 * `application_document_links` attaches these rows to `applications`, and the
 * pre-existing per-application `application_documents` checklist is untouched.
 */
export const userDocuments = pgTable(
  "user_documents",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    docType: text("doc_type").notNull(), // passport | transcript | ielts | toefl | sat | cv | award | certificate | recommendation | financial | other
    title: text("title").notNull(),
    fileName: text("file_name"),
    fileUrl: text("file_url"),
    fileSizeBytes: integer("file_size_bytes"),
    mimeType: text("mime_type"),
    issuedAt: date("issued_at"),
    expiresAt: date("expires_at"),
    status: text("status").notNull().default("uploaded"), // uploaded | verified | needs_update | expired | rejected
    verificationNote: text("verification_note"),
    verifiedAt: timestamp("verified_at"),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_user_documents_profile").on(table.profileId),
    index("idx_user_documents_expiry").on(table.profileId, table.expiresAt),
  ]
);

/** Which applications use which vault document (spec §7). */
export const applicationDocumentLinks = pgTable(
  "application_document_links",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id").references(() => applications.id, { onDelete: "cascade" }).notNull(),
    documentId: integer("document_id").references(() => userDocuments.id, { onDelete: "cascade" }).notNull(),
    usage: text("usage").notNull().default("required"), // required | optional | submitted
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("uq_app_doc_link").on(table.applicationId, table.documentId)]
);

/** Test Planner (spec §8) — current / target score and dates per test. */
export const testPlans = pgTable(
  "test_plans",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    testType: text("test_type").notNull(), // ielts | toefl | duolingo | sat | act | ap | other
    currentScore: doublePrecision("current_score"),
    targetScore: doublePrecision("target_score"),
    targetDate: date("target_date"),
    nextTestDate: date("next_test_date"),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_test_plans_profile").on(table.profileId)]
);

/** Previous attempts of a test (spec §8). */
export const testAttempts = pgTable(
  "test_attempts",
  {
    id: serial("id").primaryKey(),
    testPlanId: integer("test_plan_id").references(() => testPlans.id, { onDelete: "cascade" }).notNull(),
    testDate: date("test_date").notNull(),
    score: doublePrecision("score"),
    resultLabel: text("result_label"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_test_attempts_plan").on(table.testPlanId)]
);

/** Generated practice tasks for a test plan (spec §8). */
export const testTasks = pgTable(
  "test_tasks",
  {
    id: serial("id").primaryKey(),
    testPlanId: integer("test_plan_id").references(() => testPlans.id, { onDelete: "cascade" }).notNull(),
    title: text("title").notNull(),
    skill: text("skill").notNull().default("general"),
    dueDate: date("due_date"),
    isCompleted: boolean("is_completed").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_test_tasks_plan").on(table.testPlanId)]
);

/**
 * Activity Portfolio (spec §14). Student-entered only — the app must never
 * invent an activity, an achievement or a date (spec §14, §18).
 */
export const studentActivities = pgTable(
  "student_activities",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    category: text("category").notNull(), // volunteering | leadership | competition | project | club | research | work | community | sport | creative
    title: text("title").notNull(),
    role: text("role"),
    organization: text("organization"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    hours: integer("hours"),
    description: text("description"),
    achievements: text("achievements"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_student_activities_profile").on(table.profileId)]
);

/** Evidence attached to an activity (certificate / photo / URL / document). */
export const activityEvidence = pgTable(
  "activity_evidence",
  {
    id: serial("id").primaryKey(),
    activityId: integer("activity_id").references(() => studentActivities.id, { onDelete: "cascade" }).notNull(),
    evidenceType: text("evidence_type").notNull(), // certificate | photo | url | document
    label: text("label").notNull(),
    url: text("url"),
    documentId: integer("document_id").references(() => userDocuments.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_activity_evidence_activity").on(table.activityId)]
);

/**
 * Requirement templates (spec §5) — university / program level catalogue.
 * ADMIN-PUBLISHED ONLY. `verification_status` + `source_*` ride on every row
 * so the UI can print "Source · Last verified" next to the requirement, and an
 * unverified row renders as "Not specified" instead of as a fact.
 */
export const requirementTemplates = pgTable(
  "requirement_templates",
  {
    id: serial("id").primaryKey(),
    universityId: integer("university_id").references(() => universities.id, { onDelete: "cascade" }),
    programId: integer("program_id").references(() => universityPrograms.id, { onDelete: "cascade" }),
    section: text("section").notNull(), // academic | english | testing | documents | essays | finance | application
    itemKey: text("item_key").notNull(),
    title: text("title").notNull(),
    instructions: text("instructions"),
    isRequired: boolean("is_required").notNull().default(true),
    sourceUrl: text("source_url"),
    sourceName: text("source_name"),
    sourceType: text("source_type"),
    lastVerifiedAt: timestamp("last_verified_at"),
    verificationStatus: text("verification_status").notNull().default("unverified"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_requirement_templates_uni").on(table.universityId),
    index("idx_requirement_templates_program").on(table.programId),
  ]
);

/**
 * Application requirements (spec §5/§6) — the live, per-application
 * checklist. Seeded from `requirement_templates` and editable by the student;
 * every row keeps its own source + last-verified date.
 */
export const applicationRequirements = pgTable(
  "application_requirements",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id").references(() => applications.id, { onDelete: "cascade" }).notNull(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    section: text("section").notNull(),
    itemKey: text("item_key").notNull(),
    title: text("title").notNull(),
    instructions: text("instructions"),
    isRequired: boolean("is_required").notNull().default(true),
    status: text("status").notNull().default("todo"), // todo | in_progress | done | blocked | not_required
    dueDate: date("due_date"),
    sourceUrl: text("source_url"),
    sourceName: text("source_name"),
    sourceType: text("source_type"),
    lastVerifiedAt: timestamp("last_verified_at"),
    verificationStatus: text("verification_status").notNull().default("unverified"),
    /** What completes this row: document | essay | recommendation | test | payment | manual */
    linkedType: text("linked_type"),
    linkedId: integer("linked_id"),
    completedAt: timestamp("completed_at"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_app_requirements_application").on(table.applicationId),
    uniqueIndex("uq_app_requirements_key").on(table.applicationId, table.itemKey),
  ]
);

/** Recommendation manager (spec §19). */
export const recommendationRequests = pgTable(
  "recommendation_requests",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id").references(() => applications.id, { onDelete: "cascade" }).notNull(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    recommenderName: text("recommender_name").notNull(),
    recommenderEmail: text("recommender_email"),
    relationship: text("relationship"),
    status: text("status").notNull().default("not_requested"), // not_requested | requested | opened | submitted
    requestedAt: timestamp("requested_at"),
    submittedAt: timestamp("submitted_at"),
    dueDate: date("due_date"),
    instructions: text("instructions"),
    isPrivate: boolean("is_private").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_rec_requests_application").on(table.applicationId)]
);

/** Offers & Decisions (spec §23) — the post-acceptance record. */
export const admissionOffers = pgTable(
  "admission_offers",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id").references(() => applications.id, { onDelete: "cascade" }).notNull(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    status: text("status").notNull().default("pending"), // pending | accepted | rejected | waitlisted | deferred
    decidedAt: date("decided_at"),
    responseDeadline: date("response_deadline"),
    offerLetterUrl: text("offer_letter_url"),
    offerLetterName: text("offer_letter_name"),
    conditions: text("conditions"),
    depositAmount: integer("deposit_amount"),
    depositDueDate: date("deposit_due_date"),
    tuitionCommitment: integer("tuition_commitment"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("uq_admission_offer_application").on(table.applicationId)]
);

/** My Funding Plan (spec §9/§24) — scholarship, aid, family budget, loans. */
export const fundingItems = pgTable(
  "funding_items",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    applicationId: integer("application_id").references(() => applications.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // scholarship | aid | family | savings | loan | other
    name: text("name").notNull(),
    amountUsd: integer("amount_usd").notNull().default(0),
    covers: text("covers").notNull().default("[]"),
    status: text("status").notNull().default("planned"), // planned | applied | awarded | declined | confirmed
    confirmedAt: date("confirmed_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_funding_items_profile").on(table.profileId)]
);

/** Central deadline engine (spec §21) — one timeline for every deadline. */
export const journeyDeadlines = pgTable(
  "journey_deadlines",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    kind: text("kind").notNull(), // university | scholarship | test | document | visa | other
    title: text("title").notNull(),
    dueDate: date("due_date").notNull(),
    entityType: text("entity_type"),
    entityId: integer("entity_id"),
    isAutoGenerated: boolean("is_auto_generated").notNull().default(false),
    isCompleted: boolean("is_completed").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_journey_deadlines_profile").on(table.profileId, table.dueDate)]
);

/**
 * External Learning Provider (spec §32) — a GENERIC registry.
 *
 * No provider is hardcoded, no partner is named, and the table ships EMPTY.
 * ScholarBridge behaves identically when there are zero rows. A future partner
 * is added by an admin here, not by a code change.
 */
export const learningProviders = pgTable(
  "learning_providers",
  {
    id: serial("id").primaryKey(),
    providerKey: text("provider_key").notNull().unique(),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("test_prep"),
    status: text("status").notNull().default("disabled"), // disabled | sandbox | live
    config: text("config").notNull().default("{}"),
    isEnabled: boolean("is_enabled").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

/** A student's (optional) link to one external learning provider. */
export const learningProviderLinks = pgTable(
  "learning_provider_links",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    providerId: integer("provider_id").references(() => learningProviders.id, { onDelete: "cascade" }).notNull(),
    externalUserRef: text("external_user_ref"),
    status: text("status").notNull().default("not_connected"),
    consentAt: timestamp("consent_at"),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("uq_learning_link").on(table.profileId, table.providerId)]
);

/**
 * Metrics an external provider MAY share. Metric keys are a fixed vocabulary so
 * no partner can invent an arbitrary field: current_score, target_score,
 * practice_progress, mock_score, course_completion, study_task_completed.
 */
export const learningProviderScores = pgTable(
  "learning_provider_scores",
  {
    id: serial("id").primaryKey(),
    linkId: integer("link_id").references(() => learningProviderLinks.id, { onDelete: "cascade" }).notNull(),
    metric: text("metric").notNull(),
    value: doublePrecision("value"),
    measuredAt: date("measured_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_learning_scores_link").on(table.linkId)]
);

/**
 * Visa requirements (spec §25) — country × visa type, admin-published.
 * Never written by AI: a visa requirement without a source is shown as
 * "Not specified", and the AI is explicitly forbidden from inventing one.
 */
/**
 * Shared rate-limit hits (audit A20).
 *
 * The in-memory limiter in lib/rate-limit.ts is correct for ONE process, but a
 * deployment with several instances (or a redeploy mid-window) would hand out
 * one fresh budget per instance. Sensitive budgets — sign-in, sign-up, AI
 * spend, payments, Telegram login, admin writes — are instead counted here:
 * one row per hit, counted per key over the sliding window.
 *
 * Rows are pruned opportunistically by lib/rate-limit-shared.ts; the table
 * stays small (a day of traffic, at most a few hundred thousand rows).
 */
export const rateLimitHits = pgTable(
  "rate_limit_hits",
  {
    key: text("key").notNull(),
    hitAt: timestamp("hit_at").notNull().defaultNow(),
  },
  (table) => [index("idx_rate_limit_hits_key_at").on(table.key, table.hitAt)]
);

/**
 * Server-side web sessions (audit A23).
 *
 * The `sb_session` token is stateless (HMAC), which makes individual session
 * revocation impossible: a stolen token stays valid for its full 7-day life.
 * Each sign-in (and each Telegram channel token) now creates a row here,
 * keyed by the SHA-256 of the token. `authenticate` rejects tokens whose row
 * is missing or revoked; existing tokens from before this table shipped are
 * adopted lazily on first use so a deploy does not log everyone out.
 */
export const userSessions = pgTable(
  "user_sessions",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    // SHA-256 hex of the session token — the token itself never touches the DB.
    // Column-level UNIQUE (a real constraint, so ON CONFLICT (token_hash)
    // works — a plain unique index would not satisfy it).
    tokenHash: text("token_hash").notNull().unique(),
    scope: text("scope").notNull().default("web"),
    userAgent: text("user_agent"),
    ip: text("ip"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => [index("idx_user_sessions_profile").on(table.profileId)]
);

export const visaRequirements = pgTable(
  "visa_requirements",
  {
    id: serial("id").primaryKey(),
    country: text("country").notNull(),
    visaType: text("visa_type").notNull(),
    title: text("title").notNull(),
    instructions: text("instructions"),
    isRequired: boolean("is_required").notNull().default(true),
    sourceUrl: text("source_url"),
    sourceName: text("source_name"),
    sourceType: text("source_type"),
    lastVerifiedAt: timestamp("last_verified_at"),
    verificationStatus: text("verification_status").notNull().default("unverified"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_visa_requirements_country").on(table.country, table.visaType)]
);
