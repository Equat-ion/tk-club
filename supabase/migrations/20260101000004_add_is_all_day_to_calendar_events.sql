-- Add is_all_day column to calendar_events table
ALTER TABLE calendar_events
ADD COLUMN is_all_day BOOLEAN NOT NULL DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN calendar_events.is_all_day IS 'Indicates if the event is an all-day event (no specific time slots)';
