# Stage 2 — Central AI Configuration, Credentials, OpenRouter Models and Admin Settings

**Date:** 2026-10-21  
**Scope:** Repository audit and changes only. No production calls, live credentials, database mutation, deployment, or PR.

## Outcome

The repository already has a central chat router, admin credential storage, encrypted keys, explicit fallback selection, retry classification, cost/budget handling, and a deterministic admin settings test. The audit found that several specialized OpenRouter calls bypass that central chat path. Stage 2 adds an endpoint-aware model registry and truthful admin test/save behavior, hardens the specialized request paths, and makes optional remote embeddings unavailable by default because the current free NVIDIA model cards disclose trial data logging and warn against personal/confidential input.

This is **not a claim that all six endpoints are live for this deployment**. OpenRouter model cards and endpoint documentation were checked on 2026-10-21; account-specific credentials, routing, limits, and runtime success were not tested.

## UI → route → service → provider → UI map

| Feature / response surface | Request path and service | Provider protocol / result | Fallback and caveats |
| --- | --- | --- | --- |
| General adviser, essay/SOP generation, chat-backed features | UI → feature API route → `callAI`/`aiChat` or `aiGenerate` → `src/lib/ai/index.ts` → runtime settings/credentials → provider adapter | Central chat-completions adapter; resolves per-task provider and model, checks capability, bounds timeout, retries only transient errors, applies explicitly configured fallback, and records central usage/budget metadata. | Routes generally retain caller-authored deterministic/local fallbacks. API keys stay server-side. Provider failures are normalized/redacted. |
| Scholarship/opportunity eligibility hints | `/api/scholarships`, `/api/opportunities` → `runMercuryDecision()` → `/api/alpha/decisions` | OpenRouter typed decisions; nullable signals are joined with deterministic eligibility results. | Optional and advisory; deterministic eligibility remains authoritative. State/questions are bounded and the call has a 3.5 s maximum timeout. |
| SOP, essay, forum and visa behavior indicators | SOP/essay/forum/visa routes → `scoreConversationBehaviors()` → `/api/alpha/decisions` | Respan structured behavior probabilities, not generated prose. | Missing/error results are nullable. SOP/essay responses render indicators; forum moderation is asynchronous and audited as an advisory. No behavior probability is treated as proof or automatic punishment. Transcript, questions, and timeouts are bounded. |
| Search/document embeddings | `/api/ai/embeddings` and `/api/documents?checkReadiness=1` → `src/lib/ai/embeddings.ts` → `/api/v1/embeddings` | Text or multimodal embeddings, local cosine similarity. The document checklist path sends metadata only, not the uploaded file bytes or private file URL. | Lexical/profile ranking remains available; readiness is advisory and can be unavailable. **Remote embeddings are disabled unless explicitly opted in and a reviewed non-free model is selected.** The repository refuses `:free` embedding IDs even when the opt-in is set. |
| Visa neural speech | `VisaSpeakingAssistant` → `/api/visa/tts` → OpenRouter `/api/v1/audio/speech` | One configured TTS model; bounded text, 4.5 s timeout, audio MIME validation, and 8 MiB output cap. | One attempt only. 204/failure leaves the existing browser `speechSynthesis` fallback in control; no invisible OpenAI or second-model switch. |
| Admin provider settings | `AiSettingsManager` → `/api/admin/ai-settings` GET/PUT/POST → credentials/config helpers | Admin DB config takes precedence over supported environment settings; credentials are encrypted at rest and GET exposes only masked hints. Model selection follows saved DB model → model env → documented default. | Admin auth, rate limiting, schema bootstrap, and audited writes remain in place. Dates are normalized to ISO at the public-credential boundary. Test no longer saves; the explicit Save action persists typed changes. |

### Configuration/test semantics

- A shallow OpenRouter test checks key acceptance (`/auth/key`) and separately attempts a model-catalog lookup. A catalog listing is not an endpoint test.
- The full check tests the selected model through chat completion and JSON mode where supported. It still does **not** test TTS, embeddings, Mercury decisions, or Respan decisions.
- UI results say **“Key accepted; see endpoint checks”**, not “Connected.” Typed key/model values are not persisted by testing. Save remains an explicit separate action.
- The model panel labels six separate task/model/endpoint candidates and warns that a single key does not validate them all.
- Valid DB credentials beat environment credentials; DB model beats model env, then a documented default. No raw key is returned by the API. Invalid/missing-key and endpoint errors remain UI-safe and redacted.

## OpenRouter model/endpoint verification

These are the exact IDs already used by the repository. Official OpenRouter model cards were reviewed on the date above:

| Repository task | Exact ID | Officially documented endpoint/modality | Runtime status / important limitation |
| --- | --- | --- | --- |
| Chat | `minimax/minimax-m3.1-flash:free` | `/api/v1/chat/completions`; text, image, and video input with text output; supports `response_format`. [OpenRouter model card](https://openrouter.ai/minimax/minimax-m3.1-flash:free) | The card says the free launch variant retires **2026-10-22 at 12:00 UTC**. No automatic change to the paid base model was made; the admin/operator must choose a replacement to avoid surprise billing or outage. |
| Speech | `fish-audio/s2.1-pro-free:free` | `/api/v1/audio/speech`; text input, raw audio stream (MP3 requested). [OpenRouter model card](https://openrouter.ai/fish-audio/s2.1-pro-free:free) | Card describes free variant as testing/prototyping/low-volume and gives no production latency/availability guarantee. Runtime now performs one attempt and uses browser speech on failure. |
| Text embedding | `nvidia/nemotron-3-embed-1b:free` | `/api/v1/embeddings`; text input → vectors. [OpenRouter model card](https://openrouter.ai/nvidia/nemotron-3-embed-1b:free) | NVIDIA warns free endpoint input is logged for service improvement and says not to upload personal/confidential data. Free model is blocked in code; a reviewed non-free model and explicit opt-in are required. |
| Multimodal embedding | `nvidia/llama-nemotron-embed-vl-1b-v2:free` | `/api/v1/embeddings`; text/image/combined documents → vectors. [OpenRouter model card](https://openrouter.ai/nvidia/llama-nemotron-embed-vl-1b-v2:free) | Card warns that free endpoint prompts/outputs are logged and says trial use only—not production/business-critical. Free model is blocked; the API returns an unavailable/503 outcome rather than sending the input. |
| Eligibility decisions | `inception/mercury-decide:free` | OpenRouter Decisions API (`/api/alpha/decisions`); typed choice/score/yes-no results. [OpenRouter model card](https://openrouter.ai/inception/mercury-decide:free) | Not chat completions. Repository callers send text state, with deterministic eligibility retained as authority. No live account test. |
| Behavior evaluation | `respan/span-01-lite:free` | OpenRouter Decisions API (`/api/alpha/decisions`); text state → structured behavior probabilities. [OpenRouter model card](https://openrouter.ai/respan/span-01-lite:free) | Not chat completions. Signals remain advisory and nullable. No live account test. |

Official model documentation confirms the endpoint/modality pairing, not whether an individual key can invoke it, per-account limits, current availability, or the live response contract. The six exact model IDs are centralized in `src/lib/ai/openrouterModelIds.ts`, along with endpoint, task, timeout, input/output limits, fallback, optionality, env override, source URL, verification level, and provider-data warnings.

## Changes made

- Added typed OpenRouter capability registry for all six IDs and their different endpoint contracts; removed the UI’s misleading “Active … Free Model Stack” claim.
- Separated provider key acceptance, catalog listing, selected-model chat, and structured-output test evidence. Testing no longer implicitly saves typed credentials/models or labels a key-only check “Connected.”
- Normalized stored credential timestamps from either a PostgreSQL `Date` or string to ISO; invalid dates become `null`.
- Changed TTS from a multi-model/cross-provider retry loop to one configured OpenRouter attempt, with bounded audio input/output, a finite timeout, safe 204 behavior, and metadata-only outcome/latency logs (`usage_unreported`).
- Added metadata-only latency/outcome logs and a 2 MiB response cap for direct OpenRouter decision/embedding helpers. No prompt, state, image, credential, or provider body is logged.
- Added state/question/transcript limits and a 3.5 s timeout ceiling to Mercury and Respan wrappers.
- Disabled remote embeddings by default; free trial embedding IDs remain blocked even with the opt-in. Existing lexical/local behavior remains the safe fallback.
- Added deterministic tests for provider/model precedence, masked credentials, key-vs-model test semantics, explicit save-vs-test UI behavior, date normalization, no-key/error behavior, embedding opt-in, no hidden TTS retry, specialized response bounds, and advisory model metadata.

## Remaining limits / follow-up

- **No live model calls were run.** No production credential was available or used. The admin full check covers chat/structured output only; dedicated TTS/embeddings/decision endpoint tests require separately authorized credentials and should be performed in a non-production test environment.
- Central chat has the existing persistent usage/cost/budget path. Specialized decisions, embeddings, and TTS now emit metadata-only latency/outcome telemetry with `costStatus: usage_unreported`, but are **not yet persisted as `ai_usage` rows or wired into the central budget/quota gate**. Their provider-reported usage/cost is not currently available through the helpers in this repository. Do not interpret `usage_unreported` as a measured zero cost. A future change should unify specialized usage and quota behavior before enabling paid remote embeddings or increasing TTS traffic.
- The master prompt was not present in the available workspace context; no prompt content was invented or changed.
- No production database, live credential, deployment, or GitHub PR was touched.

## Focused validation run

- `npm run test:ai-settings` — passed, 92 assertions (deterministic; no network/model key needed).
- `npm run typecheck` — passed.
- `npx eslint` on the changed TypeScript/TSX files — passed.
- `npm run test:visa` — passed (87 shared checks + 67 scoring checks).
- `npm run test:ai-cost` — passed, 58 assertions (existing central accounting behavior).
