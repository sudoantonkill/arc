-- ================================================================
-- Add proposed_times for mutual scheduling
-- ================================================================

-- Add proposed_times column (array of proposed time options from student)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS proposed_times JSONB DEFAULT '[]';

-- Add meet_link column for Daily.co / video call links
-- (meeting_link already exists but let's ensure it's there)
-- meeting_link is already in the schema, no change needed

-- Comment for clarity
COMMENT ON COLUMN public.bookings.proposed_times IS 'Array of {date, time} objects proposed by student for mutual scheduling';
