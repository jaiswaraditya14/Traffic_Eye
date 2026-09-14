# AI Traffic Violation Detection

The current AI boundary is documented in [Phase 1 setup](AI_PHASE1_SETUP.md).
The app sends authenticated requests to the Supabase `ai-analyze` Edge Function;
provider credentials and provider/model selection stay on the server.

## Credential exposure in this document

Earlier revisions of this document included a Gemini provider credential and
instructions to embed it in the app. That credential has been removed from the
current file. The owner must revoke/rotate it, together with every NVIDIA,
Gemini, or Groq credential previously exposed through the client, environment
files, build artifacts, or shared documentation. Its validity was not tested.
Existing Git history has not been rewritten; old commits may still contain it.

Never place a provider key in `src/config/ai.config.js`, Expo public variables,
mobile build configuration, or documentation. The current server-only variable
names and deployment steps are in [Phase 1 setup](AI_PHASE1_SETUP.md).

Google OAuth is separate from Gemini. Existing sign-in continues through
Supabase Auth's Google provider and uses a Supabase session. AI provider-key
rotation does not require replacing that sign-in flow.

## Citizen review behavior

The existing AI pipeline can suggest a vehicle number, violations, confidence,
and description for the citizen review screen. The citizen can edit the plate,
violations, and description before submitting. AI suggestions and displayed
confidence are not proof of evidence authenticity or server authorization.

UI smoke testing remains an owner/device task: sign in with Google, select an
image, run analysis, review/edit the suggested values, and check the manual or
retry path when analysis is unavailable. Consult `HANDOFF_STATUS.md` for which
tests were actually run; this document does not establish device coverage or
completion of the later report-submission/security phases.
