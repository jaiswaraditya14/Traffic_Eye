CREATE OR REPLACE FUNCTION check_image_duplicate(p_hash TEXT)
RETURNS TABLE (
    is_duplicate BOOLEAN,
    existing_report_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_hash IS NULL OR trim(p_hash) = '' THEN
        RETURN QUERY SELECT FALSE, NULL::UUID;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT TRUE, id
    FROM image_reports
    WHERE image_hash = p_hash
      AND status != 'rejected'
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION check_image_duplicate(TEXT) TO authenticated, anon;
