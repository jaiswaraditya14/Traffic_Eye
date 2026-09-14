# Traffic Eye — End-to-End Capstone Technical Audit

**Audit date:** 14 September 2026  
**Audited branch:** `Pre_Main`  
**Scope:** React Native/Expo application, Supabase migrations, every SQL file in `database/`, Edge Functions, tests, and native release configuration  
**Method:** Static source audit plus local Jest/coverage/lint execution. The hosted Supabase schema, RLS behavior, secrets, provider responses, and physical-device behavior were **not** queried or changed. The stated Edge deployment and configured secret names are accepted as project facts, not independently verified. No Docker workflow is required or recommended.

> Security note: a Supabase secret was previously pasted into the conversation. This report does not reproduce or use it. Rotate that secret before any demonstration or release and invalidate the old value.

## Executive verdict

**Current decision: NOT READY for an examiner-facing live backend demo.** The mobile experience and automated suite are strong, but the repository cannot reconstruct a backend that matches the client, and several authenticated RPCs trust caller-controlled identities and reward values. These are real authorization defects, not theoretical enterprise polish.

The project becomes **college-demo ready** after the following three gates are applied to a staging/hosted Supabase project and verified with two real accounts:

1. Add the missing `image_reports` columns used by the current client and allow `tokenharbor` in `ai_analysis_events.provider`.
2. Bind rewards and reviews to `auth.uid()`, remove direct client writes to protected tables/columns, and verify one-award/one-review behavior under two simultaneous requests.
3. Force all public sign-ups to `citizen`, securely provision the demo officer, rotate the exposed demo credentials/secret, and complete a real citizen-to-officer smoke test on the release APK.

The codebase has excellent capstone material: server-owned provider allow-lists, multi-provider AI failover, advisory locking for AI quotas, report-level `FOR UPDATE`, stable submission IDs, realtime updates, MapLibre clustering, formula-safe exports, and a strongly isolated demo mode. Those strengths are defensible only if the database authorization gaps are acknowledged and repaired.

## 1. Academic evaluation scorecard

| Dimension | Grade | Evidence-based assessment |
|---|---:|---|
| Innovation | **A** | Community reporting, AI/OCR/audit stages, rewards, officer workflow, live heatmap, realtime sync, and offline synthetic demo mode form a distinctive capstone. |
| Architectural rigor | **B-** | Clear service boundaries and thoughtful retry/idempotency design, but two competing SQL sources of truth, handwritten production hotfixes, client-only jurisdiction/rate limiting, and non-persisted recovery reduce rigor. |
| Database security | **D** | RLS is enabled, but grants/policies and user-callable `SECURITY DEFINER` RPCs permit point minting, cross-user redemption, officer self-provisioning, broad report access, and private-note disclosure. |
| AI integration | **B** | Provider/key rotation, server-side secrets, stage deadlines, quotas, typed errors, and output limits are strong. The ledger rejects the primary provider, hard 4xx does not fully fail closed, and client evidence defaults can turn an unsupported model label into a confirmed violation. |
| Code quality | **B+** | 24/24 suites pass, lint is clean, release assets are integrity-tested, report submission is centralized, and exports/demo isolation are well tested. Missing DB integration tests, no CI, 8 EXIF TODOs, and untested native device paths keep it below A. |

**Overall academic assessment: B / strong concept with a C-level deployable security posture today.** With the must-fix migration and real-device/backend evidence, the project can credibly reach **A-/A** as a college capstone. It should not be described as enterprise-production-ready yet.

## 2. Verified build and test evidence

Executed locally against the current worktree:

- Jest: **24/24 suites passed; 341 passed, 8 TODO, 349 total; 0 failures**.
- Coverage: **73.72% statements, 64.65% branches, 67.40% functions, 75.98% lines**.
- ESLint: **passed with zero reported findings**.
- Release tests verify the 96×96 white/transparent notification icon, the 1024×1024 adaptive-icon safe zone, Android backup/storage flags, and SHA-256 integrity of both protected AI function files: `tests/releaseConfig.test.js:9-55`.
- Previous release verification in this worktree recorded Android/iOS exports as successful and Android `assembleRelease` as successful. The resulting Android artifact was debug-signed; no physical Android or iOS device was exercised, and iOS native building remains unavailable on Windows.
- `@maplibre/maplibre-react-native` is a native module. The MapLibre maps require a development/preview/standalone native build; Expo Go is not an adequate final demo runtime. The production EAS profile builds an AAB while preview builds an APK: `eas.json:14,20`.

The green suite is not proof of backend security. Supabase is mocked in the JavaScript tests, `supabase/tests/` is empty, and the repository has no pgTAP/RLS concurrency integration suite or CI workflow. The database defects below are therefore outside current test coverage.

The machine's global `npm` launcher currently points to a missing roaming `npm-cli.js`. Jest and ESLint were successfully run directly from `node_modules`; repair the developer machine's Node/npm installation before demo day so standard scripts work.

## 3. Architecture and report lifecycle

### What is well designed

1. `NewReport.js` and `VideoReport.js` collect media and location, then route evidence through the shared AI processing/result flow.
2. `src/services/reports/index.js:320-447` centralizes submission. It uses a stable UUID as both draft/report identity and storage object identity, shares an in-flight Promise across double taps, uploads with `upsert:false`, reconciles unknown insert outcomes by primary key, and removes definite orphans.
3. The Edge Function derives the user through `auth.getUser()`, reserves an AI quota row before provider I/O, chooses only server-owned provider/model/prompt allow-lists, and returns typed failures without key material.
4. Officer review uses a database transaction and locks the report row with `FOR UPDATE` at `20260817000001_fix_officer_review_and_guard_trigger.sql:119-138`, which is the correct primitive for preventing two officers from finalizing the same pending report.
5. Demo mode builds explicitly marked synthetic objects and bypasses live writes in `NewReport.js:198` and `VideoReport.js:427-430`; the report service also rejects `report.demo`/`ai_raw_result.demo` before Supabase I/O at `src/services/reports/index.js:320-321`.
6. CSV cells neutralize leading whitespace plus `=`, `+`, `-`, and `@` before quoting (`src/utils/reportCsv.js:1-6`), and PDF text is HTML-escaped (`src/utils/reportPdf.js:1-8`).

### Important lifecycle limitations

- The submission token and uncertain state are in memory only. An app restart loses the recovery handle, so this is robust retry handling, **not persisted offline draft recovery**.
- Media upload reads the entire file as Base64 and then decodes it (`src/services/reports/index.js:68-72`). A 50 MiB video temporarily expands substantially in memory and can crash a real phone. For the college demo, cap video size aggressively and test the exact phone; later replace this with a streaming/file-backed upload.
- The 15-second video duration is enforced (`VideoReport.js:393`) and upload MIME/extension checks exist, but uploaded report media is not magic-byte sniffed. The Edge AI endpoint does validate JPEG framing for AI images.
- Submission rate limiting is a client query over the user's own rows (`src/services/reports/index.js:244-288`), so a modified client can bypass it. It must become a server RPC/trigger for production.
- Officer queue/history jurisdiction filtering is client-side (`src/services/reports/index.js:570-576`). Current RLS lets every officer read every report, so the filter is presentation logic, not an authorization boundary.

## 4. Critical and high-severity findings

### C1 — Authenticated callers can mint points or redeem rewards for arbitrary users

**Must fix for college demo.**

The latest authoritative migration grants `award_submission_points(UUID,UUID)`, generic `award_points(UUID,INTEGER,...)`, and `redeem_reward_item(UUID,...)` to `authenticated`: `20260817000001_fix_officer_review_and_guard_trigger.sql:229-320,324-393`.

- `award_submission_points` never checks `p_user_id = auth.uid()` or that `p_report_id` exists and belongs to that user. Its check-then-insert is also raceable because the existing index is not unique.
- The five-argument `award_points` accepts arbitrary user, amount, action, and reference. Any signed-in citizen can mint unlimited points.
- The baseline's older three-argument `award_points` overload remains present (`20260420000000_baseline_deployed_bootstrap.sql:234-265`) and was never revoked there; PostgreSQL functions are executable by `PUBLIC` unless explicitly revoked.
- `redeem_reward_item` correctly locks the profile with `FOR UPDATE` and prevents a negative balance, but trusts client-controlled user, price, title, coupon, and expiry. The current client sends all of those values at `src/services/rewards/index.js:313-326`.

**Impact:** reward fraud, cross-account balance mutation, inconsistent audit history, and a straightforward viva demonstration failure if an examiner asks whether the server trusts mobile parameters.

**Exact repair:** apply Patch B in section 8. It binds identity to `auth.uid()`, validates report ownership, adds database uniqueness, removes both generic award overloads, moves prices/coupons to the server, and retains `FOR UPDATE`.

### C2 — Public sign-up can self-provision an officer

**Must fix for college demo.**

`handle_new_user()` copies `role`, `badge_id`, `department`, and `jurisdiction` from client-controlled `raw_user_meta_data`: `20260420000000_baseline_deployed_bootstrap.sql:267-281`. The mobile service still exposes `signUpOfficer` with this metadata at `src/services/auth/index.js:80-92`. `scripts/create_officer_chembur.js` also embeds and prints a real-looking officer password and relies on the unsafe sign-up path.

**Impact:** a normal sign-up can become an officer, read all citizen/profile data under current policies, and approve reports.

**Exact repair:** Patch C forces all public sign-ups to citizens and protects officer routing fields. Remove/disable `signUpOfficer`; provision officers only through a trusted admin/server transaction. Delete the committed credential from history if this repository has ever been shared and rotate the account password.

### C3 — Current mobile inserts and the Token Harbor success path contradict the migration schema

**Must fix before the next live AI/report smoke test.**

- The client sends `location_source`, `possible_duplicate`, and `duplicate_report_id`: `AIResultsVerification.js:83-106`, `VideoReport.js:433-449`, and `src/services/reports/index.js:411-418`.
- No authoritative migration creates those three columns. A clean database rebuilt from `supabase/migrations/` rejects the insert.
- `ai_analysis_events.provider` permits only `nvidia`, `gemini`, and `groq` (`20260909182341_phase1_ai_analysis_events.sql:10`), while the deployed code's first choices are `tokenharbor` (`providers.ts:14,41-61`). After a successful Token Harbor call, updating the ledger can fail its CHECK constraint and surface as a generic internal error.

**Exact repair:** Patch A adds the three report columns/index/checks and expands the provider constraint. This correction already appears as a manual recommendation in `SUPABASE_CHANGES.md`, but it is not in the authoritative migration chain and therefore remains schema drift.

### C4 — RLS is enabled but broad policies and grants bypass the intended workflow

**Must fix for college demo.**

The baseline grants all CRUD on all public tables to both `anon` and `authenticated` (`20260420000000_baseline_deployed_bootstrap.sql:663-666`) and relies entirely on policies. Several policies are unsafe and remain after later migrations:

- Any authenticated user can insert point transactions for any user (`:481-486`).
- A citizen insert is constrained only by `user_id`, so a direct REST call can forge `status`, `reward_amount`, and review timestamps (`:494-497`).
- Any officer can select and update every report with no jurisdiction or column restriction (`:498-502`).
- Every role, including anonymous, can select full approved report rows and public evidence URLs (`:503-505`).
- Any authenticated user can insert notifications for any user (`:543-547`).
- Citizens may select the complete `officer_reviews` row for their reports, including `internal_notes` (`:533-537`). RLS filters rows, not columns.

`TO authenticated` is not authorization by itself; it only distinguishes signed-in users. Patch D removes the direct mutation policies/grants, enforces immutable pending report inserts, and applies server-side officer routing. Private notes should be moved out of the exposed table as described under H2.

### C5 — Officer review verifies a role but not the supplied officer or jurisdiction

**Must fix for college demo.**

The latest function uses `auth.uid()` but falls back to caller-supplied `p_officer_id` when no JWT context exists (`20260817000001_fix_officer_review_and_guard_trigger.sql:100-105`). It never verifies that `p_officer_id` equals the authenticated caller and never checks jurisdiction. The row lock/status guard is correct (`:119-138`), but broad direct UPDATE RLS lets an officer bypass the function entirely.

**Impact:** cross-jurisdiction decisions, spoofed audit attribution in service/direct contexts, and bypass of reward/notification invariants.

**Exact repair:** Patch E is a full replacement that removes the fallback, checks identity and server-side routing, keeps `FOR UPDATE`, uses one transaction, and emits exactly one notification/award.

### H1 — `SECURITY DEFINER` search-path hardening is backwards

Most functions declare `SET search_path = public`, for example the baseline at lines 218, 227, 242, 269, 293, 384, and 421 and later repair functions throughout the 202608 migrations. The audit prompt assumes that this prevents escalation; current Supabase guidance recommends `SET search_path = ''` and fully qualified relations/functions for `SECURITY DEFINER` functions. Functions should also live outside exposed schemas when practical and have `PUBLIC` execution explicitly revoked. See the official [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

This is an **enterprise/future hardening item for simple trigger helpers**, but it is part of the demo blocker for user-callable reward/review functions because those functions already have authorization defects. Patches B–E use an empty search path.

### H2 — Citizen-accessible officer reviews expose private notes

`officer_reviews.internal_notes` is in the exposed public table (`20260420000000_baseline_deployed_bootstrap.sql:106-115`), and citizens have a SELECT policy for review rows belonging to them (`:533-537`). The normal citizen list intentionally selects only public fields at `src/services/reports/index.js:456-477`, but a modified client can request `internal_notes`; the generic detail query already requests it at `:484-507`.

**Repair:** before enterprise release, move notes into `private.officer_review_notes`, migrate existing values, drop the public column, make `submit_officer_review` write the private table, and remove `internal_notes` from the generic client query. Patch E.1 gives the exact delta. At minimum for the college demo, remove the field from `fetchReportById` and never put sensitive notes into demo data.

### H3 — Evidence storage and heatmap data are broader than the UI suggests

The `report-media` bucket is public (`20260420000000_baseline_deployed_bootstrap.sql:613-645`), the client persists `getPublicUrl()` (`src/services/reports/index.js:73-80`), and the approved-row policy exposes the underlying report. `get_approved_heatmap_points` is `SECURITY DEFINER`, leaves default `PUBLIC` execution intact, accepts unsanitized day/bounding inputs, and returns report IDs, exact addresses, evidence URLs, and officer identifiers; the random coordinate offset is only about tens of metres (`database/heatmap_update.sql:28-114`). The direct-query fallback returns the same sensitive shape (`src/services/reports/index.js:742-778`).

**College-demo action:** apply Patch E.2 to drop the full-approved-row policy, revoke default function execution, restrict the RPC to routed officers, validate `daysBack`/bbox ranges, and test the map with the officer account. **Enterprise follow-up:** make the bucket private, persist storage paths rather than public URLs, issue short-lived signed URLs after RLS/authorization checks, remove the direct fallback, and return only fields the map renders.

### H4 — AI “code decides” claims are weakened by invented confidence

`parseVisionEvidence` defaults an unknown vehicle to `motorcycle`, plate confidence to `0.95`, rider-count confidence to `0.95`, helmet confidence to `0.95`, and turns a model's `NO_HELMET` label into `CONFIRMED_ABSENT`: `src/services/ai/index.js:74-94`. The rule engine then confirms triple riding solely from a model label (`ruleEngine.js:121-138`) and confirms no-helmet on that label regardless of structured confidence (`:178-192`). Missing overall confidence is displayed as 70% (`src/services/ai/index.js:178`).

**Impact:** the LLM can directly decide a violation and missing evidence becomes high-confidence evidence, contradicting the project's claimed fail-closed rule engine.

**Exact repair:** Patch F removes fabricated defaults and requires structured, visible evidence. Add regression tests in which a model returns only `detected_violations`; the result must be `uncertain`, never `confirmed`.

### H5 — Provider hard-4xx handling does not fully “fail closed”

The transport correctly maps 5xx/402/429 to transient unavailable errors, applies AbortController deadlines of 12s/10s/8s, drains upstream errors, and rejects empty or >16,000-character output (`providers.ts:183-225`). However, `break` at `providers.ts:286` exits only the inner key loop; the outer model/provider loop continues. Therefore a hard 400/401/403 stops key rotation for one attempt but does not stop the stage as the comment claims.

**Exact code change:** replace the non-transient `break` with immediate rethrow after attaching attempt/latency metadata, then test that no later provider is called after a hard 4xx. Whether to fail the entire stage or skip only the broken provider should be a documented policy; the current code and comment disagree.

### H6 — Deployment configuration is not reproducible

The function was reportedly deployed with `--no-verify-jwt`, while `supabase/config.toml` contains no `[functions.ai-analyze]` section. The CLI default is `verify_jwt = true`, so a later deploy without the flag can silently change behavior. Add:

```toml
[functions.ai-analyze]
verify_jwt = false
```

The function still rejects missing/invalid users through `auth.getUser()` before provider use; `--no-verify-jwt` disables the gateway check, not the application's check. Current Supabase documentation describes the available [Edge Function authorization patterns](https://supabase.com/docs/guides/functions/auth) and [authorization headers](https://supabase.com/docs/guides/functions/auth-headers). For a later platform migration, evaluate `@supabase/server` in the Edge runtime; do **not** install a server-only package into the React Native bundle merely because the mobile app uses Supabase.

### H7 — Operational and test debt

- There is no CI and no database integration test suite.
- `scripts/supabase_full_audit.js` treats “no error” as permission, but RLS-denied UPDATE/DELETE may legally affect zero rows without an error; this is not a valid authorization test.
- `scripts/supabase_deep_audit.js` relies on anonymous OpenAPI exposure and puts the public key in a URL query. Supabase's 2026 platform changes make implicit exposure of new public tables no longer a stable assumption; explicit grants are required. See the official [Supabase changelog](https://supabase.com/changelog).
- `scripts/test_officer_approval_flow.js` simulates SQL semantics in JavaScript; it does not test PostgreSQL locks, triggers, grants, or RLS.
- `FINAL_TRAFFIC_EYE_PRODUCTION_AUDIT.md` declares production readiness and conflicts with the current evidence and `PRODUCTION_READINESS.md`. Archive or clearly mark the stale report to avoid confusing examiners.

## 5. Exhaustive SQL audit and master execution map

### Single source of truth

There is **no safe execution order for all files in `database/`**. They are a mix of a broken historical bootstrap, duplicate migration mirrors, manual hotfixes, diagnostics, hardcoded account mutations, and destructive resets. Executing all of them is unsafe and can reintroduce old policies/functions after newer repairs.

The only authoritative clean-build chain is the timestamped folder, in lexical order:

1. `supabase/migrations/20260420000000_baseline_deployed_bootstrap.sql` — local clean-build baseline only; deliberately recreates the insecure historical state.
2. `supabase/migrations/20260816000001_production_security_rewards_routing.sql`.
3. `supabase/migrations/20260816000002_security_hardening_patch.sql`.
4. `supabase/migrations/20260817000001_fix_officer_review_and_guard_trigger.sql`.
5. `supabase/migrations/20260909182341_phase1_ai_analysis_events.sql`.
6. **A new forward migration created with `supabase migration new capstone_security_repair`**, containing the reviewed equivalents of Patches A–E below.

This order is reproducible but **not safe until step 6 exists**. Do not rewrite already-applied historical migrations; add a forward repair. On the hosted project, inspect `supabase_migrations.schema_migrations` and apply only missing forward migrations. Never run the baseline or resets against hosted data.

`database/Traffic_Eye_Database.sql` is not an alternative clean baseline. It creates policies that call `is_officer()` before defining the function and contains an orphaned PL/pgSQL block after `submit_officer_review`; a clean run can fail despite its “safe to re-run” header.

### Disposition of every `database/*.sql` file

| File | Disposition | Reason |
|---|---|---|
| `Traffic_Eye_Database.sql` | **Archive; never execute** | Broken/ordering-sensitive historical dump; superseded by the baseline migration. |
| `ai_ana;ysis.sql` | **Delete after archival** | Duplicate of the Phase 1 ledger script, misspelled filename, and missing Token Harbor provider. |
| `PHASE1_SQL_EDITOR.sql` | **Reference only; do not execute after migration 5** | Manual duplicate of migration 5; keep only if clearly marked as SQL-Editor recovery documentation. |
| `block_role_escaltion.sql` | **Do not execute as-is; incorporate into step 6** | Directionally correct citizen-only creation, but untracked and uses weaker `search_path=public`. |
| `confirm_email.sql` | **Delete/quarantine** | Hardcoded account mutation in `auth.users`; inappropriate in a production migration. |
| `cross_duplication.sql` | **Delete after archival** | Schema already exists in baseline; anonymous `SECURITY DEFINER` hash oracle leaks existing report IDs. |
| `data_reset.sql` | **Quarantine outside migration folders** | Destructive and disables a guard trigger without transaction safety; a failure can leave protection disabled. |
| `full_data_reset_turnate+identity_reset.sql` | **Quarantine/delete** | Destructive truncation; misspelled and incompatible with current guard behavior. |
| `fix_report_approval.sql` | **Draft/reference only** | Later manual function draft; not authoritative and still contains insecure reward parameters/search path. |
| `heatmap.sql` | **Delete** | Superseded by `heatmap_update.sql` and has an inferior bbox/null predicate. |
| `heatmap_update.sql` | **Reference only; rewrite into step 6** | Newer heatmap implementation, but still has broad approved-row policy, weak privacy, no input bounds, and default function execution. |
| `image_integrity_migration.sql` | **Delete after archival** | `image_hash` and `authenticity_check` already exist in baseline. |
| `juridiction_routing.sql` | **Delete after folding indexes forward** | Index-only draft already represented by baseline; no actual jurisdiction authorization. |
| `migration_rsl_for_gift_redemption.sql` | **Delete** | Re-enables client point-transaction INSERT and uses deprecated/insufficient `auth.role()` checks. |
| `notification_bug_fix.sql` | **Delete** | Obsolete duplicate review function; later migration supersedes it. |
| `officer_profile_index.sql` | **Move to diagnostics/docs** | Read-only diagnostic/index check, not a schema migration. |
| `officer_profile_lookup.sql` | **Move to diagnostics/docs** | Account lookup query, not a migration; may expose personal data during demos. |
| `patch_migration_for_reportsandRewards.sql` | **Delete/archive** | Old public-bucket and unsafe review-function patch, superseded by baseline/later migrations. |
| `production_security.sql` | **Delete manual duplicate** | Byte-equivalent mirror of migration `20260816000001`; dual copies invite drift. |
| `security_harden.sql` | **Delete manual duplicate** | Mirror of migration `20260816000002`; keep only timestamped migration. |

After cleanup, `database/` should contain documentation/read-only diagnostics only; executable schema history belongs exclusively in `supabase/migrations/`.

### Schema/index integrity observations

- Core foreign keys and supporting indexes are generally present for report/user/media/review/notification access paths.
- `image_hash` and `authenticity_check` are already consolidated into the baseline at lines 102-104.
- `duplicate_report_id` does not exist, so neither its self-FK nor index exists; Patch A supplies both.
- The heatmap partial index `(status, reviewed_at DESC) WHERE status='approved'` stores a constant leading key. Prefer `(reviewed_at DESC) WHERE status='approved'`.
- The location-address trigram and profile-jurisdiction indexes improve lookup speed but do not enforce authorization.
- `check_image_duplicate` is granted to `anon` in the baseline (`:402`) and returns another report's ID. Revoke anonymous execution and return only a boolean to ordinary citizens.
- `check_plate_duplicate` similarly reveals an existing report UUID. Return a boolean to citizens; expose the related record only to an officer who passes routing authorization.
- PostgreSQL warns that policy subqueries and concurrent updates need careful locking/snapshot design; the relevant reference is the official [PostgreSQL row-security documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

## 6. Edge Function and AI pipeline audit

### Passed controls

- Provider keys are read only from environment names; no credential value is logged or returned (`providers.ts:76-95`).
- The client cannot select provider, model, endpoint, or server prompt (`providers.ts:21-62`).
- Token Harbor is primary; NVIDIA/Gemini are vision/OCR fallbacks and Groq is an audit fallback.
- 5xx, 402, 429, timeouts, and network failures advance through configured attempts; missing providers are skipped.
- Per-attempt AbortController timers are 12 seconds for vision, 10 seconds for OCR, and 8 seconds for audit (`providers.ts:64-68,183-225`).
- Successful completion text must be non-empty and at most 16,000 characters (`providers.ts:209-216`).
- The Edge handler bounds decoded media at 8 MiB, checks content type/base64/JPEG framing, requires a verified user, and reserves the quota before provider I/O.
- The AI ledger contains no evidence, location, prompt, token, or provider body; service-role-only insertion/update and per-user advisory locks are strong design choices (`20260909182341_phase1_ai_analysis_events.sql:26-98`).

### Remaining AI work

- Apply the Token Harbor constraint fix before relying on the primary path.
- Make hard-4xx behavior match its documented fail-closed policy.
- Validate provider JSON against a strict stage schema before returning it; “valid JSON” is weaker than “valid evidence.” Reject unknown enums, missing confidence fields, non-finite/range-invalid numbers, and oversized arrays/strings.
- Delimit prior model output as untrusted data in the audit prompt. Prompting is a safety layer, not an authorization boundary.
- The prompt schema and rule engine fields should be aligned for red-light/wrong-way cases; otherwise those violations cannot be confirmed from structured evidence as intended.
- Treat AI as advisory. Only an authenticated, routed officer transaction should create a legal/points consequence.

## 7. Mobile, release, and demo readiness

### Passed controls

- UI/report-service double-submit protection and stable IDs are sound within one app session.
- Unknown network outcomes do not immediately create a second report; the service reconciles by stable ID.
- Report uploads use `upsert:false`, and definite insert failures trigger best-effort orphan cleanup.
- Demo records are conspicuously marked and cannot reach the central report mutation path.
- MapLibre heatmap and clustering are implemented with `GeoJSONSource` and native layers (`ViolationHeatmap.js:680-736`).
- CSV formula neutralization and PDF escaping have focused tests.
- Android manifest sets `allowBackup="false"` and does not request legacy external storage.

### Release blockers and follow-ups

| Priority | Item | Classification |
|---|---|---|
| P0 | Apply/verify Patches A–E and rotate exposed credentials | Must fix for demo |
| P0 | Run real citizen→AI→save→realtime→officer review→one reward/notification flow | Must fix for demo |
| P0 | Test the exact preview/release APK on physical Android hardware, including a 15-second video | Must fix for demo |
| P1 | Persist encrypted draft/submission recovery state across app restarts | Enterprise/future |
| P1 | Replace Base64 whole-file upload; make evidence bucket private and use signed URLs | Enterprise/future |
| P1 | Add pgTAP/integration tests on an isolated hosted staging Supabase project; no Docker required | Must add before claiming production readiness |
| P1 | Add CI for lint, Jest/coverage, migration lint/diff, Android build, and secret scanning | Enterprise/future |
| P2 | Increase password requirements, confirmations, CAPTCHA/MFA as deployment policy requires | Enterprise/future |
| P2 | Validate iOS permissions/privacy metadata and test on physical iOS hardware | Required for iOS release |

## 8. Copy-ready remediation patches

These patches are **audit deliverables, not applied changes**. Put reviewed versions into one new forward migration, run the preflight queries, apply to an isolated/staging Supabase project, execute the integration matrix, and only then apply to the demo project. Do not run baseline/reset SQL against hosted data.

### Patch A — schema drift and Token Harbor ledger

```sql
BEGIN;

ALTER TABLE public.image_reports
    ADD COLUMN IF NOT EXISTS location_source text,
    ADD COLUMN IF NOT EXISTS possible_duplicate boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS duplicate_report_id uuid;

ALTER TABLE public.image_reports
    ADD CONSTRAINT image_reports_location_source_length
        CHECK (location_source IS NULL OR char_length(location_source) <= 64),
    ADD CONSTRAINT image_reports_duplicate_report_fk
        FOREIGN KEY (duplicate_report_id)
        REFERENCES public.image_reports(id) ON DELETE SET NULL,
    ADD CONSTRAINT image_reports_duplicate_not_self
        CHECK (duplicate_report_id IS NULL OR duplicate_report_id <> id),
    ADD CONSTRAINT image_reports_duplicate_consistency
        CHECK (possible_duplicate OR duplicate_report_id IS NULL);

CREATE INDEX image_reports_duplicate_report_id_idx
    ON public.image_reports (duplicate_report_id)
    WHERE duplicate_report_id IS NOT NULL;

ALTER TABLE public.ai_analysis_events
    DROP CONSTRAINT IF EXISTS ai_analysis_events_provider_check;
ALTER TABLE public.ai_analysis_events
    ADD CONSTRAINT ai_analysis_events_provider_check
    CHECK (provider IN ('tokenharbor', 'nvidia', 'gemini', 'groq'));

COMMIT;
```

Because this is a one-time forward migration, the named constraints/index are intentionally not silently recreated. Before applying to a database that may contain hand-added columns/constraints, inspect `pg_constraint` and `pg_indexes` and reconcile names rather than deleting data.

### Patch B — caller-bound, idempotent submission points and server-owned redemption

Preflight must return zero duplicate groups before creating the unique indexes. If it does not, stop and reconcile both transaction rows and balances manually.

```sql
SELECT user_id, action, reference_id, count(*)
FROM public.point_transactions
WHERE action IN ('report_submitted', 'report_approved')
GROUP BY user_id, action, reference_id
HAVING count(*) > 1;
```

```sql
BEGIN;

DROP POLICY IF EXISTS "System can insert transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Citizens can insert own redemption transactions" ON public.point_transactions;
REVOKE INSERT, UPDATE, DELETE ON public.point_transactions FROM PUBLIC, anon, authenticated;

CREATE UNIQUE INDEX point_transactions_one_submission_award
    ON public.point_transactions (user_id, reference_id)
    WHERE action = 'report_submitted';
CREATE UNIQUE INDEX point_transactions_one_approval_award
    ON public.point_transactions (user_id, reference_id)
    WHERE action = 'report_approved';

REVOKE ALL ON FUNCTION public.award_points(uuid, text, uuid)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_points(uuid, integer, text, text, uuid)
    FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.award_points(uuid, text, uuid);
DROP FUNCTION public.award_points(uuid, integer, text, text, uuid);

CREATE OR REPLACE FUNCTION public.award_submission_points(
    p_user_id uuid,
    p_report_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid := (SELECT auth.uid());
    v_transaction_id uuid;
BEGIN
    IF v_user_id IS NULL OR p_user_id IS DISTINCT FROM v_user_id THEN
        RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
    END IF;

    PERFORM 1
    FROM public.image_reports
    WHERE id = p_report_id AND user_id = v_user_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Owned report not found' USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.point_transactions
        (user_id, amount, type, action, reference_id, description)
    VALUES
        (v_user_id, 10, 'earned', 'report_submitted', p_report_id,
         'Base submission reward for filing a traffic violation report')
    ON CONFLICT (user_id, reference_id) WHERE action = 'report_submitted'
    DO NOTHING
    RETURNING id INTO v_transaction_id;

    IF v_transaction_id IS NULL THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', true, 'skipped', true, 'pointsAwarded', 0
        );
    END IF;

    PERFORM pg_catalog.set_config('traffic_eye.allow_profile_update', 'on', true);
    UPDATE public.profiles
    SET points_balance = points_balance + 10
    WHERE id = v_user_id;

    RETURN pg_catalog.jsonb_build_object(
        'success', true, 'skipped', false, 'pointsAwarded', 10
    );
END;
$$;
REVOKE ALL ON FUNCTION public.award_submission_points(uuid, uuid)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_submission_points(uuid, uuid)
    TO authenticated;

CREATE TABLE public.reward_catalog (
    id text PRIMARY KEY,
    title text NOT NULL,
    points integer NOT NULL CHECK (points > 0),
    active boolean NOT NULL DEFAULT true
);
INSERT INTO public.reward_catalog (id, title, points) VALUES
    ('r_stickers', 'Reflective Stickers', 300),
    ('r_keychain', 'Safety Keychain', 400),
    ('r_goggles', 'UV Riding Goggles', 500),
    ('r_gloves', 'Riding Gloves', 600),
    ('r_mount', 'Phone Mount', 700),
    ('r_firstaid', 'First Aid Kit', 800),
    ('r_boots', 'Riding Boots', 1000),
    ('r_helmet', 'Safety Helmet', 1200),
    ('r_kneeguard', 'Knee Guards', 1400),
    ('r_jacket', 'Riding Jacket', 1600),
    ('r_dashcam', 'Dash Camera', 1800),
    ('r_smarthelmet', 'Smart Helmet Pro', 2000);

CREATE TABLE public.reward_redemptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_id text NOT NULL REFERENCES public.reward_catalog(id),
    points_spent integer NOT NULL CHECK (points_spent > 0),
    coupon_code text NOT NULL UNIQUE,
    unlocked_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    UNIQUE (user_id, item_id)
);
CREATE INDEX reward_redemptions_user_created_idx
    ON public.reward_redemptions (user_id, unlocked_at DESC);
ALTER TABLE public.reward_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reward_catalog, public.reward_redemptions
    FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.reward_catalog, public.reward_redemptions TO authenticated;
CREATE POLICY reward_catalog_read_active ON public.reward_catalog
    FOR SELECT TO authenticated USING (active);
CREATE POLICY reward_redemptions_read_own ON public.reward_redemptions
    FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.redeem_reward_item(
    p_user_id uuid,
    p_item_id text,
    p_points integer,
    p_item_title text,
    p_coupon text,
    p_expires_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid := (SELECT auth.uid());
    v_balance integer;
    v_item public.reward_catalog%ROWTYPE;
    v_coupon text;
    v_now timestamptz := pg_catalog.clock_timestamp();
    v_expiry timestamptz;
BEGIN
    IF v_user_id IS NULL OR p_user_id IS DISTINCT FROM v_user_id THEN
        RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_item
    FROM public.reward_catalog
    WHERE id = p_item_id AND active;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reward is unavailable' USING ERRCODE = '22023';
    END IF;

    SELECT points_balance INTO v_balance
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.reward_redemptions
        WHERE user_id = v_user_id AND item_id = v_item.id
    ) THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false, 'error', 'Reward already redeemed.'
        );
    END IF;
    IF v_balance < v_item.points THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false, 'error', 'Insufficient points balance.',
            'balance', v_balance
        );
    END IF;

    v_coupon := 'TE-' || pg_catalog.upper(pg_catalog.substring(
        pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '') FROM 1 FOR 8
    ));
    v_expiry := v_now + interval '15 days';

    INSERT INTO public.reward_redemptions
        (user_id, item_id, points_spent, coupon_code, unlocked_at, expires_at)
    VALUES
        (v_user_id, v_item.id, v_item.points, v_coupon, v_now, v_expiry);

    PERFORM pg_catalog.set_config('traffic_eye.allow_profile_update', 'on', true);
    UPDATE public.profiles
    SET points_balance = points_balance - v_item.points
    WHERE id = v_user_id;

    INSERT INTO public.point_transactions
        (user_id, amount, type, action, description)
    VALUES
        (v_user_id, v_item.points, 'redeemed', 'gift_redeemed',
         pg_catalog.jsonb_build_object(
             'itemId', v_item.id, 'itemTitle', v_item.title,
             'couponCode', v_coupon, 'unlockedAt', v_now,
             'expiresAt', v_expiry
         )::text);

    RETURN pg_catalog.jsonb_build_object(
        'success', true, 'newBalance', v_balance - v_item.points,
        'couponCode', v_coupon, 'unlockedAt', v_now, 'expiresAt', v_expiry
    );
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_reward_item(uuid, text, integer, text, text, timestamptz)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_reward_item(uuid, text, integer, text, text, timestamptz)
    TO authenticated;

COMMIT;
```

The retained redemption signature avoids an immediate mobile-breaking change, but the function intentionally ignores client price/title/coupon/expiry and derives trusted values server-side. A later API cleanup should accept only `p_item_id`.

### Patch C — force citizen sign-up and protect profile authority fields

```sql
BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (
        NEW.id,
        NEW.email,
        pg_catalog.coalesce(NEW.raw_user_meta_data->>'full_name', ''),
        pg_catalog.coalesce(NEW.raw_user_meta_data->>'phone', ''),
        'citizen'
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_protected_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF pg_catalog.current_setting('traffic_eye.allow_profile_update', true) = 'on' THEN
        RETURN NEW;
    END IF;

    IF NEW.points_balance IS DISTINCT FROM OLD.points_balance
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.badge_id IS DISTINCT FROM OLD.badge_id
       OR NEW.jurisdiction IS DISTINCT FROM OLD.jurisdiction
       OR NEW.department IS DISTINCT FROM OLD.department THEN
        RAISE EXCEPTION 'Protected profile fields require a trusted path'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_protected_profile_columns() FROM PUBLIC, anon, authenticated;

COMMIT;
```

Mobile change:

```diff
--- a/src/services/auth/index.js
+++ b/src/services/auth/index.js
@@
-    signUpOfficer: async (email, password, fullName, badgeId, department, jurisdiction) => {
-        return await supabase.auth.signUp({ /* client-controlled officer metadata */ });
-    },
+    signUpOfficer: async () => ({
+        data: null,
+        error: new Error('Officer accounts require trusted administrator provisioning.'),
+    }),
```

### Patch D — close direct writes and enforce routed officer reads

```sql
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.officer_can_access_report(p_address text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.role = 'officer'
          AND (
              (
                  pg_catalog.nullif(pg_catalog.btrim(p.jurisdiction), '') IS NOT NULL
                  AND pg_catalog.strpos(
                      pg_catalog.lower(pg_catalog.coalesce(p_address, '')),
                      pg_catalog.lower(pg_catalog.btrim(p.jurisdiction))
                  ) > 0
              )
              OR (
                  pg_catalog.substring(p.badge_id FROM '([0-9]+)$') IS NOT NULL
                  AND pg_catalog.strpos(
                      pg_catalog.coalesce(p_address, ''),
                      '400' || CASE
                          WHEN pg_catalog.length(pg_catalog.substring(p.badge_id FROM '([0-9]+)$')) < 3
                          THEN pg_catalog.lpad(pg_catalog.substring(p.badge_id FROM '([0-9]+)$'), 3, '0')
                          ELSE pg_catalog.substring(p.badge_id FROM '([0-9]+)$')
                      END
                  ) > 0
              )
          )
    );
$$;
REVOKE ALL ON FUNCTION private.officer_can_access_report(text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.officer_can_access_report(text) TO authenticated;

DROP POLICY IF EXISTS "System can insert transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Citizens can insert own redemption transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "System insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Officers insert reviews" ON public.officer_reviews;
DROP POLICY IF EXISTS "Officers update report status" ON public.image_reports;
DROP POLICY IF EXISTS "Officers view all pending reports" ON public.image_reports;
DROP POLICY IF EXISTS "Anyone can view approved image reports" ON public.image_reports;
DROP POLICY IF EXISTS "Citizens insert own reports" ON public.image_reports;
DROP POLICY IF EXISTS "Officers view all report media" ON public.report_media;
DROP POLICY IF EXISTS "Officers view own reviews" ON public.officer_reviews;

REVOKE INSERT ON public.point_transactions, public.notifications, public.officer_reviews
    FROM PUBLIC, anon, authenticated;
REVOKE UPDATE ON public.image_reports FROM PUBLIC, anon, authenticated;

CREATE POLICY citizens_insert_own_pending_reports
ON public.image_reports FOR INSERT TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND status = 'pending'
    AND reward_amount = 0
    AND reviewed_at IS NULL
);

CREATE POLICY officers_read_routed_reports
ON public.image_reports FOR SELECT TO authenticated
USING (private.officer_can_access_report(location_address));

CREATE POLICY officers_read_routed_media
ON public.report_media FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.image_reports r
        WHERE r.id = report_media.report_id
          AND private.officer_can_access_report(r.location_address)
    )
);

CREATE POLICY officers_read_routed_reviews
ON public.officer_reviews FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.image_reports r
        WHERE r.id = officer_reviews.report_id
          AND private.officer_can_access_report(r.location_address)
    )
);

COMMIT;
```

This helper deliberately mirrors the current app's jurisdiction keyword/badge-derived Mumbai PIN behavior. It is a suitable demo boundary, not a general geospatial authorization system. The enterprise design should store a trusted routed jurisdiction ID or PostGIS boundary at report creation and compare IDs/geometries rather than parsing addresses.

### Patch E — authenticated, routed, locked officer review

```sql
CREATE OR REPLACE FUNCTION public.submit_officer_review(
    p_report_id uuid,
    p_officer_id uuid,
    p_decision text,
    p_remarks text DEFAULT NULL,
    p_internal text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id uuid := (SELECT auth.uid());
    v_report public.image_reports%ROWTYPE;
    v_review_id uuid;
    v_reward integer := 0;
    v_award_id uuid;
BEGIN
    IF v_caller_id IS NULL OR p_officer_id IS DISTINCT FROM v_caller_id THEN
        RAISE EXCEPTION 'Officer identity does not match authenticated caller'
            USING ERRCODE = '42501';
    END IF;
    IF p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid decision' USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = v_caller_id AND role = 'officer'
    ) THEN
        RAISE EXCEPTION 'Verified officer required' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_report
    FROM public.image_reports
    WHERE id = p_report_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report not found' USING ERRCODE = 'P0002';
    END IF;
    IF NOT private.officer_can_access_report(v_report.location_address) THEN
        RAISE EXCEPTION 'Report is outside officer jurisdiction' USING ERRCODE = '42501';
    END IF;
    IF v_report.status <> 'pending' THEN
        RETURN pg_catalog.jsonb_build_object(
            'success', false, 'already_reviewed', true,
            'current_status', v_report.status
        );
    END IF;

    INSERT INTO public.officer_reviews
        (report_id, officer_id, decision, remarks, internal_notes)
    VALUES
        (p_report_id, v_caller_id, p_decision, p_remarks, p_internal)
    ON CONFLICT (report_id) DO UPDATE
    SET officer_id = EXCLUDED.officer_id,
        decision = EXCLUDED.decision,
        remarks = EXCLUDED.remarks,
        internal_notes = EXCLUDED.internal_notes,
        review_timestamp = pg_catalog.clock_timestamp()
    RETURNING id INTO v_review_id;

    IF p_decision = 'approved' THEN
        v_reward := CASE pg_catalog.lower(pg_catalog.coalesce(v_report.severity, 'medium'))
            WHEN 'low' THEN 50 WHEN 'medium' THEN 70
            WHEN 'high' THEN 100 WHEN 'critical' THEN 100 ELSE 50 END;
    END IF;

    UPDATE public.image_reports
    SET status = p_decision,
        reviewed_at = pg_catalog.clock_timestamp(),
        reward_amount = v_reward
    WHERE id = p_report_id;

    IF p_decision = 'approved' AND v_reward > 0 THEN
        INSERT INTO public.point_transactions
            (user_id, amount, type, action, reference_id, description)
        VALUES
            (v_report.user_id, v_reward, 'earned', 'report_approved', p_report_id,
             'Reward for approved traffic violation report')
        ON CONFLICT (user_id, reference_id) WHERE action = 'report_approved'
        DO NOTHING
        RETURNING id INTO v_award_id;

        IF v_award_id IS NOT NULL THEN
            PERFORM pg_catalog.set_config('traffic_eye.allow_profile_update', 'on', true);
            UPDATE public.profiles
            SET points_balance = points_balance + v_reward
            WHERE id = v_report.user_id;
        END IF;
    END IF;

    INSERT INTO public.notifications (user_id, title, body, type, reference_id)
    VALUES (
        v_report.user_id,
        CASE WHEN p_decision = 'approved' THEN 'Report Approved!' ELSE 'Report Rejected' END,
        pg_catalog.coalesce(
            p_remarks,
            CASE WHEN p_decision = 'approved'
                THEN 'Your report was approved and reward points were credited.'
                ELSE 'Your report was reviewed and rejected.' END
        ),
        CASE WHEN p_decision = 'approved' THEN 'report_approved' ELSE 'report_rejected' END,
        p_report_id
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true, 'already_reviewed', false,
        'review_id', v_review_id, 'decision', p_decision,
        'reward_amount', v_reward
    );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_officer_review(uuid, uuid, text, text, text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_officer_review(uuid, uuid, text, text, text)
    TO authenticated;
```

For full H2 remediation, replace the `internal_notes` column write in this function with a write to a locked-down `private.officer_review_notes` table, then remove the public column and the generic client selection.

### Patch E.1 — remove private notes from the exposed schema

Apply this in the same transaction as a Patch E variant that uses the replacement insert shown below; otherwise the old function will still reference the removed column.

```sql
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE private.officer_review_notes (
    review_id uuid PRIMARY KEY
        REFERENCES public.officer_reviews(id) ON DELETE CASCADE,
    note text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON private.officer_review_notes FROM PUBLIC, anon, authenticated;

INSERT INTO private.officer_review_notes (review_id, note)
SELECT id, internal_notes
FROM public.officer_reviews
WHERE pg_catalog.nullif(pg_catalog.btrim(internal_notes), '') IS NOT NULL
ON CONFLICT (review_id) DO UPDATE
SET note = EXCLUDED.note, updated_at = pg_catalog.clock_timestamp();

ALTER TABLE public.officer_reviews DROP COLUMN internal_notes;
```

Use this block inside Patch E instead of its `INSERT INTO public.officer_reviews ... internal_notes` block:

```sql
INSERT INTO public.officer_reviews
    (report_id, officer_id, decision, remarks)
VALUES
    (p_report_id, v_caller_id, p_decision, p_remarks)
ON CONFLICT (report_id) DO UPDATE
SET officer_id = EXCLUDED.officer_id,
    decision = EXCLUDED.decision,
    remarks = EXCLUDED.remarks,
    review_timestamp = pg_catalog.clock_timestamp()
RETURNING id INTO v_review_id;

IF pg_catalog.nullif(pg_catalog.btrim(p_internal), '') IS NOT NULL THEN
    INSERT INTO private.officer_review_notes (review_id, note)
    VALUES (v_review_id, p_internal)
    ON CONFLICT (review_id) DO UPDATE
    SET note = EXCLUDED.note,
        updated_at = pg_catalog.clock_timestamp();
END IF;
```

Remove the field from the shared mobile query:

```diff
--- a/src/services/reports/index.js
+++ b/src/services/reports/index.js
@@
-                internal_notes,
```

If officers later need to read private notes, add a narrowly scoped `SECURITY DEFINER` RPC that verifies `auth.uid()`, officer role, and routed report access; do not re-expose the table.

### Patch E.2 — officer-only, bounded heatmap RPC

```sql
BEGIN;

DROP POLICY IF EXISTS "Anyone can view approved image reports"
    ON public.image_reports;

CREATE OR REPLACE FUNCTION public.get_approved_heatmap_points(
    p_min_lat double precision DEFAULT NULL,
    p_max_lat double precision DEFAULT NULL,
    p_min_lng double precision DEFAULT NULL,
    p_max_lng double precision DEFAULT NULL,
    p_days_back integer DEFAULT 365
) RETURNS TABLE (
    id uuid,
    latitude double precision,
    longitude double precision,
    location_address text,
    violation_type text,
    severity text,
    reviewed_at timestamptz,
    submitted_at timestamptz,
    weight integer,
    officer_name text,
    officer_badge text,
    officer_jurisdiction text,
    image_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_cutoff timestamptz;
BEGIN
    IF p_days_back IS NULL OR p_days_back NOT BETWEEN 1 AND 3650 THEN
        RAISE EXCEPTION 'p_days_back must be between 1 and 3650'
            USING ERRCODE = '22023';
    END IF;
    IF NOT (
        (p_min_lat IS NULL AND p_max_lat IS NULL AND p_min_lng IS NULL AND p_max_lng IS NULL)
        OR
        (p_min_lat IS NOT NULL AND p_max_lat IS NOT NULL AND p_min_lng IS NOT NULL AND p_max_lng IS NOT NULL)
    ) THEN
        RAISE EXCEPTION 'Bounding box must be fully specified or fully null'
            USING ERRCODE = '22023';
    END IF;
    IF p_min_lat IS NOT NULL AND (
        p_min_lat < -90 OR p_max_lat > 90 OR p_min_lat > p_max_lat
        OR p_min_lng < -180 OR p_max_lng > 180 OR p_min_lng > p_max_lng
    ) THEN
        RAISE EXCEPTION 'Invalid bounding box' USING ERRCODE = '22023';
    END IF;

    v_cutoff := pg_catalog.clock_timestamp()
        - pg_catalog.make_interval(days => p_days_back);

    RETURN QUERY
    SELECT
        r.id,
        r.latitude,
        r.longitude,
        r.location_address,
        r.violation_type,
        r.severity,
        r.reviewed_at,
        r.submitted_at,
        CASE pg_catalog.lower(pg_catalog.coalesce(r.severity, 'low'))
            WHEN 'critical' THEN 4 WHEN 'high' THEN 3
            WHEN 'medium' THEN 2 ELSE 1 END::integer,
        p.full_name,
        p.badge_id,
        p.jurisdiction,
        r.image_url
    FROM public.image_reports r
    LEFT JOIN public.officer_reviews o ON o.report_id = r.id
    LEFT JOIN public.profiles p ON p.id = o.officer_id
    WHERE r.status = 'approved'
      AND private.officer_can_access_report(r.location_address)
      AND pg_catalog.coalesce(r.reviewed_at, r.submitted_at) >= v_cutoff
      AND (
          p_min_lat IS NULL
          OR (
              r.latitude IS NOT NULL AND r.longitude IS NOT NULL
              AND r.latitude BETWEEN p_min_lat AND p_max_lat
              AND r.longitude BETWEEN p_min_lng AND p_max_lng
          )
      )
    ORDER BY pg_catalog.coalesce(r.reviewed_at, r.submitted_at) DESC
    LIMIT 500;
END;
$$;

REVOKE ALL ON FUNCTION public.get_approved_heatmap_points(
    double precision, double precision, double precision, double precision, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_approved_heatmap_points(
    double precision, double precision, double precision, double precision, integer
) TO authenticated;

DROP INDEX IF EXISTS public.idx_image_reports_heatmap;
CREATE INDEX image_reports_approved_reviewed_idx
    ON public.image_reports (reviewed_at DESC)
    WHERE status = 'approved';

COMMIT;
```

Remove `fetchApprovedMapReports` and the direct-table fallback in `fetchHeatmapPoints`; an RPC authorization/error must fail closed rather than retry through a broader data path.

### Patch F — fail-closed evidence normalization and hard-4xx behavior

```diff
--- a/src/services/ai/index.js
+++ b/src/services/ai/index.js
@@
-    const helmetStatus = occupants.helmet_status || parsed.helmet_status || (violations.some(v => v.includes('NO_HELMET')) ? 'CONFIRMED_ABSENT' : 'NOT_VISIBLE');
+    const helmetStatus = occupants.helmet_status || parsed.helmet_status || 'NOT_VISIBLE';
@@
-        vehicle_type: parsed.vehicle_type || vehicle.type || 'motorcycle',
+        vehicle_type: parsed.vehicle_type || vehicle.type || '',
@@
-        plate_confidence: parsed.plate_confidence ?? vehicle.plate_confidence ?? 0.95,
+        plate_confidence: parsed.plate_confidence ?? vehicle.plate_confidence ?? 0,
@@
-        rider_count_confidence: 0.95,
+        rider_count_confidence: occupants.rider_count_confidence ?? parsed.rider_count_confidence ?? 0,
@@
-        helmet_confidence: occupants.helmet_confidence ?? 0.95,
+        helmet_confidence: occupants.helmet_confidence ?? parsed.helmet_confidence ?? 0,
@@
-        confidence:      Math.round((evidence?.overall_confidence ?? 0.7) * 100),
+        confidence:      Math.round((evidence?.overall_confidence ?? 0) * 100),
```

```diff
--- a/src/services/ai/ruleEngine.js
+++ b/src/services/ai/ruleEngine.js
@@
-    if (hasExplicitTripleViolation) {
-        return { result: 'confirmed', reason: `Triple riding explicitly identified on two-wheeler (count: ${riderCount || 3}).`, violation: 'Triple Riding' };
-    }
+    // A model label is a candidate only; structured count + confidence below decide.
@@
-    const helmetConf = conf(evidence.helmet_confidence ?? evidence.helmetConfidence ?? (hasExplicitNoHelmetViolation ? 0.95 : 0));
+    const helmetConf = conf(evidence.helmet_confidence ?? evidence.helmetConfidence ?? 0);
@@
-    if (hasExplicitNoHelmetViolation || isConfirmedAbsent(helmetStatus)) {
-        if (helmetConf >= CONF_HIGH || hasExplicitNoHelmetViolation) {
+    if (isConfirmedAbsent(helmetStatus)) {
+        if (helmetConf >= CONF_HIGH) {
```

```diff
--- a/supabase/functions/ai-analyze/providers.ts
+++ b/supabase/functions/ai-analyze/providers.ts
@@
-        if (!transient) break;
+        if (!transient) {
+          last.attempts = attempts;
+          last.latencyMs = Date.now() - started;
+          throw last;
+        }
```

Update the now-unused explicit-label variables/comments and add tests for label-only evidence and 400/401/403 no-fallback behavior.

## 9. Required backend verification matrix

Run these with disposable citizen A, citizen B, in-jurisdiction officer, and out-of-jurisdiction officer accounts on a staging Supabase project. Use ordinary client JWTs—not SQL Editor/postgres—and record row counts/balances before and after.

| Test | Expected result |
|---|---|
| Citizen A signs up while injecting officer metadata | Profile is `citizen`; badge/department/jurisdiction are null. |
| Citizen A calls generic `award_points` overloads | Function absent or permission denied; no rows/balance change. |
| Citizen A awards submission points for Citizen B/report B | Permission denied; no rows/balance change. |
| Two simultaneous submission-award calls for one owned report | Exactly one transaction and one 10-point increment. |
| Citizen tampers with reward price/coupon/expiry | Server catalog price and server-generated coupon/expiry win. |
| Two simultaneous redemptions with barely enough balance | At most one succeeds; balance never negative. |
| Citizen inserts a report with `status='approved'` or nonzero reward | RLS denial. |
| Citizen inserts point transaction/notification/review directly | Permission denied. |
| Out-of-jurisdiction officer reads/reviews report | No row/permission denied; no side effects. |
| Two officers review one pending report simultaneously | One succeeds; one returns already reviewed; one review, notification, award, and balance increment. |
| Citizen requests review private notes | No private column/value accessible. |
| Anonymous caller checks image/plate duplicate or heatmap RPC | Permission denied and no report UUID leak. |
| Token Harbor completes each supported stage | Ledger row becomes success with provider `tokenharbor`; no CHECK failure. |
| AI provider returns hard 401/403 | Typed failure; no subsequent provider call under fail-closed policy. |
| Network drops after report insert commit | Retry recovers the same stable report ID; no duplicate row or upload. |

Until these tests pass against PostgreSQL, the system should be described as **unit-tested with pending database integration verification**, not production-ready.

## 10. Top-five college demo checklist

1. **Freeze and verify the backend.** Apply the new forward migration on staging, run the matrix above, then apply it to the demo project. Save read-only screenshots of migration status, RLS policies, and one successful Token Harbor ledger row.
2. **Use clean, rotated demo identities.** Rotate the previously exposed Supabase secret and the committed officer password; create one citizen and one officer through the secure admin path; preload only non-sensitive synthetic reports with matching jurisdiction.
3. **Rehearse the exact happy path on the exact APK and phone.** Citizen login → image capture → AI stages → report save → officer realtime queue → approval → one notification/reward → heatmap. Test a 15-second video and keep both phones charged with notifications/location permissions pre-approved.
4. **Prepare deterministic recovery.** Keep demo mode preloaded and visibly labeled, cache a screen recording of the live path, carry a second APK/device/hotspot, and know how to explain provider/network failure without sending demo data to production.
5. **Freeze `Pre_Main` and capture evidence.** Record the commit, build artifact/checksum, 24/24 Jest result, lint result, migration version, Edge Function version, and known limitations. Do not run reset/confirmation scripts or expose SQL Editor/secrets during the presentation.

## 11. Viva/oral-defense Q&A pointers

**Q: Why use RLS when the app already hides officer screens?**  
A: The mobile client is untrusted and can be modified. RLS and grants enforce ownership/role rules at PostgreSQL for every REST/realtime request. UI routing is convenience; database authorization is the boundary.

**Q: Is `TO authenticated` enough?**  
A: No. It only proves that a session exists. Each policy/function must bind operations to `(SELECT auth.uid())`, verify the server-side profile role, and enforce ownership or routed jurisdiction.

**Q: How do you prevent two officers from approving the same report?**  
A: `SELECT ... FOR UPDATE` locks that report row. The first transaction changes `pending`; the second waits, rereads the committed state, and exits as already reviewed. Partial unique indexes independently guarantee one reward transaction per report.

**Q: How do you prevent reward double spending?**  
A: Redemption locks the user's profile row with `FOR UPDATE`, reads the server-owned catalog price, checks balance, records a unique redemption, deducts, and writes the audit transaction inside one transaction. Two requests for one user serialize, so the balance cannot go negative.

**Q: Why multiple AI providers/models?**  
A: The Edge Function owns an ordered allow-list per stage. Transient quota, timeout, balance, or server failures advance to another configured key/model/provider. Secrets never enter the mobile bundle. The database reserves a quota event before I/O, preventing concurrent quota bypass.

**Q: Does AI automatically convict a driver?**  
A: No. Models produce structured evidence candidates; deterministic thresholds should classify confirmed/uncertain evidence, and only a verified officer transaction changes report status or awards points. The current fabricated-confidence issue is explicitly repaired/tested before making that claim.

**Q: What does the advisory lock do in the AI ledger?**  
A: `pg_advisory_xact_lock(hash(user))` serializes quota reservations for the same user only. Different users remain concurrent, while two simultaneous calls by one user cannot both observe the same pre-limit count.

**Q: Is demo mode the same as offline production support?**  
A: No. Demo mode is a deliberately synthetic, non-persistent, non-mutating presentation fallback. Production offline support would require an encrypted persisted outbox, resumable media upload, conflict handling, and expiry/consent rules.

**Q: Why MapLibre instead of Expo Go maps?**  
A: MapLibre provides native vector rendering, GeoJSON, heatmaps, and clustering without a map API key. Because it includes native code, the correct deliverable is a development/preview/standalone APK—not Expo Go.

**Q: What are the honest limitations?**  
A: Physical iOS is unverified; database integration/concurrency tests must still be executed; evidence storage should become private with signed URLs; offline recovery is not persisted; and AI outputs remain advisory rather than forensic proof. Clearly stating and prioritizing these limitations demonstrates engineering judgment.

## Final sign-off criteria

Traffic Eye may be labelled **college-demo ready** only when Patches A–E (or equivalently secure reviewed migrations) are applied and the P0 rows in the verification matrix pass on the release APK. It may be labelled **production-ready** only after private evidence delivery, persisted offline recovery, CI, hosted database integration tests, secret rotation/scanning, physical Android+iOS testing, release signing, monitoring/alerts, backup/restore rehearsal, and privacy/legal review are also complete.
