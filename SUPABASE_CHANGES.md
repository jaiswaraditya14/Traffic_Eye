# SUPABASE_CHANGES.md — Manual Supabase Console / CLI Actions

> **Scope:** These are manual actions for the project owner: validate in a separate
> test Supabase project before applying any production change. Demo seeding is test-only.
> This sprint did **not** run any SQL against the live database,
> deploy any Edge Function, set any secret, or perform any external write. All SQL
> below has been reconciled against the real schema in
> [`database/Traffic_eye_database.sql`](database/Traffic_eye_database.sql), the
> forward-only migrations in [`supabase/migrations/`](supabase/migrations), and the
> Edge Function source in [`supabase/functions/ai-analyze`](supabase/functions/ai-analyze).
> SQL was reviewed statically, not executed in Postgres; hosted schema differences
> and RLS behavior still require verification. No Docker setup is required or supplied.
>
> **Golden rules for whoever applies this:**
> - Never paste real provider keys or the `service_role` key into a file, commit, or chat. Use the CLI commands here with your own secret values.
> - Run each SQL block in the Supabase **SQL Editor** as its own query. Transaction-wrapped blocks and `DO` statements are atomic; inspect errors and verify results before advancing.
> - Do **not** run the local baseline (`supabase/migrations/20260420000000_baseline_deployed_bootstrap.sql`) or any reset script (`database/reset_for_testing.sql`, `database/migrations/data_reset.sql`) against hosted data. Those are for local reproduction only and will wipe/rewrite tables.
> - Apply the sections **in order** (1 → 9). Section 10 is the sign-off checklist.

---

## Section 1 — Apply the AI Analysis Events Table

**Why:** The server-side AI proxy (`ai-analyze`) reserves a per-user quota row in
`public.ai_analysis_events` *before* calling any provider, so concurrency or a lost
completion write cannot bypass the quota. This table and its
`reserve_ai_analysis_event(...)` function must exist before the function is deployed
(Section 3), or every AI request will fail closed.

**Source of truth:** [`database/PHASE1_SQL_EDITOR.sql`](database/PHASE1_SQL_EDITOR.sql),
which is identical in intent to the tracked migration
[`supabase/migrations/20260909182341_phase1_ai_analysis_events.sql`](supabase/migrations/20260909182341_phase1_ai_analysis_events.sql).

**Verification basis:** local repository definitions only; the hosted schema was not queried:
- `user_id uuid REFERENCES public.profiles(id)` — `public.profiles(id)` exists and is the app's user PK. ✅
- `stage IN ('vision','ocr','audit')` — matches `AI_CONFIG.stages` in [`src/config/ai.config.js`](src/config/ai.config.js). ✅
- The original provider constraint omits `tokenharbor`, which the current function returns. Apply the correction in §1c before deployment.
- `SECURITY INVOKER` + `SET search_path = ''` + fully-qualified `public.*` / `pg_catalog.*` — correct hardening; the function is executable only by `service_role`. ✅

The block below preserves the original source verbatim. The required forward-only correction follows in §1c.

### 1a. SQL to run (verbatim from `database/PHASE1_SQL_EDITOR.sql`)

Open **Supabase Dashboard → SQL Editor → New query**, paste the entire block, and click **Run**. It is wrapped in a single transaction; if anything fails, nothing is applied.

```sql
-- Traffic Eye Phase 1 only. Apply once in Supabase SQL Editor before deploying ai-analyze.
-- This is the forward-only repair, NOT the local baseline. No auth/OAuth settings change.
-- Stop on an error; the transaction rolls back. Do not run baseline/reset SQL on hosted data.
BEGIN;

CREATE TABLE public.ai_analysis_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stage text NOT NULL CHECK (stage IN ('vision', 'ocr', 'audit')),
    provider text CHECK (provider IN ('nvidia', 'gemini', 'groq')),
    model text CHECK (char_length(model) <= 128),
    correlation_id text NOT NULL CHECK (correlation_id ~ '^[A-Za-z0-9_-]{8,64}$'),
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    latency_ms integer NOT NULL DEFAULT 0 CHECK (latency_ms >= 0),
    outcome text NOT NULL CHECK (outcome IN ('pending', 'success', 'failure')),
    failure_code text CHECK (failure_code IN (
        'METHOD_NOT_ALLOWED', 'UNAUTHENTICATED', 'FORBIDDEN', 'BAD_REQUEST',
        'PAYLOAD_TOO_LARGE', 'UNSUPPORTED_MEDIA_TYPE', 'QUOTA_EXCEEDED',
        'PROVIDER_UNAVAILABLE', 'PROVIDER_TIMEOUT', 'PROVIDER_BAD_OUTPUT',
        'NOT_CONFIGURED', 'INTERNAL'
    )),
    request_bytes integer NOT NULL CHECK (request_bytes BETWEEN 0 AND 8388608),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Supports own-row RLS, both rolling quota windows, and the profile FK.
CREATE INDEX ai_analysis_events_user_created_idx
    ON public.ai_analysis_events (user_id, created_at DESC);

ALTER TABLE public.ai_analysis_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_analysis_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.ai_analysis_events TO authenticated;
GRANT SELECT, INSERT ON TABLE public.ai_analysis_events TO service_role;
-- Only the completion fields can be updated by the Edge Function.
GRANT UPDATE (provider, model, attempts, latency_ms, outcome, failure_code)
    ON TABLE public.ai_analysis_events TO service_role;

CREATE POLICY ai_analysis_events_read_own
    ON public.ai_analysis_events FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

COMMENT ON TABLE public.ai_analysis_events IS
    'Server-owned AI request quota ledger; no evidence, EXIF, location, tokens or provider payloads. Pending reservations count against quota.';

-- Invoker privileges, service_role execution only: no client can choose p_user_id.
-- The Edge Function supplies the identity obtained from auth.getUser().
-- Reserve before calling providers so concurrency or a lost completion write cannot
-- bypass the quota. Limits are fixed here, never accepted from a client.
CREATE FUNCTION public.reserve_ai_analysis_event(
    p_user_id uuid,
    p_stage text,
    p_correlation_id text,
    p_request_bytes integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_now timestamptz;
    v_hour_count bigint;
    v_day_count bigint;
    v_event_id uuid;
BEGIN
    IF p_user_id IS NULL OR p_stage IS NULL OR p_stage NOT IN ('vision', 'ocr', 'audit')
       OR p_correlation_id IS NULL OR p_correlation_id !~ '^[A-Za-z0-9_-]{8,64}$'
       OR p_request_bytes IS NULL OR p_request_bytes NOT BETWEEN 0 AND 8388608 THEN
        RETURN jsonb_build_object('code', 'BAD_REQUEST');
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('traffic-eye:ai-quota:' || p_user_id::text, 0)
    );
    -- Evaluate the window after obtaining the lock, using database time.
    v_now := pg_catalog.clock_timestamp();
    SELECT count(*) FILTER (WHERE created_at >= v_now - interval '1 hour'), count(*)
      INTO v_hour_count, v_day_count
      FROM public.ai_analysis_events
     WHERE user_id = p_user_id AND created_at >= v_now - interval '1 day';

    IF v_hour_count >= 40 OR v_day_count >= 200 THEN
        RETURN jsonb_build_object('code', 'QUOTA_EXCEEDED');
    END IF;

    INSERT INTO public.ai_analysis_events (
        user_id, stage, correlation_id, request_bytes, outcome, created_at
    ) VALUES (
        p_user_id, p_stage, p_correlation_id, p_request_bytes, 'pending', v_now
    ) RETURNING id INTO v_event_id;

    RETURN jsonb_build_object('eventId', v_event_id);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_analysis_event(uuid, text, text, integer)
    FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_ai_analysis_event(uuid, text, text, integer)
    TO service_role;

COMMIT;
```

### 1b. If the table already exists

If a prior attempt already created it, `CREATE TABLE public.ai_analysis_events` will
error with `relation "ai_analysis_events" already exists` and the whole transaction
rolls back (nothing changes). To confirm the existing object is correct instead of
recreating it, run this read-only check and compare against the definition above:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'ai_analysis_events'
ORDER BY ordinal_position;

SELECT proname, prosecdef
FROM pg_proc
WHERE proname = 'reserve_ai_analysis_event';
```

Do not drop and recreate a populated ledger on production without a deliberate decision.

### 1c. Required correction — allow the existing Token Harbor primary

After creating the ledger (or verifying an existing ledger), run this transaction.
It expands the allowed values without deleting rows. The original constraint name
is generated from the table/column declaration in §1a.

```sql
BEGIN;
ALTER TABLE public.ai_analysis_events
    DROP CONSTRAINT IF EXISTS ai_analysis_events_provider_check;
ALTER TABLE public.ai_analysis_events
    ADD CONSTRAINT ai_analysis_events_provider_check
    CHECK (provider IN ('tokenharbor', 'nvidia', 'gemini', 'groq'));
COMMIT;

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.ai_analysis_events'::regclass AND contype = 'c';
```


---

## Section 2 — Set Edge Function Secrets

**Why:** The mobile client holds **no** provider credentials. Every key lives only in
the Edge Function's secret store. The provider key names below are read by
[`supabase/functions/ai-analyze/providers.ts`](supabase/functions/ai-analyze/providers.ts)
(`KEY_ENV_NAMES`). Token Harbor is the **primary**; NVIDIA, Gemini, and Groq are the
configured fallbacks — this ordering must be preserved.

> `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected
> automatically into deployed functions by Supabase — **do not** set those yourself.

**Never commit real values.** Run these from the repo root, substituting your own keys.
At minimum set `TOKENHARBOR_API_KEY_1`; the rest enable fallback and rotation.

```bash
# Primary provider (required)
npx supabase secrets set TOKENHARBOR_API_KEY_1="<replace-me>"

# Optional second Token Harbor key for rotation
npx supabase secrets set TOKENHARBOR_API_KEY_2="<replace-me>"

# Fallback providers (set at least KEY_1 for each fallback you want active)
npx supabase secrets set NVIDIA_API_KEY_1="<replace-me>"
npx supabase secrets set GEMINI_API_KEY_1="<replace-me>"
npx supabase secrets set GROQ_API_KEY_1="<replace-me>"
```

Additional rotation slots recognized by the function (optional, set only if you have
them): `NVIDIA_API_KEY_2`, `NVIDIA_API_KEY_3`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`,
`GROQ_API_KEY_2` … `GROQ_API_KEY_6`.

Verify which secret **names** are set (values are never printed):

```bash
npx supabase secrets list
```

If a provider has no key configured, that provider is simply skipped; the function
falls back to the next one and, if none is configured, returns the typed
`NOT_CONFIGURED` error — the client shows a safe "AI unavailable" message and offers
manual review (see Prompt 1 Deliverable 4).

---

## Section 3 — Deploy the Edge Function

**Why:** `ai-analyze` is the single authenticated entry point for all AI work.

```bash
npx supabase functions deploy ai-analyze --no-verify-jwt
```

### What `--no-verify-jwt` means here — and why app-level auth still holds

`--no-verify-jwt` disables Supabase's **platform gateway** JWT check. It does **not**
mean the function is unauthenticated. Authentication is enforced *inside* the function:
[`supabase/functions/ai-analyze/index.ts`](supabase/functions/ai-analyze/index.ts)
constructs a Supabase client from the caller's `Authorization` header and calls
`auth.getUser()`; if there is no valid user, the request is rejected with
`UNAUTHENTICATED` before any provider is touched, and the per-user quota
(`reserve_ai_analysis_event`) is keyed to that verified identity.

The flag is used deliberately because the app relies on in-function verification and
because some client transports (and the streaming/error surfaces used here) behave more
predictably when the platform gateway does not pre-reject. **Do not** remove the
in-function `auth.getUser()` check — that check, not the gateway flag, is the security
boundary. If you prefer gateway-level verification too, you may deploy *without*
`--no-verify-jwt`, but only after confirming the client always attaches a fresh session
token to `functions.invoke` (it does today via the Supabase JS client).

Verify the deploy:

```bash
npx supabase functions list
```

---

## Section 4 — Fix Duplicate Review Notifications (`submit_officer_review`)

**Finding (inspection of [`database/Traffic_eye_database.sql`](database/Traffic_eye_database.sql)):**
The function body is correct and complete at lines **563–709**, ending at `$$;` on line
709 with **exactly one** notification `INSERT` (lines 692–699) and one `RETURN` (701–707).
**Lines 711–728 are orphaned, unreachable code** sitting *after* the function's closing
`$$;`: a **second** `INSERT INTO public.notifications … RETURN … END; $$;`. That leftover
block is the "duplicate review notification" artifact. In the reference dump it is dead
code (it references PL/pgSQL variables that do not exist at top level); if it was ever
part of the live body, it would fire a second notification on every review.

**Latest repository version (deployment not verified):** The clean, single-notification function is already
defined in the latest tracked migration
[`supabase/migrations/20260817000001_fix_officer_review_and_guard_trigger.sql`](supabase/migrations/20260817000001_fix_officer_review_and_guard_trigger.sql)
(lines 73–223). The replacement below preserves that signature and reward behavior, while removing its unsafe unauthenticated caller fallback and enforcing the app's existing jurisdiction/pincode routing. It
**preserves** the signature, `JSONB` return type, `SECURITY DEFINER`, `search_path`,
officer/admin authorization, `FOR UPDATE` row locking, idempotency guard, severity-based
rewards (50/70/100/100), atomic point crediting with an auditable
`point_transactions` row, and the guard-trigger session flag — and contains **exactly one**
notification insert.

Run this in the SQL Editor:

```sql
CREATE OR REPLACE FUNCTION public.submit_officer_review(
    p_report_id    UUID,
    p_officer_id   UUID,
    p_decision     TEXT,
    p_remarks      TEXT DEFAULT NULL,
    p_internal     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id    UUID;
    v_caller_role  TEXT;
    v_report       RECORD;
    v_review_id    UUID;
    v_reward       INTEGER := 0;
    v_notif_title  TEXT;
    v_notif_body   TEXT;
    v_jurisdiction TEXT;
    v_badge TEXT;
    v_suffix TEXT;
    v_old_flag TEXT;
BEGIN
    -- 1. Validate decision value
    IF p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid decision: %. Must be approved or rejected.', p_decision
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- 2. Verify authenticated caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF p_officer_id IS DISTINCT FROM v_caller_id THEN
        RAISE EXCEPTION 'Officer identity does not match authenticated caller'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- 3. Verify officer / admin role
    SELECT role, jurisdiction, badge_id INTO v_caller_role, v_jurisdiction, v_badge
    FROM public.profiles WHERE id = v_caller_id;
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('officer', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only verified traffic officers can review reports.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- 4. Lock report row atomically to prevent race conditions
    SELECT * INTO v_report
    FROM public.image_reports
    WHERE id = p_report_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report % not found', p_report_id
            USING ERRCODE = 'no_data_found';
    END IF;

    -- Match the existing app's jurisdiction-keyword OR badge-derived pincode.
    -- Empty routing data fails closed. Literal substring matching avoids SQL
    -- wildcard characters turning a jurisdiction into an unrestricted match.
    v_suffix := substring(v_badge from '([0-9]+)$');
    IF v_caller_role <> 'admin' AND NOT COALESCE((
        (NULLIF(trim(v_jurisdiction), '') IS NOT NULL AND
         strpos(lower(COALESCE(v_report.location_address, '')), lower(trim(v_jurisdiction))) > 0)
        OR
        (v_suffix IS NOT NULL AND
         strpos(COALESCE(v_report.location_address, ''),
                '400' || CASE WHEN length(v_suffix) < 3 THEN lpad(v_suffix, 3, '0') ELSE v_suffix END) > 0)
    ), false) THEN
        RAISE EXCEPTION 'Report is outside officer jurisdiction'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- 5. Idempotency guard: already reviewed reports cannot be credited twice.
    IF v_report.status <> 'pending' THEN
        RETURN jsonb_build_object(
            'success',          false,
            'already_reviewed', true,
            'current_status',   v_report.status,
            'message',          'Report has already been reviewed. No changes made.'
        );
    END IF;

    -- 6. Set transaction-local guard flag and restore it before returning.
    v_old_flag := current_setting('traffic_eye.allow_profile_update', true);
    PERFORM set_config('traffic_eye.allow_profile_update', 'on', true);

    -- 7. Insert or update officer_reviews record
    INSERT INTO public.officer_reviews (report_id, officer_id, decision, remarks, internal_notes)
    VALUES (p_report_id, v_caller_id, p_decision, p_remarks, p_internal)
    ON CONFLICT (report_id) DO UPDATE
        SET decision         = EXCLUDED.decision,
            remarks          = EXCLUDED.remarks,
            internal_notes   = EXCLUDED.internal_notes,
            review_timestamp = now(),
            officer_id       = EXCLUDED.officer_id
    RETURNING id INTO v_review_id;

    -- 8. Compute severity-aligned reward points
    IF p_decision = 'approved' THEN
        CASE lower(COALESCE(v_report.severity, 'medium'))
            WHEN 'low'      THEN v_reward := 50;
            WHEN 'medium'   THEN v_reward := 70;
            WHEN 'high'     THEN v_reward := 100;
            WHEN 'critical' THEN v_reward := 100;
            ELSE                 v_reward := 50;
        END CASE;
    ELSE
        v_reward := 0;
    END IF;

    -- 9. Update image_reports status
    UPDATE public.image_reports
    SET status        = p_decision,
        reviewed_at   = now(),
        reward_amount = v_reward
    WHERE id = p_report_id;

    -- 10. Award points and record audit transaction if approved
    IF p_decision = 'approved' AND v_reward > 0 THEN
        UPDATE public.profiles
        SET points_balance = points_balance + v_reward
        WHERE id = v_report.user_id;

        INSERT INTO public.point_transactions
            (user_id, amount, type, action, reference_id, description)
        VALUES (
            v_report.user_id,
            v_reward,
            'earned',
            'report_approved',
            p_report_id,
            'Reward for approved traffic violation report (severity: ' || COALESCE(v_report.severity, 'medium') || ')'
        );
    END IF;

    -- 11. Send notification to citizen  (EXACTLY ONE notification insert)
    IF p_decision = 'approved' THEN
        v_notif_title := 'Report Approved! 🎉';
        v_notif_body  := COALESCE(p_remarks,
            'Your traffic violation report has been approved! You earned ' || v_reward || ' points.');
    ELSE
        v_notif_title := 'Report Rejected';
        v_notif_body  := COALESCE(p_remarks,
            'Your traffic violation report was reviewed and rejected.');
    END IF;

    INSERT INTO public.notifications (user_id, title, body, type, reference_id)
    VALUES (
        v_report.user_id,
        v_notif_title,
        v_notif_body,
        CASE p_decision WHEN 'approved' THEN 'report_approved' ELSE 'report_rejected' END,
        p_report_id
    );

    PERFORM set_config('traffic_eye.allow_profile_update', COALESCE(v_old_flag, ''), true);
    RETURN jsonb_build_object(
        'success',          true,
        'already_reviewed', false,
        'review_id',        v_review_id,
        'decision',         p_decision,
        'reward_amount',    v_reward
    );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_officer_review(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_officer_review(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;
```

> The reviewed replacement intentionally tightens authentication and jurisdiction.
> A copied legacy definition is not proof of what is deployed. Apply this block
> only after reviewing the local/test checks. Do not paste the orphaned dump fragment.

---

## Section 5 — Harden New-User Creation (`handle_new_user`)

**Finding:** The repository's `handle_new_user()` (defined once, at
[`supabase/migrations/20260420000000_baseline_deployed_bootstrap.sql:268`](supabase/migrations/20260420000000_baseline_deployed_bootstrap.sql))
trusts client-controlled `raw_user_meta_data`: it copies `role` from
`COALESCE(raw_user_meta_data->>'role','citizen')` and copies `badge_id`, `department`,
and `jurisdiction` straight from metadata. **This is a privilege-escalation hole** — a
public sign-up could request `role: 'officer'` (or seed a `badge_id`) and self-provision
officer access.

**Fix:** Force every public sign-up to `citizen`, ignore any client-supplied role, and
**never** copy `badge_id`/`department`/`jurisdiction` at signup. Legitimate profile
fields (`full_name`, `phone`, `email`) are still populated. This preserves the existing
trigger `on_auth_user_created` binding (a `CREATE OR REPLACE` keeps it wired).

Run in the SQL Editor:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Public sign-ups are ALWAYS citizens. Role, badge_id, department, and
    -- jurisdiction are privileged fields and are never accepted from client
    -- metadata. Officer access is granted only by a trusted admin (see below).
    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        'citizen'
    );
    RETURN NEW;
END;
$$;
```

### Required companion correction — protect officer routing fields

The existing update guard protects role, badge, and points, but not jurisdiction or
department. Since Section 4 authorizes reviews using jurisdiction, an officer must
not be able to widen that field through the profile update API. Apply this separate
forward-only correction before enabling officer reviews. It preserves the existing
trusted-RPC transaction flag and existing trigger binding; it adds no public RPC.

```sql
CREATE OR REPLACE FUNCTION public.guard_protected_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF current_setting('traffic_eye.allow_profile_update', true) = 'on' THEN
        RETURN NEW;
    END IF;

    IF NEW.points_balance IS DISTINCT FROM OLD.points_balance
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.badge_id IS DISTINCT FROM OLD.badge_id
       OR NEW.jurisdiction IS DISTINCT FROM OLD.jurisdiction
       OR NEW.department IS DISTINCT FROM OLD.department THEN
        RAISE EXCEPTION 'Protected profile fields require a trusted administrative path.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_protected_profile_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
```

Verify using an ordinary signed-in test officer (not SQL Editor's privileged role):
direct changes to each protected column must fail; editing `full_name` must still
work. Test citizen and anonymous review calls, spoofed officer IDs, missing routing,
and out-of-jurisdiction reviews: all must fail without a review, points, or notification.
Approve one in-jurisdiction pending report twice: exactly one review, one earned
transaction, one notification, and one balance increment must result. Repeat with
two simultaneous requests. These database integration checks have **not been run**
in this sprint. Audit other privileged RPCs before release: the existing flag is
safe only if no user-callable RPC lets callers set it without authorization.

### Trusted admin path — promoting an officer

Officer promotion is a deliberate, server-side action. **Important:** the
`profiles` table is protected by the `guard_protected_profile_columns` BEFORE-UPDATE
trigger (see
[`20260817000001_fix_officer_review_and_guard_trigger.sql`](supabase/migrations/20260817000001_fix_officer_review_and_guard_trigger.sql)),
which **blocks direct changes to `role`, `badge_id`, and `points_balance`** unless the
transaction sets the session flag `traffic_eye.allow_profile_update = 'on'`. So a raw
`UPDATE … SET role='officer'` in the SQL Editor will fail with
`insufficient_privilege` unless you set that flag first, in the **same transaction**:

```sql
BEGIN;
-- Authorize this trusted, server-side profile change for THIS transaction only.
SELECT set_config('traffic_eye.allow_profile_update', 'on', true);

UPDATE public.profiles
SET role         = 'officer',
    badge_id     = 'EYE-055',
    department   = 'Mumbai Traffic Police',
    jurisdiction = 'Vakola'
WHERE email = 'officer@example.com';
COMMIT;
```

Notes:
- `role` accepts only `'citizen'` or `'officer'` (schema CHECK constraint); the review
  function additionally tolerates a legacy `'admin'` value if you introduce one.
- `badge_id` is `UNIQUE` — a duplicate will error and the transaction rolls back.
- Because the flag is transaction-local (`set_config(..., true)`), run both statements
  together (as shown) so the flag is in effect when the `UPDATE` fires.

---

## Section 6 — Demo Seed Data

**Why:** Populate a demonstrable dataset so officer/citizen dashboards, rewards, and
notifications have realistic content. This block is **idempotent** (safe to re-run),
uses **deterministic IDs** derived from a seed marker, is designed against the local schema constraints,
recalculates the citizen's point balance from the ledger, and **skips gracefully** if no
citizen/officer exists yet.

**Distribution:** 13 reports total for the first citizen — **exactly 5 pending**,
**exactly 5 approved** (each with an officer review, a `point_transactions` reward, and
an approval notification), and **3 rejected** (each with an officer review and a
rejection notification).

> **Test project only:** the script selects the first citizen and officer and updates
> that citizen's points. Never run it in a project containing real users/evidence.
> Requires at least one `citizen` and one `officer` profile. Create them via normal
> sign-up first, then promote the officer using Section 5. If either is missing, the
> block prints a `NOTICE` and makes no changes.

Run in the SQL Editor:

```sql
DO $$
DECLARE
    v_seed      text := 'traffic-eye-demo-v1';   -- seed marker for idempotency
    v_citizen   uuid;
    v_officer   uuid;
    v_i         integer;
    v_report_id uuid;
    v_status    text;
    v_severity  text;
    v_reward    integer;
    v_created   timestamptz;
    v_reviewed  timestamptz;

    -- 13 synthetic Mumbai entries (index-aligned)
    v_types      text[] := ARRAY[
        'No Helmet','Signal Jump','Wrong-Side Driving','No Seatbelt','Triple Riding',
        'Illegal Parking','Overspeeding','Mobile Phone While Driving','Missing Number Plate',
        'Lane Discipline Violation','Zebra-Crossing Encroachment','Overloading','Red-Light Jump'];
    v_addresses  text[] := ARRAY[
        'Vakola Bridge, Santacruz East, Mumbai 400055','Linking Road, Bandra West, Mumbai',
        'Western Express Highway, Andheri East, Mumbai','Sion-Panvel Highway, Chembur, Mumbai',
        'S.V. Road, Malad West, Mumbai','Dr. Ambedkar Road, Dadar East, Mumbai',
        'Eastern Express Highway, Ghatkopar, Mumbai','JVLR, Powai, Mumbai',
        'Hill Road, Bandra West, Mumbai','LBS Marg, Kurla West, Mumbai',
        'CST Road, Vakola, Santacruz East, Mumbai 400055','Ghodbunder Road, Borivali, Mumbai',
        'Peddar Road, Cumballa Hill, Mumbai'];
    v_lats       double precision[] := ARRAY[
        19.0790,19.0607,19.1136,19.0576,19.1860,19.0176,19.0860,19.1190,
        19.0509,19.0726,19.0728,19.2307,18.9690];
    v_lngs       double precision[] := ARRAY[
        72.8525,72.8362,72.8697,72.8990,72.8484,72.8446,72.9080,72.9050,
        72.8265,72.8790,72.8656,72.8567,72.8080];
    v_severities text[] := ARRAY[
        'high','medium','critical','low','high',
        'low','critical','high','medium',
        'medium','low','high','critical'];
    v_plates     text[] := ARRAY[
        'MH01AB1234','MH02CD5678','MH03EF9012','MH04GH3456','MH05IJ7890',
        'MH12KL2345','MH14MN6789','MH43OP0123','MH02QR4567','MH01ST8901',
        'MH03UV2345','MH48WX6789','MH12YZ0123'];
BEGIN
    -- 1. Resolve the first citizen and first officer (deterministic ordering)
    SELECT id INTO v_citizen FROM public.profiles WHERE role = 'citizen' ORDER BY created_at, id LIMIT 1;
    SELECT id INTO v_officer FROM public.profiles WHERE role = 'officer' ORDER BY created_at, id LIMIT 1;

    IF v_citizen IS NULL OR v_officer IS NULL THEN
        RAISE NOTICE 'Demo seed skipped: need >=1 citizen (found %) and >=1 officer (found %). Create/promote them first.',
            v_citizen, v_officer;
        RETURN;
    END IF;

    -- 2. Serialize seed setup and leave a completed seed untouched on rerun.
    PERFORM pg_advisory_xact_lock(hashtextextended(v_seed, 0));
    IF EXISTS (SELECT 1 FROM public.image_reports WHERE ai_raw_result->>'_seed' = v_seed) THEN
        IF (SELECT count(*) FROM public.image_reports WHERE ai_raw_result->>'_seed' = v_seed) <> 13 THEN
            RAISE EXCEPTION 'Partial demo seed exists; inspect it before proceeding. No records were changed.';
        END IF;
        RAISE NOTICE 'Demo seed already exists; reports, reviews, notifications and balances left unchanged.';
        RETURN;
    END IF;

    -- 3. Authorize the server-side points_balance recalculation for this transaction
    --    (the guard_protected_profile_columns trigger blocks it otherwise).
    PERFORM set_config('traffic_eye.allow_profile_update', 'on', true);

    -- 4. Insert the reports and their dependents
    FOR v_i IN 1..13 LOOP
        v_report_id := md5(v_seed || ':report:' || v_i)::uuid;
        v_severity  := v_severities[v_i];
        v_created   := now() - ((14 - v_i) || ' days')::interval - (v_i || ' hours')::interval;

        IF v_i <= 5 THEN
            v_status := 'pending';
        ELSIF v_i <= 10 THEN
            v_status := 'approved';
        ELSE
            v_status := 'rejected';
        END IF;

        IF v_status = 'approved' THEN
            v_reward := CASE lower(v_severity)
                            WHEN 'low' THEN 50 WHEN 'medium' THEN 70
                            WHEN 'high' THEN 100 WHEN 'critical' THEN 100 ELSE 50 END;
            v_reviewed := v_created + interval '3 hours';
        ELSIF v_status = 'rejected' THEN
            v_reward   := 0;
            v_reviewed := v_created + interval '3 hours';
        ELSE
            v_reward   := 0;
            v_reviewed := NULL;
        END IF;

        INSERT INTO public.image_reports (
            id, user_id, image_url, image_storage_path,
            latitude, longitude, location_address,
            violation_type, violation_description, severity,
            ai_confidence, ai_raw_result, vehicle_number,
            status, reward_amount, submitted_at, reviewed_at, created_at, updated_at
        ) VALUES (
            v_report_id, v_citizen,
            'https://placehold.co/800x600/0F2C59/FFFFFF/png?text=Evidence+' || v_i,
            NULL,
            v_lats[v_i], v_lngs[v_i], v_addresses[v_i],
            v_types[v_i], v_types[v_i] || ' observed at ' || v_addresses[v_i], v_severity,
            0.9000,
            jsonb_build_object('_seed', v_seed, 'violationDetected', true,
                               'violationType', v_types[v_i], 'severity', v_severity),
            v_plates[v_i],
            v_status, v_reward, v_created, v_reviewed, v_created, COALESCE(v_reviewed, v_created)
        );

        -- Evidence media row (image)
        INSERT INTO public.report_media (
            id, report_id, file_url, file_type, storage_path, file_name, mime_type, file_size, created_at
        ) VALUES (
            md5(v_seed || ':media:' || v_i)::uuid, v_report_id,
            'https://placehold.co/800x600/0F2C59/FFFFFF/png?text=Evidence+' || v_i,
            'image', NULL,
            'demo-' || v_i || '.png', 'image/png', NULL, v_created
        );

        -- Reviews + points + notifications for reviewed reports
        IF v_status <> 'pending' THEN
            INSERT INTO public.officer_reviews (
                id, report_id, officer_id, decision, remarks, internal_notes, review_timestamp, created_at
            ) VALUES (
                md5(v_seed || ':review:' || v_i)::uuid, v_report_id, v_officer, v_status,
                CASE WHEN v_status = 'approved'
                     THEN 'Violation verified against submitted evidence.'
                     ELSE 'Rejected: evidence insufficient or vehicle not clearly identifiable.' END,
                'Demo seed review (' || v_seed || ').',
                v_reviewed, v_reviewed
            );

            IF v_status = 'approved' THEN
                INSERT INTO public.point_transactions (
                    id, user_id, amount, type, action, reference_id, description, created_at
                ) VALUES (
                    md5(v_seed || ':pts:' || v_i)::uuid, v_citizen, v_reward, 'earned', 'report_approved',
                    v_report_id,
                    'Reward for approved traffic violation report (severity: ' || v_severity || ')',
                    v_reviewed
                );

                INSERT INTO public.notifications (
                    id, user_id, title, body, type, reference_id, is_read, created_at
                ) VALUES (
                    md5(v_seed || ':notif:' || v_i)::uuid, v_citizen, 'Report Approved! 🎉',
                    'Your traffic violation report has been approved! You earned ' || v_reward || ' points.',
                    'report_approved', v_report_id, false, v_reviewed
                );
            ELSE
                INSERT INTO public.notifications (
                    id, user_id, title, body, type, reference_id, is_read, created_at
                ) VALUES (
                    md5(v_seed || ':notif:' || v_i)::uuid, v_citizen, 'Report Rejected',
                    'Your traffic violation report was reviewed and rejected.',
                    'report_rejected', v_report_id, false, v_reviewed
                );
            END IF;
        END IF;
    END LOOP;

    -- 5. Recalculate the citizen's balance from the full ledger (authoritative).
    UPDATE public.profiles p
    SET points_balance = COALESCE((
            SELECT SUM(CASE WHEN type = 'redeemed' THEN -amount ELSE amount END)
            FROM public.point_transactions WHERE user_id = v_citizen
        ), 0)
    WHERE p.id = v_citizen;

    RAISE NOTICE 'Demo seed applied: 13 reports (5 pending, 5 approved, 3 rejected) for citizen % reviewed by officer %.',
        v_citizen, v_officer;
END $$;
```

**Idempotency & determinism notes:**
- Every inserted row uses a deterministic ID. A completed seed is a no-op on rerun;
  no existing report, review, notification, or transaction is deleted or reset.
- A partial seed is reported for inspection without mutation.
- Find seed rows with:
  ```sql
  SELECT count(*) FROM public.image_reports WHERE ai_raw_result->>'_seed' = 'traffic-eye-demo-v1';
  ```
- All locations remain realistic; the Vakola demo officer will only see matching
  addresses. Promote separate test officers for other areas if needed.
- Image URLs are placeholders (`placehold.co`); no real evidence is referenced.

---

## Section 7 — Verify Storage Buckets

**Why:** Media upload (`report-media`) and legacy verification (`verification-images`)
must exist with the right visibility and limits. Both are created in the baseline; this
is a **read-only** verification.

```sql
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('report-media', 'verification-images')
ORDER BY id;
```

**Expected:**

| id | public | file_size_limit | allowed_mime_types (contains) |
|----|--------|-----------------|-------------------------------|
| `report-media` | `true` | `52428800` (50 MB) | `image/jpeg, image/png, image/webp, video/mp4, video/quicktime, video/webm` |
| `verification-images` | `false` | `10485760` (10 MB) | `image/jpeg, image/png, image/webp, image/heic, image/heif` |

### Reapplying storage policies without conflicts

If a bucket is missing or a policy needs to be (re)applied, re-run **only** the storage
section of the baseline —
[`20260420000000_baseline_deployed_bootstrap.sql`](supabase/migrations/20260420000000_baseline_deployed_bootstrap.sql)
lines **612–647**. Check the individual policy names before reapplying:
- Bucket inserts use `ON CONFLICT (id) DO NOTHING`.
- Every baseline policy is preceded by `DROP POLICY IF EXISTS … ON storage.objects`,
  so this exact storage block can be reapplied without duplicate-policy errors.
  Review `pg_policies` first: replacing a customized policy could broaden access.
- The report-media declarations are also in Section 9 of `database/Traffic_eye_database.sql`;
  use the guarded baseline storage block, never the complete dump.

Do **not** run the entire baseline file against hosted data — copy just those lines.

---

## Section 8 — Verify Realtime Publication

**Why:** Officer/citizen dashboards subscribe to live changes. These tables must be in
the `supabase_realtime` publication.

Read-only check:

```sql
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename IN ('image_reports','notifications','officer_reviews','verification_reports','report_media')
ORDER BY tablename;
```

**Expected:** all five rows present —
`image_reports`, `notifications`, `officer_reviews`, `report_media`, `verification_reports`.

If any are missing, add them with the guarded commands below (each is a no-op if the
table is already published):

```sql
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.image_reports;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.officer_reviews;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_reports;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.report_media;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

---

## Section 9 — Authentication Settings

Configure under **Supabase Dashboard → Authentication**. These values match the app's
deep-link scheme `trafficeye` (`app.json`) and the redirect targets used in code
([`src/services/auth/index.js`](src/services/auth/index.js),
[`src/screens/auth/ForgotPassword.js`](src/screens/auth/ForgotPassword.js),
[`src/screens/auth/OtpVerification.js`](src/screens/auth/OtpVerification.js),
[`src/screens/auth/CitizenSignIn.js`](src/screens/auth/CitizenSignIn.js)).

**Providers → Email:** Enabled. (Confirm email confirmations are configured per your
policy; the app supports the email confirmation + OTP flows.)

**URL Configuration → Site URL:**
```
trafficeye://
```

**URL Configuration → Redirect URLs (allow-list):** add each of these:
```
trafficeye://auth/callback
trafficeye://signup-success
trafficeye://reset-password
```
A wildcard `trafficeye://**` also covers all three if you prefer a single entry.

### Expo Go development redirect (derive it — do not hard-code a guessed value)

In Expo Go, the sign-up email redirect is built at runtime by
`Linking.createURL('signup-success')`, which resolves to an `exp://` URL that includes
**your machine's LAN IP and Metro port** (e.g. `exp://<host>:<port>/--/signup-success`).
That host/port is environment-specific, so do not invent a fixed one. To get the exact
value for your dev machine, log it once while running in Expo Go:

```js
import * as Linking from 'expo-linking';
console.log('DEV redirect base:', Linking.createURL(''));
console.log('DEV signup redirect:', Linking.createURL('signup-success'));
```

Then add the printed `exp://…/--/signup-success` (and, if you test password reset in
Expo Go, `…/--/reset-password` and `…/--/auth/callback`) to the Redirect URLs allow-list
for the duration of development. Standalone/EAS builds use the `trafficeye://` entries
above and do not need the `exp://` values.

---

## Section 10 — Summary Checklist

Apply in order. Mark each as you complete it and record the verification result.

| # | Action | Type | Done | Verification |
|---|--------|------|------|--------------|
| 1 | Create `ai_analysis_events` table + `reserve_ai_analysis_event()` | SQL Editor (txn) | ☐ | Columns, function and Token Harbor constraint present (§1b/§1c) |
| 2 | Set Edge Function secrets (Token Harbor primary + fallbacks) | CLI | ☐ | `npx supabase secrets list` shows the names |
| 3 | Deploy `ai-analyze --no-verify-jwt` | CLI | ☐ | `npx supabase functions list` shows it; test AI call returns a result or typed error |
| 4 | Replace `submit_officer_review` (exactly one notification) | SQL Editor | ☐ | Approve a test report → citizen gets **one** notification, points credited once |
| 5 | Harden `handle_new_user` (force `citizen`) | SQL Editor | ☐ | New signup with `role:'officer'` metadata still lands as `citizen` |
| 6 | Apply demo seed data | SQL Editor (`DO` block) | ☐ | `NOTICE` reports 13 rows; dashboards populate; balance recalculated |
| 7 | Verify storage buckets | SQL Editor (read-only) | ☐ | `report-media` public/50MB, `verification-images` private/10MB |
| 8 | Verify realtime publication | SQL Editor (read-only) | ☐ | All five tables listed |
| 9 | Configure Auth (Email, Site URL, redirects, Expo dev URL) | Dashboard | ☐ | Email sign-in + password reset deep-link back into the app |
| 10 | Review all verification results and handoff limitations | Manual review | ☐ | Every preceding row verified; remaining risks recorded |

> When every row is checked and verified, the Supabase side of Prompt 1 is complete.
> Application-code changes from Prompt 1 (report submission centralization, fail-closed
> checks, AI retry/manual-review, error boundary, design foundation) are tracked
> separately in [`SPRINT_HANDOFF_1.md`](SPRINT_HANDOFF_1.md).

### Reference documentation

Function privileges and search paths follow [Supabase database-function guidance](https://supabase.com/docs/guides/database/functions). Access tests must use ordinary authenticated roles as described in [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).
