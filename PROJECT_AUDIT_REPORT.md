# Project Audit Report

## Audit Date

17 August 2026 (Asia/Kolkata). This was a read-only source/configuration audit. No Android build or device test was run. The EXIF parser unit suite was run and passed 75/75 assertions; that is **SOURCE VERIFIED**, not Android runtime verification.

## Project Environment

| Item | Finding | Verification |
| --- | --- | --- |
| Project type | Expo SDK project with an ignored, pre-generated `android/` directory and custom Kotlin native module; effectively prebuild/bare Android state, not managed-only. | SOURCE VERIFIED |
| Package manager | npm lockfile v3; no `packageManager` or Node `engines` pin. The local `npm` launcher is broken, so `npm ls` could not run. | SOURCE VERIFIED |
| Expo / React Native / React | Expo 54.0.36 / React Native 0.81.5 / React 19.1.0. | SOURCE VERIFIED |
| Android Gradle / Gradle | AGP 8.11.0 (from RN version catalog) / Gradle 8.14.3 wrapper. | SOURCE VERIFIED |
| Android SDK levels | compileSdk 36, targetSdk 36, minSdk 24 (resolved defaults/version catalog). | SOURCE VERIFIED |
| NDK / Kotlin | NDK 27.1.12297006 / Kotlin 2.1.20. | SOURCE VERIFIED |
| Architecture / engine | New Architecture enabled; Hermes enabled. | SOURCE VERIFIED |
| JS config | JavaScript project; no TypeScript, Babel, Metro, or `app.config.*` file found. Expo defaults are relied on. | SOURCE VERIFIED |

The `android/` directory is ignored by Git. Its current generated state therefore does not reliably follow `app.json`; production builds that use the native directory will use the native values, not the conflicting Expo config values.

## Dependency Audit

- `@maplibre/maplibre-react-native` 11.3.6 is installed and declares peers compatible with Expo >=54, React >=19.1, and React Native >=0.80. Its Expo config plugin is declared.
- `react-native-maps` 1.20.1 remains installed and is actively used by all current production map screens. This is a deliberate/unfinished mixed-map implementation, not a completed migration.
- Expo media, location, auth-session, web-browser, AsyncStorage, and Supabase packages are present at SDK-54-compatible locked versions. No duplicate MapLibre, mapping, or Supabase client package was found.
- No dedicated Google native sign-in package is installed. The intended flow is Supabase OAuth plus `expo-auth-session` / `expo-web-browser`, which is a valid architecture, but it depends on the Android deep link and Supabase/Google dashboard configuration.
- `npm ls` was **not verified** because the local npm executable fails before dependency inspection. No package was installed, changed, or removed.

## EXIF Audit

### Source findings

`useImagePicker` requests EXIF for gallery and camera selections, with editing disabled and image quality 1. `NewReport` sends the full selected asset to `extractImageLocation`, then passes validated latitude/longitude to `useLocation.reverseGeocodeFromCoords`. The parser supports Android flat and nested GPS structures, rationals, DMS, hemisphere references, JPEG APP1 parsing, MediaLibrary metadata, and `file://`/`content://` read attempts.

The parser validates latitude [-90, 90], longitude [-180, 180], rejects non-finite values and `(0,0)`, and preserves the correct latitude/longitude ordering. The source unit suite verifies those cases, including S/W coordinates and Android photo-picker GPS redaction.

### Gaps and risks

1. **Wrong-original risk:** if the selected asset has no usable ID, the MediaLibrary fallback searches recent assets by filename/dimensions and ultimately selects the newest asset. The native resolver also matches by filename/size/dimensions rather than the picker URI. This can associate GPS/EXIF from a different photo with the submitted evidence.
2. The binary parser only parses JPEG APP1. PNG, HEIC, and HEIF have no equivalent binary parsing path or explicit format gate. The picker accepts images generally and defaults absent MIME types to `image/jpeg`, so HEIC/PNG behavior is only partial and must be device-tested.
3. Missing or invalid EXIF is handled without a crash and leads to a manual/live-location fallback. Edited/compressed images are not specially identified; success depends on whether metadata survives the edit.
4. Date/time and camera metadata may be retained in raw EXIF but are not extracted into a dedicated report payload by the `NewReport` location flow.
5. The custom `MediaStoreResolver` native module exists and is manually registered. Its runtime access to original, unredacted media and `content://` streams is **not runtime verified**.

## MapLibre/OpenFreeMap Audit

`src/components/map/MapLibreMap.js` is source-verified to configure MapLibre with no access token and the expected OpenFreeMap Liberty URL: `https://tiles.openfreemap.org/styles/liberty`. It implements a camera, tap-to-place, draggable `PointAnnotation`, current location, forward search, and reverse lookup. `MapLibreTestScreen` has a MapLibre map, camera, and annotation and can be opened from the citizen home developer control.

This is **not the production map implementation**. `MapLibreMap` is not imported by a production screen. The following production screens still use `react-native-maps`:

- `src/screens/citizen/NewReport.js` — manual location picker (`MapView`, `Marker`).
- `src/screens/citizen/VideoReport.js` — manual location picker (`MapView`, `Marker`).
- `src/screens/officer/ViolationHeatmap.js` — live map (`MapView`, Android `PROVIDER_GOOGLE`, `Circle`, `Marker`).

MapLibre runtime loading, OpenFreeMap tile availability, Android autolinking, and network-failure handling are **NOT RUNTIME VERIFIED**.

## Heatmap Audit

The officer Live Map is not a MapLibre heatmap. It uses JS clustering plus React Native `Circle` overlays and `Marker` components. There is no `ShapeSource`, GeoJSON source, `HeatmapLayer`, `CircleLayer`, or zoom-expression implementation in source.

The screen has a debounced 800 ms viewport refetch and a realtime refresh, but it sequentially geocodes up to 20 missing-coordinate records and then fabricates jittered Mumbai coordinates for remaining invalid records. The latter is a data-integrity risk: it can display incidents where none occurred. The number of native overlays still scales with clusters and can be expensive with large incident sets; no runtime performance benchmark was available.

## Geocoding Audit

`geoService` uses Photon, then Nominatim, then Expo Location. It has a 6-second timeout per HTTP request, a 150-entry in-memory cache, normalized outputs, and in-flight request de-duplication. MapLibre forward search is debounced 400 ms. The reusable MapLibre component reverse-geocodes only after tap, drag end, or explicit location selection, rather than continuously while dragging.

The production `NewReport` and `VideoReport` manual maps are Google-map based and do not provide address search/dragging. Provider availability, Nominatim/Photon policy compliance, caching effectiveness, and device-network behavior are **NOT RUNTIME VERIFIED**.

## Google Sign-In Audit

### Source findings

- The Supabase client persists sessions in AsyncStorage, refreshes tokens, and correctly enables `detectSessionInUrl` only on web.
- The Google flow obtains a custom-scheme redirect URI, calls Supabase `signInWithOAuth` with `skipBrowserRedirect`, opens an auth browser session, and processes either a PKCE code (`exchangeCodeForSession`) or implicit tokens (`setSession`).
- `AuthContext` has one `onAuthStateChange` listener and uses its events to resolve UI state. Navigation is declarative in `AppNavigator`; the login handler does not separately navigate to Home.
- The previous dangerous direct `supabase.auth.signOut()` on profile failure was **not found**. For normal profile upsert/RLS failure and profile timeout, the code retains an authenticated user and renders `ProfileLoading`.

### Blocking native gap

The current Android manifest has no `trafficeye` deep-link intent filter. It only declares the launcher activity and an HTTPS query. Therefore the native application as audited cannot receive the `trafficeye://...` callback used by OAuth. The config value in `app.json` cannot repair this ignored/stale Android directory by itself.

### Remaining behavior risk

When `getProfile()` returns an error, `fetchProfile()` calls `supabase.auth.getUser()`. If that call itself errors (including due to a network failure), it clears the in-memory user/profile state despite a persisted local session. This is not a `signOut()` call, but it can still return the UI to Sign-In until a subsequent cold start restores the session. External Supabase redirect allow-list, Google provider client ID, Android package/SHA configuration, and OAuth callback behavior are **NOT RUNTIME VERIFIED**.

## Startup Screen Flash Audit

The intended startup architecture exists in source: `preventAutoHideAsync()` is called at module load; `AppNavigator` renders only a unified splash while auth/loading is unresolved; and the splash hides the native screen only after auth completion plus a 2.8-second branded animation. It does not initially mount the Sign-In navigator and then navigate to Home, so the previously described Sign-In flash is not indicated by source.

This still has a deliberate artificial minimum 2.8-second delay. It is branding/animation rather than an auth workaround, but it delays first content. No Android startup recording was available, so screen-flash resolution is **NOT RUNTIME VERIFIED**. `AppContext` also does not wait for its AsyncStorage onboarding flag before route selection; on slow storage this could briefly choose onboarding for a signed-out returning user.

## Android Native Build Readiness

**BUILD NOT EXECUTED — would require a potentially modifying command.** Gradle builds may create or update project build state, and the audit rules prohibit that.

Known blockers in the existing native tree:

1. `app.json` declares Android package `com.anonymous.TrafficEye`, while Gradle declares namespace/application ID `com.trafficviolationapp`.
2. Kotlin `MainActivity`, `MainApplication`, and `MediaStoreResolver*` classes are in `com.anonymous.TrafficEye`, but the manifest uses relative `.MainActivity` / `.MainApplication` names and has no manifest package. With the configured namespace, these resolve to `com.trafficviolationapp.*`, which does not match the compiled classes. This is expected to cause manifest/class resolution failure at build or app launch.
3. The current native manifest has no custom-scheme callback intent filter, blocking the implemented OAuth return path.
4. The active `react-native-maps` configuration uses an obviously placeholder Google Maps API key. Production map screens therefore cannot be treated as map-ready.
5. The native directory is Git-ignored, so its stale configuration cannot be safely assumed to match the application configuration or future EAS/prebuild output.

The project has EAS profiles for debug/development, preview APK, and production AAB, but release signing in the native Gradle file currently falls back to the debug keystore. EAS signing behavior and credentials were not inspected.

## Environment Configuration Audit

| Configuration | Status | Notes |
| --- | --- | --- |
| Supabase URL | PRESENT | Environment variable is supplied and referenced; value intentionally not reported. |
| Supabase anon/publishable key | PRESENT | Environment variable is supplied and referenced; value intentionally not reported. |
| Supabase service-role key | NOT PROVIDED / not referenced | Correct for a mobile client. |
| Google OAuth client/provider configuration | REFERENCED BUT NOT PROVIDED | External Supabase/Google dashboard settings cannot be verified from source. |
| OAuth redirect URI | POTENTIALLY MISCONFIGURED | JS uses `trafficeye://`; native manifest does not register it. |
| Google Maps key | POTENTIALLY MISCONFIGURED | Native/config value is a placeholder. |
| OpenFreeMap | PRESENT | URL is embedded in the unused MapLibre component/test screen. |
| AI provider keys | PRESENT in `.env` | Public-prefixed keys are bundled to the client; values are not reported. |

## Feature Matrix

| Area | Feature | Status | Evidence / runtime status |
| --- | --- | --- | --- |
| EXIF | Image EXIF extraction | PASS | SOURCE VERIFIED; Android runtime not verified. |
| EXIF | GPS extraction | PARTIAL | Parser tests pass; original-media matching can select a different asset. |
| EXIF | Missing EXIF handling | PASS | SOURCE VERIFIED; returns no GPS and falls back safely. |
| EXIF | Invalid EXIF handling | PASS | SOURCE VERIFIED; bounds, non-finite values, and Null Island rejected. |
| EXIF | Image URI handling | PARTIAL | `file://`/`content://` attempts exist; device behavior not verified. |
| EXIF | MediaStore integration | PARTIAL | Native module and fallback exist; matching strategy is unsafe; runtime not verified. |
| EXIF | EXIF to coordinates | PASS | SOURCE VERIFIED by 75/75 parser suite. |
| EXIF | EXIF to address | PASS | SOURCE VERIFIED; reverse geocode uses validated coordinates. |
| EXIF | Image report integration | PASS | SOURCE VERIFIED in `NewReport`; not runtime verified. |
| EXIF | PNG | PARTIAL | Safe fallback possible; no PNG binary EXIF parser. |
| EXIF | HEIC/HEIF | NOT VERIFIED | No explicit support or format handling. |
| MAP | MapLibre native module | PARTIAL | Dependency/plugin/test screen present; native runtime not verified. |
| MAP | OpenFreeMap | PARTIAL | Correct URL exists but is not used in production. |
| MAP | Map rendering / camera / marker | PARTIAL | Implemented only in unused reusable component/test screen. |
| MAP | Tap location / draggable marker / current location | PARTIAL | Implemented only in reusable MapLibre component. |
| MAP | GeoJSON / heatmap layer / zoom-dependent layers | FAIL | No production MapLibre source/layers found. |
| MAP | Clustering / performance considerations | PARTIAL | JS clusters exist; uses native Marker/Circle overlays. |
| MAP | Network failure handling | PARTIAL | Geocoding catches errors; map tile failure UI not implemented. |
| GEOCODING | Forward / reverse geocoding | PASS | SOURCE VERIFIED: Photon → Nominatim → Expo Location. |
| GEOCODING | Debounce / caching / duplicate prevention | PASS | SOURCE VERIFIED: 400 ms search debounce, bounded cache, in-flight map. |
| GEOCODING | Timeout / fallback / address parsing | PASS | SOURCE VERIFIED; 6 s HTTP timeout and normalized fields. |
| GOOGLE AUTH | Google OAuth / Supabase session / PKCE | PARTIAL | Source path exists; external/native callback not verified. |
| GOOGLE AUTH | OAuth redirect | FAIL | Existing native manifest lacks `trafficeye` scheme filter. |
| GOOGLE AUTH | Session persistence / auth listener | PASS | SOURCE VERIFIED using AsyncStorage and one listener. |
| GOOGLE AUTH | Profile fetch / failure handling | PARTIAL | No direct sign-out; network `getUser` path can still clear UI state. |
| GOOGLE AUTH | Navigation / cold start | PARTIAL | Declarative navigation source is sound; Android OAuth/cold start not tested. |
| STARTUP | Native splash / auth initialization | PASS | SOURCE VERIFIED. |
| STARTUP | Authenticated and unauthenticated startup | PARTIAL | Route gating exists; runtime not verified. |
| STARTUP | Screen flash | NOT VERIFIED | Source avoids initial Sign-In render, but no device recording. |
| STARTUP | Navigation initialization | PASS | SOURCE VERIFIED. |
| ANDROID BUILD | Dependency compatibility | PARTIAL | Core Expo/RN/MapLibre peers align; npm tree check unavailable. |
| ANDROID BUILD | Native modules / Gradle / Android SDK | FAIL | Namespace/package/class inconsistency is blocking. |
| ANDROID BUILD | Expo config / release readiness | FAIL | Ignored stale native tree, OAuth callback, and placeholder Maps key. |

## Critical Issues

1. Native Android namespace/application ID differs from `app.json` and from the Kotlin package while the manifest uses relative application/activity class names. This blocks reliable build/launch.
2. No Android `trafficeye` intent filter exists, blocking the Google OAuth callback architecture in the current native build.
3. The requested MapLibre/OpenFreeMap production migration is incomplete: all real map screens still use Google `react-native-maps`; the officer heatmap is not a MapLibre heatmap.
4. The active Google Maps key is a placeholder, so the production Google map screens are not deployable as configured.

## Non-Critical Issues

- MediaStore fallback can attribute metadata to the wrong image when asset identity is missing.
- HEIC/HEIF and PNG EXIF support is not explicitly implemented or tested.
- Heatmap points with missing coordinates are displayed at fabricated jittered coordinates.
- Startup intentionally waits at least 2.8 seconds; onboarding persistence is not part of the initialization gate.
- The project does not pin Node/npm, and the local npm executable is broken.

## Recommended Changes

| File | Current issue | Why it matters | Recommended change | Priority | Risk | Native rebuild |
| --- | --- | --- | --- | --- | --- | --- |
| `android/app/build.gradle`, Android manifest, Kotlin package files, `app.json` | Package/namespace/class names disagree. | Prevents reliable manifest class resolution and gives incompatible app identity. | Choose one lowercase Android application ID/package and align all four native/config locations; regenerate/review native output under version control. | P0 | High | Yes |
| `android/app/src/main/AndroidManifest.xml` | No `trafficeye` callback intent filter. | OAuth browser return cannot open the app. | Register the custom scheme used by `AuthSession` and verify its exact callback URI in Supabase and Google configuration. | P0 | High | Yes |
| `src/screens/citizen/NewReport.js`, `src/screens/citizen/VideoReport.js`, `src/screens/officer/ViolationHeatmap.js` | Production screens remain on Google Maps. | The requested MapLibre/OpenFreeMap migration and native heatmap are not delivered. | Integrate the existing MapLibre component or production equivalent, then retire the mixed renderer path after tests. | P0 | Medium | Yes |
| `src/screens/officer/ViolationHeatmap.js` | Circles/markers simulate heatmaps; invalid locations are jittered. | Misleading incidents and poor scalability. | Use a GeoJSON source with native MapLibre heatmap/cluster layers; omit invalid points instead of inventing positions. | P1 | Medium | Yes |
| `src/utils/exifParser.js`, `android/.../MediaStoreResolverModule.kt` | Asset fallback can choose an unrelated recent photo. | GPS provenance and evidence integrity are compromised. | Preserve and resolve the picker asset/content URI; fail closed if identity cannot be established. | P1 | High | Yes |
| `src/context/AuthContext.js` | `getUser()` error clears in-memory auth state after profile error. | Temporary network failures can visibly return a signed-in user to Sign-In. | Treat unverified/session-check errors as profile-loading/retry state; clear auth only on authoritative signed-out/no-session evidence. | P1 | Medium | No |
| `app.json`, Android manifest / build secret management | Active production map path has a placeholder Maps key. | Google map tiles may fail in current production screens. | Supply a restricted real key or complete MapLibre migration so the key is no longer required. | P1 | Medium | Yes |
| `src/utils/exifParser.js`, picker flow | No explicit PNG/HEIC policy; JPEG default can mislabel assets. | Format-specific GPS behavior is unpredictable. | Detect MIME/format, explicitly document supported formats, and test supported device variants. | P2 | Medium | No |
| `AppContext.js`, startup initialization | Onboarding flag is not awaited. | Signed-out returning users may see onboarding briefly. | Include onboarding-state restoration in the initial readiness gate. | P2 | Low | No |

## Build Readiness

**NOT READY TO BUILD.** A source-only test validates EXIF parser logic, but a build/device test was not run. More importantly, the native package/namespace/manifest mismatch and missing OAuth deep-link registration are known blockers, and the requested production MapLibre migration is not complete.

## Final Verdict

**NOT READY TO BUILD**

Only `PROJECT_AUDIT_REPORT.md` was created by this audit. No project source, dependency, native configuration, or existing report file was modified.
