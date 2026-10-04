# EXIF/GPS repair and verification

## Outcome

The extraction fix is implemented and tested. Android emulator checks passed in a
non-debuggable, locally signed QA APK using the real picker, report screen, native
map and preprocessing. Authenticated live submission and physical-device/iOS
verification are not established by these checks.

## Root causes and changes

- Android picker copies can redact location metadata or lose the original media
  identity. The native resolver now retains the selected document URI using
  `ACTION_OPEN_DOCUMENT`, resolves only exact media identities, and distinguishes
  inaccessible original metadata from absent GPS. Filename/dimension guessing
  was removed.
- Previously duplicated parsers, permissive numeric conversion and rejection of
  `(0, 0)` produced inconsistent results. `src/utils/exifGpsCore.js` is now the
  shared strict parser, with rational/DMS/decimal conversion and bounded TIFF
  reads. `extractExifFromImage` returns status, EXIF/GPS flags, coordinates and
  provenance, while preserving existing callers.
- Picker/extraction hooks and `NewReport` preserve original URIs, extract before
  transformations, clear stale location state, and do not silently substitute
  device GPS. Hashing uses raw bytes, not base64 text; incomplete reads are not
  certified as full-file hashes.
- `MapLibreMap` uses the installed v11 camera API and accepts valid zero
  coordinates. Preprocessing preserves access-bearing URI queries and keeps the
  original evidence unchanged.

Primary changes are in the Android resolver/manifest, `src/utils`,
`src/hooks`, `src/screens/citizen/NewReport.js`, the map component and AI
preprocessing. Regression tests cover parsing, fixtures, URI handling, permissions,
stale-state races, map handoff, preprocessing and mocked report upload/storage.
`scripts/exif-device/index.js` is an explicitly selected local QA entry; normal
release builds retain the production entry and authentication.

## Expected versus actual

| Image | Expected | Actual | Result |
| --- | --- | --- | --- |
| Unmodified `test_exif.jpeg` | No EXIF or GPS; null coordinates | `NO_EXIF_DATA`; no location; continue disabled without a location | PASS |
| Separate synthetic GPS control | Latitude 12.5, longitude 45.25 | 12.5, 45.25 in UI and local submission handoff | PASS |
| Separate synthetic zero control | Latitude 0, longitude 0 | 0, 0 in UI and local submission handoff | PASS |

Coordinate tolerance: `1e-6` degrees per axis; measured error was zero.
Independent Pillow and byte inspection found no EXIF/GPS in the user's fixture.
Original and committed copy SHA-256:
`ac0fe4c0a42d7286b548c3e9f0f581738e9631f7f5508ee89cf72a2b02a6cb3e`.
The fixture was never modified; positive controls are separate synthetic images.

## Verification

- PASS: full Jest suite, 395 tests across 29 suites; no TODO tests.
- PASS: targeted EXIF suite, 102 tests; changed-source ESLint and whitespace checks.
- PASS: normal-entry release APK, all four configured ABIs; separate x86_64 QA APK.
- PASS: Pixel 8 emulator, Android 17/API 37: gallery selection, original metadata,
  permission-denial handling, UI/map, valid zero coordinates and local evidence
  preprocessing/handoff. Before/after original evidence hashes matched.
- PASS: mocked upload/storage tests preserve coordinates and EXIF provenance.
- NOT TESTED: authenticated live backend submission, physical Android, iOS and
  cloud/store-signed builds. Live submission needs an authorized test account and
  safe test-report workflow; no fabricated violation was submitted.

Stack: Expo 54, React Native 0.81.5, MapLibre React Native 11.3.6; Android
min/target/compile SDK 24/36/36. Local release APKs use the existing debug signing
configuration and are not store-signed artifacts.

Reproduce automated checks:

```powershell
node node_modules/jest/bin/jest.js --runInBand --silent
node scripts/test_exif_pipeline.js --silent
cd android
.\gradlew.bat :app:assembleRelease --offline --console=plain
.\gradlew.bat :app:assembleRelease -PreactNativeArchitectures=x86_64 -PexifVerification=true --offline --console=plain
```

Generated APKs/screenshots stay local under `output/exif-verification`, not in Git.
