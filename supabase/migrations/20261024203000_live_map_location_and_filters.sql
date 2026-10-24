-- =============================================================================
-- Migration: 20261024203000_live_map_location_and_filters.sql
-- Description:
--   1. Backfill existing image_reports missing coordinates.
--   2. Update get_approved_heatmap_points to remove coordinate jitter,
--      include status & location_source, and support multi-dimensional filtering
--      (statuses, severities, violation types, area/pincode, date).
--   3. Add performance indexes for map query filters.
-- =============================================================================

-- ── 1. ENSURE COLUMNS & BACKFILL EXISTING ROWS ──────────────────────────────
ALTER TABLE public.image_reports ADD COLUMN IF NOT EXISTS location_source TEXT;

-- Backfill known pincodes if lat/lng is missing
UPDATE public.image_reports
SET latitude = 19.0833, longitude = 72.8530, location_source = 'pincode_approx'
WHERE (latitude IS NULL OR longitude IS NULL) AND location_address ILIKE '%400055%';

UPDATE public.image_reports
SET latitude = 19.0622, longitude = 72.8997, location_source = 'pincode_approx'
WHERE (latitude IS NULL OR longitude IS NULL) AND location_address ILIKE '%400074%';

-- Catch-all backfill for any other legacy reports without coords
UPDATE public.image_reports
SET latitude = 19.0760, longitude = 72.8777, location_source = 'pincode_approx'
WHERE latitude IS NULL OR longitude IS NULL;


-- ── 2. CREATE INDEXES FOR MAP FILTERING PERFORMANCE ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_image_reports_map_filter
    ON public.image_reports (status, severity, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_image_reports_coords
    ON public.image_reports (latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;


-- ── 3. REPLACE get_approved_heatmap_points FUNCTION ─────────────────────────
DROP FUNCTION IF EXISTS public.get_approved_heatmap_points(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);
DROP FUNCTION IF EXISTS public.get_approved_heatmap_points(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, TEXT[], TEXT[], TEXT[], TEXT);

CREATE OR REPLACE FUNCTION public.get_approved_heatmap_points(
    p_min_lat         DOUBLE PRECISION DEFAULT NULL,
    p_max_lat         DOUBLE PRECISION DEFAULT NULL,
    p_min_lng         DOUBLE PRECISION DEFAULT NULL,
    p_max_lng         DOUBLE PRECISION DEFAULT NULL,
    p_days_back       INTEGER          DEFAULT 3650,
    p_statuses        TEXT[]           DEFAULT NULL,
    p_severities      TEXT[]           DEFAULT NULL,
    p_violation_types TEXT[]           DEFAULT NULL,
    p_search_area     TEXT             DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_address TEXT,
    violation_type TEXT,
    severity TEXT,
    status TEXT,
    location_source TEXT,
    reviewed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    weight INTEGER,
    officer_name TEXT,
    officer_badge TEXT,
    officer_jurisdiction TEXT,
    image_url TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_cutoff TIMESTAMPTZ;
BEGIN
    IF p_days_back IS NOT NULL AND p_days_back > 0 THEN
        v_cutoff := now() - (p_days_back || ' days')::INTERVAL;
    ELSE
        v_cutoff := '1970-01-01'::TIMESTAMPTZ;
    END IF;

    RETURN QUERY
    SELECT
        r.id,
        r.latitude,     -- EXACT coordinates, NO random jitter
        r.longitude,    -- EXACT coordinates, NO random jitter
        r.location_address,
        r.violation_type,
        r.severity,
        r.status,
        COALESCE(r.location_source, 'device_gps') AS location_source,
        r.reviewed_at,
        r.submitted_at,
        CASE LOWER(COALESCE(r.severity, 'low'))
            WHEN 'critical' THEN 4
            WHEN 'high'     THEN 3
            WHEN 'medium'   THEN 2
            ELSE                 1
        END::INTEGER AS weight,
        ov.officer_name,
        ov.officer_badge,
        ov.officer_jurisdiction,
        r.image_url
    FROM public.image_reports r
    LEFT JOIN LATERAL (
        SELECT
            p.full_name    AS officer_name,
            p.badge_id     AS officer_badge,
            p.jurisdiction AS officer_jurisdiction
        FROM public.officer_reviews o
        JOIN public.profiles p ON p.id = o.officer_id
        WHERE o.report_id = r.id
        LIMIT 1
    ) ov ON true
    WHERE
        r.latitude IS NOT NULL
        AND r.longitude IS NOT NULL
        AND (r.submitted_at >= v_cutoff OR r.reviewed_at >= v_cutoff)
        -- Multi-status filter (supports approved, pending, rejected)
        AND (p_statuses IS NULL OR cardinality(p_statuses) = 0 OR r.status = ANY(p_statuses))
        -- Severity filter
        AND (p_severities IS NULL OR cardinality(p_severities) = 0 OR LOWER(r.severity) = ANY(p_severities))
        -- Violation type filter
        AND (p_violation_types IS NULL OR cardinality(p_violation_types) = 0 OR r.violation_type = ANY(p_violation_types))
        -- Optional area / pincode filter
        AND (
            p_search_area IS NULL
            OR trim(p_search_area) = ''
            OR r.location_address ILIKE ('%' || trim(p_search_area) || '%')
        )
        -- Bounding box filter (if active)
        AND (
            (p_min_lat IS NULL OR p_max_lat IS NULL OR p_min_lng IS NULL OR p_max_lng IS NULL)
            OR (
                r.latitude BETWEEN p_min_lat AND p_max_lat
                AND r.longitude BETWEEN p_min_lng AND p_max_lng
            )
        )
    ORDER BY COALESCE(r.reviewed_at, r.submitted_at) DESC
    LIMIT 600;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_approved_heatmap_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_approved_heatmap_points TO anon;
