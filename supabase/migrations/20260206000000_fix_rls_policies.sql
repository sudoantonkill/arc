-- ================================================================
-- INTERVIEW ACE - SECURITY HARDENING
-- Fix overly permissive RLS policies
-- ================================================================

-- 1. FIX AVAILABILITY SLOTS RLS
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public availability" ON public.availability_slots;

-- Interviewers can manage their own slots
CREATE POLICY "Interviewers manage own slots"
  ON public.availability_slots
  FOR ALL
  USING (interviewer_id = auth.uid())
  WITH CHECK (interviewer_id = auth.uid());

-- Anyone can view active availability (for booking)
CREATE POLICY "Anyone can view active availability"
  ON public.availability_slots
  FOR SELECT
  USING (is_active = true);

-- 2. FIX INTERVIEW FEEDBACK RLS
DROP POLICY IF EXISTS "Public feedback" ON public.interview_feedback;

-- Interviewers can create/update feedback for their bookings
CREATE POLICY "Interviewers manage feedback"
  ON public.interview_feedback
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.interviewer_id = auth.uid()
    )
  );

-- Students can view published feedback for their bookings
CREATE POLICY "Students view own feedback"
  ON public.interview_feedback
  FOR SELECT
  USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.student_id = auth.uid()
    )
  );

-- 3. FIX CHAT MESSAGES RLS
DROP POLICY IF EXISTS "Chat access" ON public.chat_messages;

-- Participants can view messages in their bookings
CREATE POLICY "Participants view chat"
  ON public.chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id 
      AND (b.student_id = auth.uid() OR b.interviewer_id = auth.uid())
    )
  );

-- Participants can send messages in their bookings
CREATE POLICY "Participants send chat"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id 
      AND (b.student_id = auth.uid() OR b.interviewer_id = auth.uid())
    )
  );

-- 4. FIX CODE SESSIONS RLS
DROP POLICY IF EXISTS "Code session access" ON public.code_sessions;

-- Participants can view/update code sessions in their bookings
CREATE POLICY "Participants access code session"
  ON public.code_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id 
      AND (b.student_id = auth.uid() OR b.interviewer_id = auth.uid())
    )
  );

-- 5. FIX PLATFORM SETTINGS RLS
DROP POLICY IF EXISTS "Read settings" ON public.platform_settings;

-- Anyone can read settings
CREATE POLICY "Anyone read settings"
  ON public.platform_settings
  FOR SELECT
  USING (true);

-- Only admins can update settings (check via user_roles)
CREATE POLICY "Admins update settings"
  ON public.platform_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- 6. ADD ADMIN CHECK FUNCTION
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- 7. BOOKINGS RLS (ensure proper access)
-- Drop and recreate with proper checks
DROP POLICY IF EXISTS "Users view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Students create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Participants update bookings" ON public.bookings;

-- Students and interviewers can view their own bookings
CREATE POLICY "Users view own bookings"
  ON public.bookings
  FOR SELECT
  USING (
    student_id = auth.uid() OR 
    interviewer_id = auth.uid() OR
    public.is_admin()
  );

-- Students can create bookings
CREATE POLICY "Students create bookings"
  ON public.bookings
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Participants can update their bookings
CREATE POLICY "Participants update bookings"
  ON public.bookings
  FOR UPDATE
  USING (
    student_id = auth.uid() OR 
    interviewer_id = auth.uid() OR
    public.is_admin()
  );
