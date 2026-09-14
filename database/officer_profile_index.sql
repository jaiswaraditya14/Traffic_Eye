-- Check officers
SELECT badge_id, jurisdiction, full_name 
FROM profiles WHERE role = 'officer';

-- Check indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename = 'image_reports' 
  AND indexname LIKE '%location%';
