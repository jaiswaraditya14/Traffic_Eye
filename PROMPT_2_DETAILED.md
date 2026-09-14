# PROMPT 2 OF 3 — Product Experience, Feature Completion, and Demo Polish

## Role

You are the lead React Native product engineer and mobile UI/UX specialist for **Traffic Eye**, an AI-powered traffic-violation reporting application.

| Key | Value |
|---|---|
| Repository | `D:\Traffic_Eye` |
| Required branch | `Pre_Main` |
| Stack | React Native 0.81, Expo SDK 54, Supabase JS v2, MapLibre |
| Frontend language | **JavaScript only** (no TypeScript in the app) |
| Edge Functions | TypeScript (do not modify) |
| Package manager | npm |
| Test runner | Jest via `jest-expo` preset |
| Lint | ESLint (`npm run lint`) |

This is the **second stage** of a three-stage sprint. Prompt 1 established the backend contract, shared theme, centralized submission flow, and security foundation. Your responsibility is to **complete and polish** the citizen and officer product experience without regressing that foundation.

**Do not merely describe or mock up the work. Implement, inspect, render, test, and document it.**

---

## Start Here — Pre-Flight Checklist

Before editing any file:

1. Run `git branch --show-current`. **Stop** if the result is not `Pre_Main`.
2. Run `git status --short` and **preserve all existing user changes** — do not discard, stash, or overwrite unrelated modifications.
3. Read these repository instructions if present:
   - `.agents/` directory (contains Supabase skill)
   - Any `AGENTS.md` or `GEMINI.md`
4. Read and internalize (these files exist and are critical):
   - [`SUPABASE_CHANGES.md`](file:///D:/Traffic_Eye/SUPABASE_CHANGES.md) — full Supabase manual actions guide (944 lines)
   - [`SPRINT_HANDOFF_1.md`](file:///D:/Traffic_Eye/SPRINT_HANDOFF_1.md) — completed Prompt 1 work, known issues, non-regression list (266 lines)
   - [`src/utils/theme.js`](file:///D:/Traffic_Eye/src/utils/theme.js) — design system: `COLORS`, `DARK_COLORS`, `SPACING`, `FONT_FAMILIES`, `DISPLAY_FONT_FAMILIES`, `TYPOGRAPHY` (7 DM Sans presets), `BORDER_RADIUS`, `SHADOWS`, `GRADIENTS`, `SPRINGS`, `globalStyles`
   - [`src/utils/fonts.js`](file:///D:/Traffic_Eye/src/utils/fonts.js) — loads both Nunito and DM Sans font families
   - [`src/components/index.js`](file:///D:/Traffic_Eye/src/components/index.js) — barrel export for all shared components
5. Read the shared components created/maintained by Prompt 1:
   - [`src/components/common/StatusPill.js`](file:///D:/Traffic_Eye/src/components/common/StatusPill.js) — status badge (pending/approved/rejected)
   - [`src/components/common/PressableScale.js`](file:///D:/Traffic_Eye/src/components/common/PressableScale.js) — animated pressable with reduced-motion support
   - [`src/components/common/ConfirmationModal.js`](file:///D:/Traffic_Eye/src/components/common/ConfirmationModal.js) — confirm/cancel dialog
   - [`src/components/common/ErrorBoundary.js`](file:///D:/Traffic_Eye/src/components/common/ErrorBoundary.js) — branded error recovery screen
   - [`src/components/common/Skeleton.js`](file:///D:/Traffic_Eye/src/components/common/Skeleton.js) — shimmer loading (Skeleton, CardSkeleton, StatSkeleton)
   - [`src/components/common/EmptyState.js`](file:///D:/Traffic_Eye/src/components/common/EmptyState.js) — icon + title + subtitle + optional CTA
   - [`src/components/common/FeedbackToast.js`](file:///D:/Traffic_Eye/src/components/common/FeedbackToast.js) — slide-down toast (success/error/info/warning variants)
   - [`src/components/common/ScreenHeader.js`](file:///D:/Traffic_Eye/src/components/common/ScreenHeader.js) — reusable screen header
   - [`src/components/common/FocusAwareStatusBar.js`](file:///D:/Traffic_Eye/src/components/common/FocusAwareStatusBar.js) — status bar per screen
6. Read the navigation structure:
   - [`src/navigation/AppNavigator.js`](file:///D:/Traffic_Eye/src/navigation/AppNavigator.js) — auth gating: Onboarding → Auth stack → Citizen/Officer navigator
   - [`src/navigation/CitizenNavigator.js`](file:///D:/Traffic_Eye/src/navigation/CitizenNavigator.js) — bottom tabs + stack screens for citizen
   - [`src/navigation/OfficerNavigator.js`](file:///D:/Traffic_Eye/src/navigation/OfficerNavigator.js) — bottom tabs + stack screens for officer
   - [`src/screens/index.js`](file:///D:/Traffic_Eye/src/screens/index.js) — screen barrel exports
7. Read the services:
   - [`src/services/reports/index.js`](file:///D:/Traffic_Eye/src/services/reports/index.js) — centralized submission (`submitReportWithMedia`, `createReportSubmission`, `uploadReportMedia`), citizen/officer queries, realtime subscriptions, rate limiting, duplicate detection (867 lines)
   - [`src/services/ai/index.js`](file:///D:/Traffic_Eye/src/services/ai/index.js) — AI pipeline with retry
   - [`src/services/ai/retry.js`](file:///D:/Traffic_Eye/src/services/ai/retry.js) — transient retry logic
   - [`src/services/ai/manualReview.js`](file:///D:/Traffic_Eye/src/services/ai/manualReview.js) — manual review result builder
   - [`src/services/notifications.js`](file:///D:/Traffic_Eye/src/services/notifications.js) — notification setup
   - [`src/services/supabase.js`](file:///D:/Traffic_Eye/src/services/supabase.js) — Supabase client
   - [`src/context/AuthContext.js`](file:///D:/Traffic_Eye/src/context/AuthContext.js) — auth provider (user, profile, signOut, refreshProfile)
   - [`src/context/AppContext.js`](file:///D:/Traffic_Eye/src/context/AppContext.js) — app state (currentReport, hasSeenOnboarding, etc.)
8. Read the [`app.json`](file:///D:/Traffic_Eye/app.json) configuration — scheme `trafficeye`, EAS project ID, plugins, permissions
9. Run the quickest reliable baseline check: `node node_modules/jest/bin/jest.js --runInBand` — expected: **10 suites, 229 tests passed, 8 todo**
10. **Do not redo completed Prompt 1 work** unless a verified defect requires a targeted fix.

---

## Non-Negotiable Constraints

- **Do not touch `main` branch.**
- **Do not modify** [`supabase/functions/ai-analyze/index.ts`](file:///D:/Traffic_Eye/supabase/functions/ai-analyze/index.ts) or [`supabase/functions/ai-analyze/providers.ts`](file:///D:/Traffic_Eye/supabase/functions/ai-analyze/providers.ts).
- **Preserve** authentication, centralized report submission (`submitReportWithMedia`), fail-closed validation (`checkUserRateLimit`, `checkPlateDuplicate`), rewards, and officer-review integrity.
- **Do not expose** secrets, provider keys, or privileged credentials.
- **JavaScript only** in the React Native app. TypeScript only in Edge Functions.
- **Reuse** the shared theme tokens (`COLORS`, `TYPOGRAPHY`, `SPACING`, `BORDER_RADIUS`, `SHADOWS`, `SPRINGS`, `GRADIENTS`) and existing shared components before creating new ones.
- **Avoid** heavy UI, animation, charting, and state-management packages. Do not add `react-native-reanimated`, `lottie`, `victory-native`, `redux`, `zustand`, or similar.
- Add **Expo-compatible** packages only through `npx expo install`.
- Use **real data** from Supabase except in explicit demo mode.
- **Handle all states**: loading, empty, error, offline, permission-denied, retry, and success.
- **Respect**: safe areas, font scaling, accessibility labels, reduced motion, and small-device layouts.
- **Clean up** subscriptions, timers, listeners, and animations on unmount.
- **Do not** deploy, publish, or mutate live external services.
- **Do not** run SQL against the live Supabase project.
- **Preserve** all existing comments and docstrings unrelated to your changes.

---

## Existing File Inventory (Screens to Upgrade)

### Citizen Screens (`src/screens/citizen/`)

| File | Size | Description |
|---|---|---|
| `CitizenHome.js` | 35 KB, 871 lines | Dashboard with hero, stats bar, recent activity, quick services, traffic info cards |
| `NewReport.js` | 41 KB, ~950 lines | Camera/gallery capture → location → submit flow |
| `ReportSuccess.js` | 11 KB, 325 lines | Post-submission confirmation with animated checkmark |
| `ImageReportStatus.js` | 26 KB | Status timeline for a single report |
| `Rewards.js` | 42 KB, 844 lines | Points hero, tier progress, reward catalog with redemption |
| `VideoReport.js` | 44 KB | Video capture, playback, retake, upload (Prompt 1 centralized submission) |
| `Profile.js` | 17 KB, 455 lines | User profile with stats, settings, logout |
| `Notifications.js` | 21 KB | Notification list |
| `MyReports.js` | 25 KB | Full report list |
| `ReportDetail.js` | 22 KB | Single report detail view |

### Officer Screens (`src/screens/officer/`)

| File | Size | Description |
|---|---|---|
| `OfficerDashboard.js` | 35 KB, 802 lines | Command center with pending/approved/rejected counts, queue |
| `ImageReportReview.js` | 37 KB | Evidence review, violation override, approve/reject |
| `ViolationHeatmap.js` | 40 KB | MapLibre heatmap with severity/time filters |
| `OfficerReportExport.js` | 33 KB | PDF export with date-range filtering |
| `PendingQueue.js` | 45 KB | Full pending reports queue |
| `OfficerProfile.js` | 14 KB | Officer profile |

### Shared Screens (`src/screens/shared/`)

| File | Size | Description |
|---|---|---|
| `AIProcessing.js` | 21 KB, 487 lines | AI analysis with pulse animation, Try Again, manual-review fallback |
| `AIResultsVerification.js` | 30 KB, 626 lines | AI results editing, violation selection, centralized submission |
| `OnboardingCarousel.js` | 12 KB, 355 lines | 3-slide onboarding carousel |
| `PermissionsRequest.js` | 6 KB | Permission request screen |

### Existing Assets (`assets/images/`)

Already present: `1.jpg`, `onboarding_ai.jpg`, `onboarding_rewards.jpg`, `icon.png`, `adaptive-icon.png`, `splash.png`, various reward images in `assets/images/rewards/`.

---

## Deliverables

### 1. New Shared Components

Create reusable components **only where they eliminate genuine duplication** across multiple screens. Register each in [`src/components/index.js`](file:///D:/Traffic_Eye/src/components/index.js).

#### 1a. `GlassCard.js` (`src/components/common/`)
- Frosted-glass surface using `expo-blur` `BlurView`
- Props: `intensity`, `tint`, `borderRadius`, `style`, `children`
- Android < 12 fallback: semi-transparent white surface
- Use `BORDER_RADIUS`, `SHADOWS`, `SPACING` from theme

#### 1b. `AnimatedCounter.js` (`src/components/common/`)
- Count-up animation from `from` to `to` over configurable `duration`
- Props: `from`, `to`, `duration`, `formatValue`, `style`, `prefix`, `suffix`, `trigger` (re-triggers on change)
- Respects `AccessibilityInfo.isReduceMotionEnabled()` — snaps to final value
- Uses `Animated.timing` with `useNativeDriver: false` (text value interpolation)
- Accessible: `accessibilityLabel` shows the final formatted value

> [!NOTE]
> `Skeleton`, `EmptyState`, `FeedbackToast`, `StatusPill`, `PressableScale`, `ConfirmationModal` already exist. Do not recreate them.

---

### 2. Citizen Home Upgrade

**File**: [`src/screens/citizen/CitizenHome.js`](file:///D:/Traffic_Eye/src/screens/citizen/CitizenHome.js)

The screen already has: navy gradient header, greeting with GPS city, stats bar, amber report-violation hero, recent activity feed with thumbnails, quick services grid, traffic info horizontal scroll, realtime subscription, notification bell with unread count.

**Add/upgrade**:
- **Animated amber points badge**: Separate card below hero showing trophy icon + `AnimatedCounter` for points + "Redeem" CTA linking to Rewards
- **Frosted photo and video quick actions**: Replace the single amber hero with two side-by-side gradient cards — amber "Photo Report" (→ NewReport) and navy "Video Report" (→ VideoReport) — using `GlassCard` or `LinearGradient`
- **Count-up animation on focus**: Stats bar values (Reports, Verified, Points) animate from 0 using `AnimatedCounter` when the tab gains focus (use `useFocusEffect` to bump a `trigger` key)
- **Skeleton loading state**: While `loadData()` is pending on first load, show `StatSkeleton` in the stats bar and `CardSkeleton` placeholders for recent activity
- **Pull-to-refresh**: Wrap `ScrollView` content with `RefreshControl` — amber tint color, navy progress background
- **Error/offline state**: If `fetchCitizenReports` errors, show an inline banner with cloud-offline icon and "Pull down to retry" message. Do not replace the entire screen.
- **Accessibility**: Add `accessibilityLabel` and `accessibilityRole="button"` to the quick action cards, notification bell, and service items

**Preserve**: The existing realtime subscription, location-based city, quick services grid, traffic info cards, dev-only MapLibre test button, all existing navigation patterns (`navigation.getParent()?.navigate(...)` fallback).

---

### 3. New Report Step Indicator

**File**: [`src/screens/citizen/NewReport.js`](file:///D:/Traffic_Eye/src/screens/citizen/NewReport.js)

**Add**:
- Three-step indicator at the top: **Capture** → **Location** → **Submit**
- Active step highlighted with amber fill + number; completed steps show a checkmark; upcoming steps are muted
- Animated progress line between steps (use `Animated.timing` on width)
- Clear camera/gallery hierarchy: camera button primary, gallery button secondary
- MapLibre location preview card (read-only mini-map) showing the selected location with a pulsing pin marker
- Source badge below map: "📍 EXIF", "📱 Device GPS", or "✏️ Manual" — derived from `currentReport.locationSource`
- Permission-denied recovery: if camera or location permission is denied, show a clear message with "Open Settings" button
- Validation: disable the Submit/Continue button when required fields are incomplete; show inline validation messages

**Preserve**: Existing capture logic, EXIF extraction, location selection, image cropping via `ImageCropModal`, and all state management.

---

### 4. AI Processing 5-Stage Animation

**File**: [`src/screens/shared/AIProcessing.js`](file:///D:/Traffic_Eye/src/screens/shared/AIProcessing.js)

The screen already has: pulse animation, progress bar loop, stage labels, Try Again button, manual-review confirmation modal, fail-closed duplicate check, overlapping-run prevention, unmount cleanup.

**Upgrade the visual stage representation** to show five discrete stages:

| # | Label | Icon |
|---|---|---|
| 1 | Scanning image | `image-outline` |
| 2 | Detecting vehicles | `car-outline` |
| 3 | Reading plate | `document-text-outline` |
| 4 | Cross-checking evidence | `shield-checkmark-outline` |
| 5 | Report ready | `checkmark-circle-outline` |

- Map each stage to the `onStageChange` callback from the AI pipeline (stages: `vision`, `ocr`, `audit`)
- Each stage node shows: icon, label, a progress indicator (dot/ring) that fills when active, checkmark when complete
- Use deterministic, interruptible `Animated.timing` animations — stop previous when advancing
- Clean up all animation references on unmount
- When AI is unavailable, the error phase (Try Again / manual review) already works. **Preserve** the Prompt 1 manual-review fallback exactly.

---

### 5. AI Results Verification Polish

**File**: [`src/screens/shared/AIResultsVerification.js`](file:///D:/Traffic_Eye/src/screens/shared/AIResultsVerification.js)

Already has: violation multi-select with toggle chips, editable vehicle number, confidence display, submission via `submitReportWithMedia`, double-tap guard, unmount tracking.

**Add/upgrade**:
- **Animated confidence meter**: Circular or arc gauge showing confidence 0–1.0 as a percentage. Red (< 0.4), yellow (0.4–0.7), green (> 0.7). Animate the fill on mount.
- **Accessible numeric score**: Always show the numeric percentage alongside the gauge, not just the visual
- **Realistic Indian license-plate presentation**: Display the detected plate in a styled badge resembling an Indian number plate (white background, black text, rectangular border)
- **Tappable violation chips**: Each chip has an animated selected/deselected state (scale bounce + fill color change) using `PressableScale` or `Animated.spring`
- **Submission feedback**: Show `FeedbackToast` success/error after submission completes

**Preserve**: Centralized submission via `submitReportWithMedia`, the `submissionRef` and `submittingRef` guards, the manual-review flag handling.

---

### 6. Report Success Screen

**File**: [`src/screens/citizen/ReportSuccess.js`](file:///D:/Traffic_Eye/src/screens/citizen/ReportSuccess.js)

Already has: animated checkmark with spring, pulse ring loop, next-steps info, navigation buttons, hardware back blocking.

**Add/upgrade**:
- **Lightweight confetti**: ~20–30 animated circles/squares that fall from the top using `Animated.timing` with staggered delays and random horizontal positions. Use theme colors (amber, navy, success). Clean up on unmount.
- **Self-drawing checkmark**: Animate the checkmark's opacity/scale in a sequence that simulates drawing (two strokes)
- **Animated points earned**: If route params contain `reward_amount`, show an `AnimatedCounter` counting up to that value with "pts" suffix and a trophy icon
- **Navigation behavior**: "Report Another" navigates to `NewReport` with `navigation.reset()` to prevent accidental back-to-success. "View My Reports" navigates to `MyReports`.
- **Prevent resubmission**: The hardware back handler already resets to `CitizenMain`. Ensure the screen is presented via `navigation.replace()` from `AIResultsVerification` so it cannot be swiped back to.

---

### 7. Status Timeline

**File**: [`src/screens/citizen/ImageReportStatus.js`](file:///D:/Traffic_Eye/src/screens/citizen/ImageReportStatus.js)

**Upgrade to a vertical timeline** with four nodes:

| Node | Condition |
|---|---|
| **Submitted** | Always present, timestamp from `submitted_at` |
| **Under Review** | Present when status is `pending` (show "Awaiting officer review") |
| **Approved** ✅ | Show when `status === 'approved'`, timestamp from `reviewed_at` |
| **Rejected** ❌ | Show when `status === 'rejected'`, timestamp from `reviewed_at` |

- Connecting lines between nodes: solid for completed steps, dashed for pending
- Officer remarks shown in a card below the Approved/Rejected node
- Points-earned badge (amber pill) shown on approved reports with `reward_amount > 0`
- **Never fabricate missing timestamps** — if `reviewed_at` is null, show "Pending" not a fake date
- Handle the incomplete state gracefully (only Submitted node filled in)

---

### 8. Rewards Screen Polish

**File**: [`src/screens/citizen/Rewards.js`](file:///D:/Traffic_Eye/src/screens/citizen/Rewards.js)

Already has: animated points hero, tier progress bar, reward catalog with tiles, redemption modal with coupon code, clipboard copy, BlurView overlay, loading/error states, `refreshProfile()` integration.

**Add/upgrade**:
- **Subtle sparkle effect**: Tiny animated opacity-pulsing dots around the points hero area (2–4 dots, amber/white colors)
- **Reward-card press tilt**: Use `PressableScale` or a custom `Animated.Value` to add a subtle scale + slight rotation on press for the reward tiles
- **Correct state handling**: Ensure these states are clearly handled and tested:
  - Insufficient points: card shows "Need X more points" with disabled style
  - Already redeemed: card shows "Redeemed ✓" badge
  - Unavailable reward: grayed out with "Coming soon" label
  - Loading: `StatSkeleton` placeholders
  - Failure: `FeedbackToast` error
- **Never weaken redemption idempotency** — the existing `rewardService` handles this server-side

---

### 9. Officer Dashboard Upgrade

**File**: [`src/screens/officer/OfficerDashboard.js`](file:///D:/Traffic_Eye/src/screens/officer/OfficerDashboard.js)

Already has: officer name/badge/zone display, pending/approved/rejected counts, pending report list, fade/slide animations, jurisdiction filtering.

**Add/upgrade**:
- **Dark-navy command-center aesthetic**: Use `GRADIENTS.heroDark` for the header gradient
- **Animated status rings**: Three circular progress indicators for pending (amber), approved (green), rejected (red) counts — using `Animated.timing` on SVG-like arc paths or simple circular views with percentage text
- **Top-five pending queue**: Sort by severity (critical > high > medium > low) then by age (oldest first). Show urgency indicator: red dot for critical, amber dot for high
- **Realtime "Live" badge**: Pulsing green dot + "LIVE" text when the realtime subscription is active. Use `subscribeToOfficerQueue` from report service.
- **Skeleton loading**: Show `StatSkeleton` and `CardSkeleton` while `fetchData()` is loading
- **Pull-to-refresh**: `RefreshControl` with navy/amber colors
- **Empty state**: Use `EmptyState` component when no pending reports exist
- **Offline/error state**: Inline error banner similar to CitizenHome
- **Jurisdiction-filtered queries**: Already implemented — preserve the badge-derived pincode + jurisdiction keyword filtering

---

### 10. Officer Review Upgrade

**File**: [`src/screens/officer/ImageReportReview.js`](file:///D:/Traffic_Eye/src/screens/officer/ImageReportReview.js)

**Add/upgrade**:
- **Evidence image**: Full-width image with tap-to-zoom (use `Modal` with `Image` resizeMode contain)
- **AI analysis display**: Show AI confidence score, detected violations, detected plate in a card
- **Relevant telemetry**: Location address, coordinates, submission timestamp, severity badge
- **Violation add/remove override**: Allow officer to add or remove violations from the AI-detected list before deciding
- **Approve and reject confirmations**: Use `ConfirmationModal` before submitting decision
- **Locked loading state**: While `submitOfficerDecision()` is in flight, disable both buttons and show `ActivityIndicator`
- **Idempotent retry behavior**: If the RPC returns `already_reviewed: true`, show an info toast instead of an error
- **Clear failure recovery**: Show error toast with retry option on RPC failure
- **Authorization and jurisdiction preservation**: The existing `submitOfficerDecision` RPC enforces auth + jurisdiction server-side — do not bypass or duplicate this logic client-side

---

### 11. Violation Heatmap Filters

**File**: [`src/screens/officer/ViolationHeatmap.js`](file:///D:/Traffic_Eye/src/screens/officer/ViolationHeatmap.js)

**Add/upgrade**:
- **Severity filters**: Chips for Low, Medium, High, Critical — multi-select with animated selection state
- **Time range filters**: Today, Week, Month, All — single-select with animated selection state
- **Correctly recomputed MapLibre source data**: When filters change, filter the fetched data array and update the GeoJSON source. Do NOT re-fetch from the server on every filter change — filter client-side.
- **Cluster/report detail bottom sheet**: When tapping a cluster or individual report pin, show a bottom sheet with evidence thumbnail, violation type, severity, status, and timestamp
- **My Location action**: FAB button that centers the map on the user's current location with `expo-location`
- **Permission-safe centering**: If location permission is denied, show a toast instead of crashing
- **Empty-map state**: Overlay message "No reports match your filters" when the filtered dataset is empty
- **Do not add a second map implementation** — use only `@maplibre/maplibre-react-native`

---

### 12. Officer PDF Export

**File**: [`src/screens/officer/OfficerReportExport.js`](file:///D:/Traffic_Eye/src/screens/officer/OfficerReportExport.js)

**Add/upgrade**:
- Use `expo-print` for PDF generation and `expo-sharing` for share
- **Date-range filtering**: Two date pickers (from/to) using `@react-native-community/datetimepicker`
- **Summary statistics**: Total reports, approved count, rejected count, pending count in the selected range
- **Useful report metadata**: Each row shows violation type, plate, location, severity, status, date
- **Preview/share workflow**: Generate HTML → render PDF → share via `Sharing.shareAsync()`
- **Empty state**: "No reports found in this date range" with `EmptyState` component
- **Error state**: Toast on generation failure
- **Escape user-provided content** in the generated HTML template (violation types, addresses, plates may contain special characters) — use a simple escape function for `<`, `>`, `&`, `"`, `'`

---

### 13. Realtime Notifications Loop

Implement the complete notification lifecycle in the existing auth/session architecture. Modify [`App.js`](file:///D:/Traffic_Eye/App.js) and relevant service/screen files.

**Requirements**:
- Subscribe to `notifications` table changes **filtered to the authenticated user's ID** using `subscribeToNotifications()` from report service
- On new insert, trigger a local Expo notification via `expo-notifications` `scheduleNotificationAsync()`
- Update the unread badge count immediately on CitizenHome and any active notification screen
- Navigate to the related report when the user taps the notification (already partially implemented in `App.js` notification response listener)
- **Prevent duplicate local notifications**: Track notification IDs in a `Set` ref; ignore already-fired IDs
- **Prevent duplicate subscriptions**: Ensure only one subscription per user ID is active. Clean up on logout, account change, and unmount.
- Handle:
  - **Foreground**: Show the notification toast using `FeedbackToast`
  - **Background**: Use the OS notification channel (already configured: `traffic-eye-default`)
  - **Denied permission**: Silently skip local notification; still update badge
  - **Unavailable device**: No-op

---

### 14. Video Reports Completion

**File**: [`src/screens/citizen/VideoReport.js`](file:///D:/Traffic_Eye/src/screens/citizen/VideoReport.js)

Already has: camera view, recording controls, submission via `submitReportWithMedia`, centralized upload, manual-review fallback.

**Add/complete**:
- **15-second recording timer**: Countdown circle or bar. Auto-stop when timer reaches 0.
- **Recording-limit enforcement**: Do not allow recording beyond 15 seconds
- **Playback**: After recording, show video preview using `expo-video` (already in dependencies)
- **Retake**: Clear the recorded video and return to camera view
- **Correct MIME type**: `video/mp4` for recorded videos
- **Correct storage path**: `report-media/{userId}/{draftUUID}.mp4`
- **Keyframe extraction**: Attempt to extract a single frame from the video for AI analysis using `expo-video-thumbnails` if available and compatible. If not compatible with Expo SDK 54, **use the first frame of the video or skip AI and go directly to manual review**. Document the limitation clearly.
- **Upload progress**: Show a progress indicator during the upload
- **Cancellation-safe cleanup**: If the user navigates away during upload, cancel the upload and clean up
- **Retry and manual-review fallback**: Already implemented from Prompt 1 — preserve it

---

### 15. Onboarding Carousel Upgrade

**File**: [`src/screens/shared/OnboardingCarousel.js`](file:///D:/Traffic_Eye/src/screens/shared/OnboardingCarousel.js)

Currently has 3 slides with images from `assets/images/`. Upgrade to 4 slides:

| # | Title | Subtitle |
|---|---|---|
| 1 | See a violation? Snap it! | Capture photo or video evidence instantly |
| 2 | AI analyzes in seconds | Smart detection of plates, violations, and locations |
| 3 | Officers verify and act | Verified reports lead to real enforcement |
| 4 | Earn rewards, save lives | Collect points for every approved report |

**Generate four consistent navy/amber illustrations** using the image generation tool. Requirements:
- Navy (`#0A1E3F`) and amber (`#D97706`) color palette
- No embedded text in the illustrations (text is rendered by the app)
- Clean, modern, flat illustration style
- Save optimized files to `assets/images/` (e.g., `onboarding_1.png` through `onboarding_4.png`)

**Add**:
- **Parallax scrolling**: Offset the illustration slightly from the text during scroll using `Animated.event` on the `ScrollView` `onScroll`
- **Accessible page indicators**: Dots with `accessibilityLabel` showing "Page X of 4"
- **Get Started action**: Final slide shows "Get Started" button instead of "Next"
- **Persistent onboarding completion**: Already handled by `setHasSeenOnboarding(true)` in `AppContext`
- **Reduced-motion fallback**: If `AccessibilityInfo.isReduceMotionEnabled()`, disable parallax and use simple opacity transitions
- **Correct small-screen behavior**: Ensure illustrations don't clip on screens < 375px wide

---

### 16. App Icon and Splash

**Generate a professional Traffic Eye app icon** using the image generation tool:
- Stylized eye motif combined with a traffic-signal element
- Navy (`#0A1E3F`) and amber (`#D97706`) palette
- Strong small-size silhouette — must be recognizable at 48×48
- **No text**, no unofficial government seal
- Save to `assets/images/icon.png` (1024×1024)

**Generate adaptive icon foreground**: Same design on transparent background, save to `assets/images/adaptive-icon.png` (1024×1024). Verify it works within Android's adaptive-icon safe zones (center 66% is the safe area).

**Verify splash configuration** in `app.json`:
- Splash image: `./assets/images/icon.png`
- Background color: `#0A1E3F`
- Resize mode: `contain`

---

### 17. About Screen

**Add an About screen** to the Profile navigation stack:

**File**: Create `src/screens/citizen/About.js` (and `src/screens/officer/About.js` or share one)

Contents:
- App name: "Traffic Eye" (from `app.json`)
- Version: Derive from `expo-constants` `Constants.expoConfig.version`
- Technology badges: React Native, Expo, Supabase, MapLibre — small pills with icons
- "Made for [University/Event]" — use a centralized placeholder like "Academic Project" if the event name is not found in config
- App icon centered at top
- Navy gradient header consistent with Profile screen

**Add navigation**: Add an "About" row in both [`Profile.js`](file:///D:/Traffic_Eye/src/screens/citizen/Profile.js) and [`OfficerProfile.js`](file:///D:/Traffic_Eye/src/screens/officer/OfficerProfile.js) settings lists. Register the screen in both `CitizenNavigator.js` and `OfficerNavigator.js`.

---

### 18. Hidden Demo Mode

**Five taps** on the version number in the Profile/About screen toggles demo mode.

**When enabled**:
- Persist the flag in `AsyncStorage` (key: `traffic_eye_demo_mode`)
- Show a subtle amber "Demo Mode" badge in the Profile header
- Show a `FeedbackToast` confirmation: "Demo mode enabled"
- When starting a new report:
  - Load a bundled synthetic test image from `assets/images/test1.jpeg` (already exists)
  - Use a deterministic Mumbai location: `{ latitude: 19.0760, longitude: 72.8777, address: 'Gateway of India, Mumbai 400001' }`
  - **Skip the external AI call** entirely
  - Return a schema-compatible cached AI result:
    ```js
    {
      violationDetected: true,
      violationType: 'Signal Jump',
      allViolations: ['Signal Jump', 'No Helmet'],
      vehicleNumber: 'MH01AB1234',
      confidence: 0.92,
      severity: 'high',
      description: 'Demo: Signal jump detected at Gateway of India',
      plateOCR: { plate: 'MH01AB1234', confidence: 0.95 },
    }
    ```
  - **Prevent accidental production-data creation**: Do NOT call `submitReportWithMedia()`. Instead, navigate directly to `ReportSuccess` with mock data. Show a "Demo — not saved" indicator on the success screen.

**When disabled**:
- Clear the `AsyncStorage` flag
- Show `FeedbackToast`: "Demo mode disabled"
- Restore the real AI pipeline and submission flow

---

### 19. Global Quality Requirements

Apply across **all** substantially modified screens:

- [ ] Use shared theme tokens — no hardcoded colors that duplicate `COLORS.*`
- [ ] Skeleton loading for data-dependent screens
- [ ] Pull-to-refresh on scrollable data screens
- [ ] Empty states using `EmptyState` component
- [ ] `FeedbackToast` for non-critical success/error feedback
- [ ] `ConfirmationModal` for consequential actions (approve, reject, redeem, delete)
- [ ] Haptic feedback via `expo-haptics` for consequential taps (if the dependency is already present; if not, skip)
- [ ] `React.memo` for expensive list items; stable `useCallback` and list `key` props
- [ ] Accessible names, roles, values, and states on interactive elements
- [ ] Status communication beyond color alone (icons + text alongside colored elements)
- [ ] Safe-area handling via `react-native-safe-area-context`
- [ ] Keyboard dismissal on form screens
- [ ] Reduced-motion support: check `AccessibilityInfo.isReduceMotionEnabled()` and disable decorative animations
- [ ] Animation, timer, and subscription cleanup in `useEffect` return functions

---

### 20. Visual Verification

Render or run every substantially modified screen and inspect for:

- Layout correctness (no overlapping elements)
- Clipping (text/icons not cut off)
- Safe areas (content not under notch/home indicator)
- Font scaling (test with system font at 200%)
- Empty states (correct illustration + messaging)
- Loading states (skeletons visible, not blank)
- Error states (banner/toast shown, not white screen)
- Keyboard overlap (forms not hidden behind keyboard)
- Modal behavior (backdrop dismissal, focus trapping)
- Navigation (correct back behavior, no orphaned screens)
- Color consistency (all colors from theme, not hardcoded)
- Touch targets (minimum 44×44 pt)
- Animation cleanup (no warnings about updating unmounted components)

**Revise visible defects before finishing.**

---

## Validation

Run targeted checks throughout development, followed by project-wide checks at the end:

```bash
# Unit tests
node node_modules/jest/bin/jest.js --runInBand

# Lint (targeted on changed files)
node node_modules/eslint/bin/eslint.js [changed files] --ext .js

# Full lint
node node_modules/eslint/bin/eslint.js App.js index.js src --ext .js

# Expo doctor
npx expo-doctor

# Dependency check
npx expo install --check

# Android export validation
npx expo export --platform android

# iOS export validation
npx expo export --platform ios
```

Use `EXPO_NO_DOTENV=1` prefix for export commands to avoid loading credentials.

**Record failures accurately.** Do not claim a check passed unless it actually ran and passed.

### New/Updated Tests

Add or update focused tests in `src/` or `tests/` directories for:

| Area | File | Test cases |
|---|---|---|
| New Report validation | `src/screens/citizen/__tests__/NewReport.test.js` | Required fields, incomplete state prevents submit, permission-denied state |
| AI stage transitions | `src/screens/shared/__tests__/AIProcessing.test.js` (update) | 5-stage progression, stage mapping from AI events, animation cleanup |
| AI retry/manual fallback UI | Already covered | Verify no regression |
| Notification dedup | `src/services/__tests__/notifications.test.js` | Duplicate ID filtering, subscription cleanup on logout |
| Notification navigation | Same file | Tapping notification navigates to correct report |
| Officer priority sorting | `src/screens/officer/__tests__/OfficerDashboard.test.js` | Critical > High > Medium > Low sorting, then by age |
| Heatmap filtering | `src/screens/officer/__tests__/ViolationHeatmap.test.js` | Severity filter, time range filter, empty result |
| Status timeline | `src/screens/citizen/__tests__/ImageReportStatus.test.js` | All four states, null timestamp handling, points badge |
| Rewards guards | `src/screens/citizen/__tests__/Rewards.test.js` | Insufficient points, already redeemed, unavailable |
| Demo-mode state | `tests/demoMode.test.js` | Enable/disable toggle, AsyncStorage persistence, cached result schema, production data prevention |
| Video-flow transitions | `src/screens/citizen/__tests__/VideoReport.test.js` | Record start/stop, timer countdown, retake state, upload cancellation |

---

## Handoff

Create [`D:\Traffic_Eye\SPRINT_HANDOFF_2.md`](file:///D:/Traffic_Eye/SPRINT_HANDOFF_2.md) containing:

1. **Completed screens and features** — list each screen and what was changed
2. **Files changed** — full list of modified and created files
3. **Dependencies added** — any new packages installed via `npx expo install`
4. **Visual assets generated** — onboarding illustrations, app icon, splash
5. **Data flows affected** — realtime notifications, demo mode, any service changes
6. **Tests added** — list of new test files and case counts
7. **Commands and actual results** — every validation command run with real output
8. **Known defects** — anything discovered but not fixed (with severity)
9. **Platform limitations** — features that work differently on Android vs iOS
10. **Items Prompt 3 must verify** — specific flows and edge cases for QA
11. **Critical flows that must not regress**:
    - Centralized submission via `submitReportWithMedia` (one path, fail-closed checks, draft token)
    - AI retry with bounded backoff and cancellation
    - Manual-review fallback with truthful flags
    - Officer review idempotency (one notification, one reward)
    - ErrorBoundary branded recovery
    - No secrets in client code or logs

---

## Final Response

Report:
- **Product outcome** — what the app experience looks like after this work
- **Screens and features completed** — specific list
- **Files changed** — count and list
- **Tests and actual results** — suite/test counts, pass/fail
- **Remaining defects or limitations** — with severity
- **Confirmation** that `SPRINT_HANDOFF_2.md` is ready

**Do not claim production readiness. That decision belongs to Prompt 3.**
