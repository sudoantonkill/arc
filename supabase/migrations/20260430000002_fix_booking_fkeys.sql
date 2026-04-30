-- ================================================================
-- Fix Bookings Foreign Keys
-- The bookings table must reference the profile tables directly
-- so that Supabase/PostgREST can perform automatic joins.
-- ================================================================

DO $$ 
BEGIN 
    -- Add foreign keys to profiles so joins work in the frontend
    ALTER TABLE public.bookings 
    ADD CONSTRAINT bookings_student_profile_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
    ADD CONSTRAINT bookings_interviewer_profile_fkey FOREIGN KEY (interviewer_id) REFERENCES public.interviewer_profiles(user_id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
