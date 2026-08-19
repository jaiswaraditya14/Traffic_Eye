# Traffic Eye — EAS Fix Report

## Build

- EAS build: **AWAITING USER APPROVAL** (fixes applied, build not triggered yet)
- APK installation: NOT TESTED
- Android version/API: —
- Device: —
- Build profile: `preview` (APK)

---

## Files Changed

| File | Change |
|---|---|
| `.easignore` | Removed `android/` exclusion — bare workflow EAS build |
| `app.json` | Removed 3 stale permissions (READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE, READ_MEDIA_AUDIO) |
| `src/screens/citizen/CitizenHome.js` | Fixed imageUrl field + reordered sections (hero→recent→quick→traffic) |
| `src/navigation/CitizenNavigator.js` | Wrapped MapLibreTest route in {__DEV__ && ...} |
| `src/components/map/MapLibreMap.js` | Replaced fixed pixel estimate with onLayout-measured bottomBarHeight |

---

## Fixed Issues

### 1. EAS Native Module — .easignore Bare Workflow Conflict
Status: FIXED
Root cause: .easignore excluded android/ which caused EAS to run expo prebuild and destroy MediaStoreResolverModule.kt.
Fix: Removed android/ from .easignore. EAS now uploads and uses the existing native project as-is.

### 2. EXIF GPS Extraction
Status: FIXED (architecture preserved) / VERIFY ON EAS APK
The 4-stage EXIF pipeline and MediaStoreResolverModule.kt are intact. The only failure was exclusion from EAS (fixed in #1).

### 3. Evidence Thumbnail — Wrong Field
Status: FIXED
imageUrl: r.image_url || r.media?.[0]?.file_url || null
Both storage paths tried so thumbnail renders regardless of submission mechanism used.

### 4. Map System Navigation Overlap
Status: FIXED
Replaced: const bottomBarEstimatedHeight = showConfirmButton ? 80+56+32+... : 80+32+...
With: const [bottomBarHeight, setBottomBarHeight] = useState(...)
Plus onLayout={(e) => setBottomBarHeight(e.nativeEvent.layout.height)} on the bottom bar View.
GPS button now floats above actual rendered height, not a fixed estimate.

### 5. Android Permissions — Stale Entries
Status: FIXED
Removed from app.json: READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE, READ_MEDIA_AUDIO
Kept: ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, ACCESS_MEDIA_LOCATION, READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, CAMERA, RECORD_AUDIO, READ_MEDIA_VISUAL_USER_SELECTED

### 6. Recent Activity Section Order
Status: FIXED
New order: Hero → Recent Activity → Quick Services → Traffic Information
slideAnims indices reallocated to preserve all 4 animations.

### 7. Officer Settings
Status: CODE-LEVEL PASS / VERIFY ON EAS APK
Navigation chain intact. No code changes needed.

### 8. Officer Notifications
Status: CODE-LEVEL PASS / VERIFY ON EAS APK
Navigation chain intact. No code changes needed.

### 9. Production Dev Screen
Status: FIXED
MapLibreTest Stack.Screen now wrapped in {__DEV__ && (...)} in CitizenNavigator.js

### 10. API Key Security
Status: DOCUMENTED RISK / SEPARATE TASK
AI provider keys still in EXPO_PUBLIC_* vars. Requires server-side proxy before Play Store release.

---

## Remaining Issues (Pending EAS APK Verification)

1. Map navigation overlap — fix applied, awaiting real device test
2. EXIF GPS — Stage 1A fix applied, awaiting EAS APK to confirm native module present
3. Officer Settings/Notifications — code-level pass, need EAS APK test
4. MapLibreTest production exclusion — need EAS APK to confirm __DEV__ === false

Known risk: API keys in client bundle — out of scope this session.

---

## Final EAS Readiness

READY TO BUILD — all code-level fixes applied and verified by static analysis.
EAS build awaiting explicit user approval.
