# Traffic Eye — Production Repair: Status

_Last updated: 2026-09-10. Branch: `Pre_Main` (mirrored to `Pre_dev`)._

This tracks the production-hardening pass described in
`TRAFFIC_EYE_REWRITTEN_COMPREHENSIVE_FIX_PROMPT.md`. It is a **partial**
checkpoint committed under time pressure — read "What is left" before assuming
anything is production-ready.

---

## ✅ Done (committed)

### Phase 0 — Groundwork
- Established the source of truth and mapped every submission / upload / review
  route in the app.
- Recorded the baseline: ESLint had 4 pre-existing errors; the only "tests"
  (`scripts/test_exif_pipeline.js`, 75/75) exercised a **copied** parser
  (`exifParserCoreCommonJS.js`), not the production one.
- Confirmed local tooling: Docker Desktop present, Java 17, Android SDK path,
  npm registry reachable. Installed `supabase` CLI as a dev dependency
  (`./node_modules/.bin/supabase`).
- Confirmed provider-credential exposure **without printing secret values**.

### Phase 1 — AI provider secrets moved off the client (complete)
This is the main body of work in this checkpoint.
- **`src/config/ai.config.js`** — gutted. No longer holds any API keys, provider
  endpoints, or model lists. Now exposes only the permitted `stages`, an Edge
  Function name, and a client-side round-trip timeout.
- **`src/services/ai/utils.js`** — rewritten. The client no longer calls NVIDIA /
  Gemini / Groq directly. It exposes `invokeAiStage()` which makes one
  authenticated call to the `ai-analyze` Edge Function, plus a typed
  `AiStageError`. `callAI`, `buildAttemptQueue`, `runWithRotation` are gone.
- **`src/services/ai/index.js`** — the pipeline now calls `invokeAiStage({stage})`
  for vision, OCR, and audit. All prompt text was removed from the client.
- **`supabase/functions/ai-analyze/`** — new server-side proxy (Deno/TS):
  - `index.ts` — verifies the JWT, derives the caller from `auth.uid()`,
    validates body (stage, base64 JPEG magic-byte + size cap, audit text caps),
    enforces per-user hourly/daily quota from `ai_analysis_events`, records every
    attempt, returns typed errors with a correlation id. **Fail-closed**: if the
    quota ledger can't be read, no provider credit is spent.
  - `providers.ts` — server-owned model allow-list, per-stage attempt chains,
    timeouts, key rotation. Keys read from Edge secrets, never logged.
  - `prompts.ts` — vision / OCR / audit prompts now live here.
  - `_shared/http.ts` — CORS, typed error codes, sanitized logging.

### Phase 1 cleanup — .env, ignore rules, and documentation
- **`.env`** — all exposed `EXPO_PUBLIC_*` AI provider keys (Gemini ×2, Groq ×6,
  NVIDIA ×1) removed from the live `.env`. Only `EXPO_PUBLIC_SUPABASE_URL` and
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` remain. Source tree confirmed clean of leaked
  provider keys (no `nvapi-`, `gsk_*`, or `AQ.Ab8*` in any tracked file).
- **`.env.example`** — already updated to list only Supabase public config plus
  server-only secret names as comments.
- **`.easignore`** — already updated: `android/` is NOT excluded (bare workflow
  native modules preserved); `.env*` files excluded at every depth; server-only
  code (`supabase/functions/`, `supabase/migrations/`, `scripts/benchmark_*`)
  excluded from mobile upload.
- **`.gitignore`** — already updated: `.env*` files ignored at every depth;
  only the reviewed `.env.example` is tracked.
- **`docs/AI_DETECTION_IMPLEMENTATION.md`** — Gemini key removed from current
  tree; replaced with exposure notice + rotation instructions.

### Audit fixes (AUDIT_CHANGES.md Issues 1–5 — all confirmed resolved)
- **Issue 1 (CRITICAL)** — `.easignore` no longer excludes `android/`. Native
  `MediaStoreResolverModule.kt` and `MediaStoreResolverPackage.kt` survive EAS
  build. Gradle build caches are excluded instead.
- **Issue 2 (HIGH)** — `CitizenHome.js` thumbnail now reads
  `r.image_url || r.media?.[0]?.file_url || null`.
- **Issue 3 (MEDIUM)** — `CitizenNavigator.js` MapLibreTest route wrapped in
  `{__DEV__ && ...}`, excluded from production builds.
- **Issue 4 (HIGH)** — `MapLibreMap.js` bottom bar height is now measured via
  `onLayout` callback instead of static pixel estimate.
- **Issue 5 (MEDIUM)** — `app.json` permissions cleaned: `READ_EXTERNAL_STORAGE`,
  `WRITE_EXTERNAL_STORAGE`, `READ_MEDIA_AUDIO` removed.

### Backend reproducibility (in progress but usable)
- **`supabase/migrations/20260420000000_baseline_deployed_bootstrap.sql`** —
  a syntax-clean consolidation of the hand-applied SQL that reproduces the
  **current live (pre-repair) schema**, including its known vulnerabilities,
  so a throwaway local DB can be built and the repair proven against it.
  (The canonical `database/Traffic_eye_database.sql` has an orphaned dead-code
  block that makes it fail to parse; that block is omitted here.)
- The three already-applied migrations were copied verbatim into
  `supabase/migrations/` (must not be edited).
- `supabase/config.toml` created; `auto_expose_new_tables` pinned to `true` to
  match cloud default (the repair migration must REVOKE, not rely on absent GRANTs).

---

## ⛔ What is left (not done)

### Verification NOT yet run
- Docker daemon was not up in this session, so **no** `supabase db reset`,
  `supabase test db`, or `supabase db lint` has been run against the new
  baseline. **The baseline SQL has not been executed yet** — review before trust.
- No `npm test` / `npm run test:exif` (scripts still not wired to jest).
- No Android Gradle build run this session.
- No physical-device EXIF test (owner will do this).

### Phase 1 remainder (owner actions only — no code changes needed)
- Provider keys still need **owner-side rotation** — every key that ever shipped
  in an `EXPO_PUBLIC_*` var or was committed to docs must be treated as
  compromised and rotated in each provider console.
- A live Gemini-looking key is still present in git history at
  `docs/AI_DETECTION_IMPLEMENTATION.md` (10 commits). Documented, not purged —
  history rewrite needs explicit approval.
- `supabase secrets set` for `NVIDIA_API_KEY_*`, `GEMINI_API_KEY_*`,
  `GROQ_API_KEY_*` must be done before `ai-analyze` works.
- Apply `database/PHASE1_SQL_EDITOR.sql` (= migration
  `20260909182341_phase1_ai_analysis_events.sql`) to the live Supabase project
  via the SQL Editor before deploying `ai-analyze`.

### Phases 2–9 — NOT started
- **Phase 2 (DB security):** role-escalation in `handle_new_user`, `SECURITY
  DEFINER` audit + `search_path` + REVOKE from anon/PUBLIC, points/rewards
  server-derived + idempotent, officer review without `p_officer_id`, remove
  broad officer UPDATE, officer discovery without email exposure, replace
  `auth.role()`-only policies, fix heatmap/public leakage, unify notification
  schema, RLS/RPC pgTAP tests. (Findings catalogued — see the agent prompt file.)
- **Phase 3 (submit RPC):** one authoritative submit RPC with advisory lock,
  3/60min rate limit, hard duplicate rules (plate+time+500m, SHA-256),
  `client_submission_id` idempotency, atomic report+media insert, fail-closed.
- **Phase 4 (EXIF/evidence):** delete filename/size/dimension/latest-media
  heuristics from `MediaStoreResolverModule.kt` and `exifParser.js`; one
  production parser imported by both runtime and tests; real `test:exif`;
  hash exact uploaded bytes; server re-verification.
- **Phase 5/6 (media + screens):** 10 MiB image / 5 MiB video contract, private
  bucket + signed URLs, `upsert:false` UUID paths, success screen from server
  snapshot, citizen duplicate UX.
- **Phase 7/8 (officer edit + jurisdiction):** shared violation catalog, atomic
  decision+violations+audit RPC, pincode-as-text, server-controlled jurisdiction.
- **Phase 9:** full test matrix + build/audit run.

### Known client bypass routes still live (must be removed in Phase 3/5)
- `src/screens/shared/AIResultsVerification.js` — own storage upload + inserts.
- `src/screens/citizen/VideoReport.js` — own storage upload + inserts.
- `src/services/reports/index.js` — `checkUserRateLimit` and `checkPlateDuplicate`
  **fail open**; `uploadReportMedia` uses `upsert:true` + public URL.

---

## ⚠️ If you deploy this checkpoint as-is
The app's AI analysis will **not function** until: (1) the `ai_analysis_events`
table exists, and (2) provider keys are set as Edge secrets. Until then
`invokeAiStage` returns `NOT_CONFIGURED` and the pipeline fails closed to
manual review. The rest of the app (reports, review) is unchanged from before
this pass and still carries the Phase 2–9 vulnerabilities.
