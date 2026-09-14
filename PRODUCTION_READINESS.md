# Traffic Eye Production Readiness

Updated: 2026-09-14  
Authoritative scope: Prompt 3 local production testing, defect resolution, and release-readiness checkpoint  
Constraint honored: no Docker, live SQL mutation, deployment, paid build, store submission, signing change, branch switch, or protected Edge Function edit.

## 1. Executive Summary

**Readiness verdict: NOT READY.** Local application quality improved materially: the final Jest run passes all 24 suites (341 passed, 8 TODO, 0 failed), lint passes, Expo dependency compatibility passes, Android and iOS Metro exports pass, and the Android native release variant compiles. The sprint removed the runtime `xlsx` risk, hardened evidence/privacy diagnostics and async lifecycle behavior, fixed export and interaction defects, supplied valid notification art, and reduced each export by about 2.04 MiB. Production release is still blocked by Critical/High server-side authorization and evidence-privacy defects in the unapplied database source, an unchecked Supabase deployment checklist, debug-only Android signing, no installed Android device run, no macOS/iOS native run, and unverified accessibility/native permission journeys. Passing mocked tests and bundle exports do not replace those gates.

## 2. Branch & Commit Tested

- Required/current branch: `Pre_Main` (verified before work and again at finalization).
- Starting/current HEAD: `c0c3b3e feat(ai-security): move AI provider calls server-side; add repro migrations + handoff docs`.
- Worktree: substantially dirty from Prompts 1 and 2 plus pre-existing user work. It was preserved without stash, reset, discard, or branch switch.
- Protected file verification:
  - `supabase/functions/ai-analyze/index.ts`: `9242C8D904AF397B724F657F99FDAF0BC8B9F7157EAB12873D366BCDE6339893` — matches handoff.
  - `supabase/functions/ai-analyze/providers.ts`: `76929043847CFF7F62585B801598CAB2AF811575C62D9EF0DFECA8CFE41A9C75` — matches handoff.
- Both protected files appear modified relative to HEAD because they were existing Prompt 1 work; Prompt 3 did not alter them and their required hashes are intact.

## 3. Test Environment

| Component | Observed value |
| --- | --- |
| Host OS | Microsoft Windows NT 10.0.26200.0 |
| Shell | PowerShell |
| Node.js | v24.13.0 |
| npm | 11.6.2 via direct `npm-cli.js` (the roaming npm shim is broken) |
| Java used for Android build | Temurin OpenJDK 17.0.16 |
| Gradle wrapper | 8.14.3 |
| Android compile/target SDK | 36 / 36 |
| Android build tools | 36.0.0 |
| Android min SDK | 24 |
| Android NDK | 27.1.12297006 |
| ADB | Available; local daemon started successfully; no devices attached |
| Xcode / iOS simulator | Unavailable on Windows |
| Supabase staging/local DB | Not supplied or authorized; static review only |

Gradle warned that installed Android SDK command-line tools understand SDK XML v3 while encountering v4, that cross-volume hard links fell back to slower copies, and that 512 MiB metaspace was constrained. The build still completed successfully.

## 4. Platforms, OS Versions, Devices, Build Types

| Platform | Build/evidence | Result | Limitation |
| --- | --- | --- | --- |
| JavaScript/Jest on Windows | jest-expo unit/integration with mocked boundaries | PASS | Not a native device or real backend |
| Expo Android export | Production Hermes bundle, credential-free environment | PASS | Export is not an installable app |
| Expo iOS export | Production Hermes bundle, credential-free environment | PASS | Export is not an Xcode/TestFlight build |
| Android native | `assembleRelease`, SDK 36, universal APK | PASS compile | APK is debug-signed; no device/emulator attached |
| Android installed candidate | ADB discovery | BLOCKED | No attached device/emulator |
| iOS native candidate | None | BLOCKED | Windows has no macOS/Xcode/simulator |
| Expo Web visual supplement | Local development preview | BLOCKED | Native MapLibre import calls `codegenNativeComponent`, unsupported by react-native-web; not treated as a mobile defect or mobile validation |
| Supabase authorization/integration | Static SQL and guide review | FAIL/BLOCKED | Vulnerable source remains and no staging deployment was available |

No Expo Go session was counted as release validation.

## 5. Commands Executed

Substantive commands and their outcomes are recorded below. Read-only `rg`, `Get-Content`, `Get-ChildItem`, and image/hash inspection commands used for individual source findings are summarized by audit area.

| Command | Exit | Result |
| --- | ---: | --- |
| `git branch --show-current` | 0 | `Pre_Main` |
| `git status --short` | 0 | Dirty prior/user work inventoried and preserved |
| `git log -1 --oneline` | 0 | `c0c3b3e ...` |
| `git diff Pre_Main~1..Pre_Main --stat` | 0 | Base commit scope reviewed; dirty work reviewed separately |
| `node --version` | 0 | v24.13.0 |
| `node C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js --version` | 0 | 11.6.2 |
| `node node_modules/eslint/bin/eslint.js App.js index.js src --ext .js` | 0 | Baseline lint passed |
| `node node_modules/eslint/bin/eslint.js App.js index.js src tests scripts/generate_notification_icon.js --ext .js` | 0 | Final expanded lint passed |
| `node node_modules/jest/bin/jest.js --runInBand --coverage --verbose --json --outputFile=docs/prompt3-qa/jest-results.json` | 0 | Final: 24 suites, 341 passed, 8 TODO, 0 failed |
| `node node_modules/expo/bin/cli install --check` | 0 | Dependencies are up to date |
| `node C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js exec --yes expo-doctor` | 1 diagnostic | 17/18 checks; native/app-config synchronization warning |
| `node C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js audit --json` | 1 findings | 38 packages: 1 low, 20 moderate, 16 high, 1 critical |
| `node ... npm-cli.js audit --omit=dev --json` | 1 findings | 37 packages: 1 low, 19 moderate, 16 high, 1 critical |
| `node ... npm-cli.js uninstall xlsx expo-av @google/generative-ai --offline` | 0 | Removed vulnerable/unused runtime dependencies |
| `node ... npm-cli.js update ws` | 0 | Patched Supabase/Expo/Jest `ws` copies within compatible ranges |
| Expo-compatible React Navigation v7 update | 0 | Latest compatible v7 packages installed; advisory remains without a safe in-major fix |
| `node scripts/generate_notification_icon.js` | 0 | Generated deterministic white-on-transparent notification icons |
| `node scripts/audit_accessibility.js` | 1 findings | 233 explicit label/role candidates; requires manual triage/native screen-reader test |
| Expo local web preview on port 8083 with non-sensitive placeholder Supabase values | 0 server / blocked render | Bundle served; MapLibre native binding prevented UI mount |
| `node node_modules/expo/bin/cli export --platform android --output-dir dist-prompt3-android` | 0 | 64 assets; 4,728,923-byte Hermes bundle |
| `node node_modules/expo/bin/cli export --platform ios --output-dir dist-prompt3-ios` | 0 | 63 assets; 4,702,821-byte Hermes bundle |
| `adb devices -l` | 0 | Daemon started; no devices attached |
| `android\gradlew.bat assembleRelease --no-daemon` from repository root | 1 | Invocation-path error; repository root is not Gradle root |
| `.\gradlew.bat assembleRelease --no-daemon` from `android\` | 0 | Full build succeeded in 58m28s; 484 tasks |
| Same corrected Gradle command after final font change | 0 | Incremental final build succeeded in 2m; 37 executed / 447 up-to-date |
| `apksigner.bat verify --print-certs app-release.apk` | 0 | Valid APK signature, but signer is `CN=Android Debug` |
| Final secret/log scans over `src/` and `tests/` | 0 | No credential-shaped literals found; one harmless `SUPABASE_SERVICE` identifier in a test |
| Final SHA-256 protected-file checks | 0 | Both required hashes match |

## 6. Automated Test Results

| Gate | Prompt 2 baseline | Prompt 3 final | Assessment |
| --- | ---: | ---: | --- |
| Suites | 19 passed | 24 passed | +5 suites; no regression |
| Passed tests | 291 | 341 | +50 passed |
| TODO tests | 8 | 8 | Existing deferred EXIF items remain explicit |
| Failed tests | 0 | 0 | PASS |
| Total tests | 299 | 349 | Includes 8 TODO |
| Snapshots | 0 | 0 | — |

Final coverage from the required run:

| Metric | Covered / total | Final | Prompt 2 | Delta |
| --- | ---: | ---: | ---: | ---: |
| Statements | 1,560 / 2,116 | 73.72% | 74.70% | -0.98 pp |
| Branches | 1,475 / 2,284 | 64.57% | 65.88% | -1.31 pp |
| Functions | 182 / 270 | 67.40% | 67.26% | +0.14 pp |
| Lines | 1,373 / 1,807 | 75.98% | 76.92% | -0.94 pp |

The small percentage decline reflects expanded instrumented source and UI surfaces, not test failures. New coverage includes report concurrency/retry/MIME, AI terminal classification/cancellation, notification lifecycle, full rewards interaction, video boundaries/unmount, heatmap coordinate filtering, timeline truthfulness, demo repetition, PDF/CSV escaping and formula neutralization, release configuration/hashes, picker unmount behavior, and privacy diagnostics. Machine-readable evidence is `docs/prompt3-qa/jest-results.json`; HTML/lcov evidence is under `coverage/`.

Additional gates:

- ESLint: PASS with zero reported errors.
- Expo dependency check: PASS.
- Expo Doctor: 17/18; FAIL only for managed config fields coexisting with checked-in native projects.
- Release configuration tests: 6/6 pass, including icon alpha/color, adaptive safe zone, manifest backup/storage settings, and protected hashes.
- One VideoReport suite timed out only during an earlier overloaded combined focused run; it passed immediately alone and twice in full serial gates. Classified as non-reproducible test-host contention.

## 7. Manual Test Results

No installed native manual journey was executed because ADB found no Android device/emulator, Windows cannot run an iOS simulator, and no hardened staging Supabase project/accounts/fault-injection harness were provided. Therefore citizen, video, officer, permission, notification-tap, lifecycle, font-scale, screen-reader, network-throttling, and account-switch journeys are `NOT RUN` or `BLOCKED`—never inferred as passing from code.

The exact test script and result fields are in `docs/prompt3-qa/MANUAL_MOBILE_TEST_PLAN.md`. It contains C1-C27, V1-V9, O1-O15, D1-D7, all required permission states, foreground/background/terminated/deep-link paths, four width classes, 100%/200% font scaling, keyboard/modal checks, and N1-N11 network conditions. It explicitly requires a non-production staging project and excludes Docker.

The local Expo Web supplement did not render because `@maplibre/maplibre-react-native` reaches a native codegen component unavailable in react-native-web. The check did verify that missing public environment configuration fails before UI mount and that web support is not currently a validated platform.

## 8. Database & Authorization Results

Method: static inspection of `database/Traffic_eye_database.sql`, `database/PHASE1_SQL_EDITOR.sql`, migration sources, application calls, and `SUPABASE_CHANGES.md`. No SQL was executed. The guide's ten checklist rows are all unchecked.

| Boundary | Static result | Production implication |
| --- | --- | --- |
| Public signup forces `citizen` | FAIL in base schema; metadata role/routing fields are trusted. Guide contains a proposed fix only. | User can potentially self-promote or write trusted routing attributes until hardened and verified. |
| Citizen reads only own reports | PARTIAL | Own-row SELECT exists, but related review/media exposure remains unsafe. |
| Citizen report insert is constrained | FAIL | `WITH CHECK` binds `user_id` but does not constrain privileged status/reward/timestamp fields. |
| Officer jurisdiction | FAIL | `is_officer()` policies allow all officers to select/update all reports; no server-side jurisdiction predicate. Client query filters are usability only. |
| Officer review RPC identity/idempotency | FAIL in base source | Caller-supplied officer fallback, no JWT/officer match/jurisdiction check, PUBLIC execute risk, and duplicated orphan SQL after the function terminator. The guide's replacement is not deployed. |
| Concurrent review/points/notification | BLOCKED | Guide proposes row locking and one notification, but no staging concurrency test occurred. |
| Point transaction integrity | FAIL | Any authenticated user can satisfy the current insert policy, allowing forged positive transactions. |
| Notification integrity | FAIL | Current insert policy permits any authenticated session without owner/event binding. |
| Internal officer notes privacy | FAIL | Citizen SELECT on `officer_reviews` exposes whole rows, including `internal_notes`; row policies cannot provide column secrecy. |
| Security-definer least privilege | FAIL | Functions use `search_path=public` and execute grants are not explicitly revoked from PUBLIC/anon. |
| Evidence storage privacy | FAIL | `report-media` is public; evidence URLs are universally readable. |
| Realtime publication | BLOCKED | SQL intent exists, deployed publication was not inspected. |
| AI rate reservation | STATIC ONLY | Migration/test coverage is strong, but actual function/grants were not verified in staging. |
| Demo seed idempotency | PASS static/tests | Documentation test passes; deployment not performed. |

Database/API grants also require explicit deployed verification because current Supabase platform defaults for newly created public tables may differ by project creation date. Do not depend on implicit Data API exposure or implicit function grants.

## 9. Security Findings

- Secret scan: zero `service_role`, JWT-prefix, `sk-`, or `AIza` credential-shaped literals in app/test code. One `SUPABASE_SERVICE` match is an identifier in `tests/ai/handler.test.ts`, not a credential. Client code references only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Protected server AI files remain byte-for-byte at the required hashes. Client AI transport delegates auth/provider selection to the Edge Function and sanitizes typed failures.
- Privacy diagnostics: raw EXIF, hashes, evidence URIs, coordinates, plates, provider bodies, identities, and raw exceptions were removed from sensitive paths. Remaining production-capable console messages are static safety/error markers; other operational diagnostics are `__DEV__` gated. Nine privacy-critical modules have an enforcement test.
- Android local data posture improved: `android:allowBackup="false"`; legacy external storage was removed.
- Export safety improved: `xlsx` was removed, CSV uses BOM/CRLF/strict quoting and neutralizes cells beginning with `=`, `+`, `-`, or `@`; PDF escapes user-controlled HTML.
- Dependency audit: full tree has 38 flagged packages (1 critical, 16 high, 20 moderate, 1 low); production-omitting-dev reports 37. The former runtime-reachable `xlsx` High and vulnerable Supabase `ws` copies are removed/patched. The Critical `shell-quote` is reachable through `react-native -> react-devtools-core` tooling, not the application business runtime. Most Highs are Expo/Metro/config/prebuild/Jest glob/XML/CSS tooling and npm proposes an unsafe Expo SDK 57 major upgrade. The notable mobile runtime advisory is React Navigation's transitive `query-string/decode-uri-component`; current compatible v7 packages remain flagged with no safe in-major npm resolution. No forced audit fix or Expo upgrade was applied.
- Critical unresolved risks are database trust boundaries, review/RPC grants, forgeable ledger/notification inserts, officer-wide access, internal-note disclosure, and public evidence—not client secrets.

## 10. Accessibility Findings

- Navy `#0A1E3F` and amber `#F59E0B` contrast is 7.70:1, passing WCAG AA normal-text contrast in either foreground/background arrangement.
- Reduced-motion handling exists for onboarding parallax, success celebration/confetti, counters, AI stage animations, and particle celebrations. `PressableScale` defaults to button role and disables spring motion when Reduce Motion is enabled.
- The rewards card nested-control defect was removed so one card does not expose/trigger two overlapping press targets.
- Strict AST audit found 233 `TouchableOpacity`, `Pressable`, or wrapper candidates without both explicit label and role at the call site. This count intentionally over-reports visible-text controls and wrapper instances whose default role/name is inherited, but it also proves the requirement “every control has an explicit label and role” is not met.
- TalkBack/VoiceOver name, role, focus order, dialog focus trap/return, selected/busy state, and 44×44 pt touch targets were not validated on native devices.
- 200% font scaling and 360/412/430/600+ dp layouts were not executed. Browser visual validation was blocked by native MapLibre; source inspection cannot certify clipping/focus behavior.

Accessibility status: Medium debt plus blocked native validation. Complete the manual matrix before release and prioritize icon-only controls first.

## 11. Performance Findings

| Artifact | Bundle | Assets | Total export | Result |
| --- | ---: | ---: | ---: | --- |
| Android final export | 4,728,923 B (4.51 MiB) | 64 | 23,275,125 B (22.20 MiB) | PASS |
| iOS final export | 4,702,821 B (4.48 MiB) | 63 | 23,250,020 B (22.17 MiB) | PASS |

- Prompt 2 reported roughly 6.13 MB Android / 6.1 MB iOS bundles. Final Hermes bundles are about 4.73/4.70 MB decimal, a favorable reduction; differences in exporter/Hermes formatting mean this is an indicative comparison, not a binary install-size comparison.
- Weight-specific Google Font imports removed 23 unused font assets and 2,137,698 bytes (2.04 MiB) from each clean export while preserving all 11 registered fonts.
- The largest remaining assets are reward/onboarding PNGs (roughly 0.96-1.39 MB each) and broad vector-icon font families. They are future optimization candidates; no lossy rewrite was performed without a visual device gate.
- Final universal Android APK: 154,967,357 bytes (147.79 MiB), SHA-256 `CB02F427EA4BCFF8BAF040DCD0C50A4BA5BBECF4FB0AA57064937762AE0A3C41`. It packages multiple ABIs and is debug-signed, so it is not representative of Play App Bundle download size.
- AppContext, About, image picker, and location async state now suppress post-unmount updates. Video timers/recorder, notification subscriptions, reduced-motion listeners, and primary screen subscriptions have cleanup paths and automated coverage where feasible.
- Dashboard/heatmap sorts and filters are pure helpers; invalid coordinates are excluded. No installed-device startup time, FPS, JS/native memory, image-cache pressure, or long-scroll profile was captured.

## 12. Known Defects

| ID | Severity | File / area | Description | Status / resolution |
| --- | --- | --- | --- | --- |
| P3-F01 | High | `OfficerReportExport.js`, dependencies | Runtime `xlsx` carried a High advisory and formula/content risk. | FIXED: removed `xlsx`; implemented hardened CSV and tests. |
| P3-F02 | High | Notifications/app config | Full-color launcher image was invalid Android status icon art. | FIXED: deterministic white silhouette + all native densities; config/tests updated. |
| P3-F03 | High | Evidence/AI/report diagnostics | Several paths could log raw errors/evidence-derived values. | FIXED: sanitized/static diagnostics and privacy regression tests. |
| P3-F04 | Medium | AppContext/About/image/location hooks | Late async completion could set state or alert after unmount. | FIXED: StrictMode-safe mount guards and hook tests. |
| P3-F05 | Medium | PDF/CSV export | Empty ranges and hostile HTML/spreadsheet cell prefixes were unsafe/unclear. | FIXED: explicit empty state, HTML escaping, strict CSV/formula neutralization, 50-row tests. |
| P3-F06 | Medium | Rewards UI | Nested press controls risked duplicate activation/focus; backend failure coverage was helper-only. | FIXED: single interaction surface and full screen-level guard/concurrency tests. |
| P3-F07 | Medium | Heatmap/dashboard/timeline | Invalid coordinates, inconsistent jurisdiction filters, and rejected/pending timeline wording could mislead. | FIXED client-side behavior/tests; server authorization remains open separately. |
| P3-F08 | Medium | Android manifest | App backups and legacy external storage increased evidence exposure. | FIXED: backups disabled, legacy storage removed. |
| P3-F09 | Low | Font loading | Package-root imports shipped every font weight. | FIXED: weight-specific imports; 23 assets / 2.04 MiB removed per export. |
| P3-C01 | Critical | `Traffic_eye_database.sql` signup/profile policies | Metadata-supplied role/routing and weak profile update boundary enable privilege manipulation. | OPEN: deploy hardened trigger/policies through a reviewed staging migration. |
| P3-C02 | Critical | Point/notification RLS | Authenticated users can insert forged point transactions and arbitrary notifications. | OPEN: revoke direct inserts; expose audited, owner-bound RPCs only. |
| P3-C03 | Critical | `submit_officer_review` / grants | Caller identity fallback, missing jurisdiction/identity checks, PUBLIC execute risk, and invalid duplicated SQL tail. | OPEN: replace function, revoke grants, grant authenticated only, then adversarial/concurrency test. |
| P3-H01 | High | Report RLS/status | Officers can read/update all reports with no server-side jurisdiction restriction. | OPEN: implement jurisdiction-aware SELECT/RPC authorization and remove direct status update. |
| P3-H02 | High | Citizen report insert | Citizen can supply privileged workflow/reward/timestamp values. | OPEN: narrow insert columns or use server RPC with strict checks/defaults. |
| P3-H03 | High | `officer_reviews.internal_notes` | Citizens can select the full review row, exposing internal notes. | OPEN: revoke base-table citizen SELECT and expose a safe projection/view/RPC. |
| P3-H04 | High | `report-media` storage | Public bucket makes traffic evidence universally readable. | OPEN: make private; enforce owner/jurisdiction policies and short-lived signed access. |
| P3-H05 | High | Android signing | Native `release` uses debug signing; final APK signer is `CN=Android Debug`. | OPEN: configure protected release/EAS credentials outside source and build a signed AAB/APK. |
| P3-H06 | High | Installed mobile validation | No Android device/emulator and no macOS/iOS environment. | OPEN/BLOCKED: run complete plan on signed installed Android and iOS candidates. |
| P3-H07 | High | Supabase operations | All ten deployment/verification checklist entries are unchecked. | OPEN/BLOCKED: apply only to staging first, capture verification, then controlled production change. |
| P3-M01 | Medium | Accessibility | 233 explicit-prop candidates plus no screen-reader/font-scale run. | OPEN: triage true icon-only gaps and execute native matrix. |
| P3-M02 | Medium | Expo/native sync | Doctor 17/18; checked-in native project will not auto-sync managed config fields. | OPEN: reconcile intentionally; do not use blind `prebuild --clean`. |
| P3-M03 | Medium | Store metadata | Privacy policy and support URLs are absent. | OPEN: owner must provide public URLs; do not invent them. |
| P3-M04 | Medium | Web | Native MapLibre import prevents Expo Web mount. | DEFERRED: mobile-only scope; add platform adapters only if web becomes supported. |
| P3-M05 | Medium | Dependency tooling/runtime | 38 advisories remain; React Navigation transitive advisory has no safe in-major npm fix. | DEFERRED: monitor patched Expo SDK 54/v7 paths; do not force breaking audit fixes. |

## 13. Untested Areas

- Real Supabase RLS, grants, storage policies, realtime publication, authentication settings, Edge Function secrets/deployment, rate reservation, and seed behavior.
- Adversarial cross-account, citizen-to-officer escalation, forged points/notifications, jurisdiction bypass, internal-notes access, and signed evidence URL tests.
- Concurrent two-officer review and exactly-once points/notification transaction on a real Postgres backend.
- Android installed cold/warm start, camera/gallery/GPS, MediaStore EXIF, MapLibre rendering, video record/playback/backgrounding, notification status icon/channel/taps, deep links, native sharing, memory/FPS, and process death.
- iOS build/sign/install, limited Photos permission, MOV capture, notification behavior, password-reset universal/deep link, tablet layout, VoiceOver, and TestFlight behavior.
- TalkBack/VoiceOver focus order, 200% font scaling, all target widths/tablet, hardware keyboard, modal focus, and physical 44×44 pt measurements.
- Airplane mode, 3G/slow response, mid-upload loss, OS termination during upload/AI, 401 refresh, 403/409/429/5xx against staging, and account switching with active realtime.
- Store console declarations, privacy/data-safety forms, content rating, screenshots, support/privacy URLs, production EAS credentials, AAB validation, and store review.
- The eight explicit EXIF TODOs remain deferred Phase 4 parser-hardening requirements.

## 14. External Prerequisites

Execute these in order against a dedicated staging Supabase project first. Record SQL/function hashes, actor role, timestamp, result, and rollback; obtain separate approval before production.

1. Create `ai_analysis_events` plus atomic `reserve_ai_analysis_event()` and apply the documented Token Harbor constraint correction.
2. Set server-only AI provider secrets; verify names without printing values.
3. Deploy `ai-analyze --no-verify-jwt`; verify its own bearer-identity enforcement and typed failures.
4. Replace `submit_officer_review` with the row-locking, JWT-derived, jurisdiction-aware, exactly-once transaction; remove the invalid duplicate tail and lock down grants.
5. Harden `handle_new_user` to force `citizen`; protect role, badge, department, jurisdiction, points, and other routing fields; use an audited admin promotion path.
6. Apply the re-runnable demo seed only in staging and verify expected rows/balances.
7. Replace public `report-media` access with private owner/jurisdiction policies; verify `verification-images`; test unauthorized URLs and MIME/size limits.
8. Verify realtime publication for the five required tables and subscription cleanup/deduplication with two accounts.
9. Configure Email Auth, Site URL, exact production/development redirects, and password-reset deep links; do not hard-code a guessed Expo dev URL.
10. Complete every verification row in `SUPABASE_CHANGES.md`, including adversarial RLS/grant and concurrent review tests, and update the handoff limitations.

Additional release prerequisites: owner-provided privacy/support URLs, controlled native/app-config reconciliation, protected release signing/EAS credentials, signed preview/release candidates, Android and iOS devices, staging citizen/officer accounts, and completed manual evidence.

## 15. Store Configuration Status

| Item | Current state | Assessment |
| --- | --- | --- |
| App name / slug / scheme | Traffic Eye / TrafficViolationApp / `trafficeye` | Present |
| Version | 1.0.0 | Present; owner must confirm release numbering/build numbers |
| Android package | `com.trafficviolationapp` | Present |
| iOS bundle identifier | `com.trafficviolationapp` | Added/present; not built on iOS |
| EAS project ID | Present | Configuration only; account/credential ownership not tested |
| `eas.json` | Development, preview APK, production AAB, submit profiles; CLI >=16 | Present |
| Notification icon/color/channel | Dedicated white silhouette / amber / default channel | Static validation PASS; device rendering not tested |
| Adaptive icon | Alpha bounds x229-824, y359-822 within x/y 192-832 safe region | PASS static |
| Android permissions | 8 explicit permissions | Rationales broadly match camera/video/location/EXIF; Play policy necessity still needs owner/device review |
| iOS usage descriptions | Location, camera, photo library | Present; notification behavior and any microphone wording need native archive review |
| Edge-to-edge | Enabled | Compile PASS; visual device compatibility untested |
| Android backup/legacy storage | Backup disabled; legacy storage removed | PASS static/native compile |
| Privacy policy URL | Missing | BLOCKER for store submission |
| Support URL | Missing | BLOCKER for store submission |
| Native/app config sync | Doctor warning | Must be deliberately reconciled |
| Android release signing | Debug certificate | BLOCKER; APK must not be distributed as production |
| iOS signing/archive | None | BLOCKED on Windows |
| Store submission | Not attempted | Correctly outside authorization |

## 16. Regression Matrix

| Test ID | Platform/device | Build type | Feature | Preconditions | Steps | Expected | Actual | Status | Evidence | Defect ref |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RM-C01 | Jest | Unit/integration | Canonical submission | Mock auth/storage/DB | Validate, upload, insert, retry same draft, triple tap | One object/report; reconcile uncertainty; retain evidence | All assertions pass | PASS | `reports.test.js` | — |
| RM-C02 | Native Android+iOS | Signed candidate | Photo journey | Staging citizen | C1-C27 | Complete truthful flow without duplicate or privacy leak | Not run | BLOCKED | Manual plan | P3-H06/H07 |
| RM-C03 | Jest | Unit | AI retry/cancel | Typed failures | 1s/3s backoff, terminal codes, cancel | Bounded retry; terminal no-retry; no late success | 18 retry + transport tests pass | PASS | AI retry/utils suites | — |
| RM-C04 | Jest + native | Unit/signed candidate | Video | Permissions/camera | 15s, early stop, retake, cancel, unmount, MIME | One safe recording/upload | 8 automated pass; native pending | PARTIAL/BLOCKED | VideoReport suite/manual V1-V9 | P3-H06 |
| RM-C05 | Staging DB | Integration | Review transaction | Hardened RPC/two officers | Concurrent approve/reject | One decision, point credit, notification | Not run; source unsafe | FAIL/BLOCKED | SQL review/manual O9 | P3-C03 |
| RM-C06 | Jest + native | Unit/signed candidate | Notifications | Two users/realtime | Dedup, logout, refresh, tap states | Owned, deduped, routed once | 10 automated pass; device pending | PARTIAL/BLOCKED | notifications suite | P3-H06/H07 |
| RM-C07 | Jest + staging | Component/integration | Rewards | Balances/rewards | Insufficient/redeemed/fail/double tap | Server-authorized exactly-once debit | 12 UI/helper pass; RLS unsafe | FAIL/BLOCKED | Rewards suites | P3-C02 |
| RM-C08 | Native | Signed candidate | Permissions/lifecycle | Resettable permissions | Full matrix + background/kill | Recovery without crash/stale work | Not run | BLOCKED | Manual matrix | P3-H06 |
| RM-C09 | Static + staging | Security | Signup/RLS/grants | Applied migrations | Adversarial accounts | Least privilege and private notes/media | Static source fails | FAIL | SQL review | P3-C01-C03/P3-H01-H04 |
| RM-C10 | Jest + native | Unit/device | Demo isolation | Demo enabled | Repeat toggle/report flow | No real network/storage/AI/reward write | 5 automated pass; traffic inspection pending | PARTIAL/BLOCKED | demo suite/manual D1-D7 | P3-H07 |
| RM-C11 | Jest + native | Unit/device | Export | Empty/special/50 rows | Generate preview/share | Escaped PDF, safe CSV, native share once | 11 automated pass; share pending | PARTIAL/BLOCKED | PDF/CSV suites | P3-H06 |
| RM-C12 | Static + native | Audit/device | Accessibility | 360-600+ dp; 200% font | Screen reader, focus, targets, motion | No critical barrier/clipping | Contrast/motion pass; 233 candidates; native not run | FAIL/BLOCKED | AST audit/manual matrix | P3-M01 |
| RM-C13 | CLI | Export/native | Build/config | Credential-free env | Doctor, exports, Gradle | Compatible config and compilable bundles | Exports/build pass; Doctor 17/18; debug signer | PARTIAL | CLI logs/APK hash | P3-H05/P3-M02 |
| RM-C14 | Static/CLI | Source/deps | Security/privacy | Repository | Secret/log/dependency/trust scans | No credentials/PII logs; server auth | Client scans improved; server boundaries fail | FAIL | scans/audit/SQL review | P3-C01-C03 |
| RM-O01 | Jest + staging | Unit/integration | Officer queue | Jurisdiction fixtures | Sort/scope/realtime | Priority order and server-scoped rows | Sort/query helper passes; RLS fails | FAIL | dashboard tests/SQL | P3-H01 |
| RM-O02 | Jest + native | Unit/device | Heatmap | Known coordinates | Severity/date/invalid/GPS/detail | Truthful valid points only | 13 helper tests pass; map device pending | PARTIAL/BLOCKED | heatmap suite | P3-H06 |
| RM-A01 | Android device | Installed signed release | Store-critical | Release-signed candidate | Install/cold start/full plan | No launch/native/plugin defect | No device; local APK debug-signed | BLOCKED | ADB/apksigner | P3-H05/H06 |
| RM-I01 | iPhone/iPad | TestFlight/release | Store-critical | macOS/Xcode signed archive | Install/cold start/full plan | No launch/native/plugin defect | Windows only | BLOCKED | Environment inventory | P3-H06 |

## 17. Final Readiness Decision

**NOT READY**

Critical/High authorization, privacy, signing, backend-deployment, and installed-platform validation gates remain unresolved. Automated tests, exports, and a debug-signed native compile are necessary evidence but cannot authorize production release.

## 18. Safest Next Actions

1. Create/choose an isolated staging Supabase project and back up its current schema/config. Do not test these migrations directly in production.
2. Convert `SUPABASE_CHANGES.md` recommendations into reviewed, versioned forward migrations that fix P3-C01 through P3-H04: signup/profile trust, direct ledger/notification inserts, RPC identity/grants/jurisdiction/idempotency, privileged report fields, internal-note projection, and private evidence.
3. Apply those migrations to staging, then run authenticated/anon/cross-user/officer-out-of-jurisdiction tests plus a two-officer concurrency test. Capture exact results and confirm one review, one point credit, and one notification.
4. Set staging server secrets, deploy the AI function, configure exact auth redirects, and complete all ten checklist rows without printing secret values.
5. Reconcile `app.json` with checked-in native projects through a reviewed native diff. Do not use blind `expo prebuild --clean` over user native changes.
6. Add owner-approved public privacy-policy and support URLs; complete permission/data-safety declarations and verify iOS microphone/notification configuration in an archive.
7. Configure protected Android release/EAS signing outside source, build a signed preview AAB/APK, and verify the certificate is not Android Debug. Produce an iOS TestFlight/archive build on macOS/Xcode.
8. Run `docs/prompt3-qa/MANUAL_MOBILE_TEST_PLAN.md` on at least one Android small/typical phone, one current iPhone, and a 600+ dp tablet, including 200% font, TalkBack/VoiceOver, permission denial/revocation, background/termination, network loss, video, maps, notifications, deep links, sharing, and account switching.
9. Resolve every Critical/High result, add a regression test, rerun the exact Jest/lint/Doctor/export/native build gates, and update this report with installed build IDs and evidence.
10. Only after a clean staging sign-off, take a separately approved, backed-up, monitored production change and store-release decision.

Generated export directories removed during font optimization were reproducible build artifacts and were immediately regenerated cleanly. No Docker feature, file, command, or workflow was added or used.
