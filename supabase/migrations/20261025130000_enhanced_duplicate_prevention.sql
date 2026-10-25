-- =============================================================================
-- Migration: 20261025130000_enhanced_duplicate_prevention.sql
-- Description:
--   Enhance check_plate_duplicate RPC with 4-point verification:
--   1. Vehicle plate matching (normalized)
--   2. Spatial proximity (Haversine formula within radius, default 100m)
--   3. Violation type matching
--   4. Rolling 24-hour time window (ignoring rejected reports)
-- =============================================================================

-- Performance index for rapid plate duplicate lookups
CREATE INDEX IF NOT EXISTS idx_image_reports_duplicate_lookup
    ON public.image_reports (vehicle_number, submitted_at DESC)
    WHERE status <> 'rejected';

-- Drop previous function signatures to avoid ambiguity
DROP FUNCTION IF EXISTS public.check_plate_duplicate(TEXT);
DROP FUNCTION IF EXISTS public.check_plate_duplicate(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION public.check_plate_duplicate(
    p_vehicle_number  TEXT,
    p_latitude        DOUBLE PRECISION DEFAULT NULL,
    p_longitude       DOUBLE PRECISION DEFAULT NULL,
    p_violation_type  TEXT             DEFAULT NULL,
    p_radius_meters   DOUBLE PRECISION DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_normalized TEXT;
    v_report     RECORD;
BEGIN
    IF p_vehicle_number IS NULL OR trim(p_vehicle_number) = '' THEN
        RETURN jsonb_build_object('is_duplicate', false, 'existing_report_id', NULL);
    END IF;

    -- Strip all whitespace and convert to uppercase
    v_normalized := upper(regexp_replace(trim(p_vehicle_number), '\s+', '', 'g'));

    -- Guard against short / placeholder plates
    IF length(v_normalized) < 4 OR v_normalized IN ('NOTDETECTED', 'NOTAPPLICABLE', 'N/A', 'PLATE_NOT_READABLE') THEN
        RETURN jsonb_build_object('is_duplicate', false, 'existing_report_id', NULL);
    END IF;

    SELECT
        id,
        submitted_at,
        violation_type,
        latitude,
        longitude,
        CASE
            WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL AND latitude IS NOT NULL AND longitude IS NOT NULL THEN
                -- Haversine formula in meters (Earth radius ~ 6,371,000 m)
                6371000 * 2 * asin(sqrt(
                    power(sin(radians(latitude - p_latitude) / 2), 2) +
                    cos(radians(p_latitude)) * cos(radians(latitude)) *
                    power(sin(radians(longitude - p_longitude) / 2), 2)
                ))
            ELSE NULL
        END AS distance_meters
    INTO v_report
    FROM public.image_reports
    WHERE vehicle_number = v_normalized
      AND status <> 'rejected'
      AND submitted_at >= now() - interval '24 hours'
      -- Violation matching: match if p_violation_type is provided
      AND (
          p_violation_type IS NULL
          OR trim(p_violation_type) = ''
          OR lower(trim(violation_type)) = lower(trim(p_violation_type))
      )
      -- Spatial radius matching: if both target and stored row have coordinates, enforce distance radius
      AND (
          p_latitude IS NULL
          OR p_longitude IS NULL
          OR latitude IS NULL
          OR longitude IS NULL
          OR (
              6371000 * 2 * asin(sqrt(
                  power(sin(radians(latitude - p_latitude) / 2), 2) +
                  cos(radians(p_latitude)) * cos(radians(latitude)) *
                  power(sin(radians(longitude - p_longitude) / 2), 2)
              )) <= COALESCE(p_radius_meters, 100)
          )
      )
    ORDER BY submitted_at DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'is_duplicate',       true,
            'existing_report_id', v_report.id::text,
            'submitted_at',       v_report.submitted_at,
            'violation_type',     v_report.violation_type,
            'distance_meters',    round(COALESCE(v_report.distance_meters, 0)::numeric, 1)
        );
    END IF;

    RETURN jsonb_build_object('is_duplicate', false, 'existing_report_id', NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.check_plate_duplicate(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_plate_duplicate(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION) TO authenticated, anon;
