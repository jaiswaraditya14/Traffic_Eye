# Traffic Eye — Production-Grade Comprehensive Repair Prompt

Copy and paste the complete prompt below into a coding agent that has access to the Traffic Eye repository.

---

You are the lead React Native, Expo, Android, and Supabase engineer responsible for making **Traffic Eye** production-safe. Work directly in the repository at `D:\Traffic_Eye`.

Do not stop at an audit or a list of suggestions. Inspect the current implementation, implement the fixes, add forward-only migrations, test the result, and give an evidence-based completion report. Treat filenames and line references in this prompt as starting points because the repository may have changed. Preserve unrelated user work and do not perform destructive resets, rewrite shared Git history, modify an already-applied migration, or expose credentials in output.

The goal is one coherent repair, not a collection of disconnected patches:

1. make photo/video evidence provenance truthful and fix EXIF/GPS extraction safely;
2. prevent duplicate incident reports and rate-limit submissions atomically on the server;
3. use one secure media-upload and report-submission path;
4. let authorized officers correct violations atomically and audibly;
5. move AI provider secrets and calls off the mobile client;
6. secure authentication, privileged RPCs, RLS, rewards, notifications, jurisdiction routing, and evidence storage;
7. eliminate stale state, misleading labels, and success-screen data loss;
8. consolidate tests so they exercise the production code.

## Non-negotiable engineering rules

- Use the versions actually installed in `package.json` and the native Android project. Do not copy APIs from a different Expo SDK or add a native dependency without verifying compatibility.
- Follow the repository's real database migration workflow. Inspect the remote/local migration history if access is available, create one or more new forward-only migrations after the latest applied migration, and only then synchronize any canonical bootstrap schema if that is the repository convention.
- Never use reset/sample-data scripts against a real database. Include upgrade/backfill behavior for existing rows.
- The mobile client is untrusted. UI checks are only for user experience; every security, duplicate, rate-limit, role, reward, and officer-review rule must be enforced by an authoritative server/database boundary.
- Derive the caller from the verified JWT and `auth.uid()`. Do not accept or fall back to caller-supplied user/officer IDs.
- Use server-generated submission time for rate limiting and duplicate detection. Keep media capture time separate and never trust EXIF time as submission time.
- Never invent, guess, or silently substitute EXIF/GPS data. If metadata was removed or Android/iOS does not expose it, the correct result is “unavailable,” followed by a clearly labelled device-location or manual-location fallback.
- Never log raw EXIF, exact GPS coordinates, full local/content URIs, bearer tokens, provider payloads, or secrets in production. Development diagnostics must also be minimized and sanitized.
- Use typed/domain error codes at service boundaries and user-friendly messages in the UI. Do not leak SQL, provider, storage, or stack-trace details.
- Keep all evidence private. Authorization must not depend on a public URL, a user-editable address, or caller-supplied pincode.
- Do not describe this system as issuing or preventing legal fines unless the repository contains an actual legally authorized fine-issuance workflow. This repair prevents duplicate reports and duplicate downstream review of an incident.

## Phase 0 — Establish the source of truth

Before editing:

1. Inspect `git status`, `package.json`, app configuration, native Android configuration, the report schemas, Storage policies, RLS policies, RPC grants, Edge Functions, and every photo/video submission route.
2. Trace these current areas and all of their callers:
   - `src/utils/exifParser.js`, `src/utils/exifParserCore.js`, `src/utils/exifParserCoreCommonJS.js`, their tests, and `scripts/test_exif_pipeline.js`;
   - `src/hooks/useImagePicker.js`, `src/hooks/useLocation.js`, `src/screens/citizen/NewReport.js`, `AIProcessing.js`, `AIResultsVerification.js`, `VideoReport.js`, and `ReportSuccess.js`;
   - `android/app/src/main/java/com/trafficviolationapp/MediaStoreResolverModule.kt` and its registration/configuration;
   - AI configuration/services, authentication services, report/media services, officer review screens, violation constants, reward services, notification services, and pincode/jurisdiction queries;
   - `database/Traffic_eye_database.sql`, every file under `database/migrations`, and any other ad-hoc SQL.
3. Find all direct inserts/updates to reports and report media, direct Storage uploads, public-URL creation, role assignment, point/reward RPCs, notification inserts, and officer-review calls. No legacy route may bypass the repaired path.
4. Record the baseline result of existing JS tests, EXIF tests, lint/type checks, Android compilation, and database tests. A pre-existing failure must be distinguished from a regression, but do not use it to skip the repair.
5. Make the backend reproducible from source. If the current `database/` SQL and migration fragments cannot build a fresh local Supabase instance, consolidate their effects into the repository's canonical migration workflow without modifying remote data or already-applied migrations. A local disposable `supabase db reset` is allowed for verification; resetting any shared or remote environment is forbidden.

## Phase 1 — Contain exposed AI credentials and create a server boundary

The repository currently has client-side `EXPO_PUBLIC_*` AI configuration and direct provider calls. It also contains documentation/history that may include a real provider credential. Treat every exposed provider key as compromised.

1. Remove real credentials from the current tree, examples, documentation, generated configuration, logs, and mobile-accessible environment variables. Replace documentation values with obvious placeholders. Scan the current tree and Git history without printing secret values.
2. Report which provider credentials require owner-side revoke/rotation. Code changes do not rotate an already exposed key. Do not rewrite shared Git history without explicit approval; instead, document the historical exposure and the safe remediation.
3. Move remote AI-provider requests into authenticated Supabase Edge Functions. Keep only non-secret preprocessing and deterministic local checks in the app.
4. In each Edge Function:
   - verify the Supabase JWT and reject anonymous/invalid requests;
   - validate MIME type, byte size, request shape, plate/result shape, and timeouts;
   - use server-side Supabase secrets for provider credentials;
   - enforce per-user quotas and abuse controls that cannot be selected by the client;
   - restrict outbound providers/models to an allowlist whose identifiers are verified against current official provider documentation;
   - return a small normalized response and sanitized error code, never raw provider responses, authorization headers, secret names/values, or stack traces;
   - add request correlation IDs and privacy-safe structured logs.
5. Delete the mobile provider-call fallback. Provider failure must produce a retry/manual-verification path, not a hidden direct call from the client.
6. Update `.env.example` and setup documentation with server-side secret names only. Add `.env*` exclusions to both Git and EAS/build ignore rules while retaining the safe example file. Verify that production/mobile bundles do not contain provider keys.
7. Let the function analyze a private Storage object only after verifying ownership, MIME, size, and submission state. Store a server-owned AI analysis record and let submission reference that record ID; never trust client-supplied confidence, severity, reward, or raw provider output as authoritative.

## Phase 2 — Close authorization, RPC, RLS, reward, and notification vulnerabilities

Perform this security work before adding new privileged behavior.

1. **Role escalation:** public signup must always create a citizen-level profile. Do not trust `raw_user_meta_data`, user-editable metadata, badge ID, department, jurisdiction, or a requested `role` to grant officer/admin powers. Remove or redesign public `signUpOfficer`: it may create a pending application, but only a trusted admin/server workflow may grant an officer role. Authorization must use server-controlled database state or trusted app metadata.
2. **Privileged functions:** inspect every `SECURITY DEFINER` function, especially officer review, point awards, reward redemption, officer lookup, and report submission. Schema-qualify referenced objects, use a safe fixed/empty `search_path`, validate authorization inside the function, revoke execution from `PUBLIC` and `anon`, and grant only the minimum role. Remove legacy overloads so PostgREST cannot select an unsafe signature.
3. **Points and rewards:** authenticated users must not be able to call a generic function that awards arbitrary points to any user, supplies a target user ID, invents reward costs, or supplies coupon details. Derive the caller, report eligibility, award amount, catalog price, reward identity, and generated redemption data on the server. Add idempotency/uniqueness constraints so one event cannot award or redeem twice. Keep administrative helpers private/service-only.
4. **Officer review:** remove any `p_officer_id` fallback. Lock the report row, verify the current caller is an active authorized officer for the assigned jurisdiction, require the report still be pending, apply the decision and final violations in one transaction, and write an immutable audit/review record.
5. **Direct table mutations:** remove broad authenticated officer `UPDATE` access that can change arbitrary report columns. Route the decision through the secured review RPC. A citizen insert must not be able to choose approved/rejected status, review data, reward/points, server timestamps, duplicate flags, trusted provenance, or authoritative AI fields. Remove client access that allows arbitrary notification insertion or other privileged side effects.
6. **Officer discovery/login:** do not expose an officer's email through an anonymous badge-ID RPC. Replace it with a secure login/application flow and real abuse controls; `pg_backend_pid()` is not a client rate limiter.
7. Replace deprecated or over-broad role checks such as policies that merely test for any authenticated role. Add explicit grants because current Supabase behavior must not be assumed to auto-expose every table.
8. Audit heatmap/public-report views as part of RLS work. Publish only the minimum aggregated or coarsened data needed for a heatmap; do not expose report UUIDs, exact addresses/times/coordinates, officer identity, reporter identity, or evidence URLs through a supposedly anonymized view.
9. Unify the notification schema and event types across SQL, writers, `AuthContext`, notification screens, local notifications, and navigation. Resolve the current `body`/`reference_id` versus `message`/`report_id` drift and add a display-and-tap integration test.
10. Add RLS/RPC tests for anon, citizen A, citizen B, assigned officer, unassigned officer, disabled officer, and admin/service contexts. Include direct REST/RPC attempts, not only UI tests.

## Phase 3 — Add the database model and one atomic submission operation

Create a forward-only migration with appropriate backfill and constraints. Use names consistent with the existing schema, but the final model must include the following concepts:

- a canonical normalized vehicle number, computed identically everywhere by trimming, uppercasing, and removing every non-alphanumeric character; reject an empty result for a new report;
- `client_submission_id UUID NOT NULL` with a unique constraint scoped to the authenticated user for idempotent network retries;
- server-generated `submitted_at`; separate nullable `captured_at` with provenance if available;
- a valid latitude/longitude pair: both null or both present for legacy rows, finite and in range; authoritative new submissions require both coordinates;
- normalized pincode stored as text, plus an explicit trusted assignment/unassigned state;
- location provenance, using unambiguous values such as `EXIF_ORIGINAL`, `EXIF_PICKER_COPY`, `DEVICE_CURRENT`, `DEVICE_LAST_KNOWN`, and `USER_SELECTED`;
- location accuracy in metres where known, location-observed timestamp, evidence SHA-256, and evidence/hash provenance;
- the private Storage object path and verified media metadata instead of treating a public URL as authority.

Do not retain raw EXIF blobs by default. Persist only the normalized evidence/audit fields the application actually needs.

Implement one authoritative submission function/operation used by image and video flows. It must:

1. verify the authenticated caller and derive the user ID from `auth.uid()`;
2. validate the normalized plate, coordinate pair, media record, location source, accepted violations, and client submission ID;
3. use a deterministic transaction advisory lock (or an equally strong serialized design) for the submitting user and normalized incident/plate keys so concurrent requests cannot bypass either rate or duplicate checks;
4. enforce a fixed limit of **three accepted submissions in the rolling previous 60 minutes** using server time; the client must not pass the limit;
5. enforce the hard-duplicate policies below using server time and exact distance;
6. insert the report and its media row in the same database transaction;
7. return the existing row for a legitimate idempotent retry, but never let a reused client submission ID create a second report;
8. return a typed result such as success, hard duplicate, rate limited, invalid evidence, or unauthorized;
9. fail closed if the duplicate/rate check cannot execute.

The file upload cannot share a Postgres transaction. Upload first to a unique pending private path with `upsert: false`, verify it during finalization, call the authoritative submit operation, and delete the pending object if validation/submission fails. A retry must be safe. Add a cleanup job for abandoned pending objects.

### Exact duplicate policy

Use one policy everywhere; do not implement contradictory cooldowns:

- **Hard, non-overridable incident duplicate:** a non-rejected report with the same normalized plate, server submission time within the rolling previous 24 hours, and exact great-circle distance less than or equal to 500 metres.
- **Hard, non-overridable evidence duplicate:** the exact SHA-256 of the bytes actually uploaded as evidence is already linked to a non-rejected report. Do not hash a base64 string and label it as the byte hash.
- **Soft warning only:** the same user has previously reported the same plate but the report is outside the hard incident window. The user may explicitly choose **Report Anyway**. This choice never bypasses either hard rule or the server rate limit.
- Rejected reports do not hard-block a new incident. Use the repository's canonical status values consistently.

Use Haversine/exact great-circle distance or a correctly configured spatial type. A latitude/longitude bounding box or `±0.005°` may narrow candidates but is never the final 500-metre test. Add a partial/composite index that matches the real normalized-plate, server-time, status, and valid-coordinate candidate query; a raw `vehicle_number` index alone is insufficient.

The preflight duplicate check is a debounced UX aid. Re-run it whenever the normalized plate or selected coordinates change, attach a request sequence/token so a stale response cannot win, and recheck atomically at submission. A cross-user duplicate response may contain only a redacted reference, broad area, and time. “View Existing Report” may open full details only for the owner or an authorized officer.

## Phase 4 — Repair EXIF/GPS extraction and evidence identity

The current EXIF path can mistake the selected image for a different gallery item. Expo ImagePicker returns an exported/cache URI in common paths, while the Android resolver and a JS fallback guess a MediaStore item from filename, byte size, dimensions, or the latest 100 assets. This is unacceptable evidence handling.

1. Preserve the complete picker asset immediately, including exact URI, query string, asset ID when present, MIME/type information, dimensions, size, filename, and picker-provided EXIF. Do not call `split('?')`, normalize away URI components, or relabel a cache URI as the original URI.
2. Pass the exact stable asset identifier/source URI through JS to the native resolver. Trust original-media metadata only when it is resolved by an exact `assetId` or the exact selected `content://`/platform URI and identity is proven.
3. Remove all filename, substring, size, dimension, date-order, and “latest media” matching from Kotlin and JavaScript. These heuristics may attach another person's/photo's GPS.
4. If exact original identity is unavailable—common with Android Photo Picker, limited permission, or a null asset ID—parse only the exact selected picker copy when supported and label it `EXIF_PICKER_COPY`. If that copy has no valid GPS, return unavailable. Never claim it is original metadata.
5. For Android gallery import where Expo's exported cache result does not expose a usable original ID/URI, add a project-owned native picker/import path that retains the exact ActivityResult/Photo Picker content URI and requests location-metadata sharing through supported platform APIs. Do not edit `node_modules`. Make the native implementation reproducible through a local Expo module/config plugin, or explicitly enforce and test the committed bare-native workflow so `expo prebuild --clean` cannot silently erase the feature.
6. On Android, request only the permissions required by the installed SDK/OS. Handle `ACCESS_MEDIA_LOCATION`, scoped storage, Photo Picker, Android 14 selected-photo access, denied/limited/permanently denied permission, and user consent for original location where required. Use the platform-supported original-media access mechanism only with user authorization. Do not broaden storage access as a workaround.
7. On iOS, account for camera captures where ImagePicker does not return GPS. Use the device/manual fallback instead of assuming the camera asset contains location.
8. Recover pending picker results after Android activity/process recreation where the installed Expo API supports it.
9. Track one structured evidence object through selection, EXIF parsing, hashing, AI analysis, upload, and submission. It must identify the exact byte URI, picker URI, stable source identity when available, detected format, byte length, raw-byte SHA-256, metadata source, extraction method, status, and reason. Do not discard it and retain only an image URI.

Consolidate metadata normalization into **one production source** imported by both runtime code and tests. Eliminate the drifting production/Core/CommonJS parser copies or generate one adapter from the same implementation. Add a real `test:exif` package script that exercises the code used by the app.

The parser must:

- accept supported decimal, DMS, rational, and common iOS/Android key variants;
- strictly parse the entire numeric/rational value; reject trailing junk, non-finite values, negative minutes/seconds, and zero denominators;
- accept finite signed decimal coordinates without N/S/E/W references when their representation is inherently signed;
- require/obey hemisphere references for unsigned DMS, reject contradictory direction data, reject zero rational denominators, validate minutes/seconds in `[0, 60)`, and enforce latitude/longitude ranges;
- treat latitude `0` or longitude `0` as potentially valid; do not reject the equator or prime meridian. Treat exact `(0,0)` as unavailable only when metadata/ref/redaction evidence shows it is a placeholder, while keeping product geography validation separate;
- return a typed result with coordinates, source, confidence/reason, captured time if valid, and safe diagnostics; malformed metadata must never throw through the UI.

Do not treat a missing MIME type as JPEG. Determine type conservatively from trusted picker/native metadata and magic bytes, then filename only as a hint. Prefer AndroidX/platform metadata decoders for the exact native stream. If retaining a pure JPEG parser, it must validate segment/TIFF bounds and types, support little- and big-endian TIFF, continue past XMP or other APP1 blocks until the EXIF APP1 block is found, and reject truncated/malformed input safely. For HEIC/HEIF, PNG, WebP, or video, use a platform decoder that is already compatible and proves support, otherwise report metadata unavailable and use the fallback. Never run JPEG byte parsing on an unknown format.

Hash the exact bytes that are uploaded. Do not strip URI query parameters, load the same large file into multiple base64 copies, or silently fall back to hashing base64 text. Prefer streaming/native hashing. If the exact authorized original stream is used, copy it once to app-private storage while hashing/parsing and upload that same copy. If the original and a derivative are both retained, store separately labelled hashes; the duplicate-evidence rule uses the uploaded evidence hash. Recompute the byte hash and supported metadata at the trusted server finalization boundary, persist verification/mismatch state, and never label client metadata as server-verified when the uploaded bytes disagree.

### Location fallback and state safety

1. Immediately clear all media-derived coordinates, address, pincode, EXIF source, duplicate results, hashes, and banners whenever the selected asset changes or is removed.
2. Give each asynchronous EXIF, permission, geocode, and duplicate request a monotonically increasing selection/request token. Apply a result only if it still belongs to the currently selected asset and location.
3. If valid EXIF GPS is unavailable, show the reason and explicit **Use Current Location** and **Choose on Map** actions. Do not silently request/use live location merely because EXIF failed. After consent, validate maximum age and accuracy before labelling a fix current. A last-known fix must have a defined age/accuracy threshold and be labelled `DEVICE_LAST_KNOWN`, never “verified live.”
4. If device location is unavailable or denied, require the user to select/confirm a map location. Do not submit null coordinates, fabricated EXIF, stale coordinates, or `(0,0)` as a fallback.
5. Treat location as one object: coordinates, display address, normalized postal code, source, accuracy, and observed time. Editing address text alone must not change the coordinates or let the UI call the result EXIF-derived. A manual map change changes provenance to `USER_SELECTED`.
6. Reverse-geocoding failure must preserve valid coordinates and show a retry/manual address state. An editable address is descriptive, not trusted evidence of jurisdiction.
7. Rename misleading UI such as “Verified Location (Image Metadata)” to factual language such as “Location read from image metadata,” plus the actual source badge. Explain that metadata provenance is not proof that an image is authentic.
8. Apply the same fallback/provenance rules to video evidence.

## Phase 5 — Unify media upload, report submission, and success state

Replace duplicated direct Storage/table logic in image verification, video reporting, and any other route with one report service and the authoritative submission operation.

1. Define one shared media contract: images are at most **10 MiB**, videos are at most **5 MiB**; explicitly list supported MIME types based on formats the installed app can decode. Validate the actual file size and magic bytes on the client for feedback and again at the trusted finalization boundary. A `content://` URI extension and caller-supplied MIME are not proof.
2. Use UUID-based object names under a user/submission-scoped pending path and `upsert: false`. Never force every object to `.jpg` or `image/jpeg`.
3. Make the evidence bucket private. Replace permanent public URLs with stored object paths and short-lived signed URLs returned only after owner/officer authorization. Migrate legacy rows compatibly and remove the current public-read policy without breaking authorized review.
4. Ensure an upload followed by submission failure is deleted immediately when possible and eventually by the abandoned-upload cleanup job.
5. Make all screens resistant to missing context, direct navigation, double taps, retries, unmounts, and stale route params. Disable duplicate taps locally, but rely on server idempotency.
6. Build `ReportSuccess` from the immutable server-returned snapshot: report/reference ID, server submission time, normalized/display plate, final selected violations, coordinates/address/pincode, and truthful location source. Only after constructing/passing that snapshot, clear `currentReport` and reset navigation so an old report cannot contaminate the next one.

## Phase 6 — Correct citizen duplicate UX

1. Run the preflight after both plate and coordinates are available and whenever either changes. Do not fail open on network/RPC failure; show an actionable retry state and block final submission until the authoritative path is reachable.
2. For a hard duplicate, disable submission and do not show an override. Present a privacy-safe explanation and only show **View Existing Report** when authorized.
3. For the soft same-user historical warning, require a deliberate **Report Anyway** confirmation and include that acknowledgement in the audit payload. The server still independently evaluates the hard rules.
4. At final submission, map server outcomes to specific UI states. A race where another user submits first must become a normal hard-duplicate result, not a generic crash.

## Phase 7 — Repair officer violation editing and auditing

1. Create one shared violation catalog/normalizer used by AI results, citizen verification, video reports, officer review, database validation, and display. Preserve unknown legacy/AI values as trimmed, deduplicated “Other” chips instead of losing them; keep deterministic ordering.
2. In the officer review screen, initialize/edit state after the asynchronous report has loaded and reset it when the report ID changes. Do not initialize once from `undefined` data.
3. Let authorized officers toggle each violation and add a sanitized “Other” value. Approval requires at least one final violation. Rejection requires a reason and may retain zero final violations if that matches the rejection model.
4. Submit the decision, final violations, reason, and audit record in the same secured transaction. Do not perform a separate client update before or after `submit_officer_review`.
5. Preserve original detected/citizen-confirmed violations separately from officer-final violations. Record officer ID from auth, server timestamp, before/after values, decision, and reason. Prevent a second decision by locking and checking pending status.

## Phase 8 — Make jurisdiction and pincode routing trustworthy

1. Propagate normalized postal code from the structured geocoder result; never parse it from a display-address string. Store Indian pincodes as text so leading zeros and validation are preserved.
2. Backfill existing records where the stored structured data supports it. Rows without a trusted assignment go to an explicit unassigned queue; do not guess.
3. Do not grant officer visibility from a citizen-editable address or client-supplied pincode. Use a server-controlled jurisdiction mapping/assignment. If server-side coordinate-to-jurisdiction verification is unavailable, leave the report unassigned for trusted triage instead of authorizing an officer from unverified data.
4. Model officer-to-jurisdiction assignment in server-controlled tables/normalized data, not badge-text matching or client-side `ILIKE`. Enforce it in RLS and the officer-review function.

## Phase 9 — Required tests and verification

Add deterministic automated tests, not only manual steps.

### EXIF/media tests

- JPEG fixture with valid north/east GPS;
- south/west DMS and rational GPS;
- signed decimal GPS without direction refs;
- valid zero latitude and valid zero longitude;
- absent EXIF, Android-redacted `(0,0)`, malformed rational, invalid bounds, contradictory refs;
- exact `content://` and `file://` URI handling with query parameters;
- exact asset-ID resolution and null asset-ID fail-closed behavior;
- Photo Picker/non-MediaStore URI and two different images with the same filename/dimensions;
- two rapid selections where the first slow result must not overwrite the second;
- picker copy without GPS followed by device/manual fallback;
- permission denied, limited, permanently denied, stale last-known location, and reverse-geocode failure;
- iOS camera capture without GPS and Android pending-result recovery;
- JPEG magic-byte validation plus safe HEIC/HEIF, PNG, WebP, and video fallback;
- evidence hash equals the uploaded byte stream.

### Database/security/concurrency tests

- plate formats such as spaces, hyphens, and case normalize identically;
- a matching report at 499 m and 23h59m is hard-blocked;
- a matching report beyond 500 m or beyond 24 hours is not incident-blocked;
- a rejected report does not hard-block;
- exact uploaded evidence bytes are hard-blocked even when filename changes;
- two concurrent matching submissions result in at most one new report;
- two concurrent fourth-hour submissions cannot bypass the three-per-rolling-hour limit;
- reused client submission ID returns the same report and never duplicates it;
- direct REST/RPC calls cannot bypass hard duplicates, rates, role checks, review rules, or media ownership;
- citizen A cannot read citizen B's full duplicate/evidence details;
- a citizen cannot self-assign officer/admin through signup metadata;
- a citizen cannot award points, invent reward prices/coupons, insert arbitrary notifications, or invoke officer review;
- two concurrent officer decisions cannot approve/reject twice or award points twice;
- assigned officer access works; unassigned/disabled officer access fails;
- no public evidence URL or anonymous evidence read remains, and an authorized signed URL expires.

### Build and audit checks

- the production EXIF test command, unit/integration tests, lint/typecheck, and Android build/compile pass;
- a fresh database and an upgrade from the current schema both pass migrations;
- RLS tests and Supabase security/performance advisors are reviewed, with justified exceptions documented;
- the app contains no direct AI provider call or provider key;
- secret scanning finds no live credential in the current tree or build output;
- no duplicate legacy upload/insert/review route remains;
- manual smoke tests cover photo, video, hard duplicate, soft warning/override, rate limit, officer approval/rejection, offline/provider failure, and success-to-new-report reset.

Create missing scripts/configuration as needed and run the repository-equivalent of these commands. Use a disposable local Supabase instance only; never point reset commands at shared data:

```powershell
node .\node_modules\eslint\bin\eslint.js src --ext .js
npm test -- --runInBand
npm run test:exif
supabase db reset
supabase test db
supabase db lint
.\android\gradlew.bat :app:lintDebug :app:testDebugUnitTest :app:assembleDebug
.\android\gradlew.bat :app:assembleRelease
```

Test the native EXIF path on physical devices/builds, including the originally failing Android device when available, representative Android 10–15 behavior, and at least one iOS gallery/camera path. Report unit-tested, build-tested, and physical-device-tested results separately; do not claim a device result that was not actually run.

## Completion report format

When the work is complete, return:

1. a concise outcome summary grouped by EXIF/evidence, submission/duplicates, security, officer workflow, and UI;
2. the exact files and migrations changed;
3. the exact verification commands run and their results;
4. the duplicate, rate-limit, EXIF fallback, media cleanup, and authorization behaviors now guaranteed;
5. any remaining owner action, especially credential revoke/rotation or deployment configuration;
6. any pre-existing failure or external blocker with evidence.

Do not claim completion while a client path can still bypass the authoritative submit/review operations, EXIF identity can still be guessed, evidence remains public, tests exercise only a copied parser, or a leaked provider credential remains active.

---
