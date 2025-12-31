-- Migration to rename "Main Calendar" to "Primary" and set orange color
-- This updates the default calendar for all events

BEGIN;

-- Update the name and color for default calendars
UPDATE calendars
SET 
  name = 'Primary',
  color = '#f97316'
WHERE is_default = true
  AND name = 'Main Calendar';

COMMIT;
