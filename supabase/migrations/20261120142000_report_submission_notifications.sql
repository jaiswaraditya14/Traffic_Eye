-- =============================================================================
-- Migration: 20261120142000_report_submission_notifications.sql
-- Description:
--   1. Expand public.notifications type constraint to allow 'report_submitted' and 'new_report_pending'.
--   2. Create trigger on public.image_reports to automatically notify:
--      a) Citizen submitter: 'report_submitted' confirmation notification.
--      b) Traffic Officers: 'new_report_pending' review alert (jurisdiction-aware).
-- =============================================================================

-- ── 1. EXPAND NOTIFICATION TYPE CONSTRAINT ──────────────────────────────────
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
        'report_approved', 'report_rejected', 'points_earned', 'system',
        'report_submitted', 'report_pending', 'new_report_pending',
        'traffic_alert', 'safety_update', 'fine_update', 'emergency'
    ));

-- ── 2. TRIGGER FUNCTION: on_image_report_submitted ─────────────────────────
CREATE OR REPLACE FUNCTION public.on_image_report_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_officer_count INTEGER := 0;
BEGIN
    -- 1. Notify the citizen submitter
    IF NEW.user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, body, type, reference_id)
        VALUES (
            NEW.user_id,
            'Report Submitted 📋',
            'Your report for ' || COALESCE(NEW.vehicle_number, 'the reported incident') || ' has been received and is awaiting officer review.',
            'report_submitted',
            NEW.id
        );
    END IF;

    -- 2. Notify active traffic officers (only when report is in pending status)
    IF NEW.status = 'pending' THEN
        -- Check if any officer has a matching jurisdiction configured
        IF NEW.location_address IS NOT NULL AND TRIM(NEW.location_address) != '' THEN
            SELECT COUNT(*) INTO v_officer_count
            FROM public.profiles p
            WHERE p.role = 'officer'
              AND (NEW.user_id IS NULL OR p.id != NEW.user_id)
              AND p.jurisdiction IS NOT NULL
              AND TRIM(p.jurisdiction) != ''
              AND NEW.location_address ILIKE '%' || TRIM(p.jurisdiction) || '%';
        END IF;

        IF v_officer_count > 0 THEN
            -- Notify matching jurisdiction officers + officers with general (null) jurisdiction
            INSERT INTO public.notifications (user_id, title, body, type, reference_id)
            SELECT 
                p.id,
                'New Violation Report 🚨',
                'Report #' || UPPER(LEFT(NEW.id::text, 8)) || ' submitted' || 
                CASE WHEN NEW.location_address IS NOT NULL THEN ' near ' || LEFT(NEW.location_address, 45) ELSE '' END || 
                ' (' || COALESCE(NEW.violation_type, 'Traffic Violation') || ').',
                'new_report_pending',
                NEW.id
            FROM public.profiles p
            WHERE p.role = 'officer'
              AND (NEW.user_id IS NULL OR p.id != NEW.user_id)
              AND (
                  p.jurisdiction IS NULL
                  OR TRIM(p.jurisdiction) = ''
                  OR (NEW.location_address IS NOT NULL AND NEW.location_address ILIKE '%' || TRIM(p.jurisdiction) || '%')
              );
        ELSE
            -- No specific jurisdiction match: notify all officers
            INSERT INTO public.notifications (user_id, title, body, type, reference_id)
            SELECT 
                p.id,
                'New Violation Report 🚨',
                'Report #' || UPPER(LEFT(NEW.id::text, 8)) || ' submitted' || 
                CASE WHEN NEW.location_address IS NOT NULL THEN ' near ' || LEFT(NEW.location_address, 45) ELSE '' END || 
                ' (' || COALESCE(NEW.violation_type, 'Traffic Violation') || ').',
                'new_report_pending',
                NEW.id
            FROM public.profiles p
            WHERE p.role = 'officer'
              AND (NEW.user_id IS NULL OR p.id != NEW.user_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ── 3. ATTACH TRIGGER TO image_reports ──────────────────────────────────────
DROP TRIGGER IF EXISTS trg_image_reports_submitted_notification ON public.image_reports;
CREATE TRIGGER trg_image_reports_submitted_notification
    AFTER INSERT ON public.image_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.on_image_report_submitted();
