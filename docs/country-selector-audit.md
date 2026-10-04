# Country selector and data-source audit

Audit performed locally against the application source and Drizzle schema. No production database connection or data read/write was used. The sources below were inspected before the selector edits; this note records their original source and the additive treatment applied.

## Country selectors and selectable lookup sources

| Surface | Source before the edit | Change |
| --- | --- | --- |
| Onboarding — preferred destinations (`src/components/OnboardingWizard.tsx`) | A module-level hard-coded array of 14 English labels (`United States`, `United Kingdom`, `Canada`, `Germany`, `Australia`, `Singapore`, `Netherlands`, `Switzerland`, `Japan`, `France`, `Sweden`, `South Korea`, `United Arab Emirates`, and `China`). Values are saved in `student_profiles.preferred_countries`. | Kept existing labels/order and appended only missing requested options through the shared country list. `China` remains the saved value and is displayed as China (Mainland). Selection recognizes aliases so a saved equivalent is not shown as a second selection. Labels use `countryNames` translations. |
| Profile modal — preferred destinations (`src/components/ProfileModal.tsx`) | A hard-coded 11-label list, separate from onboarding; existing profile values load from the saved `preferredCountries` field (JSON or legacy text). The home-country/residence field is free text, not a selector. | Kept the list and saved-value format; additively merged the missing options and localized labels. The separate free-text residence field is unchanged. |
| University/program search (`src/components/UniversityExplorer.tsx`) | Native country `<select>` with `All` plus nine hard-coded country options; selections call `/api/universities?country=...`. | Kept `All`, the nine original options, native select behavior, and English API values; appended missing options and localized their labels. API matching now recognizes aliases. |
| Scholarship/funding search (`src/components/ScholarshipHub.tsx`) | Native `<select>` with six hard-coded country options plus the non-country `European Union` option; selections call `/api/scholarships?country=...`. | Preserved all original choices, including European Union, and appended missing country options. Country labels are localized; EU remains its existing value and label. API matching now recognizes aliases. |
| Country comparison (`src/components/CountryComparePanel.tsx`) | Chips came from `data.available.slice(0, 14)`, returned by `/api/countries/compare`; the API builds that list from university-country values in the database, ordered by university count. Comparison rows are also database-backed. | Kept the database-derived options first and appended missing requested choices. Existing dynamic labels and ordering remain intact; known labels are localized. Alias-aware comparison and deduplication operate on existing stored labels without changing the response shape. |
| Success-story country filter (`src/components/growth/SuccessStories.tsx`) | Native `<select>` options came from `/api/stories`, which returns distinct `admittedCountry` values from approved story records. | Preserved database-driven values first, added missing requested choices, and localized recognized names. Story records and API values remain unchanged; the API filter accepts equivalent aliases. |
| Visa-speaking practice (`src/components/VisaSpeakingAssistant.tsx`, `src/lib/visa-interview.ts`) | A static list of 11 records containing stable country codes, English country names, flags, interview language, speech locale, and prompts. The UI sends the existing code to visa APIs. | Retained all 11 original records/codes and added 26 records so the selector covers all 37 requested entries. Existing language, locale, prompt, and API behavior is retained; new labels are localized while codes/names remain stable nonlocalized identifiers/values. Mainland China, Hong Kong SAR, and Taiwan are separate records. |

## Country-related inputs inspected but not fixed-option selectors

These controls intentionally remain free text or free-form lists so existing users can enter countries outside the requested set and no saved-value workflow is redesigned:

- Authentication sign-up/sign-in has no country control; the onboarding wizard is the first structured destination choice.
- `ProfileModal.tsx`: country of residence; this remains free text rather than a fixed selector.
- `journey/PreparePanels.tsx`: study-plan target country.
- `journey/ExplorePanels.tsx` (`VisaCenterPanel`): country text search for `/api/visa/requirements`; it is not constrained to a database-provided selector. The API now resolves known aliases against the already-published country labels.
- `growth/SuccessStories.tsx`: submitted home and admitted country text fields.
- Admin editors: university country (`admin/UniversitiesManager.tsx`), scholarship/provider country and eligible-countries JSON (`admin/ScholarshipsManager.tsx`), and opportunity country (`admin/OpportunitiesManager.tsx`) are text inputs. Verification, story moderation, analytics, and research screens display country data but do not offer country pickers. The visa-requirements admin API accepts a country string; there is no country selector in the inspected admin components.

Country appears as metadata in application/university lists, career-path results, funding results, analytics, and the Telegram mini-app. These are displays or catalog-driven records, not country-choice controls. The application tracker selects university/application records, not a separate country.

Other country-bearing constants and data paths were also inspected, including career-destination examples (`src/lib/journey/careers.ts`), seed/default profile values (`src/db/seed.ts` and the schema default), preferred-country inputs to recommendation/dashboard services, scholarship eligibility, notifications, and profile/story similarity logic. They are catalog, seed, or matching/scoring inputs rather than country pickers; they were deliberately left unchanged to avoid catalog, student-data, recommendation, admission, or scoring changes.

## API, lookup, and schema findings

- `/api/universities` and `/api/scholarships` previously applied exact country-string filtering. They now use the shared alias-aware matcher; the existing free-text search also recognizes a country alias.
- `/api/stories` previously matched country filters by lowercase exact string. It now matches known equivalent names/codes and allows an alias in the country part of search without producing duplicate records.
- `/api/countries/compare` reads university and scholarship rows; its pure comparison helper now matches aliases and collapses equivalent database country labels for the available-country list.
- `/api/visa/requirements` reads admin-published `visa_requirements.country` values. Its query resolves known aliases to an existing saved label; the returned shape and saved values do not change.
- Schema inspection (`src/db/schema.ts`) found country data stored in text fields (and preferred countries as JSON text), including profiles, universities, scholarships, success stories, study plans, and visa requirements. No dedicated country lookup table exists. No schema, seed, catalog, production data, or database records were changed.
- Country-aware recommendation/admission/scoring logic was deliberately left untouched; the edits are limited to choice lists, labels, alias-aware display filters/lookups, and country comparison aggregation.

## Localization and verification

The new `countryNames` message namespace is present in English, Uzbek, and Russian for all 37 requested entries. Values sent to APIs and persisted by selectors remain the existing English/canonical values, not localized display labels.

Verified locally with `npm run test:countries`, `npm run test:country-compare` (17 checks), `npm run test:visa` (50 checks), `npm run test:journey` (90 assertions), `npm run check:i18n`, `npm run typecheck`, and `git diff --check`. The country-specific test checks the 37-entry list, locale coverage, alias deduplication, territory separation, stable visa codes, and alias-aware comparison behavior. `npm run lint:baseline` passed with no new or worsened findings; the repository's existing baseline remains 50 issues (45 errors and 5 warnings).
