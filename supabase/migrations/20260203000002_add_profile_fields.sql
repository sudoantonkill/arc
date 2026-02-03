-- Migration: Add profile fields for interviewer and student profiles
-- Run this in Supabase SQL Editor

-- ============ INTERVIEWER PROFILES ============
ALTER TABLE public.interviewer_profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS github_url TEXT,
ADD COLUMN IF NOT EXISTS phone_country_code TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- ============ STUDENT PROFILES ============
ALTER TABLE public.student_profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS github_url TEXT,
ADD COLUMN IF NOT EXISTS phone_country_code TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- ============ ADMIN UPDATE POLICY FOR VERIFICATION ============
-- Ensure admin can update verification_status on interviewer profiles
-- (This may already exist, but adding IF NOT EXISTS equivalent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'interviewer_profiles' 
    AND policyname = 'Admin can update interviewer profiles'
  ) THEN
    CREATE POLICY "Admin can update interviewer profiles"
    ON public.interviewer_profiles
    FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
