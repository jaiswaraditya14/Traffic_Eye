-- ═══════════════════════════════════════════════════════════════════════════════
-- TRAFFIC EYE — HEATMAP RPC & RLS MIGRATION  (v5 – fix r.created_at column error)
-- Run this in: Supabase Dashboard > SQL Editor > New Query > Run
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. RLS POLICY for Approved Map Reports ────────────────────────────────────
-- Allows all authenticated users (citizens & officers) to view approved reports
DROP POLICY IF EXISTS "Anyone can view approved image reports" ON public.image_reports;
CREATE POLICY "Anyone can view approved image reports"
    ON public.image_reports FOR SELECT
    USING (status = 'approved');

-- ── 2. COMPOSITE INDEX for heatmap spatial queries ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_image_reports_heatmap
    ON public.image_reports (status, reviewed_at DESC)
    WHERE status = 'approved';

-- ── 3. RPC — get_approved_heatmap_points ─────────────────────────────────────
-- Returns anonymized heatmap data for approved reports.
-- Accessible to all authenticated users for the public live map.
-- Shows: violation type, severity, date, approx location, officer name, station
-- Evidence/violation image_url is returned (NOT officer profile photo).

-- Drop any existing overloads to avoid return-type mismatch
DROP FUNCTION IF EXISTS public.get_approved_heatmap_points(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);
DROP FUNCTION IF EXISTS public.get_approved_heatmap_points;

CREATE OR REPLACE FUNCTION public.get_approved_heatmap_points(
    p_min_lat    DOUBLE PRECISION DEFAULT NULL,
    p_max_lat    DOUBLE PRECISION DEFAULT NULL,
    p_min_lng    DOUBLE PRECISION DEFAULT NULL,
    p_max_lng    DOUBLE PRECISION DEFAULT NULL,
    p_days_back  INTEGER          DEFAULT 365
)
RETURNS TABLE (
    id                   UUID,
    latitude             DOUBLE PRECISION,
    longitude            DOUBLE PRECISION,
    location_address     TEXT,
    violation_type       TEXT,
    severity             TEXT,
    reviewed_at          TIMESTAMPTZ,
    submitted_at         TIMESTAMPTZ,
    weight               INTEGER,
    officer_name         TEXT,
    officer_badge        TEXT,
    officer_jurisdiction TEXT,
    image_url            TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cutoff TIMESTAMPTZ;
BEGIN
    v_cutoff := now() - (p_days_back || ' days')::INTERVAL;

    RETURN QUERY
    SELECT
        r.id,
        -- Apply ~30 m jitter to anonymize exact location
        CASE WHEN r.latitude  IS NOT NULL THEN r.latitude  + (random() - 0.5) * 0.0003 ELSE NULL END AS latitude,
        CASE WHEN r.longitude IS NOT NULL THEN r.longitude + (random() - 0.5) * 0.0003 ELSE NULL END AS longitude,
        r.location_address,
        r.violation_type,
        r.severity,
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
        r.image_url         -- violation evidence photo (NOT officer profile photo)
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
        r.status = 'approved'
        AND COALESCE(r.reviewed_at, r.submitted_at) >= v_cutoff
        AND (
            p_min_lat IS NULL OR p_max_lat IS NULL OR p_min_lng IS NULL OR p_max_lng IS NULL
            OR r.latitude IS NULL
            OR (
                r.latitude  BETWEEN p_min_lat AND p_max_lat
                AND r.longitude BETWEEN p_min_lng AND p_max_lng
            )
        )
    ORDER BY COALESCE(r.reviewed_at, r.submitted_at) DESC
    LIMIT 500;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_approved_heatmap_points TO authenticated;

