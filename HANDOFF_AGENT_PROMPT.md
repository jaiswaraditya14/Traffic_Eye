# Traffic Eye — Continuation Prompt for the Next Coding Agent

Paste everything below into the next agent. It is self-contained.

---

You are the lead React Native / Expo / Android / Supabase engineer for **Traffic
Eye** at `D:\Traffic_Eye`. A previous agent completed **Phase 0** and the
**code** for **Phase 1** (moving AI provider secrets off the untrusted mobile
client). Your job is to verify Phase 1 end-to-end and then implement Phases 2–9.
Do not restart Phase 1 from scratch — build on what exists.

Authoritative spec: `TRAFFIC_EYE_REWRITTEN_COMPREHENSIVE_FIX_PROMPT.md`.
Current state: `HANDOFF_STATUS.md`. Read both first.

## Non-negotiable rules (from the spec)
- The mobile client is **untrusted**. Every security, duplicate, rate-limit,
  role, reward, and officer-review rule MUST be enforced server-side.
- Derive the caller from the verified JWT / `auth.uid()`. Never trust a
  caller-supplied user or officer id.
- Server time for rate-limit and duplicate windows. Capture time (EXIF) is
  separate and never trusted as submission time.
- Never invent/guess EXIF or GPS. Missing metadata → "unavailable" + labelled
  device/manual fallback. Accept lat 0 / lng 0 as valid (equator/prime meridian).
- Never log raw EXIF, exact GPS, full URIs, bearer tokens, provider payloads, secrets.
- Forward-only migrations. Never edit an already-applied migration. Never reset
  a shared/remote DB (local `supabase db reset` is fine).
- Treat every exposed provider key as compromised; document history exposure,
  don't rewrite shared git history without explicit approval.
- Report unit-tested / build-tested / device-tested results **separately**. Do
  not claim a device result you didn't run.

## Duplicate & rate policy (implement exactly)
- Hard incident dup: non-rejected report, same normalized plate, server time
  within previous 24h, great-circle distance ≤ 500 m. Non-overridable.
- Hard evidence dup: exact SHA-256 of uploaded bytes already on a non-rejected report.
- Soft warning: same user, same plate, outside the window → "Report Anyway"
  allowed (never bypasses hard rules or rate limit).
- Rate limit: 3 accepted submissions per rolling 60 min, server-enforced.
- Media: images ≤ 10 MiB, videos ≤ 5 MiB.
- Location provenance enum: EXIF_ORIGINAL, EXIF_PICKER_COPY, DEVICE_CURRENT,
  DEVICE_LAST_KNOWN, USER_SELECTED.

## What Phase 1 already did (verify, don't redo)
- `src/config/ai.config.js` — no keys/endpoints; exposes `stages`, function name, timeout.
- `src/services/ai/utils.js` — `invokeAiStage({stage, imageBase64|evidenceSummary,candidates})`
  + `AiStageError`. Calls the Edge Function only.
- `src/services/ai/index.js` — pipeline uses `invokeAiStage` for vision/ocr/audit.
- `supabase/functions/ai-analyze/{index,providers,prompts}.ts`, `_shared/http.ts` —
  JWT-verified proxy, allow-listed models, server prompts, per-user quota,
  typed errors, sanitized logging.
- `supabase/migrations/20260420000000_baseline_deployed_bootstrap.sql` —
  reproduces the CURRENT (insecure) live schema for local testing.

## FIRST TASKS (do these before anything else)
1. **Create the `ai_analysis_events` table** the Edge Function writes to — it
   does NOT exist yet. Columns used by `index.ts`: `id`, `user_id` (uuid, FK
   profiles), `stage`, `provider`, `model`, `correlation_id`, `attempts`,
   `latency_ms`, `outcome`, `failure_code`, `request_bytes`, `created_at
   timestamptz default now()`. RLS: users read only their own; only
   service_role inserts. Put it in the forward-only repair migration, not the baseline.
2. **Start Docker**, then:
   ```bash
   ./node_modules/.bin/supabase start
   ./node_modules/.bin/supabase db reset   # applies baseline + migrations
   ./node_modules/.bin/supabase db lint
   ```
   Fix any error in the baseline SQL before proceeding — it has not been executed yet.
3. Wire `npm test` (jest-expo) and `npm run test:exif` to run against the
   **production** parser, not `exifParserCoreCommonJS.js`.
4. Verify `ai-analyze` locally with `supabase functions serve` using a real JWT;
   confirm it fails closed with `NOT_CONFIGURED` when no provider secret is set,
   and returns typed errors (not provider bodies).

## THEN implement, in order (see spec for full detail)
- **Phase 2 — DB security.** Fix these catalogued findings:
  1. `handle_new_user()` trusts `raw_user_meta_data->>'role'` → role escalation.
  2. Officers can UPDATE any column of any report (broad `FOR UPDATE USING (is_officer())`).
  3. `submit_officer_review` falls back to `p_officer_id` when `auth.uid()` null.
  4. `award_points` has TWO overloads (3-arg + 5-arg) → PostgREST ambiguity;
     both grantable to `authenticated` → point minting. Consolidate + REVOKE.
  5. `"Anyone can view approved image reports"` exposes full rows incl. `image_url`.
  6. `get_approved_heatmap_points` leaks report UUID, address, officer identity,
     `image_url`, coords jittered only ~30 m. Reduce to aggregate/coarse cells.
  7. `check_image_duplicate` granted to `anon` → hash oracle. REVOKE anon.
  8. `report-media` bucket is PUBLIC → make private + signed URLs.
  9. Notification / point_transaction policies use `auth.role()='authenticated'`
     with no `user_id` check → injection for any user. Tighten + explicit grants.
  10. Add `search_path` hardening + REVOKE FROM PUBLIC on all SECURITY DEFINER fns.
  - Write pgTAP tests for anon / citizenA / citizenB / assigned officer /
    unassigned officer / disabled officer / admin.
- **Phase 3 — one authoritative submit RPC** with advisory lock, the duplicate
  and rate rules above, `client_submission_id` idempotency, atomic report+media
  insert, typed results, fail-closed. Add normalized plate, server `submitted_at`,
  separate `captured_at`, coordinate-pair constraint, provenance enum, evidence
  SHA-256 column, private storage path. Remove the client bypass routes in
  `AIResultsVerification.js` and `VideoReport.js`; make `reports/index.js` call the RPC.
- **Phase 4 — EXIF/evidence.** Delete filename/size/dimension/latest-100-media
  heuristics from `android/.../MediaStoreResolverModule.kt` (Strategy 2) and
  `src/utils/exifParser.js` (MediaLibrary latest-100 fallback). Keep only exact
  MediaStore-ID resolution. One production parser imported by BOTH runtime and
  tests (delete `exifParserCore.js` / `exifParserCoreCommonJS.js` duplication).
  Fix `fileHash.js` to hash exact bytes (don't drop query params silently; the
  base64-string fallback is not sha256sum-equivalent — flag or fix). Re-verify hash server-side.
- **Phase 5/6 — media + screens:** 10/5 MiB contract, private bucket + signed
  URLs, `upsert:false` UUID paths, cleanup on failure, `ReportSuccess` from
  server snapshot then clear `currentReport`, citizen duplicate UX.
- **Phase 7/8 — officer edit + jurisdiction:** shared violation catalog/normalizer,
  officer edit state init after load, atomic decision+violations+audit RPC,
  preserve original vs officer-final violations, pincode-as-text, server-controlled
  jurisdiction routing enforced in RLS.
- **Phase 9 — full verification:** EXIF/media matrix, DB/security/concurrency
  pgTAP, `eslint`, `npm test`, `npm run test:exif`, `supabase db reset`,
  `supabase test db`, `supabase db lint`, Android gradle. Report results in the
  spec's 6-section format, unit/build/device separated.

## Deliverables the owner explicitly asked for
- A paste-ready SQL file for the Supabase SQL Editor (generate from the
  forward-only repair migration; do not include the baseline, which only
  reproduces the already-live schema).
- Keep `HANDOFF_STATUS.md` updated as you complete each phase.

## Gotchas from the last session
- Windows + Git Bash: use absolute paths with the Read tool; a `cd` inside one
  Bash call persists and breaks later relative paths. Use `supabase` via
  `./node_modules/.bin/supabase`, not `npx` (npx hung).
- This is a **bare-workflow** Android app (`android/` is committed). Do NOT run
  `expo prebuild --clean` — it erases the native `MediaStoreResolverModule`.
- `EXPO_PUBLIC_*` env vars are bundled into the APK and are not secret.
