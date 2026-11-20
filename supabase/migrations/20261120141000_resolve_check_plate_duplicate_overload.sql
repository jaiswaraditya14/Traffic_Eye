-- Drop the legacy overloaded check_plate_duplicate with location parameters to resolve PostgREST ambiguity (PGRST203)
DROP FUNCTION IF EXISTS public.check_plate_duplicate(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS public.check_plate_duplicate(TEXT, NUMERIC, NUMERIC, TEXT, NUMERIC);

-- Ensure single canonical definition
CREATE OR REPLACE FUNCTION public.check_plate_duplicate(p_vehicle_number TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing RECORD;
BEGIN
    IF p_vehicle_number IS NULL OR length(trim(p_vehicle_number)) < 4 THEN
        RETURN jsonb_build_object('is_duplicate', false, 'existing_report_id', null, 'previous_submitted_at', null);
    END IF;

    SELECT id, submitted_at INTO v_existing
    FROM public.image_reports
    WHERE vehicle_number = upper(trim(p_vehicle_number))
      AND status != 'rejected'
      AND submitted_at >= now() - interval '24 hours'
    ORDER BY submitted_at DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'is_duplicate', true,
            'existing_report_id', v_existing.id::text,
            'previous_submitted_at', v_existing.submitted_at
        );
    END IF;

    RETURN jsonb_build_object('is_duplicate', false, 'existing_report_id', null, 'previous_submitted_at', null);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_plate_duplicate(TEXT) TO authenticated, anon;
