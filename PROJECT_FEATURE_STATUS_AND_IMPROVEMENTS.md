# Traffic Eye: Project Understanding, Feature Status, and Improvement Plan

**Assessment date:** 24 October 2026  
**Purpose:** Identify what is implemented, what is incomplete, and what should be improved to make Traffic Eye a strong, reliable college project demonstration.

## 1. Assessment Scope

This report is based on a detailed review of the current React Native screens, navigation, services, AI pipeline, Supabase functions and migrations, tests, Android configuration, and project documentation.

Status meanings used below:

- **Implemented:** A real code path exists and is connected to the relevant UI, local service, or backend operation.
- **Partial:** The main idea exists, but some actions, data handling, or edge cases are incomplete.
- **Not implemented:** No complete working implementation was found.
- **Needs live verification:** The code exists, but the deployed backend, external provider, or device behavior must still be checked.

This was a static source review. The app and live Supabase backend were not rerun during this assessment. Existing verification documentation records 395 passing Jest tests across 29 suites and a successful Android emulator EXIF/GPS test, but it also states that authenticated live submission, physical Android testing, and iOS testing were not completed (`docs/EXIF_GPS_FIX_REPORT.md:51-66`).

## 2. What the Project Does

Traffic Eye is a two-sided mobile traffic-violation reporting system:

1. A **citizen** captures photo or video evidence.
2. The app obtains the incident location from image EXIF data, device GPS, or manual map selection.
3. Photo reports can pass through AI-based violation analysis and number-plate OCR.
4. The citizen checks or corrects the result and submits the report.
5. The evidence and report are stored in Supabase.
6. An **officer** views pending reports, examines the evidence, and approves or rejects them.
7. Approval updates the report, rewards the citizen, and generates a notification.
8. Officers can view approved incidents on a map and export reports.

### Main Technology

- Expo 54 and React Native 0.81.5
- React Navigation for citizen and officer flows
- Supabase for authentication, database, storage, realtime updates, and server functions
- MapLibre for map selection and the officer heatmap
- External vision/OCR providers through the Supabase `ai-analyze` Edge Function
- Jest for automated tests

The primary user workflows are registered in `src/navigation/CitizenNavigator.js:83-124` and `src/navigation/OfficerNavigator.js:71-90`.

## 3. Implemented Features

### 3.1 Common and Authentication Features

| Feature | Current implementation | Important limitation |
|---|---|---|
| Onboarding | Multi-screen onboarding with completion persisted locally | Content is static |
| Citizen email sign-up/sign-in | Connected to Supabase authentication | Requires working Supabase configuration |
| Google sign-in | OAuth flow is implemented | Requires provider and redirect configuration |
| Officer sign-in | Badge number is resolved to an officer account, followed by password sign-in | Officer accounts must be provisioned; no officer self-sign-up |
| Password recovery | OTP verification and new-password screens are connected | Final success behavior needs device verification |
| Persistent sessions | Existing sessions are restored and profiles loaded on startup | Profile-loading failure can leave the user on a loading screen |
| Role-based navigation | Citizen and officer interfaces are selected from the profile role | Depends on a valid profile record |
| Reusable application shell | Splash handling, fonts, safe areas, error boundary, and notification provider are present | Native behavior still needs device-level acceptance testing |

Relevant code: `src/services/auth/index.js`, `src/context/AuthContext.js`, and `src/navigation/AppNavigator.js:119-204`.

### 3.2 Citizen Features

| Feature | Status and behavior |
|---|---|
| Citizen home dashboard | Implemented. Shows the real profile, reward balance, report counts, recent reports, and realtime updates (`src/screens/citizen/CitizenHome.js:45-153`). |
| Photo capture and gallery selection | Implemented using camera/image-picker permissions and media selection (`src/hooks/useImagePicker.js:22-115`). |
| Original-image EXIF/GPS extraction | Implemented, including Android original-media resolution and explicit handling of missing or inaccessible metadata. Existing emulator verification passed (`src/utils/exifParser.js:70-181`). |
| Device GPS and reverse geocoding | Implemented with last-known/current location and multiple geocoding fallbacks (`src/hooks/useLocation.js`, `src/services/geoService.js:323-391`). |
| Manual incident map selection | Implemented through MapLibre; valid coordinates are required for normal submission. |
| Photo AI processing | Implemented when the Edge Function and at least one AI provider are configured. The pipeline includes preprocessing, vision analysis, deterministic rules, conditional OCR, and optional text audit (`src/services/ai/index.js:254-475`). |
| AI provider fallback | Implemented across configured TokenHarbor, NVIDIA, Gemini, and Groq providers. Actual availability depends on deployed configuration (`supabase/functions/ai-analyze/providers.ts:41-96`). |
| Manual review fallback | Implemented when AI is unavailable or inconclusive; the citizen can provide the plate and violation details for officer review. |
| AI result verification | Implemented. The citizen can review detected violations, plate, location, and confidence before submission. |
| Evidence upload and report saving | Implemented through Supabase Storage, `image_reports`, and `report_media`, with retry/reconciliation logic (`src/services/reports/index.js:332-462`). Repository/deployed schema alignment still needs verification. |
| Duplicate and rate checks | Implemented before report insertion. Confirmed possible duplicates remain available for officer review. |
| Manual video reporting | Implemented for recording/gallery selection, validation, upload, and officer review. This is intentionally a manual-report path, not AI video analysis. |
| My Reports | Implemented with real Supabase data and realtime refresh (`src/screens/citizen/MyReports.js:65-102`). |
| Report details | Implemented with evidence, review, reward, location, and image/video display (`src/screens/citizen/ReportDetail.js:52-289`). |
| In-app notifications | Implemented with unread count, realtime updates, mark-read actions, and report deep links (`src/context/NotificationContext.js:26-84`). |
| Local notification display | Implemented for supported native environments while the realtime application path is active. Closed-app remote push is separate and incomplete. |
| Rewards balance and history | Implemented from backend reward data. |
| Reward redemption | Implemented through a server operation, persisted redemption records, generated coupon details, and clipboard copying (`src/services/rewards/index.js:308-458`). |
| Reward catalog | A functional local catalog is present; it is not a live partner redemption system. |
| Edit full name | Implemented through the profile update service. |
| Fine information | Implemented as searchable, category-filtered local reference data. |
| Fine calculator | Implemented as a local offence/count calculator, with one empty-input edge case listed below. |
| Traffic signs and safety tips | Implemented as searchable/static educational content with interactive sections. |
| Speed-limit information | Implemented as local zone and vehicle reference tables. |
| Emergency contacts | Implemented as a searchable directory with confirmed `tel:` calling actions. It does not send an SOS or live location. |
| Contact and About screens | Implemented with static information and phone/email external actions. |

### 3.3 Officer Features

| Feature | Status and behavior |
|---|---|
| Officer dashboard | Implemented with pending, approved, and rejected counts, jurisdiction filtering, and realtime refresh (`src/screens/officer/OfficerDashboard.js:71-137`). |
| Pending report queue | Implemented with real reports, submitter/review/media joins, search, filters, and sorting (`src/screens/officer/PendingQueue.js:225-402`). |
| Image and video evidence review | Implemented with image galleries, fullscreen images, and video playback (`src/screens/officer/ImageReportReview.js:240-327,581-609`). |
| Approve/reject review | Implemented through `submit_officer_review`; the server operation records the decision, updates the report, awards applicable points, records the reward transaction, and creates the citizen notification. |
| Duplicate-review protection | Implemented in the review operation to prevent the same report being reviewed twice. |
| Reviewed-report history | Implemented with approved/rejected filtering and real backend data (`src/screens/officer/VerifiedReports.js:72-201`). |
| Reviewed-report details | Implemented with report, media, and officer-review information. Rejected-report labels need correction. |
| Violation heatmap | Implemented using approved report coordinates, viewport loading, clustering, severity/time filters, and refresh after approval (`src/screens/officer/ViolationHeatmap.js:453-604`). It is not live officer tracking. |
| Officer profile statistics | Implemented from the signed-in officer's actual review records (`src/screens/officer/OfficerProfile.js:36-69`). |
| CSV export and sharing | Implemented for filtered report data using Expo file and sharing APIs. |
| PDF generation/printing/sharing | Implemented for exports and individual report details (`src/screens/officer/OfficerReportExport.js:195-263`). |
| Officer notification inbox | The shared realtime inbox is implemented, but automatic new-pending-report notifications for officers were not found. |

## 4. Partial, Broken, or Misleading Features

The following items should be addressed before claiming that every visible feature works.

### 4.1 Highest-Priority Functional Risks

| Area | Finding | Effect |
|---|---|---|
| Report schema alignment | Submission always writes `possible_duplicate` and `duplicate_report_id`, and screens may send `location_source`; these columns were not found in the repository's `image_reports` migration definition (`src/services/reports/index.js:423-430`, `supabase/migrations/20260420000000_baseline_deployed_bootstrap.sql:76-105`). | If the deployed database matches the repository migrations, normal image/video insertion can fail. Confirm the live schema first. |
| TokenHarbor AI result recording | TokenHarbor is a provider option, but the AI event migration lists only `nvidia`, `gemini`, and `groq` as allowed provider values. | A successful TokenHarbor response may become an internal failure when its result is recorded, if the live constraint matches the migration. |
| AI setup | Real AI needs deployed Edge Function code, provider secrets, database AI-event support, and authenticated access. | AI is not guaranteed to work from only `npm start`; missing provider configuration returns `NOT_CONFIGURED`. |
| AI rule coverage | Several rule-engine evaluators expect fields not requested by the current vision prompt. Seatbelt, plate-absence, traffic-light, wrong-way, phone, and overload-related decisions are therefore inconsistent or unsupported in parts of the normal parsed response. | The registered list of ten evaluators overstates dependable detection coverage. |
| AI confidence display | Missing confidence values can default to 70% or 95%, and the UI presents these as match/AI-confidence values. | Some precise-looking percentages may be defaults rather than measured model confidence. |
| AI audit result | The audit can request manual review, but its accepted/rejected violation lists do not actually add or remove final violations. | The audit is not a true second decision-maker despite its name. |

### 4.2 Citizen and Media Issues

| Feature | Current gap |
|---|---|
| Video AI analysis | Not implemented. Videos go directly to manual officer review with zero AI confidence; no frames are extracted for analysis (`src/screens/citizen/VideoReport.js:437-463`). |
| Video thumbnails | Video URLs are stored in `image_url`, while several list/status screens render that field as an image. Broken thumbnails are likely outside the detail screen, which handles video correctly. |
| Video draft saving | The visible “Save as Draft” control has no action. Submission recovery state is in memory and does not survive process termination. |
| Video incident date/time | The edit pencil is decorative; the displayed timestamp is not an editable incident time. |
| Video size limits | Gallery, recorder, and upload use different limits: approximately 5 MB, 50 MB, and a stricter 12 MB in-memory upload ceiling. A recording can pass recording validation but fail during upload. |
| Manual/video fraud label | Officer screens can show “FRAUD FLAG” merely because confidence is below 70%. Manual/video reports have zero confidence because no AI ran, so this label is misleading. |
| Address editing | Editing incident address text does not geocode it or update coordinates, so displayed address and map coordinates can diverge. |
| Manual address-only reporting | Normal submission still requires valid coordinates; entering only an address is insufficient despite some UI guidance. |
| Crop evidence | A crop component exists but is not connected to the active capture flow. |
| HEIC/HEIF evidence | These common phone formats are not accepted by the final media validation/upload path. |
| Evidence authenticity display | Local file/metadata heuristics exist, but their result is not reliably passed into the officer-facing authenticity field. This is not a complete forensic verification feature. |
| Image hash reuse | A hash is calculated during EXIF processing but is not included in the normal submission payload. |
| OCR uncertain-character warning | The AI pipeline and verification screen use different property names, so this warning cannot display as intended. |
| Separate verification-report history | `VerificationReports` reads separate verification tables, but no corresponding citizen submission/processing flow was found. Its detail action opens the generic image-report detail path with mismatched data. |
| `VideoReportStatus` | Contains sample/local state rather than live Supabase status and is not part of the normal successful video-submission route. |
| `ImageReportStatus` | Uses live data, but its title says image reports while its query does not exclude videos. |
| Reward points on submission | A base-submission-points helper exists but is not called by the normal report flow. Post-approval rewards are separately implemented. |
| Reward partners | Coupons and catalog content are local; there is no external partner validation or real-world fulfillment integration. |
| Avatar editing | The avatar camera badge has no action; profile display uses initials. Phone and email are read-only. |
| Profile menu | Change Password and Terms/Privacy target unregistered routes. Rate App and Share App have no working action (`src/screens/citizen/Profile.js:95-122,183-188`). |
| Sign-up resend | “Resend” only displays a success message and does not call Supabase resend. Password validation also allows six characters while the UI says eight. |
| Password reset requirements | The UI lists uppercase, number, and special-character rules, but the code checks only length and matching. The post-sign-out success transition needs device verification. |
| Permissions screen | Grant/Skip only navigate; the screen itself does not request permissions. Actual feature-level camera/location requests do work separately. |
| Fine calculator | Clearing the instance count and using a stepper can produce `NaN`. |
| Fine categories | Parking and Public Transport data exist but are omitted from category metadata/chips, so they are mainly reachable through All or search. |
| Contact/support | Phone and email actions exist, but there is no in-app support ticket or feedback submission. |

### 4.3 Officer and Analytics Issues

| Feature | Current gap |
|---|---|
| Bulk approve/reject result handling | Bulk processing does not inspect each `{data, error}` result. Failed operations can be followed by selection clearing/reload as if all succeeded (`src/screens/officer/PendingQueue.js:350-379`). |
| Officer violation correction | Selected corrections are serialized into internal notes instead of structured report fields. Original violation analytics and corrected outcomes can therefore disagree. |
| Rejected-report detail/PDF | The shared detail screen can label rejected reports as “Verified” or “Approved,” including generated PDF output. |
| Legacy `ReportVerification` screen | Uses bundled/hard-coded evidence and only navigates back on decisions. It is registered but not connected to the found active review flow; the real review screen is `ImageReportReview`. |
| Officer settings | Notification, sound, and vibration switches are local component state and are not persisted or connected to actual behavior. Duty/server/version information is hard-coded. |
| Officer Help/Support | Actions show placeholder alerts rather than real help content or support submission. |
| Officer profile editing | No officer profile-edit workflow was found. |
| Officer new-report alerts | Citizen review-result notifications exist, but automatic officer notifications for newly pending/assigned reports were not found. |
| Analytics and trends | No real trend charts, date-based comparison dashboard, violation analytics screen, or model-performance dashboard was found. Current analytics are mainly totals, profile counts, map counts, and export summaries. |
| Queue location default | Pending Queue defaults to “All Locations (Testing),” unlike the jurisdiction-scoped dashboard. This should be cleaned up for a final presentation. |
| Heatmap range | Map data is bounded by viewport/query limits and a 500-point fallback; “All” is not unlimited historical analytics. |
| Bulk PDF preview | “Preview PDF” invokes printing rather than a dedicated document preview screen. |

## 5. Features Not Currently Implemented

These are not necessarily defects; they are possible extensions beyond the present project scope.

- AI analysis of video frames or continuous video
- Persistent offline drafts and offline-to-online submission synchronization
- Closed-app remote push notifications through a complete token-registration and server-dispatch pipeline
- Live traffic-police/officer location tracking
- Real government challan issuance, payment, or official traffic-database integration
- Real external reward-partner redemption
- A structured analytics/trends dashboard with charts and exportable insights
- A measured AI accuracy/evaluation dashboard using labeled field data
- In-app support tickets or feedback storage
- Full officer profile editing and persistent officer preferences
- A fully validated web version
- SOS broadcasting with live location sharing

## 6. Platform and Setup Status

### Recommended Demonstration Platform

**Use a native Android development/preview build, not Expo Go alone.** The project contains native MapLibre and custom Android original-media functionality. Expo Go is suitable only for limited UI exploration, not the complete feature set.

### Required Setup

1. Install Node.js 20 or newer and project dependencies.
2. Configure the public Supabase URL and anonymous key in `.env`.
3. Apply and verify all database migrations, storage setup, realtime setup, functions, and demo data.
4. Deploy `ai-analyze` and configure at least one supported vision/OCR provider; configure Groq as well if audit is required.
5. Create one citizen account and one provisioned officer account.
6. Verify that the live `image_reports` schema contains every field submitted by the current client.
7. Test the exact AI provider that will be used during the demonstration, including its event-ledger compatibility.
8. Build and install the Android app on the demonstration device/emulator.
9. Preload a small, realistic set of pending, approved, and rejected reports.

### Platform Limitations

| Platform | Current status |
|---|---|
| Android | Best-supported platform. Existing documentation records an emulator EXIF/GPS pass, but physical-device and live authenticated submission checks remain necessary. |
| iOS | Configuration exists, but no iOS build/device verification was established. macOS/Xcode is required for local native compilation. |
| Web | Not currently validated as a complete platform; native MapLibre imports and native-only features block a dependable full-web experience. |
| Expo Go | Not sufficient for the complete native demo. |

## 7. Existing Testing and What It Proves

The latest verification report records:

- 395 passing Jest tests across 29 suites
- 102 targeted EXIF tests
- Android emulator validation of gallery selection, original metadata, permission denial, map handoff, zero coordinates, and preprocessing
- Local Android APK build checks

Automated tests cover report validation/submission control flow, AI sequencing and failure handling, EXIF/GPS parsing, notifications, rewards guards, video validation, heatmap helpers, exports, and release configuration.

These are valuable results, but many external services and native modules are mocked. They do **not** prove live Supabase deployment behavior, real AI detection accuracy, OCR accuracy, closed-app push delivery, physical-device reliability, or iOS compatibility. No complete device end-to-end test script or CI workflow was found.

## 8. Prioritized Improvement Plan

### Priority 0: Make the Current Demonstration Reliable

Complete these first because teachers are most likely to judge visible, working workflows.

1. **Align client and live database schema.** Verify every submitted column and run a real citizen submission followed by officer review.
2. **Fix and test the active AI provider path.** Resolve the provider/event-ledger mismatch and test vision, OCR, fallback, and manual review with the exact deployed configuration.
3. **Remove or repair dead controls.** Implement video draft/date editing and profile actions, or hide unfinished buttons for the demonstration.
4. **Fix video presentation.** Add proper thumbnails/video icons and make the 5/12/50 MB limits consistent across picker, recorder, validation, and UI text.
5. **Correct officer review results.** Check every bulk result, preserve failures for retry, and make rejected-report detail/PDF labels match the real status.
6. **Replace misleading AI labels.** Do not call zero-confidence manual reports fraudulent; distinguish “Not AI analyzed,” “Manual review,” and genuine review warnings.
7. **Store officer corrections as structured data.** Keep original AI prediction and final officer decision separately so reports and analytics remain truthful.
8. **Complete authentication UX.** Implement real resend, align password rules, and verify the reset-success navigation on a device.
9. **Run one complete live rehearsal.** Citizen sign-in → photo report → AI/manual fallback → submit → officer review → reward → notification → map → export.

### Priority 1: Add High-Visible-Value College Features

1. **Officer analytics dashboard**
   - Reports by day/week/month
   - Approval and rejection rates
   - Most frequent violation types
   - Top violation locations
   - Average review time
   - Charts plus CSV/PDF export

2. **Offline-first drafts and reliable submission**
   - Save photo/video drafts locally
   - Show upload progress and pending-sync state
   - Resume after app restart
   - Prevent duplicate submissions after uncertain network responses

3. **Video-assisted AI review**
   - Extract representative frames
   - Run the existing image pipeline on selected frames
   - Show frame-level evidence to the officer
   - Keep final approval human-controlled

4. **AI evaluation and explainability**
   - Build a small labeled test dataset with different lighting, angles, blur, occlusion, and plate formats
   - Measure violation precision/recall and plate OCR accuracy
   - Show why a violation was detected using visual evidence and rule explanations
   - Compare AI prediction with officer correction

5. **Complete notifications**
   - Register device push tokens
   - Notify citizens when review completes
   - Notify officers when new reports enter their queue
   - Verify foreground, background, and terminated-app behavior

6. **Better citizen report experience**
   - Real crop/rotate step
   - Editable incident date/time
   - Address-to-coordinate geocoding
   - Consistent video thumbnails and upload progress
   - Clear AI-versus-manual status labels

### Priority 2: Useful Polish and Extensions

- Real help/FAQ and in-app feedback form
- Avatar upload and officer profile editing
- Persistent settings
- Advanced heatmap date ranges and server-side aggregation
- Report assignment and workload balancing between officers
- Multi-language support for wider citizen accessibility
- Accessibility audit and larger-text testing
- Offline informational content packaged with the app
- A visible, guided demonstration mode with sample accounts and clearly labeled synthetic data
- Either a proper web map fallback or a clear mobile-only project declaration

## 9. Best Demonstration Flow for Evaluation

A concise demonstration should prove the complete system rather than showing isolated screens:

1. Show onboarding and citizen sign-in.
2. Capture/select a real sample photo and show EXIF/GPS or manual map location.
3. Run AI analysis and explain the detected evidence, OCR result, and confidence limitations honestly.
4. Correct the details if needed and submit the report.
5. Open My Reports and show pending status.
6. Sign in as an officer on another device/account.
7. Show dashboard counts and open the same pending report.
8. Play/view the evidence and approve or reject it with comments.
9. Return to the citizen account and show updated status, notification, reward points, and reward history.
10. Open the officer heatmap and export the reviewed data as CSV/PDF.
11. Finish with the analytics/evaluation dashboard if added.

Keep one pre-tested photo report and one manual video report ready. Also test the no-AI/manual-review fallback before the presentation so an external-provider failure does not stop the demo.

## 10. Overall College-Project Assessment

Traffic Eye already has a strong foundation: two real user roles, evidence capture, GPS handling, AI-assisted photo analysis, backend persistence, officer review, rewards, realtime updates, mapping, exports, and a meaningful automated test suite. That is substantially stronger than a screen-only prototype.

The biggest current weakness is not a lack of screens; it is the gap between visible features and consistently working end-to-end behavior. The best route to a very strong college submission is to **stabilize the existing citizen-to-officer workflow first**, then add **analytics, offline drafts, video-frame AI assistance, and measured AI accuracy**. These additions are easy to demonstrate, academically valuable, and directly connected to the project's purpose.
