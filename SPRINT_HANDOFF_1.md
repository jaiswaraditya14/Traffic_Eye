# Traffic Eye — Prompt 1 handoff

Date: 2026-09-12  
Repository: D:/Traffic_Eye  
Branch: Pre_Main (verified before work and again at completion)

## Outcome and scope

Prompt 1 application changes and manual Supabase guide are implemented, with the
validation results below. This continues Claude's unfinished work; it is not a
clean-worktree rewrite. **The app is not yet production-ready.** Database execution,
device testing, native configuration, dependency findings, and the security issues
listed below remain release gates.

No Docker feature, dependency, container configuration, or test workflow was added.
An attempted local database-validation setup was cancelled at the user's request;
the Docker Desktop processes launched for that attempt were closed. No container
was created and no SQL was executed. No live Supabase writes, function deployment,
secret changes, build publication, commits, or branch switches were performed.

SUPABASE_CHANGES.md already existed from Claude before application edits in this
continuation. It has been reconciled with repository SQL and corrected; no claim
is made that the hosted schema matches the repository.

## Completed work

- Preserved and completed the navy/amber theme foundation: semantic colors, seven
  DM Sans typography presets, required spacing/radii, four shadows, three springs.
  Existing Nunito aliases remain compatible; no blind whole-app restyling.
- Retained StatusPill, ConfirmationModal, and PressableScale. Corrected the
  pressable's actual layout node, added reduced-motion handling and animation
  cleanup, and allowed confirmation-button height to grow for larger text.
- Photo verification and video reporting use one report-submission service.
  Screens reuse a draft token and synchronous tap guard, avoid updates/navigation
  after unmount, and replace the completed screen on success.
- Validation blocks indeterminate rate-limit and duplicate responses, including
  null/malformed responses and exceptions. The final edited plate is rechecked.
  Confirmed duplicates retain the established possible-duplicate officer workflow.
- Uploads use canonical MIME inference/validation, the original local URI,
  owner-scoped stable object names, actual decoded size validation, and no overwrite.
  Unsupported formats fail before upload; evidence is never silently relabeled.
- AI vision/OCR/audit calls have bounded transient retries (1s, then 3s), external
  cancellation linked to the SDK request, cancellation checks after async stages,
  and cleanup of timers/listeners. Auth, quota, validation and deterministic errors
  do not retry. Unknown response codes cannot leak through typed diagnostics.
- AIProcessing provides Try Again and explicit manual-review confirmation, blocks
  uncertain duplicate checks, prevents overlapping active runs, and stops both
  animation loops on unmount.
- Manual fallback does not fabricate detected violations or confidence:
  ai_raw_result carries requiresManualReview and aiUnavailable; the description
  explicitly tells the officer that AI was unavailable. Video carries
  requiresManualReview and source=manual_video.
- ErrorBoundary has a branded recovery screen that remounts failed children.
  Diagnostics expose only an allowlisted error kind/frame count in development,
  never raw error text or component stacks. Recovery copy avoids guaranteeing
  that an interrupted report was not saved.
- EXIF diagnostic logging no longer exposes coordinates, evidence paths, raw
  errors, metadata, or hashes. Parser behavior was not broadly rewritten.
- Added the lint script/test environment configuration. Installed only the
  Expo-compatible test typing correction: @types/jest 29.5.14 instead of 30.0.0,
  using Expo install, with the lockfile updated.

## Submission architecture and retry contract

1. Each screen creates one createReportSubmission() token for its draft.
2. submitReportWithMedia() coalesces concurrent calls on that token and returns a
   cached success if already finished. Switching accounts cannot reuse the token.
3. Validate report/location/media, then check activity and the final plate before
   uploading. Errors return safe code/userMessage fields.
4. uploadReportMedia() writes report-media/<userId>/<draftUUID>.<extension> with
   upsert=false. The service checks decoded byte length against the 50 MB ceiling.
5. Insert image_reports using the same stable UUID. Owner/evidence URLs come from
   the service; status=pending, reward_amount=0, reviewed_at=null. Caller-supplied
   created/submitted/updated timestamps are removed.
6. Link report_media using the same deterministic UUID. A media-link failure is
   nonfatal because the base report already holds the evidence URL/path.
7. On a lost/uncertain insert acknowledgment, keep evidence. Retry queries the
   authenticated user's report ID before another insert. A primary-key conflict
   is reconciled, not treated as proof that deletion is safe.
8. Delete orphaned evidence only on definite database validation/permission
   rejection. Failed cleanup retains upload state for a safe same-draft retry.

Important limits: this token is in memory, not persisted across navigation away,
an ErrorBoundary remount, or process death. After an uncertain save, retry the
same unchanged draft; inspect report history before starting another. A persisted
outbox/server idempotency contract is still needed for crash-safe delivery.
The fingerprint prevents changing report/evidence fields during an unresolved
attempt; uploaded evidence is never knowingly attached to a different edited draft.
Storage conflict reuse applies only to a retry of that stable draft.

Client validation is not a server authorization boundary. Client-only rate checks
cannot atomically enforce limits across multiple devices or direct API calls.

## Files changed or completed

Application:

- src/services/reports/index.js
- src/services/ai/index.js, utils.js, retry.js, manualReview.js
- src/screens/shared/AIProcessing.js, AIResultsVerification.js
- src/screens/citizen/VideoReport.js
- src/components/common/ErrorBoundary.js, PressableScale.js, ConfirmationModal.js
- src/components/common/StatusPill.js and src/components/index.js (Claude foundation retained)
- src/utils/theme.js and src/utils/fonts.js (Claude foundation retained)
- src/utils/exifParser.js
- package.json, package-lock.json, .eslintrc.json

Tests:

- src/services/reports/__tests__/reports.test.js: validation, malformed/throwing
  checks, final-plate lookup, owner/status normalization, concurrent submission,
  deterministic retries, ambiguous outcomes, orphan cleanup, media/size rules.
- src/services/ai/__tests__/utils.test.js: SDK-only transport, safe errors, HTTP
  classification, deadlines, cancellation and untrusted error fields.
- src/services/ai/__tests__/retry.test.js: retry budgets/backoff, terminal errors,
  cancellation during requests/delays, exhaustion.
- src/services/ai/__tests__/pipeline.test.js: stage retry-wrapper wiring,
  preprocessing/stage cancellation, manual fallback.
- src/screens/shared/__tests__/AIProcessing.test.js: unavailable state, Try Again,
  explicit manual fallback, fail-closed duplicate handling and unmount behavior.
- src/components/common/__tests__/ErrorBoundary.test.js: recovery and privacy in
  development and production.
- src/utils/__tests__/exifParser.test.js and fixtures: Claude's existing parser
  and privacy coverage retained; eight TODOs remain.
- tests/docs/supabaseGuide.test.js: verbatim original SQL, ten sections, complete
  review block, one notification insert, signup/routing guard and insert-only seed.
  These are text regression tests, NOT a SQL parser or Postgres integration tests.
- tests/ai/handler.test.ts and providers.test.ts: preexisting tests ran unchanged.

Documentation: SUPABASE_CHANGES.md and this handoff.

Other preexisting changes in Git status were left alone, including Claude's AI
backend work, benchmarks, older handoffs, env templates and SQL source files.

## Supabase guide and user actions

SUPABASE_CHANGES.md contains all ten requested sections:

1. Complete original PHASE1_SQL_EDITOR.sql, separately followed by a forward-only
   provider-constraint correction for the existing Token Harbor primary.
2. Placeholder-only Token Harbor/NVIDIA/Gemini/Groq secret commands.
3. Manual ai-analyze deployment command and the inspected application-level
   authentication required when platform JWT verification is disabled.
4. Complete review-function replacement: authenticated caller identity, officer
   role, jurisdiction/pincode check, row lock, idempotency, severity rewards,
   transaction ledger and exactly one notification insert.
5. Citizen-only signup, a separate protected-jurisdiction/department update guard,
   and the transaction-scoped trusted EYE-055/Vakola promotion example.
6. Test-only, insert-only 13-report seed (5 pending, 5 approved, 3 rejected), with
   deterministic IDs, serialized reruns, reviews/ledger/notifications and balance.
7. Read-only bucket verification and guarded policy reapplication guidance.
8. Read-only publication verification and guarded additions for five tables.
9. Email/deep-link settings and a configuration-derived Expo Go redirect pattern.
10. Manual verification checklist.

The raw database dump contains an orphan duplicate notification fragment; that is
not proof the deployed function actually sends duplicates. The guide separates
repository evidence, corrections and required runtime verification.

Owner must validate against a separate hosted test project, including ordinary
citizen/officer/anonymous sessions, spoofed officer IDs, jurisdiction rejection,
signup metadata escalation, profile-field updates, and concurrent repeat reviews.
Only then apply reviewed production changes manually. Never seed a real-user project.
The Supabase skills informed these authorization checks, explicit grants and
transaction boundaries. Their required database execution/advisor verification
could not be completed without an authorized test database.

## Commands executed and actual results

Windows npm.ps1 resolved to a missing global npm-cli.js on this machine. Direct
Node entry points below avoid that local shell issue; the package scripts remain
standard npm scripts for other environments.

| Check | Actual result |
|---|---|
| git branch --show-current | Pre_Main |
| node node_modules/jest/bin/jest.js --runInBand | 10 suites passed; 229 passed, 8 TODO, 0 failed |
| node C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js run lint (path quoted) | Failed: 4 errors in untouched files, listed below |
| Targeted ESLint for all Prompt 1 services/screens/components/theme/EXIF and docs tests | Passed, exit 0 |
| Expo install @types/jest@29.5.14 --dev | Passed; compatible test-only version correction |
| node node_modules/expo/bin/cli install --check | Passed: dependencies are up to date |
| Expo Doctor via npm exec --yes --package=expo-doctor -- expo-doctor | 17/18 passed; native/app-config synchronization warning |
| Expo export --platform android --output-dir .expo/prompt1-android | Passed; Hermes bundle 6.02 MB |
| Expo export --platform ios --output-dir .expo/prompt1-ios | Passed; Hermes bundle 5.99 MB |
| npm audit --json via the same direct npm-cli.js entry | Exit 1; 40 findings: 1 low, 20 moderate, 18 high, 1 critical |
| git diff --check | Passed after removing whitespace introduced in the touched screen |
| SHA-256 comparison of protected backend files | Both unchanged from continuation start |
| Live/local Postgres execution and RLS tests | Not performed |
| Installed native build / emulator / physical-device E2E | Not performed |

Expo checks used EXPO_NO_DOTENV=1, so exports are compilation/asset checks without
loading local credentials, not configured end-to-end builds. They do not prove
native plugin integration, login, deep links, camera, maps or backend behavior.
Exports are ignored local artifacts under .expo, not APK/IPA/store builds.

Targeted lint command:

    node node_modules/eslint/bin/eslint.js src/services/reports src/services/ai src/screens/shared/AIProcessing.js src/screens/shared/AIResultsVerification.js src/screens/shared/__tests__ src/screens/citizen/VideoReport.js src/components/common/ErrorBoundary.js src/components/common/PressableScale.js src/components/common/ConfirmationModal.js src/components/common/StatusPill.js src/components/common/__tests__ src/utils/theme.js src/utils/fonts.js src/utils/exifParser.js tests/docs --ext .js

Protected-file hashes:

- supabase/functions/ai-analyze/index.ts:
  9242C8D904AF397B724F657F99FDAF0BC8B9F7157EAB12873D366BCDE6339893
- supabase/functions/ai-analyze/providers.ts:
  76929043847CFF7F62585B801598CAB2AF811575C62D9EF0DFECA8CFE41A9C75

## Known issues and release gates

- Repo lint: MapLibreMap.js lines 193, 301, 306 contain empty blocks; CitizenHome.js
  line 794 declares unused activityIcon style. These were not changed in this task.
- Expo Doctor: native android/ios folders coexist with app.json configuration
  fields that EAS will not automatically sync. Resolve the native/prebuild ownership
  decision and verify permissions, scheme, icons and plugins before release.
  No destructive prebuild regeneration was attempted.
- Dependency audit: the critical transitive finding is shell-quote. High findings
  include the Expo/Metro toolchain and direct xlsx dependency (audit offers no fix
  for xlsx). Triage runtime reachability separately from build tooling. Some proposed
  fixes involve a major Expo upgrade, outside the required SDK 54 scope.
  No blanket audit fix or unrelated package upgrade was performed.
- Local baseline RLS still allows broad officer reads/updates, and public SELECT
  of full approved report rows. Citizen insert policy only checks ownership, not
  workflow fields. Direct report/review API writes may bypass the reviewed RPC's
  intended workflow. Audit actual grants/policies and all privileged RPCs before
  release; stronger client checks do not fix these server-side gaps.
- report-media remains a public bucket under the existing contract. Private
  evidence retention/access and signed-URL design need a separate backend/client
  migration and explicit product/privacy review.
- EXIF has 8 preexisting TODOs: zero/signed coordinates; invalid GPS values; binary
  bounds/non-EXIF APP1 handling; query preservation throughout extraction/hashing;
  heuristic asset matching; byte-hash fallback; duplicate parser implementations.
- Raw asset/error logging still exists in untouched useImagePicker and other legacy
  paths. The entire app needs a privacy-log audit, not just this sprint's paths.
- Draft tokens are not durable. Network drop plus process death/navigation away can
  require manual history reconciliation. Media linking is best-effort, not an atomic
  database transaction with report creation.
- Extensionless content URIs work in the service when explicit MIME metadata is
  supplied. Current screen/picker state drops some asset metadata; unknown formats
  now fail closed instead of guessing. Carry verified MIME/size metadata through
  capture state in the evidence-pipeline stage and test on real Android/iOS devices.
- Existing video picker applies a stricter 5 MB limit than the service/bucket 50 MB
  limit. No limit was weakened; reconcile product copy and device memory testing.
- Dedicated officer manual-review badges, large-font layouts and full shared-theme
  adoption remain UI-stage tasks. The current photo fallback description already
  communicates AI unavailability and stores explicit flags.

## Required follow-up for Prompts 2 and 3

- Consume shared theme/components without removing existing aliases or repeating
  upload/database code in screens.
- Exercise real Android and iOS capture/gallery/video, location denied/limited,
  offline/reconnect, double tap, back navigation, background/foreground, process
  death, and report-history reconciliation.
- Test citizen signup/login/logout/reset deep links; officer review/rewards/
  notification updates; failed and concurrent decisions using test identities.
- Verify manual-review UI reads the explicit flags and does not imply an AI
  finding when unavailable. Preserve confidence=0 and the provenance description.
- Perform small-screen/large-font/screen-reader/reduced-motion checks, native
  release builds and privacy/permission checks, dependency remediation and RLS
  verification before any production-readiness sign-off.

Do not regress: Pre_Main-only work; JavaScript app code; Token Harbor primary with
configured fallbacks; protected backend files; server-held secrets; fail-closed
checks; stable draft IDs; non-overwriting evidence; no cleanup of uncertain saves;
bounded/cancellable AI retries; truthful manual fallback; one review reward and
notification; no Docker dependency.
