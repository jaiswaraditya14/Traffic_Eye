# Traffic Eye — EAS Android Audit Required Changes

> **Audit conducted:** 2026-08-19 (Local time: 22:14 IST)
> **Auditor role:** Senior React Native / EAS Android QA Engineer
> **Method:** Static code inspection + configuration analysis
> **EAS APK build status:** NOT ATTEMPTED — local `android/` directory exists from previous manual Gradle build. EAS remote build NOT triggered (audit-only, no source changed).

---

## Project Baseline

| Property | Value |
|---|---|
| Expo SDK | `~54.0.37` |
| React Native | `0.81.5` |
| EAS CLI minimum | `>= 14.0.0` |
| New Architecture | `enabled` (`newArchEnabled=true`) |
| Hermes | `enabled` |
| Edge-to-Edge | `enabled` (`edgeToEdgeEnabled=true`) |
| Android Package | `com.trafficviolationapp` |
| MapLibre | `@maplibre/maplibre-react-native@11.3.6` (installed) |
| Safe Area Context | `react-native-safe-area-context@5.6.2` |
| Image Picker | `expo-image-picker@~17.0.11` |
| Media Library | `expo-media-library@~18.2.1` |
| Location | `expo-location@~19.0.8` |
| Notifications | `expo-notifications@~0.32.17` |

---

## Overall Result

**NOT READY — CRITICAL ISSUES MUST BE RESOLVED BEFORE EAS BUILD**

---

## Issue 1 — EAS Build: `.easignore` Excludes `android/` — Native Module Conflict

### Status
FAIL

### Severity
CRITICAL

### Problem
`.easignore` line 10 contains:
```
android/
```

This causes EAS to run `expo prebuild` and regenerate the entire `android/` directory from scratch. The project contains three **hand-written native Kotlin files** that are NOT driven by any Expo plugin:

- `android/app/src/main/java/com/trafficviolationapp/MediaStoreResolverModule.kt`
- `android/app/src/main/java/com/trafficviolationapp/MediaStoreResolverPackage.kt`
- `android/app/src/main/java/com/trafficviolationapp/MainApplication.kt` (has manual `add(MediaStoreResolverPackage())`)

After EAS `prebuild` regenerates `android/`, these files will NOT exist. The app will compile but `NativeModules.MediaStoreResolver` will be `undefined` at runtime. The EXIF pipeline in `src/utils/exifParser.js` is gated by:

```js
if (Platform.OS === 'android' && MediaStoreResolver?.resolveOriginalMedia) {
```

The optional chain means no crash — but Stage 1A (native GPS extraction via `ACCESS_MEDIA_LOCATION`) is silently skipped in all EAS builds. GPS from gallery photos will fail silently.

### Root Cause
The project is a **bare workflow** app (hand-modified native files) configured as if it were a **managed workflow** app (`.easignore` removes `android/`, relies on prebuild). These are mutually incompatible.

### File(s) Responsible
- `.easignore` (line 10)
- `android/app/src/main/java/com/trafficviolationapp/MediaStoreResolverModule.kt`
- `android/app/src/main/java/com/trafficviolationapp/MediaStoreResolverPackage.kt`
- `android/app/src/main/java/com/trafficviolationapp/MainApplication.kt`
- `src/utils/exifParser.js` (line 817)

### Required Change
**Option A — Bare Workflow (Recommended for current state):**
Remove `android/` from `.easignore`. Commit the full `android/` directory to git. EAS will upload it and use it as-is without running prebuild.

**Option B — Managed Workflow:**
Create a local Expo config plugin (e.g., `plugins/with-mediastore-resolver.js`) that writes the Kotlin files into the generated `android/` directory during `expo prebuild`. Register the plugin in `app.json`.

### Testing Required After Fix
- EAS preview build → install APK → pick gallery photo with GPS EXIF → verify GPS auto-fills in NewReport.
- Logcat: filter `[EXIF Extractor]` → confirm `ORIGINAL_CONTENT_RESOLVER_BINARY` or `ORIGINAL_CONTENT_RESOLVER_EXIF` extraction method appears.
- Confirm `NativeModules.MediaStoreResolver` is NOT undefined (add temporary log if needed).

---

## Issue 2 — EXIF: `r.image_url` Field Mismatch — Evidence Thumbnail Always Shows Icon

### Status
FAIL

### Severity
HIGH

### Problem
`CitizenHome.js` line 136 builds the `recentActivity` array:

```js
imageUrl: r.image_url || null,
```

`fetchCitizenReports` in `src/services/reports/index.js` returns:
```js
*,
media: report_media (
    id,
    file_url,
    file_type,
    ...
)
```

The evidence file URL is stored in `report_media.file_url` (available as `r.media[0].file_url`), NOT in `image_reports.image_url`. The `image_url` column exists on `image_reports` and is populated only if the submit payload explicitly includes it — which may not always happen.

Even when `report_media` is correctly populated after upload, the thumbnail will not render because the mapping reads the wrong field.

### Root Cause
Two evidence URL mechanisms exist: `image_reports.image_url` (denormalized) and `report_media.file_url` (normalized). The Recent Activity mapping only reads the denormalized one.

### File(s) Responsible
- `src/screens/citizen/CitizenHome.js` (line 136)
- `src/services/reports/index.js` (lines 273–279)

### Required Change
```js
// Change line 136 in CitizenHome.js from:
imageUrl: r.image_url || null,
// To:
imageUrl: r.image_url || r.media?.[0]?.file_url || null,
```

### Testing Required After Fix
- Submit a new image report.
- Return to Home screen → Recent Activity → verify evidence thumbnail image appears.
- Test with multiple reports → verify each card shows its own correct thumbnail.
- Test with a report that has no uploaded media → verify graceful icon fallback.

---

## Issue 3 — Dev Screen (`MapLibreTestScreen`) Registered in Production Navigation

### Status
FAIL

### Severity
MEDIUM

### Problem
`CitizenNavigator.js` unconditionally registers the dev-only test screen:

```js
// Lines 115–119 — no __DEV__ guard
<Stack.Screen
    name="MapLibreTest"
    component={MapLibreTestScreen}
    options={{ headerShown: true, title: 'MapLibre Native Test' }}
/>
```

The trigger button in `CitizenHome.js` is guarded by `{__DEV__ && ...}`, so end users cannot tap to navigate there — but the route and screen are still bundled in production builds. The screen is navigable via any route that calls `navigate('MapLibreTest')` (e.g., a future deep link, test automation, or mistake).

### Root Cause
Route registration is not wrapped in a `__DEV__` conditional.

### File(s) Responsible
- `src/navigation/CitizenNavigator.js` (lines 114–120)
- `src/screens/dev/MapLibreTestScreen.js` (no DEV guard at component level)

### Required Change
```js
{__DEV__ && (
    <Stack.Screen
        name="MapLibreTest"
        component={MapLibreTestScreen}
        options={{ headerShown: true, title: 'MapLibre Native Test' }}
    />
)}
```

### Testing Required After Fix
- EAS preview APK: verify `MapLibreTest` route is not accessible.
- Dev build: verify button still appears and navigates correctly.

---

## Issue 4 — Map System Navigation Overlap (Bottom Bar Height Estimate)

### Status
FAIL (Likely)

### Severity
HIGH

### Problem
`MapLibreMap.js` positions the GPS locate button using a fixed height estimate:

```js
// Lines 397–399
const bottomBarEstimatedHeight = showConfirmButton
    ? 80 + 56 + 32 + Math.max(insets.bottom, 16)
    : 80 + 32 + Math.max(insets.bottom, 16);
```

The `locateBtn` is positioned at `bottom: bottomBarEstimatedHeight + 12` (line 515). If the bottom bar renders taller than estimated (e.g., long address wraps to 2 lines, or a location error banner is visible), the GPS button visually overlaps the bottom bar and can become inaccessible.

With `edgeToEdgeEnabled=true`, the map also draws behind the system navigation bar. The `paddingBottom: Math.max(insets.bottom, 16)` (line 529) handles the navigation bar inset for the content inside the bottom bar, but the confirm button and address block may still be clipped on devices with very large insets.

Additionally, `OfficerDashboard` (line 165) uses `SafeAreaView edges={['bottom']}` without `edges={['top']}`, and manually applies `insets.top` to the header `paddingTop`. If `insets.top` is wrong on any device, the header may overlap the status bar.

### Root Cause
Static pixel estimate for dynamic content height. No layout measurement.

### File(s) Responsible
- `src/components/map/MapLibreMap.js` (lines 397–399, 515)
- `src/screens/officer/OfficerDashboard.js` (line 165)

### Required Change
Replace the estimate with a measured height using `onLayout`:

```js
const [bottomBarHeight, setBottomBarHeight] = useState(120); // initial estimate

// On the bottom bar View:
onLayout={(e) => setBottomBarHeight(e.nativeEvent.layout.height)}

// GPS button:
style={[styles.locateBtn, { bottom: bottomBarHeight + 12 }]}
```

### Testing Required After Fix
- Test gesture navigation (swipe-up).
- Test 3-button navigation.
- Test when `showConfirmButton={true}`.
- Test with a long address (2 lines) in the bottom bar.
- Test when the location error banner is visible.
- Test on a small screen (720p) and a large screen.
- Test installed EAS APK, not just dev build.

---

## Issue 5 — `app.json` Contains Stale / Unnecessary Android Permissions

### Status
FAIL

### Severity
MEDIUM

### Problem
`app.json` `android.permissions` declares these permissions that are not needed:

| Permission | Reason to Remove |
|---|---|
| `android.permission.READ_EXTERNAL_STORAGE` | Deprecated on Android 13+; superseded by `READ_MEDIA_IMAGES`. Not needed. |
| `android.permission.WRITE_EXTERNAL_STORAGE` | Traffic Eye uploads via Supabase, not local storage writes. Not needed. |
| `android.permission.READ_MEDIA_AUDIO` | Traffic Eye has no audio file access feature. Not needed. |

On EAS `prebuild`, `app.json` permissions are used to generate a fresh `AndroidManifest.xml`. These stale permissions will reappear in the EAS-built APK. The current manually-edited `android/AndroidManifest.xml` correctly excludes them, but this is overwritten on prebuild.

### Root Cause
Historical permissions not cleaned from `app.json` after being removed from `AndroidManifest.xml`.

### File(s) Responsible
- `app.json` (lines 41–45)

### Required Change
Remove these three lines from `app.json` `android.permissions`:
```json
"android.permission.READ_EXTERNAL_STORAGE",
"android.permission.WRITE_EXTERNAL_STORAGE",
"android.permission.READ_MEDIA_AUDIO"
```

Keep: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_MEDIA_LOCATION`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_VISUAL_USER_SELECTED`, `CAMERA`, `RECORD_AUDIO`.

### Testing Required After Fix
- After EAS prebuild, verify generated `AndroidManifest.xml` does not contain the removed permissions.
- Verify Play Store review does not flag unnecessary permissions.

---

## Issue 6 — Map Live Location: Delhi Fallback

### Status
PASS

### Severity
N/A

### Findings
Code-searched for `Delhi` and `28.6139` (Delhi latitude) across all of `src/` — no results. The map fallback is correctly set to **Mumbai** (`19.0760, 72.8777`) in `MapLibreMap.js` lines 46–48. The fallback is only triggered when GPS is unavailable, and an explanatory error message is shown in the bottom bar. The location flow follows the required pipeline: permission check → `getCurrentPositionAsync` → `getLastKnownPositionAsync` → `Lowest accuracy` → reverse geocode.

---

## Issue 7 — Officer Dashboard: Settings Navigation

### Status
PASS (Code-Level)

### Severity
N/A

### Findings
`OfficerDashboard.js` line 188 calls `navigation.navigate('OfficerSettings')`. `OfficerNavigator.js` line 84 registers `<Stack.Screen name="OfficerSettings" component={OfficerSettings} />`. Route chain is intact. `OfficerSettings.js` renders a complete, functional settings screen.

**NOT TESTED on installed EAS APK** — mark for manual validation.

---

## Issue 8 — Officer Dashboard: Notifications Navigation

### Status
PASS (Code-Level)

### Severity
N/A

### Findings
`OfficerDashboard.js` line 195 calls `navigation.navigate('OfficerNotifications')`. `OfficerNavigator.js` line 86 registers `<Stack.Screen name="OfficerNotifications" component={Notifications} />`. The `Notifications` screen is Supabase-backed, reads from the `notifications` table filtered by the current user's `id`, supports mark-read and realtime updates.

**NOT TESTED on installed EAS APK** — mark for manual validation.

---

## Issue 9 — EXIF Permissions Required vs Available

### Status
PARTIAL PASS

### Severity
MEDIUM

### Required Permissions (Genuinely Needed)

| Permission | Purpose |
|---|---|
| `ACCESS_FINE_LOCATION` | Live location for incident address |
| `ACCESS_COARSE_LOCATION` | Fallback location accuracy |
| `ACCESS_MEDIA_LOCATION` | Unredacted GPS EXIF on Android 10+ |
| `READ_MEDIA_IMAGES` | Gallery image access (Android 13+) |
| `READ_MEDIA_VIDEO` | Gallery video access (Android 13+) |
| `READ_MEDIA_VISUAL_USER_SELECTED` | Partial access (Android 14+) |
| `CAMERA` | Photo and video capture |
| `RECORD_AUDIO` | Video evidence with audio |
| `INTERNET` | Supabase, AI APIs, map tiles |
| `VIBRATE` | Notification feedback |

### Unnecessary Permissions (Currently in `app.json`)

| Permission | Verdict |
|---|---|
| `READ_EXTERNAL_STORAGE` | REMOVE — deprecated, superseded |
| `WRITE_EXTERNAL_STORAGE` | REMOVE — not used |
| `READ_MEDIA_AUDIO` | REMOVE — no audio file feature |

### EXIF Architecture (Production Risk)

- **Stage 1A** (Native `MediaStoreResolver` — Best): Lost in EAS build (see Issue 1).
- **Stage 1B** (Expo `MediaLibrary.getAssetInfoAsync`): Works but less reliable for GPS; Android Photo Picker may redact.
- **Stage 2** (Binary JPEG APP1 parse of picker copy): Reads redacted copy — GPS typically absent.
- **Stage 3** (expo-image-picker `exif: true`): GPS redacted by Photo Picker on Android 13+.

**Net result in EAS build without fix:** GPS from gallery photos silently fails; user must manually enter location.

### Root Cause
Android Photo Picker (default on API 33+) returns a content URI pointing to a redacted copy. GPS EXIF requires reading the original unredacted file via `ACCESS_MEDIA_LOCATION` + `MediaStore.setRequireOriginal()` — which only Stage 1A does correctly via the native module.

### Required Change
Resolve Issue 1 (preserve native module in EAS build). Then verify `ACCESS_MEDIA_LOCATION` permission is explicitly requested at runtime before Stage 1B.

---

## Issue 10 — Recent Activity: Section Order

### Status
CONDITIONAL PASS / LOW PRIORITY

### Severity
LOW

### Findings
Current render order in `CitizenHome.js`:
1. Hero card (Report Violation) — line ~251
2. Traffic Information (horizontal scroll) — line ~298
3. **Recent Activity** — line ~355
4. **Quick Services** — line ~426

Recent Activity IS before Quick Services. If the request was only that Quick Services appear below Recent Activity, the current code is correct.

If the request is that Recent Activity appear **immediately after the hero card** (before Traffic Information), then the Recent Activity block must move from lines 355–424 to immediately after line 295.

### File(s) Responsible
- `src/screens/citizen/CitizenHome.js` (lines 251–456)

### Required Change (if order change is needed)
Move the `{/* ── Recent Activity ── */}` `<Animated.View>` block (lines 355–424) to appear immediately after the hero card block ends (line ~295), before the Traffic Information section.

---

## Issue 11 — API Keys Exposed in Client Bundle

### Status
POTENTIAL RISK

### Severity
HIGH (Security)

### Problem
All API keys use `EXPO_PUBLIC_*` which bakes them into the JavaScript bundle at build time. The `.env` file contains:
- `EXPO_PUBLIC_NVIDIA_API_KEY_1` — NVIDIA NIM API (spend-limited)
- `EXPO_PUBLIC_GEMINI_API_KEY_1/2` — Google Gemini (spend-limited)
- `EXPO_PUBLIC_GROQ_API_KEY_1-6` — Groq API (spend-limited)
- `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` — Supabase (rate-limited by RLS)

Anyone who decompiles the production APK can extract these keys. For Supabase, the anon key with RLS is an accepted risk. For paid AI provider keys, this is a real financial risk.

### Root Cause
Expo's `EXPO_PUBLIC_*` is a client-accessible substitution. There is no server-side proxy.

### File(s) Responsible
- `.env`
- `src/config/ai.config.js`

### Required Change (Before Production Release)
Deploy a server-side proxy (Supabase Edge Function or similar) to call NVIDIA/Gemini/Groq APIs, removing those keys from the client bundle. Rotate all exposed keys after the proxy is deployed.

---

## Summary Matrix

| # | Issue | Status | Severity | Classification |
|---|---|---|---|---|
| 1 | `.easignore` excludes `android/` — native module lost in EAS build | FAIL | CRITICAL | Confirmed Bug |
| 2 | `r.image_url` field mismatch — evidence thumbnail never shows | FAIL | HIGH | Confirmed Bug |
| 3 | Dev screen (`MapLibreTest`) registered in production navigation | FAIL | MEDIUM | Confirmed Bug |
| 4 | Map bottom bar height estimate — GPS button may overlap | FAIL (Likely) | HIGH | Likely Bug |
| 5 | Stale permissions in `app.json` — reappear on EAS prebuild | FAIL | MEDIUM | Confirmed |
| 6 | Delhi fallback on map | PASS | — | Not a Bug |
| 7 | Officer Settings navigation | PASS (code-level) | — | Not Tested on EAS APK |
| 8 | Officer Notifications navigation | PASS (code-level) | — | Not Tested on EAS APK |
| 9 | EXIF permissions and pipeline | PARTIAL PASS | MEDIUM | Confirmed Risk |
| 10 | Recent Activity section order | CONDITIONAL PASS | LOW | Clarification Needed |
| 11 | API keys in client bundle | POTENTIAL RISK | HIGH | Potential Risk |

---

## Final EAS Readiness Report

### Overall EAS Readiness
**NOT READY**

### Build
- EAS build: **NOT TESTED** (audit-only session)
- APK installation: **NOT TESTED**
- Application launch: **NOT TESTED**

### Map
- System navigation overlap: **LIKELY FAIL** (estimate-based bottom bar height)
- Live location: **PASS** (code-level)
- Delhi fallback: **PASS** (Mumbai is correct)
- Location permissions: **PASS** (tiered fallback implemented correctly)
- GPS disabled handling: **PASS** (tiered fallback: Balanced → LastKnown → Lowest)
- Map navigation/selection: **PASS** (code-level, not tested on EAS APK)

### Officer Dashboard
- Settings: **PASS** (code-level)
- Notifications: **PASS** (code-level)

### EXIF
- EXIF reading: **LIKELY FAIL** in EAS build (native module excluded by `.easignore`)
- GPS extraction: **LIKELY FAIL** in EAS build
- Permissions: **PARTIAL** (stale entries in `app.json`)
- Photo Picker/Gallery compatibility: **LIKELY FAIL** in EAS build

### Home Screen
- Recent Activity first (before Quick Services): **PASS**
- Evidence thumbnail: **FAIL** (`r.image_url` reads wrong field)

### Android
- Gesture navigation: **NOT TESTED** on EAS APK
- 3-button navigation: **NOT TESTED** on EAS APK
- Release-only errors: **CRITICAL RISK** (native module excluded from EAS build)

### Issue Counts
- **Critical:** 1 (Issue #1 — EAS build destroys MediaStoreResolver)
- **High:** 3 (Issues #2, #4, #11)
- **Medium:** 3 (Issues #3, #5, #9)
- **Low:** 1 (Issue #10)
- **Potential Risks:** 2 (#4, #11)
- **Not Tested on EAS APK:** All interactive features — EAS build was not triggered

### AUDIT_CHANGES.md created: YES
Path: `d:\Traffic_Eye\AUDIT_CHANGES.md`

---

*End of Audit — No source code was modified during this audit. Only this `AUDIT_CHANGES.md` file was created.*
