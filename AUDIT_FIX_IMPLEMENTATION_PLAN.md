# Audit Fix Implementation Plan

## Purpose

Implement every actionable issue in `PROJECT_AUDIT_REPORT.md`, then verify the Android application through an actual debug build and device test. This plan supersedes the earlier draft where they conflict.

## Non-Negotiable Rules

- Do not expose secrets, OAuth client secrets, Supabase service-role keys, sessions, or tokens.
- Do not fabricate map coordinates or associate EXIF metadata with an image whose identity cannot be proven.
- Do not clear a user’s authentication state because profile, database, or network access fails.
- Do not claim device/runtime success from source inspection or a successful Gradle build.
- Inspect installed MapLibre v11 APIs/types before using event properties or layer APIs; do not assume `react-native-maps` equivalents.
- Make an atomic commit or checkpoint after each completed phase.

## Phase 0 — Decisions and Baseline (P0)

### Application ID decision

Before editing identifiers, determine the application ID of the existing published/internal Android artifact and the OAuth configuration it already uses. A package-ID change produces a different Android app and breaks upgrade continuity.

If the chosen canonical ID is `com.trafficviolationapp`, align all of the following with it:

- `app.json` Android package.
- `android/app/build.gradle` namespace and application ID.
- Kotlin package declarations and source directory path for `MainActivity`, `MainApplication`, `MediaStoreResolverPackage`, and `MediaStoreResolverModule`.
- Android manifest relative component names.
- Android OAuth/package registrations where they are actually applicable.

Do not call the project “unified” while retaining `com.anonymous.TrafficEye` Kotlin packages. Fully-qualified manifest names may be used only as a short-lived compatibility bridge, not the final design.

### Baseline

1. Record `git status`, current dependency lockfile state, current package ID values, and existing test outcomes.
2. Inspect the installed MapLibre package’s type definitions and Expo plugin before changing map code.
3. Identify whether Android is intended to be committed or generated. Because native code is required for the custom MediaStore module, establish a reproducible, documented native workflow and do not leave it as ignored/stale generated output.

## Phase 1 — Android Package, Splash, and OAuth Deep Link (P0)

### Native alignment

Modify the Android application only after the canonical package decision is made. Align native source, manifest, Gradle, and Expo configuration as one change.

### Canonical callback URI

Use one explicit callback URI everywhere, for example:

`trafficeye://auth/callback`

Construct that exact URI explicitly in JavaScript; do not depend on an unspecified default from `makeRedirectUri`. Keep the React Navigation linking configuration consistent with the same path.

Add a browsable Android activity intent filter for the `trafficeye` scheme. Confirm that it routes the canonical callback URI to the running app.

### External configuration checklist

These require dashboard access and must be reported as external setup, not hardcoded in the app:

- Supabase Auth redirect allow-list includes `trafficeye://**`.
- Supabase Google provider uses a Web OAuth client and its secret remains only in Supabase/Google configuration.
- The Google Web client’s authorized redirect URI is the project-specific Supabase Auth callback URL.
- Android package/SHA registration is needed only if a native Google Sign-In SDK is introduced; this project’s browser-based Supabase OAuth flow does not require it by default.

## Phase 2 — Supabase Auth and Startup State (P0)

### Auth event safety

Refactor `AuthContext` so `onAuthStateChange` synchronously records the event/session only. Do not await `fetchProfile()`, call `getUser()`, make database queries, or make any other asynchronous Supabase request directly inside the event callback.

Schedule profile loading outside the callback through state/effect or a deferred, cancellation-aware task. Handle `INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, and `USER_UPDATED` with request sequencing so a late profile response cannot overwrite a newer signed-out/user-switched state.

### Failure model

Keep the following states separate:

- Auth session known / unknown / absent.
- User known / absent.
- Profile loading / loaded / unavailable.
- Onboarding loading / loaded.

For profile, RLS, or network failures with a locally stored session, preserve the authenticated state and show a retryable profile-loading/error state. Clear auth UI state only after a definitive signed-out event or a confirmed absent session.

Add React Native `AppState` handling to start token refresh in the foreground and stop it in the background.

### Startup

Add `onboardingLoading` to `AppContext`; resolve it before selecting the unauthenticated route. Keep the native splash visible while auth and onboarding initialization are unresolved. The branded splash duration must not be used to hide a race condition.

## Phase 3 — Supabase Data Security Check (P0)

Before keeping any client-side profile upsert, inspect and test RLS and the profile-creation flow.

- A client must not set `role`, `points_balance`, badge/officer fields, or another user’s profile.
- Do not use mutable `user_metadata` for authorization.
- Prefer secure server-side profile creation or a narrowly scoped function/policy for self-owned fields.
- For any `SECURITY DEFINER` function, use a non-exposed schema where practical, limit grants, set a safe search path, and verify authorization inside the function.
- Use policies targeted to the correct role and ownership predicates; update policies require both `USING` and `WITH CHECK`.
- Run Supabase security advisors and test authenticated/unauthenticated access before accepting the change.

If schema changes are needed, use the project’s existing migration workflow and commit the generated/reviewed migration.

## Phase 4 — Production MapLibre/OpenFreeMap Migration (P0)

### Screens to migrate

- `src/screens/citizen/NewReport.js`
- `src/screens/citizen/VideoReport.js`
- `src/screens/officer/ViolationHeatmap.js`

Use `@maplibre/maplibre-react-native` and:

`https://tiles.openfreemap.org/styles/liberty`

Reuse and improve `src/components/map/MapLibreMap.js` for the citizen location picker. It already exposes `{ coordinate, address }` from `onConfirm`, but it is source-verified only and must be runtime-tested.

### Required picker behavior

- Camera centered on selected/current/default coordinates.
- Tap-to-place marker.
- Draggable marker with reverse geocode only after drag end.
- Current location action with permission/error UI.
- Debounced forward address search and cancellation/stale-result protection.
- Valid coordinate checks before map camera or marker operations.
- Map style/tile loading and network-error UI.
- OpenFreeMap attribution remains visible.

### Required heatmap behavior

- Use a GeoJSON `ShapeSource` with native MapLibre layers.
- Use `HeatmapLayer` for aggregate density and native cluster/circle/symbol layers for zoom-dependent individual/cluster display.
- Define weight, intensity, radius, blur, opacity, color interpolation, and zoom expressions deliberately.
- Use only valid report coordinates. Missing/invalid coordinates are omitted and surfaced in telemetry/logging; never jitter or fabricate positions.
- Update GeoJSON dynamically after filtered fetches and realtime events.
- Obtain viewport bounds from the installed MapLibre region event API, debounce requests, and protect against out-of-order results.
- Fit the camera only to valid coordinates/bounds.

Only remove `react-native-maps`, its Google Maps config, and the placeholder Google Maps API key after repository search confirms no production imports remain and runtime tests pass.

## Phase 5 — EXIF and MediaStore Provenance (P0)

### Identity and original-media rule

Use an original asset only if identity is proven by the picker asset ID or a directly resolvable selected URI. Pass available picker URI and asset ID through the JS/native boundary.

Remove both unsafe fallbacks:

- Native `MediaStoreResolverModule.kt` filename/size/dimension/recent-item matching fallback.
- JavaScript `exifParser.js` fallback that selects a recent MediaLibrary asset when no verified ID is available.

Do not assume every `content://` URI is `content://media/...`; Android Photo Picker URIs can use other authorities. If original media cannot be resolved safely:

1. Read only the selected picker copy where permitted.
2. Label successful metadata as `EXIF_PICKER_COPY`.
3. Return `GPS_UNAVAILABLE` when no valid metadata is available.
4. Never label an unverified picker copy as original media.

### Format policy

- JPEG: preserve validated APP1 parsing and existing rational/DMS/hemisphere handling.
- PNG: do not run JPEG parsing; use only supported selected-asset/native metadata paths.
- HEIC/HEIF: do not run JPEG parsing; attempt supported native metadata paths and return a safe unavailable result otherwise.
- Stop defaulting an unknown MIME type to JPEG. Detect known MIME/extension conservatively and record an explicit unsupported/unknown format reason.
- Preserve date/camera metadata only when available, but do not treat their presence as location proof.

## Phase 6 — Dependencies and Native Configuration (P1)

1. Do not install or upgrade packages unless an actual peer/build failure requires it.
2. Pin supported Node and package-manager versions in project metadata/documentation.
3. Verify MapLibre config plugin/autolinking in the final native project.
4. Remove obsolete Google Maps dependencies/configuration only after migration validation.
5. Keep all lockfile updates intentional and committed.

## Phase 7 — Validation and Acceptance (P0)

### Automated validation

- Use existing JSX-capable parser/linter tooling; do not use `node -c` for JSX files.
- Preserve and run the EXIF suite.
- Add tests for no-identity MediaStore inputs, unrelated-recent-media prevention, JPEG with/without GPS, Android-redacted GPS, file/content URI outcomes, PNG, and HEIC/HEIF safe behavior.
- Run dependency validation with the project’s functioning package manager.
- Run the Android debug build with `gradlew.bat :app:assembleDebug`; use `clean` only when diagnosing stale output.
- Resolve build errors and rerun the same build until it succeeds.

### Required Android runtime tests

| Scenario | Required result |
| --- | --- |
| Cold start with stored session | Native splash, then correct authenticated route; no Sign-In/onboarding flash. |
| Cold start without session, returning user | Native splash, then auth route; no onboarding flash. |
| Google OAuth | Browser returns to the canonical URI exactly once; PKCE exchanges once; correct signed-in route appears. |
| Profile API/RLS/network failure | Session remains intact; retryable profile state appears; no automatic sign-out. |
| NewReport and VideoReport maps | OpenFreeMap renders; search, tap, drag, confirm, current location and reverse geocoding work. |
| Officer heatmap | Native heatmap/clusters render from valid reports and update after realtime/filter changes. |
| EXIF GPS JPEG | Valid coordinates and address are filled with accurate provenance. |
| EXIF absent/redacted/unsupported | No crash, no false coordinates, clear fallback/manual flow. |
| Upgrade install | Required if application ID or native package changes; confirm existing users are not inadvertently stranded. |

## Completion Criteria

The work is complete only when:

1. The Android debug build succeeds.
2. The native package, manifest, Kotlin classes, and Expo config use a coherent documented application identity.
3. OAuth callback and session restoration have been verified on Android.
4. All production map screens use MapLibre/OpenFreeMap and the officer heatmap uses native GeoJSON layers.
5. EXIF location provenance fails closed when original identity is not provable.
6. Supabase profile security/RLS is tested and no client can elevate role/points/ownership.
7. The final handoff lists changed files, commands/results, runtime-verified items, and dashboard/signing setup still required.
