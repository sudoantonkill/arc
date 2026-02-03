-- ================================================================
-- INTERVIEW ACE - SYNC SCHEMA SCRIPT
-- Aligning DB with src/types/database.ts
-- ================================================================

-- 0. UPDATED FUNCTION (Handle Profile Creation on Role Set)
CREATE OR REPLACE FUNCTION public.set_my_role(_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _role NOT IN ('student', 'interviewer') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  v_role := _role::public.app_role;

  -- Set role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), v_role)
  ON CONFLICT (user_id) DO UPDATE SET role = v_role;

  -- Create profile
  IF v_role = 'student' THEN
    INSERT INTO public.student_profiles (user_id)
      VALUES (auth.uid())
      ON CONFLICT (user_id) DO NOTHING;
  ELSIF v_role = 'interviewer' THEN
    -- For demo: auto-approve interviewers so students can see them
    INSERT INTO public.interviewer_profiles (user_id, verification_status)
      VALUES (auth.uid(), 'approved')
      ON CONFLICT (user_id) DO NOTHING;
    -- Wallet creation is handled by trigger on interviewer_profiles (see fix_tables.sql)
  END IF;
END;
$$;

-- 1. AVAILABILITY SLOTS
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interviewer_id UUID REFERENCES public.interviewer_profiles(user_id) ON DELETE CASCADE NOT NULL,
  day_of_week INT NOT NULL, -- 0 = Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public availability" ON public.availability_slots FOR ALL USING (true); -- For demo

-- 2. UPDATE BOOKINGS TABLE (Add missing columns)
DO $$ BEGIN
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS target_company TEXT;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS meeting_link TEXT;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS meeting_room_id TEXT;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS interviewer_amount_cents INT DEFAULT 0;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS student_notes TEXT;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 3. INTERVIEW FEEDBACK (The Rubric)
CREATE TABLE IF NOT EXISTS public.interview_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  technical_rating INT,
  problem_solving_rating INT,
  communication_rating INT,
  soft_skills_rating INT,
  confidence_rating INT,
  body_language_rating INT,
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  improvement_roadmap TEXT,
  interviewer_notes TEXT,
  recommended_resources JSONB DEFAULT '[]'::jsonb, -- Array of objects
  ai_summary TEXT,
  ai_confidence_analysis TEXT,
  ai_improvement_suggestions JSONB DEFAULT '[]'::jsonb,
  overall_rating INT,
  would_hire BOOLEAN,
  hire_level TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.interview_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public feedback" ON public.interview_feedback FOR ALL USING (true);

-- 4. CHAT MESSAGES (Real-time Chat)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text', -- 'text' or 'code'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chat access" ON public.chat_messages FOR ALL USING (true);

-- 5. CODE SESSIONS (Shared Editor State)
CREATE TABLE IF NOT EXISTS public.code_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  code TEXT DEFAULT '',
  language TEXT DEFAULT 'javascript',
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.code_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Code session access" ON public.code_sessions FOR ALL USING (true);

-- 6. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "My notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

-- 7. PLATFORM SETTINGS
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read settings" ON public.platform_settings FOR SELECT USING (true);

-- 8. Enable Realtime for Chat and Code
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.code_sessions;
