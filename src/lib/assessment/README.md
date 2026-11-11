# Canonical programme assessment

One service, used by every surface (`/api/chancing`, `/api/programs/recommend`,
`/api/dashboard`, `/api/deadlines`, `/api/universities[/id]` and the
`ProgrammeAssessmentScreen` UI).

```
version.ts            scoring/preference/subject rule versions + weights
subjectRelation.ts    identity / alias / accepted equivalent / curated related / lexical / unknown
preferences.ts        must-prefer-no_preference modes and the fit arithmetic
eligibility.ts        AND/OR requirement tree, unknown reasons, gap-to-close
finance.ts            strict cost sums, net cost, funding gap, scenarios
academicComparison.ts recorded result vs PUBLISHED p25/p75 (never a percentile)
adapters.ts           catalogue rows → assessment input (the only DB-facing part)
index.ts              assessProgramme, grouping, conservative sort, display
```

Five answers stay separate (spec §1): `preferenceFit`, `eligibility`, `finance`,
`academicComparisons`, and `admissionProbability` which is ALWAYS
`{ value: null, reason: "no_validated_model" }`.

## Preference fit

```
T = Σ weights of active `prefer` factors      (must = filter, no_preference = out)
K = Σ weights whose similarity is known
U = T − K
W = Σ (weight × similarity)
knownFit   = 100 × W / K      (null when K = 0)
coverage   = 100 × K / T      (null when T = 0)
lowerBound = 100 × W / T
upperBound = 100 × (W + U) / T
fit        = pointFit only when U = 0 and the subject relation is known
```

Weights: subject 60, country 15, teaching language 15, study load 5,
delivery mode 5 — versioned product settings, not a validated statistical model.
Unknown factors are never replaced by 0 or 0.5, nothing is rounded before the UI,
and every value is finite (`T = 0` and `K = 0` are handled explicitly).

## Ordering

Inside a group: `lowerBound` desc → `coverage` desc → stable programme id asc.
Overlapping intervals are NOT claimed to be ordered; an unknown fit is kept in a
separate block instead of becoming a fake 0.
