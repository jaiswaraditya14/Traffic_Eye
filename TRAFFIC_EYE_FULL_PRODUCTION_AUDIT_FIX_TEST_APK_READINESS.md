# Traffic Eye — Full Production Audit, Fix, Test & APK Readiness

You are the **lead production engineer, QA engineer, security auditor, AI/Computer-Vision engineer, React Native engineer, and UX reliability engineer** for the **Traffic Eye** application.

Your task is to perform a **complete end-to-end production audit** of the entire Traffic Eye project.

Do not merely inspect the code and give recommendations.

You must:

**AUDIT → TEST → IDENTIFY → FIX → RE-TEST → REGRESSION TEST → BUILD READINESS CHECK**

The final objective is:

> **Determine whether Traffic Eye is genuinely ready for a production APK build.**

If anything is broken, incomplete, unsafe, inconsistent, misleading, slow, duplicated, or unreliable, **fix it before declaring the project ready**.

Do not declare success simply because the application compiles.

---

# 1. ABSOLUTE RULE

Do not assume that an existing implementation works.

Verify it.

For every important feature:

```text
Inspect
  ↓
Trace actual execution
  ↓
Test
  ↓
Identify failure
  ↓
Fix
  ↓
Test again
  ↓
Regression test
```

Do not stop after finding problems.

Do not only provide a report of problems.

**Actually fix the problems that can be fixed.**

If something cannot safely be fixed without a human decision, clearly identify it as a blocker and do not claim APK readiness.

---

# 2. COMPLETE SYSTEM AUDIT

Audit the entire project, not only the AI module.

Inspect:

* React Native architecture
* navigation
* screens
* components
* services
* hooks
* state management
* API services
* AI providers
* EXIF/location extraction
* live map
* heatmap
* navigation
* permissions
* authentication
* storage
* caching
* offline behavior
* network failures
* Android configuration
* APK/build configuration
* assets
* icons
* splash screen
* environment variables
* security
* performance
* memory usage
* duplicate features
* overlapping systems
* dead code
* unused dependencies
* inconsistent UI states
* error handling
* loading states

Search the project systematically rather than checking only obvious files.

---

# 3. FEATURE INVENTORY

First create a complete inventory of every user-facing feature.

For each feature record:

```text
Feature
Entry point
Screen
Components
Services
API/provider
State
Storage
Permissions
Dependencies
Failure behavior
```

Identify:

* duplicate implementations
* overlapping services
* conflicting state sources
* unused implementations
* abandoned experimental code
* old AI pipelines
* old location pipelines
* duplicate navigation systems
* duplicate map/heatmap implementations

Do not leave two competing implementations active for the same responsibility unless there is a deliberate fallback architecture.

---

# 4. EXIF / IMAGE LOCATION AUDIT

This is a critical Traffic Eye feature.

Completely audit the image-location extraction system.

Trace the full flow:

```text
Gallery Image
      ↓
Asset metadata
      ↓
EXIF object
      ↓
Binary JPEG metadata if required
      ↓
GPS parsing
      ↓
DMS/rational conversion
      ↓
Decimal coordinates
      ↓
Validation
      ↓
Reverse geocoding
      ↓
Location result
```

Verify support for:

* EXIF GPSLatitude
* EXIF GPSLatitudeRef
* EXIF GPSLongitude
* EXIF GPSLongitudeRef
* rational numbers
* arrays
* DMS values
* decimal coordinates
* string coordinates
* malformed metadata
* missing metadata
* 0,0 coordinates
* negative coordinates
* hemisphere references
* different image formats where supported

Test:

### Valid GPS

Should produce correct coordinates.

### No GPS

Should NOT invent a location.

Return:

```text
NO_LOCATION_FOUND
```

and tell the user to use live location when appropriate.

### Invalid GPS

Reject it safely.

### 0,0

Treat as invalid unless genuinely applicable.

### GPS exists but reverse geocoding fails

Preserve coordinates and handle address failure separately.

Do not discard valid GPS merely because reverse geocoding failed.

---

# 5. EXIF FORENSIC SAFETY

Verify that:

* coordinates are not accidentally swapped
* latitude is not treated as longitude
* longitude is not treated as latitude
* DMS conversion is mathematically correct
* hemisphere signs are correct
* coordinates are within valid ranges

Latitude:

```text
-90 ≤ latitude ≤ 90
```

Longitude:

```text
-180 ≤ longitude ≤ 180
```

Reject impossible coordinates.

Check whether image processing/compression accidentally removes EXIF before extraction.

**Extract location before destructive image normalization when necessary.**

---

# 6. LIVE LOCATION FALLBACK

Verify the complete fallback:

```text
Image GPS available
      ↓
Use image location

Image GPS unavailable
      ↓
Show clear message
      ↓
Offer live location
      ↓
Request permission
      ↓
Acquire current location
      ↓
Validate accuracy
      ↓
Use live location
```

Test:

* permission granted
* permission denied
* permission permanently denied
* location disabled
* timeout
* low accuracy
* network unavailable
* user cancels
* location unavailable

Never silently substitute an unrelated location.

---

# 7. LOCATION SOURCE PRIORITY

The application must have a clear source hierarchy.

Use something equivalent to:

```text
1. Valid image GPS
2. Explicit user-selected/live location
3. No location
```

Do not silently use an inaccurate fallback.

Always store the location source:

```text
IMAGE_EXIF
LIVE_LOCATION
USER_SELECTED
NONE
```

This must be available to downstream reporting.

---

# 8. AI PIPELINE AUDIT

Audit the entire Traffic Eye AI pipeline.

Verify the production architecture:

```text
IMAGE
 ↓
LOCAL PREPROCESSING
 ↓
NVIDIA Llama 11B Vision
 ↓
Gemini fallback
 ↓
STRUCTURED EVIDENCE
 ↓
LOCAL RULE ENGINE
 ↓
CONDITIONAL OCR
 ↓
RISK CLASSIFICATION
 ↓
HIGH-RISK SECOND OPINION WHEN REQUIRED
 ↓
EVIDENCE MERGER
 ↓
Groq GPT-OSS-20B AUDIT
 ↓
FINAL RESULT / MANUAL REVIEW
```

Verify that the old architecture is completely removed where it conflicts with this design.

---

# 9. AUTHENTICITY AUDIT

Verify that there is NO mandatory remote authenticity AI call.

The system should use local integrity checks only.

Search the entire project for:

```text
checkImageAuthenticity
authenticity
fake image
image authenticity
```

Determine which calls are actually network calls.

Remove obsolete mandatory calls.

Do not leave hidden duplicate authenticity requests.

---

# 10. AI PROVIDER AUDIT

Verify every provider:

### NVIDIA

Primary:

`meta/llama-3.2-11b-vision-instruct`

### Gemini

Fallback:

`gemini-3.5-flash`

### Groq

Auditor:

`openai/gpt-oss-20b`

Verify:

* model IDs
* endpoints
* request format
* image encoding
* MIME types
* JSON schema
* response parsing
* timeout
* retry behavior
* error handling

Do not assume a model works because its name exists in config.

Test actual requests where safe.

---

# 11. AI JSON SAFETY

Test:

* valid JSON
* markdown-wrapped JSON
* empty response
* partial response
* malformed JSON
* unexpected fields
* missing fields
* null fields
* wrong data types
* hallucinated plate
* hallucinated violation

The application must never crash because the model returned unexpected content.

Invalid AI output must become:

```text
MANUAL_REVIEW_REQUIRED
```

or a controlled technical failure.

---

# 12. AI HALLUCINATION AUDIT

Use difficult negative tests.

Examples:

* blank image
* empty road
* no vehicles
* unclear helmet
* unclear plate
* red light unrelated to vehicle
* ambiguous road direction
* raised hand without phone
* two riders with misleading perspective

Verify:

**The system does not manufacture violations.**

---

# 13. AI RULE ENGINE AUDIT

Verify that:

> **AI observes → Code decides**

The LLM must not be the final legal decision authority.

Audit every rule:

* no helmet
* triple riding
* seatbelt
* phone use
* wrong way
* red light
* missing plate
* overcrowding
* protruding cargo
* all other configured violations

For each rule verify:

```text
Input evidence
↓
Required conditions
↓
Confidence threshold
↓
Violation result
```

Test both:

* true positives
* hard negatives

---

# 14. CONFIDENCE AUDIT

Verify that confidence thresholds are:

* configurable
* violation-specific
* consistently enforced

Ensure that:

```text
UNCERTAIN
```

never becomes:

```text
CONFIRMED_VIOLATION
```

because of downstream processing.

---

# 15. OCR AUDIT

Trace:

```text
Vision
 ↓
Plate visible?
 ↓
Readable?
 ├── YES → use result
 └── NO → OCR
```

Verify OCR is conditional.

Test:

* clear plate
* blurry plate
* partial plate
* multiple plates
* wrong plate selected
* no plate
* unreadable plate
* OCR timeout

Never fabricate characters.

Return:

```text
PLATE_NOT_READABLE
```

when appropriate.

---

# 16. AI LATENCY AUDIT

Measure:

```text
preprocessing_ms
vision_ms
fallback_ms
ocr_ms
rules_ms
second_opinion_ms
groq_ms
total_ms
```

Calculate:

* P50
* P95
* maximum observed latency

Target approximately:

```text
Normal P50 ≤ 6 sec
Normal P95 ≤ 10 sec
Fallback P95 ≤ 15 sec
```

Do not sacrifice accuracy simply to hit a latency target.

---

# 17. MAP AUDIT

Completely audit the **Live Map**.

Verify:

* map loads reliably
* correct provider configuration
* markers render
* marker coordinates are correct
* user location is correct
* selected violation opens correctly
* map does not freeze
* map does not reload unnecessarily
* map does not leak memory
* map handles no-data state
* map handles network failure
* map handles permission denial
* map handles many markers
* map handles duplicate markers
* map handles invalid coordinates

Test zooming, panning, marker selection, back navigation, and screen reopening.

---

# 18. HEATMAP AUDIT

Audit the heatmap separately from the live map.

Verify:

* correct coordinates
* correct intensity
* correct aggregation
* no duplicate counting
* correct filtering
* correct date/category filters
* no invalid 0,0 coordinates
* no location inversion
* correct zoom behavior
* correct empty state
* correct loading state
* correct error state

Check whether the heatmap and live map are using:

**the same authoritative location source and data model.**

If they use different coordinate systems or duplicate transformations, fix the architecture.

---

# 19. MAP/HEATMAP DATA CONSISTENCY

Take the same violation record and trace:

```text
Violation
 ↓
Database/API
 ↓
Map
 ↓
Heatmap
 ↓
Details screen
```

Verify that:

* latitude is identical
* longitude is identical
* violation type is identical
* timestamp is consistent
* location source is consistent

There must not be one coordinate transformation for the map and another for the heatmap unless explicitly required.

---

# 20. NAVIGATION AUDIT

Audit the entire navigation architecture.

Check:

* stack navigation
* tab navigation
* nested navigators
* deep links
* back button
* Android hardware back
* modal navigation
* screen parameters
* authentication redirects
* logout
* app restart
* navigation after AI analysis
* navigation after location permission
* navigation after errors

Look specifically for:

* duplicate routes
* route-name collisions
* screens registered twice
* stale navigation state
* navigation loops
* screens opening with missing parameters
* back button returning to the wrong screen
* screens becoming unreachable

---

# 21. SYSTEM OVERLAP AUDIT

This is mandatory.

Search for multiple implementations of:

* location extraction
* reverse geocoding
* map rendering
* heatmap rendering
* AI analysis
* OCR
* authenticity checking
* violation classification
* navigation
* API requests
* loading state
* error state
* user location
* violation storage
* report generation

For each duplicated responsibility:

```text
Implementation A
Implementation B
Which one is authoritative?
Why?
Can they conflict?
```

If duplication is accidental:

**consolidate it.**

Do not leave competing implementations active.

---

# 22. STATE MANAGEMENT AUDIT

Trace important state:

* selected image
* GPS location
* live location
* analysis state
* AI result
* violations
* plate
* map data
* heatmap data
* authentication
* permissions

Identify:

* duplicated state
* stale state
* race conditions
* state surviving too long
* state disappearing unexpectedly
* asynchronous updates after screen unmount
* state overwritten by fallback values

Fix race conditions.

---

# 23. ASYNC / RACE CONDITION AUDIT

Look for:

* multiple simultaneous AI requests
* multiple location requests
* duplicate map API calls
* duplicate reverse geocoding
* duplicate navigation calls
* requests continuing after screen unmount
* stale response overwriting newer response

Implement cancellation/guards where appropriate.

Example:

```text
Request A starts
Request B starts
Request B finishes first
Request A finishes later

A must NOT overwrite B.
```

---

# 24. PERMISSIONS AUDIT

Audit:

* camera
* gallery
* location
* notifications if used
* storage where applicable

Test:

* first request
* granted
* denied
* permanently denied
* revoked from Android settings
* app restart

The application must explain permission failures clearly.

---

# 25. AUTHENTICATION AUDIT

If authentication exists, test:

* normal login
* logout
* session restoration
* expired session
* network failure
* Google sign-in if implemented
* cancellation
* repeated login
* loading state
* black screen
* infinite spinner

Verify authentication state cannot become inconsistent with navigation state.

---

# 26. OFFLINE / NETWORK AUDIT

Test:

* no internet
* slow internet
* intermittent network
* API timeout
* provider outage
* backend outage

The app must not:

* freeze
* crash
* endlessly retry
* lose user data unexpectedly

Show meaningful recovery actions.

---

# 27. PERFORMANCE AUDIT

Check:

* startup time
* bundle size
* image memory
* map memory
* AI image memory
* large image handling
* repeated screen mounting
* unnecessary renders
* unnecessary API calls
* memory leaks
* timers
* listeners
* subscriptions
* location watchers

Pay special attention to map and image components.

---

# 28. UI/UX PRODUCTION AUDIT

Verify:

* loading states
* empty states
* error states
* success states
* manual-review states
* permission states
* offline states

No screen should show:

* blank white screen
* unexplained black screen
* infinite spinner
* broken image
* undefined text
* raw API error
* raw JSON
* developer error

The application should look like a serious government/public-safety application, not a prototype.

---

# 29. ASSET / BRAND AUDIT

Inspect:

* app icon
* adaptive icon
* splash screen
* logo dimensions
* image scaling
* Android assets
* status bar
* navigation bar

Ensure:

* correct aspect ratio
* no stretching
* no excessive padding
* no pixelation
* no inappropriate placeholder graphics

---

# 30. BUILD CONFIGURATION AUDIT

Inspect:

* `android/`
* Gradle
* AndroidManifest
* SDK versions
* min SDK
* target SDK
* build tools
* signing configuration
* release configuration
* ProGuard/R8 if applicable
* permissions
* network security
* environment configuration

Ensure debug-only configuration is not accidentally included in production.

---

# 31. API KEY / SECRET AUDIT

Search the entire repository for:

```text
API_KEY
SECRET
TOKEN
PASSWORD
Authorization
Bearer
NVIDIA
GEMINI
GROQ
```

Identify every credential.

Verify:

* no hard-coded secret
* no secret in Git
* no secret in logs
* no secret in report
* no secret in UI

If API keys must be client-side, explicitly report that production risk.

---

# 32. DEPENDENCY AUDIT

Inspect package dependencies.

Identify:

* unused packages
* duplicate libraries
* abandoned libraries
* incompatible versions
* packages causing large bundle size
* packages with known build problems

Do not blindly upgrade everything.

Only change dependencies when justified.

---

# 33. DEAD CODE AUDIT

Find:

* unused files
* unused imports
* unused functions
* commented-out old implementations
* old AI providers
* old authenticity code
* duplicate navigation
* unused screens
* obsolete test scripts

Remove obsolete code when safe.

---

# 34. CRASH AUDIT

Search for:

* unhandled promises
* null dereferences
* undefined properties
* unsafe JSON parsing
* missing navigation params
* image loading failures
* map provider errors
* permission exceptions
* network exceptions

Fix all deterministic crash paths discovered.

---

# 35. APK BUILD TEST

After fixing the project:

Perform a clean build.

Use the project's actual package manager and Android build configuration.

Do:

```text id="5v7x6q"
clean
install dependencies if required
clean Android build
release APK build
```

Do not rely only on a debug build.

---

# 36. RELEASE APK VERIFICATION

Install the generated release APK on an Android device/emulator.

Test:

### Launch

* cold start
* warm start
* restart

### Authentication

* login
* logout
* session restore

### Image workflow

* gallery
* image preprocessing
* EXIF GPS
* no EXIF
* live location
* AI analysis

### AI

* primary provider
* fallback
* OCR
* manual review
* failure handling

### Maps

* live map
* markers
* heatmap
* filtering
* navigation

### Navigation

* every major screen
* Android back
* logout
* restart

### Permissions

* allow
* deny
* revoke

### Network

* online
* offline
* slow network

---

# 37. APK READINESS GATE

Do NOT declare the project ready unless all critical gates pass.

### BLOCKER CONDITIONS

The project is NOT ready if any of these exist:

* build failure
* release APK cannot install
* crash on critical workflow
* infinite loading
* broken authentication
* broken location extraction
* incorrect coordinates
* broken map
* broken heatmap
* broken navigation
* API keys exposed unintentionally
* AI can fabricate a confirmed violation
* OCR can fabricate a plate
* provider failure crashes the app
* major feature overlap causes inconsistent results
* critical permission flow broken
* data loss in main workflow

---

# 38. FINAL QUALITY GATES

Every major system must receive a status:

```text
PASS
PASS WITH MINOR WARNING
BLOCKED
```

Audit:

```text
EXIF / GPS
LIVE LOCATION
AI PIPELINE
OCR
RULE ENGINE
GROQ AUDIT
MAP
HEATMAP
NAVIGATION
AUTHENTICATION
PERMISSIONS
NETWORK
STATE MANAGEMENT
SECURITY
PERFORMANCE
UI/UX
ANDROID BUILD
RELEASE APK
```

---

# 39. FINAL REPORT

Generate:

`FINAL_TRAFFIC_EYE_PRODUCTION_AUDIT.md`

Include:

## Executive Summary

* overall readiness
* critical issues
* fixes performed
* remaining blockers

## Feature Audit

For every major system:

```text
Feature
Status
Problems found
Fixes made
Tests performed
```

## AI Audit

Include:

* provider health
* model configuration
* latency
* fallback behavior
* hallucination tests
* OCR results
* rule-engine tests
* manual-review behavior

## EXIF Audit

Include:

* formats tested
* GPS formats tested
* coordinate validation
* fallback behavior
* reverse-geocoding behavior

## Map / Heatmap Audit

Include:

* coordinate correctness
* marker behavior
* heatmap correctness
* performance
* empty/error states

## Navigation Audit

Include:

* route integrity
* back behavior
* authentication redirects
* deep links if applicable

## Security Audit

Include:

* secret exposure findings
* API-key risks
* unsafe logging
* storage concerns

## Performance Audit

Include:

* startup
* AI latency
* map performance
* memory observations
* P50/P95 where measurable

## Build Audit

Include:

* debug build
* release build
* APK installation
* runtime testing

---

# 40. FINAL VERDICT

At the end provide exactly one:

```text
PRODUCTION READY
```

or

```text
NOT PRODUCTION READY
```

Do not use "probably ready."

Do not use "looks ready."

Do not use "should be ready."

Only use:

`PRODUCTION READY`

when all critical acceptance gates pass.

If anything critical remains:

`NOT PRODUCTION READY`

and clearly list the blockers.

---

# 41. IMPORTANT EXECUTION RULE

Do not stop after the first audit.

Use this loop:

```text id="q7w1nm"
AUDIT
  ↓
FIND PROBLEMS
  ↓
FIX PROBLEMS
  ↓
RUN TESTS
  ↓
FIND REGRESSIONS
  ↓
FIX REGRESSIONS
  ↓
RE-RUN AUDIT
  ↓
BUILD RELEASE APK
  ↓
INSTALL + TEST APK
  ↓
FINAL AUDIT
  ↓
READINESS VERDICT
```

If a fix creates a regression, fix the regression before proceeding.

Do not weaken tests to make them pass.

Do not hide failures.

Do not delete a failing test simply because the implementation cannot pass it.

Do not mark a feature as passing without actually testing it.

---

# 42. FINAL OBJECTIVE

Your goal is NOT merely to produce a report.

Your goal is to leave the **Traffic Eye codebase in the best production-ready state possible**, with all safely fixable issues corrected.

The final APK should have:

* reliable EXIF/GPS extraction
* safe live-location fallback
* accurate AI evidence extraction
* deterministic violation decisions
* conditional OCR
* Groq consistency auditing
* fail-closed uncertainty handling
* correct live map
* correct heatmap
* reliable navigation
* no conflicting duplicate systems
* robust permissions
* robust network handling
* secure configuration
* stable state management
* acceptable performance
* clean UI/UX
* successful release APK build

**Do the work. Test the work. Fix the work. Then decide whether it is ready.**

Do not declare production readiness until the release APK itself has been successfully built and tested.

