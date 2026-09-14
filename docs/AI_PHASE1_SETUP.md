# Phase 1 AI configuration and owner actions

The mobile app calls `ai-analyze` using the signed-in user's Supabase session.
The Edge Function verifies the JWT and derives the user's identity from that
verified session. Provider credentials belong only to the server.

## Mobile configuration and Google OAuth

Copy the reviewed root `.env.example` to `.env` and supply only the app's public
Supabase configuration: `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY`. Use the existing Supabase project for Google
OAuth. These values are public app configuration; never substitute a
`service_role` key or any other server secret for the anon key. Supabase documents
the client/server key distinction in its [environment variable guide](https://supabase.com/docs/guides/functions/secrets).

Google sign-in remains `supabase.auth.signInWithOAuth({ provider: 'google' })` in
`src/services/auth/index.js`. Keep the existing Google client ID/client secret,
Supabase callback, and app redirect configuration in the appropriate Google and
Supabase Auth settings. A Gemini AI key is independent of Google OAuth and is
not needed for sign-in. See [Supabase's Google sign-in guide](https://supabase.com/docs/guides/auth/social-login/auth-google).

The Git and EAS ignore rules exclude `.env*` files at every depth and retain only
the reviewed root `.env.example`. EAS excludes server function source and AI
benchmark scripts from the mobile upload. Because a local `.env` is not shipped
to EAS, configure the two public Supabase values in the owner's EAS build
environment. Remove obsolete public AI variables from that environment as well.
Keep `android/` committed and included in builds; never run `expo prebuild --clean`.

## Server-only AI secrets

The owner must apply [the Phase 1 SQL Editor repair](../database/PHASE1_SQL_EDITOR.sql)
to the intended Supabase project before deploying the updated function. It adds
the AI event ledger and service-only atomic quota reservation used by the function.
The forward migration is
`supabase/migrations/20260909182341_phase1_ai_analysis_events.sql`.
Then configure replacement credentials in the project's Supabase Dashboard
under Edge Function secrets, and deploy the repository's `ai-analyze` function.
SQL Editor cannot configure provider secrets or deploy a function.
[Supabase supports setting Edge secrets through the Dashboard or CLI](https://supabase.com/docs/guides/functions/secrets).

The existing function reads these names:

| Provider | Server secret names | Used by |
| --- | --- | --- |
| NVIDIA | `NVIDIA_API_KEY_1`, `NVIDIA_API_KEY_2`, `NVIDIA_API_KEY_3` | Vision and OCR |
| Gemini | `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3` | Vision and OCR fallback |
| Groq | `GROQ_API_KEY_1` through `GROQ_API_KEY_6` | Text-only audit |

Unused slots may remain unset. Configure at least one allowed vision/OCR
provider and Groq for the audit stage if that stage is needed. Do not put these
values in app files, public Expo variables, EAS mobile variables, SQL, reports,
or chat. The function also uses Supabase's server environment, including its
service-role credential; that credential must remain server-only.

No provider secrets means an authenticated valid analysis request must return
the typed `NOT_CONFIGURED` response without a provider request. Invalid sessions
must be rejected. Quota ledger failures must stop provider calls. An attempt's
pending reservation remains counted if recording completion fails, so that
lost completion bookkeeping cannot bypass quota. Provider error bodies, tokens,
complete URIs, EXIF/GPS, and secrets must not appear in responses or diagnostic
output. See `HANDOFF_STATUS.md` for tested guarantees and limits.

## Rotation and deployment remain owner actions

1. Revoke/rotate every provider credential that was exposed: the Gemini key
   formerly embedded in `docs/AI_DETECTION_IMPLEMENTATION.md`, plus every NVIDIA,
   Gemini, and Groq key that appeared in public app variables, shipped APKs,
   documentation, or shared configuration. No credential validity check or
   provider-console rotation was performed by this repository change.
2. Remove the old AI variables from local app env files and existing EAS/CI
   mobile environments. Use replacement values only in Supabase Edge secrets.
   Existing ignored local env values were not printed or automatically edited.
3. Apply only the supplied forward repair SQL to the intended Supabase project.
   Never paste the local bootstrap schema into the live project. Review and
   deploy `ai-analyze` with the existing verified-JWT requirement preserved.
4. Rebuild affected mobile artifacts after removing public provider variables.
   Old APKs/bundles can retain old keys, which is why revocation is necessary.
5. Confirm Google login and authenticated AI failure/success behavior in the
   intended environment, without sharing JWTs, provider payloads, or credentials.

Historical commits still contain exposed provider material. History was scanned
without printing values and was not rewritten. Current-tree removal and ignore
rules do not revoke a credential or remove it from old commits or existing APKs.

## Verification boundary for this change

The owner explicitly requested **Skip Docker entirely**. No Docker feature,
configuration, dependency, container, or local Supabase stack is added or started.
Consequently, local Supabase start/reset/lint/pgTAP and a locally issued real-JWT
Edge Function smoke test are skipped for this scope. Unit tests or static SQL
checks do not substitute for those integration checks. Any database/hosted
deployment, secret configuration, or device checks still required are listed in
`HANDOFF_STATUS.md` with their actual status. Work stops at Phase 1.
