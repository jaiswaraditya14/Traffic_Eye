# Traffic Eye Manual Mobile Test Plan

Use this plan only with a dedicated staging Supabase project and non-production test accounts. Do not run it against production, deploy schema changes from this plan, or use Docker. Record every result; a blank result is not a pass.

## Test run record

| Field | Value |
| --- | --- |
| Tester | |
| Date/time and timezone | |
| Git commit / build hash | |
| App version / build number | |
| Build type (preview/release) | |
| Distribution source | |
| Device model | |
| OS and version | |
| Screen width / font scale | |
| Staging Supabase project ref | |
| Citizen account ID (non-sensitive alias) | |
| Officer account ID and jurisdiction (non-sensitive alias) | |
| Network profile | |

Allowed result values: `PASS`, `FAIL`, `BLOCKED`, `NOT RUN`. For each failure, attach a screenshot/video and logs with credentials, email, precise GPS, plates, evidence URLs, and tokens redacted.

## Citizen journey (C1-C27)

| ID | Exact steps | Expected result | Actual / evidence | Result | Defect |
| --- | --- | --- | --- | --- | --- |
| C1 | Uninstall the app, install the candidate build, clear no data manually, and cold-launch it. | Branded splash appears without a white flash or crash, then first-run onboarding opens. | | NOT RUN | |
| C2 | Swipe through all four onboarding pages; inspect indicators; repeat with Reduce Motion enabled; tap **Get Started**. | Four pages are readable, indicators track the page, motion is reduced when requested, and Get Started opens role/auth selection once. | | NOT RUN | |
| C3 | Sign up using a new citizen email. If the staging harness allows metadata tampering, include `role=officer`. Inspect the resulting profile through an administrator-safe query. | Signup succeeds as `citizen`; client metadata cannot create an officer. | | BLOCKED until hardened staging schema | |
| C4 | Sign in with the new citizen account, including one invalid-password attempt first. | Invalid credentials show a safe message; valid credentials open the citizen home once without leaking account details to logs. | | NOT RUN | |
| C5 | Open profile and log out. Inspect the UI and staging realtime connection count. | Session, account-specific UI, cached private data, and realtime subscriptions are cleared; auth screen appears. | | NOT RUN | |
| C6 | Sign in, force-stop/terminate the app, then relaunch. | A valid session restores once and routes to citizen home without showing another user's data. | | NOT RUN | |
| C7 | From a terminated state, open a staging password-reset link using `trafficeye://reset-password`; complete a test reset. | App cold-starts on reset flow, accepts a valid recovery session, and returns safely to login. | | NOT RUN | |
| C8 | Start a photo report with camera permission not yet requested; tap Allow. | OS prompt appears once and the camera becomes usable immediately. | | NOT RUN | |
| C9 | Revoke camera permission, retry capture, deny it, and repeat after selecting Android **Don't ask again** where available. | App stays responsive and provides clear Settings/recovery guidance; no retry loop or blank camera. | | NOT RUN | |
| C10 | Test gallery selection once allowed, once denied, and with iOS limited-photo access. | Allowed/limited selection opens the picker; denial has recovery guidance; no unrelated media is exposed. | | NOT RUN | |
| C11 | Test location once allowed and once denied/permanently denied, then choose manual location. | GPS fills a valid coordinate when allowed; denial never blocks report creation and manual selection remains available. | | NOT RUN | |
| C12 | Capture a clear traffic-violation photo and accept it. | Preview shows the exact captured evidence with retake/continue controls; orientation is correct. | | NOT RUN | |
| C13 | Select a portrait and landscape image from the gallery. | Selected file previews correctly without stretching, unexpected crop, or stale prior evidence. | | NOT RUN | |
| C14 | Select one image containing GPS EXIF and one without it. | Valid EXIF location is used transparently; absent/invalid EXIF falls back to live or manual location, never `(0,0)`. | | NOT RUN | |
| C15 | With EXIF absent, choose device GPS and compare the displayed pin with the device location. | A plausible current coordinate is selected; failure offers cached/manual fallback without exposing precise coordinates in logs. | | NOT RUN | |
| C16 | Search for an address, tap the MapLibre map, drag/reposition the pin, and confirm. | Pin, coordinates, and displayed address remain consistent; confirm returns the selected coordinate once. | | NOT RUN | |
| C17 | Continue with valid evidence and network access through AI processing. | Vision, OCR, and audit complete; results are explicitly AI-derived and editable; no fabricated success appears. | | BLOCKED until staging AI function is deployed | |
| C18 | Make the staging AI endpoint return 502, then success; repeat with 503, 503, then success while timing retries. | UI remains cancellable; retries occur after about 1s then 3s with no parallel chain; success appears once. | | BLOCKED until staging fault injection | |
| C19 | Make all permitted AI attempts fail transiently, then test 400/401/403/422. Tap **Try Again** once. | Transient attempts stop after the bounded budget; terminal 4xx errors do not retry; UI offers a truthful retry/manual-review path. | | BLOCKED until staging fault injection | |
| C20 | After permanent AI failure, explicitly choose manual review and confirm submission. | Report is marked for manual review with confidence zero; app does not claim an AI finding. | | BLOCKED until staging schema/function deployment | |
| C21 | Submit a complete report, rapidly tapping the submit control three times. | One loading transaction runs, exactly one report/storage object is created, and one success screen appears. | | BLOCKED until staging backend | |
| C22 | Retry the same draft after simulating a lost insert response and after relaunching the app. | Existing result is recovered by draft UUID; no duplicate report, reward, or evidence object is created. | | BLOCKED until staging backend | |
| C23 | Open report status while it moves pending → reviewed → approved, then repeat for rejection. | Timeline uses real timestamps; pending does not imply a decision; approval shows points; rejection shows the public rejection reason and no points. | | BLOCKED until staging backend | |
| C24 | Keep the citizen app foregrounded while the officer approves the report. | One user-owned notification arrives within the agreed staging interval, with no duplicate. | | BLOCKED until staging backend and two devices | |
| C25 | Tap the report notification from foreground, background, and terminated states. | Each tap routes to the matching report only after the correct session is restored; unauthorized reports never open. | | BLOCKED until staging backend and device | |
| C26 | Record points before approval, approve once, refresh/relaunch, and inspect ledger. | Balance increases exactly once by the server-authorized amount and agrees with the immutable transaction ledger. | | BLOCKED until hardened staging RPC | |
| C27 | Redeem an affordable reward; also try an unaffordable and already-redeemed reward and double-tap confirmation. | One affordable redemption debits once; other cases are disabled/rejected; failure preserves balance and can be retried safely. | | BLOCKED until staging rewards RPC | |

## Video sub-journey (V1-V9)

| ID | Exact steps | Expected result | Actual / evidence | Result | Defect |
| --- | --- | --- | --- | --- | --- |
| V1 | Start recording and do not touch controls until the 15-second countdown reaches zero. | Countdown is accurate, recording auto-stops once, and a playable evidence URI is retained. | | NOT RUN | |
| V2 | Start a new recording and press Stop at about five seconds. | Recording stops once and produces valid evidence shorter than 15 seconds. | | NOT RUN | |
| V3 | Play, pause, scrub, and replay the captured video in preview. | Playback controls remain responsive; video orientation/audio are correct; leaving preview releases playback. | | NOT RUN | |
| V4 | Tap Retake, verify the timer, then record a different clip. | Old URI is discarded locally, timer resets to 15, and only the new clip is submitted. | | NOT RUN | |
| V5 | Submit on a throttled network while observing progress. | Progress/loading remains visible and controls prevent duplicate submissions until upload completes. | | BLOCKED until staging backend | |
| V6 | Request cancellation during upload and wait for the SDK call to settle. | UI explains cooperative cancellation; no database insert occurs after cancellation and evidence remains available for retry. | | BLOCKED until staging backend | |
| V7 | Background the app during recording, wait ten seconds, then foreground it. | Recording stops safely, interval is cleared, and the app offers preview/retake without a crash. | | NOT RUN | |
| V8 | Submit both Android MP4 and iOS MOV evidence through the AI path. | A representative frame is analyzed, MOV is `video/quicktime`, MP4 is `video/mp4`, and results are truthful. | | BLOCKED until Android+iOS devices and staging AI | |
| V9 | Disable network mid-upload, then restore it and retry the same draft. | Error is actionable, local evidence is retained, retry creates at most one storage object/report. | | BLOCKED until staging backend | |

## Officer journey (O1-O15)

| ID | Exact steps | Expected result | Actual / evidence | Result | Defect |
| --- | --- | --- | --- | --- | --- |
| O1 | Sign in with a badge-verified staging officer. Attempt the same with a citizen account. | Verified officer reaches officer UI; citizen cannot obtain officer routes or data. | | BLOCKED until hardened staging auth/RLS | |
| O2 | Seed in- and out-of-jurisdiction reports, open/refresh the dashboard, and inspect network responses. | Only server-authorized in-jurisdiction rows are returned and displayed; client filtering is not the authorization boundary. | | BLOCKED until jurisdiction RLS is deployed | |
| O3 | Submit a new in-jurisdiction report from another device while dashboard is open. | It appears once in priority order without refresh or duplicate subscriptions. | | BLOCKED until staging realtime | |
| O4 | Open evidence and zoom/view it; attempt a copied evidence URL while signed out. | Authorized officer can inspect full evidence; signed-out/unauthorized access is denied by private storage policy. | | BLOCKED until private staging bucket | |
| O5 | Inspect AI violation, plate, severity, confidence, and evidence metadata. | Values match the citizen's report and are clearly distinguished from officer assessment. | | BLOCKED until staging backend | |
| O6 | Select officer assessment chips and save a review; inspect the report row and review row. | Chips save only as internal notes/assessment; original AI `violation_type` is not silently mutated; citizens cannot read internal notes. | | BLOCKED until safe review projection/RPC | |
| O7 | Approve, confirm, and rapidly tap the action again. | Dialog requires confirmation, controls lock synchronously, one RPC completes, and success appears once. | | BLOCKED until hardened staging RPC | |
| O8 | Reject without a reason, then enter a reason and confirm. | Empty reason is blocked; valid public rejection reason is saved once and shown safely to the citizen. | | BLOCKED until hardened staging RPC | |
| O9 | Have two officers submit conflicting decisions concurrently and inspect report, review, notification, points, and logs. | One transaction wins; the other receives an idempotent/already-reviewed result; exactly one review, notification, and point credit exist. | | BLOCKED until row-locking staging RPC | |
| O10 | Toggle Low, Medium, High, and Critical filters using known fixtures. | Map/list shows only matching severity and keeps invalid coordinates excluded. | | NOT RUN | |
| O11 | Toggle Today, Week, Month, and All around exact UTC/local boundary fixtures. | Results consistently follow documented date boundaries; combining date+severity applies both filters. | | NOT RUN | |
| O12 | Tap a cluster, expand it, select a report, dismiss and reopen the detail sheet. | Correct evidence/violation/severity appear; sheet is scrollable, accessible, and does not retain the wrong report. | | NOT RUN | |
| O13 | Tap My Location with location allowed, denied, revoked, and GPS unavailable. | Allowed state centers plausibly; all failure states show recovery and leave the map usable. | | NOT RUN | |
| O14 | Export empty, special-character, and 50+ row date ranges; preview and share PDF and CSV. | Empty output is explicit; special text is escaped; all rows export; CSV prevents spreadsheet formulas; native share sheet opens once. | | NOT RUN | |
| O15 | Log out with dashboard/realtime active, then sign in as a different user. | Prior channels are removed and no prior account report/notification data remains. | | BLOCKED until staging realtime | |

## Demo mode journey (D1-D7)

| ID | Exact steps | Expected result | Actual / evidence | Result | Defect |
| --- | --- | --- | --- | --- | --- |
| D1 | In Profile/About, tap the version exactly five times. | A clear confirmation appears and demo mode becomes enabled once. | | NOT RUN | |
| D2 | Navigate through citizen reporting and relevant profile/status screens. | A subtle, readable Demo badge remains visible wherever simulated data could be mistaken for real data. | | NOT RUN | |
| D3 | Run the bundled demo image through location, AI result, and submit screens while monitoring staging traffic. | Deterministic Mumbai demo result appears; no Supabase query/upload, Edge Function call, real report, or reward write occurs. | | NOT RUN | |
| D4 | Tap the version five times again. | Confirmation appears, badge is removed, and demo data is cleared without affecting real account data. | | NOT RUN | |
| D5 | Start a report after disabling demo. | Real camera/location/AI path is restored and no demo result is reused. | | BLOCKED until staging AI | |
| D6 | Enable demo, terminate the app, relaunch, and inspect the mode. | Persisted demo preference restores consistently and remains clearly disclosed. | | NOT RUN | |
| D7 | Complete enable → flow → disable → enable → flow twice. | Each demo starts cleanly; no stale draft, plate, result, toast, report, or reward state accumulates. | | NOT RUN | |

## Permission matrix

Run every row for Camera, Media Library, Location, and Notifications on both Android and iOS where the state exists.

| Permission | State | Exact steps | Expected result | Actual / evidence | Result |
| --- | --- | --- | --- | --- | --- |
| Each | Not requested | Reset app permission, launch the related feature, and take no action before the app asks. | OS prompt occurs at the point of need; app remains usable if dismissed. | | NOT RUN |
| Each | First allow | Tap Allow/While Using App and immediately continue the feature. | Feature works without requiring restart or duplicate prompt. | | NOT RUN |
| Each | First deny | Tap Deny and retry once. | Clear recovery UI appears, including Settings guidance when appropriate; no crash/spinner lock. | | NOT RUN |
| Each | Permanently denied | On Android select Don't ask again (or deny repeatedly), relaunch, and retry. | App detects non-requestable state and offers Open Settings instead of looping prompts. | | NOT RUN |
| Media Library | iOS limited | Choose Select Photos, grant one item, then select an allowed and unallowed item. | Limited picker works for allowed assets and can manage/expand selection safely. | | NOT RUN |
| Each | Revoked while open | Allow, background to Settings, revoke, foreground, and invoke the feature again. | Next action rechecks permission and provides recovery without stale success state. | | NOT RUN |
| Camera / Location | Capability unavailable | Use emulator/device with no camera or disabled/unavailable GPS. | Informative fallback appears; manual/gallery path remains usable; no crash. | | NOT RUN |

Notification-specific checks: Android 13+ prompt timing, Android channel name/importance, monochrome status icon, notification-disabled Settings recovery, iOS foreground presentation, and no notification for another user.

## Lifecycle and account isolation

| ID | Exact steps | Expected result | Actual / evidence | Result |
| --- | --- | --- | --- | --- |
| L1 | Install fresh and launch twice. | First launch onboards; subsequent launch does not repeat after completion. | | NOT RUN |
| L2 | Partially complete a report, background for 30 seconds, then foreground. | Safe form state is preserved without restarting network work or duplicating listeners. | | NOT RUN |
| L3 | Sign in, terminate through task switcher/OS, and relaunch. | Valid session restores; expired session routes to auth safely. | | NOT RUN |
| L4 | Background during storage upload, then foreground after success and after injected failure. | Exactly one outcome is shown; failure retains evidence for same-draft retry. | | BLOCKED until staging backend |
| L5 | Background during video recording and foreground. | Recorder stops/releases and timer no longer advances in the background. | | NOT RUN |
| L6 | Background during AI retry, wait through a delay, then foreground. | No parallel retry chain appears; cancelled/failed state is truthful and retryable. | | BLOCKED until staging fault injection |
| L7 | Open reset and report-detail deep links from foreground, background, and terminated states. | Correct route opens after auth restoration; malformed/unauthorized IDs fail safely. | | NOT RUN |
| L8 | Tap a notification from foreground, background, and terminated states. | Correct owned report opens once in each state. | | BLOCKED until staging notifications |
| L9 | Log out during an active realtime subscription. | Channel is removed and no later event reaches logged-out UI. | | BLOCKED until staging realtime |
| L10 | Sign in citizen → logout → sign in officer → logout → sign in a second citizen. | Role navigator, cache, subscriptions, drafts, reports, notifications, and rewards always belong only to the current user. | | BLOCKED until staging backend |

## Network and failure matrix

| ID | Condition and exact steps | Expected result | Actual / evidence | Result |
| --- | --- | --- | --- | --- |
| N1 | Enable airplane mode before cold launch. | App does not crash; cached shell/auth is safe and network-dependent areas show actionable offline/error states. | | NOT RUN |
| N2 | Disable network during storage upload, then restore and retry. | Error is shown, evidence retained, and one draft creates at most one object/report. | | BLOCKED until staging backend |
| N3 | Disable network during AI processing. | Only bounded transient retries occur; manual-review fallback remains explicit. | | BLOCKED until staging AI |
| N4 | Disable network during officer review, then retry after restoration. | Review remains unresolved or recovers idempotently; no duplicate side effects. | | BLOCKED until staging RPC |
| N5 | Throttle responses beyond 10 seconds. | Loading state remains visible and cancellable; no premature success or duplicate tap. | | BLOCKED until proxy/staging harness |
| N6 | Return Supabase 401 with expired token. | Session refresh is attempted once; persistent failure returns to auth without exposing token details. | | BLOCKED until staging fault injection |
| N7 | Return 403 on report/review/reward operations. | Clear forbidden result, no retry, no local optimistic mutation. | | BLOCKED until staging fault injection |
| N8 | Return 409 after a lost response for report/review. | Client reconciles the idempotent result; no duplicate row or side effect. | | BLOCKED until staging fault injection |
| N9 | Return 429. | User-friendly rate-limit message appears; only documented bounded backoff is used. | | BLOCKED until staging fault injection |
| N10 | Return Supabase 502/503/504, then success and then persistent failure. | Only safe idempotent operations retry; success occurs once; persistent failure preserves recoverable state. | | BLOCKED until staging fault injection |
| N11 | Rapidly tap submit/review/redeem under 3G throttling. | Synchronous guards permit exactly one operation per logical action. | | BLOCKED until staging backend |

## Responsive, accessibility, and keyboard matrix

Repeat the major auth, report, result, status, rewards, officer dashboard/review, heatmap, and export screens for:

| Device class | Target | Font settings | Required checks | Actual / evidence | Result |
| --- | --- | --- | --- | --- | --- |
| Small phone | 360 × ~800 dp | 100% and 200% | No horizontal overflow; critical text visible; content scrolls; controls remain at least 44×44 pt. | | NOT RUN |
| Typical phone | 412 × ~900 dp | 100% and 200% | Primary flow has no overlaps, clipped buttons, or hidden validation/errors. | | NOT RUN |
| Large phone | 430 × ~930 dp | 100% and 200% | Layout does not stretch awkwardly; bottom controls respect safe areas. | | NOT RUN |
| Tablet | 600+ dp | 100% and 200% | Content scales/centers; maps and sheets remain usable; line length and whitespace are reasonable. | | NOT RUN |

For each screen, enable TalkBack/VoiceOver and verify accessible names, roles, disabled/busy state, focus order, non-color status labels, dialog focus/return, and reduced motion. Open the keyboard on login, signup, address, rejection reason, and export date inputs; verify focused fields scroll into view, submit controls remain reachable, keyboard dismissal works, and modal/back dismissal returns to the correct screen without data loss.

## Completion rule

This plan is complete only when every row has an Actual/Evidence entry and a result. Any Critical/High failure, missing staging authorization proof, unsigned/debug-signed candidate, or absent Android/iOS installed-build run blocks a production-ready verdict.
