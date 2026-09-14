# Traffic Eye — Work Divided into 5 Sequential Prompts

These prompts divide the remaining production-repair work described in
`HANDOFF_AGENT_PROMPT.md` and `HANDOFF_STATUS.md` into five sequential tasks.
Run them in order. Each agent must read the authoritative files before making
changes and must update `HANDOFF_STATUS.md` with completed work, verification
results, and remaining blockers.

The authoritative implementation specification is
`TRAFFIC_EYE_REWRITTEN_COMPREHENSIVE_FIX_PROMPT.md`. If a summary below differs
from that specification, follow the specification.

---

## Prompt 1 of 5 — Validate the Baseline and Finish Phase 1

You are working on the **Traffic Eye** React Native / Expo / Android / Supabase
project at `D:\Traffic_Eye`.

Before changing anything, read these files completely:

- `TRAFFIC_EYE_REWRITTEN_COMPREHENSIVE_FIX_PROMPT.md`
- `HANDOFF_AGENT_PROMPT.md`
- `HANDOFF_STATUS.md`

Phase 0 and the Phase 1 client/Edge Function code already exist. Do not rewrite
that work from scratch. Your task is to validate the local database baseline and
finish the remaining repository-side Phase 1 work.

Required work:

1. Inspect the current git state and preserve unrelated user changes. Never edit
   the three already-applied migrations. Use forward-only migrations.
2. Add `ai_analysis_events` to a new forward-only repair migration. It must have
   the columns used by `supabase/functions/ai-analyze/index.ts`: `id`, `user_id`
   (UUID referencing profiles), `stage`, `provider`, `model`, `correlation_id`,
   `attempts`, `latency_ms`, `outcome`, `failure_code`, `request_bytes`, and
   `created_at timestamptz default now()`. Enable RLS: a user may read only their
   own rows, and only `service_role` may insert.
3. Start the local Supabase stack and run, in order:
   `./node_modules/.bin/supabase start`,
   `./node_modules/.bin/supabase db reset`, and
   `./node_modules/.bin/supabase db lint`. Fix baseline SQL errors if found, but
   do not change migrations known to have already been applied remotely.
4. Wire `npm test` through `jest-expo`. Make `npm run test:exif` exercise the
   production EXIF parser rather than `exifParserCoreCommonJS.js`. Do not yet do
   the broader Phase 4 parser rewrite unless it is strictly required to make the
   production tests truthful; document any deferred duplication.
5. Serve `ai-analyze` locally and test it with a real locally issued JWT. Confirm
   that missing provider secrets fail closed with the typed `NOT_CONFIGURED`
   response and that provider response bodies or secrets are never exposed.
6. Update `.env.example`, `.gitignore`, and `.easignore` as appropriate so public
   AI key variables are no longer encouraged or shipped. Do not print or commit
   any secret. Do not rewrite shared git history. Record that owner-side provider
   key rotation and production secret configuration remain manual actions.
7. Add or update focused tests for the work in this prompt.

Non-negotiable constraints:

- The mobile app is untrusted; derive identity from the verified JWT.
- Do not log tokens, secrets, raw EXIF, exact GPS, complete URIs, or provider
  payloads.
- This is a bare-workflow app. Never run `expo prebuild --clean`.
- Use the repository-local Supabase executable, not `npx`.
- Report unit tests, database tests, builds, and device tests separately. Never
  claim a physical-device test that was not performed.

Finish by updating `HANDOFF_STATUS.md` with exact commands and results. Clearly
list any owner action or blocker. Stop after this scope; do not begin Phase 2.

---

## Prompt 2 of 5 — Implement Phase 2 Database Security

Continue the **Traffic Eye** production repair at `D:\Traffic_Eye`. Prompt 1
must already be complete.

Read the following before editing:

- `TRAFFIC_EYE_REWRITTEN_COMPREHENSIVE_FIX_PROMPT.md`
- `HANDOFF_AGENT_PROMPT.md`
- the latest `HANDOFF_STATUS.md`
- every existing database migration and pgTAP test relevant to auth, reports,
  officers, points, notifications, storage, and public heatmaps

Implement Phase 2 as forward-only migrations. Treat the mobile client as
untrusted and derive every caller identity from `auth.uid()` or a verified JWT.

Required security repairs:

1. Stop `handle_new_user()` from accepting a privileged role from
   `raw_user_meta_data`. New public sign-ups must receive only the safe default
   role; privileged roles require a controlled server/admin path.
2. Remove the broad officer `UPDATE` policy on reports. Officers must not be able
   to edit arbitrary report columns or reports outside their authorization.
3. Remove the `p_officer_id` fallback from `submit_officer_review`; derive the
   officer from `auth.uid()` and fail closed without authenticated identity.
4. Consolidate the conflicting three-argument and five-argument `award_points`
   overloads. Prevent authenticated clients from invoking point-minting paths;
   make rewards server-derived and idempotent, with explicit grants and revokes.
5. Remove public access to complete approved-report rows and private media URLs.
6. Replace `get_approved_heatmap_points` with a privacy-preserving aggregated or
   coarse-cell result that does not expose report UUIDs, addresses, officer
   identity, image URLs, or near-exact coordinates.
7. Revoke anonymous access to `check_image_duplicate` so it cannot serve as a
   hash oracle.
8. Make the `report-media` storage bucket private. Define least-privilege storage
   policies suitable for later signed-URL access.
9. Replace notification and point-transaction policies that rely only on
   `auth.role() = 'authenticated'` with owner-scoped policies and explicit grants.
10. Audit every `SECURITY DEFINER` function: set a safe fixed `search_path`,
    revoke execution from `PUBLIC` and unauthorized roles, explicitly grant only
    intended roles, qualify security-sensitive objects, and fail closed.
11. Cover any additional Phase 2 requirements in the authoritative spec,
    including officer discovery privacy and notification-schema consistency.

Write pgTAP coverage for at least: anon, citizen A, citizen B, assigned officer,
unassigned officer, disabled officer, and admin/service paths. Test both allowed
and denied behavior, including column-level escalation attempts and direct RPC
abuse. Run `supabase db reset`, `supabase test db`, and `supabase db lint`.

Do not implement the Phase 3 submit RPC in this task except for schema/security
prerequisites that cannot safely be separated. Update `HANDOFF_STATUS.md` with
the migrations, tests, results, and any remaining risks, then stop.

---

## Prompt 3 of 5 — Build the Authoritative Submission RPC

Continue the **Traffic Eye** production repair at `D:\Traffic_Eye`. Prompts 1
and 2 must already be complete.

First read the authoritative specification, `HANDOFF_AGENT_PROMPT.md`, the latest
`HANDOFF_STATUS.md`, the current schema/migrations, and all current client report
submission paths.

Implement Phase 3: one authoritative, transactional, server-side report
submission RPC. The mobile client must not be able to bypass identity,
duplicate, rate, media, or atomicity rules.

The RPC and related forward-only schema migration must:

1. Derive the user from `auth.uid()` and reject anonymous calls. Never accept a
   trusted caller-supplied user or officer ID.
2. Accept and enforce an idempotent `client_submission_id`; retries must return
   the original typed outcome without creating another report, upload record,
   reward, or notification.
3. Serialize conflicting submissions with a transaction-scoped advisory lock or
   an equally strong database mechanism.
4. Enforce a rolling server-time rate limit of at most three accepted submissions
   per user in the preceding 60 minutes. Use server time, never client or EXIF
   capture time, and fail closed if enforcement cannot be completed.
5. Enforce the non-overridable hard incident duplicate rule: a non-rejected
   report with the same normalized plate, submitted during the prior 24 hours,
   at a great-circle distance of 500 metres or less.
6. Enforce the non-overridable hard evidence duplicate rule: the exact SHA-256
   digest of uploaded bytes already belongs to a non-rejected report.
7. Return a soft warning when the same user submits the same plate outside the
   hard duplicate window. Support an explicit `Report Anyway` retry, but never
   let that flag bypass a hard duplicate or rate limit.
8. Atomically insert the report and its media metadata, returning typed result
   codes and a complete server snapshot needed by the success screen.
9. Add and consistently use: normalized plate, server-owned `submitted_at`,
   separate nullable `captured_at`, a coordinate-pair constraint, the location
   provenance enum (`EXIF_ORIGINAL`, `EXIF_PICKER_COPY`, `DEVICE_CURRENT`,
   `DEVICE_LAST_KNOWN`, `USER_SELECTED`), the evidence SHA-256 column, and a
   private collision-resistant storage path.
10. Accept latitude or longitude value `0` as valid. Do not treat zero as missing.

Update all client submission entry points to call the authoritative service/RPC.
Remove direct insert and fail-open duplicate/rate paths from:

- `src/screens/shared/AIResultsVerification.js`
- `src/screens/citizen/VideoReport.js`
- `src/services/reports/index.js`

Do not leave a reachable legacy route. Add pgTAP tests for idempotency, rate
boundaries, spatial/time boundaries, rejected-report behavior, hard/soft
duplicate precedence, concurrency, forged identity, and direct-table/RPC abuse.
Add focused client tests for typed result handling.

Run the relevant unit tests plus `supabase db reset`, `supabase test db`, and
`supabase db lint`. Report each category separately and update
`HANDOFF_STATUS.md`. Stop before the Phase 4 evidence/media rewrite.

---

## Prompt 4 of 5 — Repair EXIF, Hashing, Media, and Citizen Screens

Continue the **Traffic Eye** production repair at `D:\Traffic_Eye`. Prompts 1–3
must already be complete.

Read the authoritative specification, `HANDOFF_AGENT_PROMPT.md`, the latest
`HANDOFF_STATUS.md`, and the current Android/media/report implementation. This
task covers Phases 4–6.

Evidence and EXIF work:

1. In `android/.../MediaStoreResolverModule.kt`, remove Strategy 2 and every
   filename/size/dimension heuristic. Resolve only by an exact MediaStore ID.
2. In `src/utils/exifParser.js`, delete the latest-100-media fallback and any
   guessed association. Never invent EXIF or GPS.
3. Replace `exifParserCore.js` / `exifParserCoreCommonJS.js` duplication with one
   production parser imported by both runtime code and tests.
4. Missing metadata must be represented as unavailable. Device-derived and
   manually selected locations must be explicitly labelled with the correct
   provenance. Latitude/longitude zero remain valid.
5. Fix `fileHash.js` so SHA-256 is calculated over the exact bytes uploaded. Do
   not silently discard URI query parameters, and do not present a hash of a
   base64 string as equivalent to `sha256sum` of the binary bytes. Re-verify the
   hash server-side against stored/uploaded evidence before accepting it.

Media and screen work:

6. Enforce the same size contract everywhere: images at most 10 MiB and videos
   at most 5 MiB. Validate at client convenience boundaries and authoritative
   server/storage boundaries.
7. Keep the media bucket private. Use collision-resistant UUID object paths,
   `upsert: false`, short-lived signed URLs for authorized reads, and cleanup or
   compensation for failed submissions/orphaned uploads.
8. Make `ReportSuccess` render only from the immutable server-returned submission
   snapshot, then safely clear `currentReport` without erasing what the success
   screen needs.
9. Implement citizen duplicate UX for hard incident duplicate, hard evidence
   duplicate, rate limit, idempotent replay, and soft warning with `Report
   Anyway`. The soft override must never bypass hard rules.
10. Ensure logs and UI errors do not expose raw EXIF, exact GPS, full local or
    signed URIs, tokens, secrets, or provider payloads.

Add a representative EXIF/media test matrix covering camera originals, picker
copies, missing EXIF, exact MediaStore matches, deliberately similar files,
URI/query handling, zero coordinates, hash parity, media limits, upload cleanup,
and typed duplicate responses. Run `npm test`, `npm run test:exif`, relevant
database tests, lint, and an Android Gradle build. Keep unit-tested,
build-tested, and physical-device-tested claims separate. Do not claim the
owner's physical-device EXIF test.

Update `HANDOFF_STATUS.md` with exact results and unresolved device checks. Stop
before officer editing and jurisdiction work.

---

## Prompt 5 of 5 — Officer Workflow, Jurisdiction, Final Verification, and SQL Deliverable

Complete the **Traffic Eye** production repair at `D:\Traffic_Eye`. Prompts 1–4
must already be complete.

Read the authoritative specification, `HANDOFF_AGENT_PROMPT.md`, the latest
`HANDOFF_STATUS.md`, all current migrations/tests, and the citizen/officer/admin
flows. This task covers Phases 7–9 and the final deliverables.

Officer and jurisdiction work:

1. Create one shared violation catalog and normalizer used consistently by AI
   output, citizen verification, officer editing, database validation, and display.
2. Initialize officer edit state only after the report and existing violations
   have loaded. Prevent stale/default state from overwriting loaded values.
3. Implement one atomic server-side RPC for the officer decision, final
   violations, audit record, status transition, notifications, and any resulting
   points/rewards. Derive the officer from `auth.uid()`, enforce assignment,
   enabled status, jurisdiction, permitted state transitions, and idempotency.
4. Preserve original submitted/AI violations separately from officer-final
   violations and retain a useful audit trail. Never silently overwrite evidence.
5. Store pincodes as text so leading zeroes and non-numeric formatting rules are
   not corrupted.
6. Make jurisdiction assignment/routing server-controlled and enforce it in RLS
   and RPC logic. Client filtering is presentation only, never authorization.

Run the complete verification pass required by the authoritative spec:

- EXIF and media test matrix
- DB security, RLS, RPC, abuse, idempotency, and concurrency pgTAP tests
- `npm test`
- `npm run test:exif`
- ESLint
- `./node_modules/.bin/supabase db reset`
- `./node_modules/.bin/supabase test db`
- `./node_modules/.bin/supabase db lint`
- Android Gradle build

Fix failures within scope. Keep pre-existing failures explicitly distinguished
from regressions. Report unit tests, database tests, lint, build tests, local
integration tests, and physical-device tests separately. Never claim a device
result that was not run.

Generate a paste-ready SQL file for the Supabase SQL Editor from the complete
forward-only repair migrations. It must be safe to apply to the current live
pre-repair schema, ordered correctly, and must not include the local baseline
migration because that baseline only recreates the already-live database. Add
clear transaction/application notes and do not include secrets.

Finally, update `HANDOFF_STATUS.md` using the six-section reporting format from
the authoritative specification. Include completed changes, exact verification
commands/results, deferred physical-device checks, owner actions (provider key
rotation and Edge secret setup), deployment order, rollback/forward-fix notes,
and any residual risks. Do not rewrite git history or deploy/reset a shared
database without explicit owner approval.

