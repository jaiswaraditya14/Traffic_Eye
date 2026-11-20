-- =============================================================================
-- Migration: 20261120143000_push_notifications_trigger.sql
-- Description:
--   1. Enable pg_net extension for non-blocking asynchronous HTTP calls.
--   2. Automatically dispatch remote push notifications to Expo Push Server
--      whenever a notification row is inserted for a user with a push_token.
-- =============================================================================

-- ── 1. ENSURE pg_net EXTENSION ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ── 2. EXPO PUSH DISPATCHER FUNCTION ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.dispatch_expo_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_push_token TEXT;
    v_payload JSONB;
BEGIN
    -- Look up the recipient user's push token
    SELECT push_token INTO v_push_token
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- Only send if user has a registered Expo push token (APK standalone builds)
    IF v_push_token IS NOT NULL AND v_push_token LIKE 'ExponentPushToken%' THEN
        v_payload := jsonb_build_object(
            'to', v_push_token,
            'title', NEW.title,
            'body', NEW.body,
            'sound', 'default',
            'channelId', 'traffic-eye-default',
            'priority', 'high',
            'data', jsonb_build_object(
                'userId', NEW.user_id::text,
                'notifId', NEW.id::text,
                'reportId', NEW.reference_id::text,
                'type', NEW.type
            )
        );

        -- Send async HTTP request via pg_net (non-blocking)
        PERFORM net.http_post(
            url := 'https://exp.host/--/api/v2/push/send',
            body := v_payload,
            headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Push notification delivery must never block database transactions
    RETURN NEW;
END;
$$;

-- ── 3. ATTACH TRIGGER TO notifications ───────────────────────────────────────
DROP TRIGGER IF EXISTS trg_notifications_expo_push ON public.notifications;
CREATE TRIGGER trg_notifications_expo_push
    AFTER INSERT ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.dispatch_expo_push_notification();
