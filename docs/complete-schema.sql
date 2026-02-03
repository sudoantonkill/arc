-- ================================================================
-- INTERVIEW ACE - COMPLETE DATABASE SCHEMA
-- ================================================================
-- Run this ONCE in your Supabase SQL Editor
-- This combines phase1 + phase2 into a single file
-- ================================================================

-- ============ CLEANUP (if re-running) ============
-- Uncomment these lines if you want to drop existing tables first:
-- DROP TABLE IF EXISTS public.interviewer_reviews CASCADE;
-- DROP TABLE IF EXISTS public.notifications CASCADE;
-- DROP TABLE IF EXISTS public.platform_settings CASCADE;
-- DROP TABLE IF EXISTS public.wallet_transactions CASCADE;
-- DROP TABLE IF EXISTS public.wallets CASCADE;
-- DROP TABLE IF EXISTS public.interview_feedback CASCADE;
-- DROP TABLE IF EXISTS public.bookings CASCADE;
-- DROP TABLE IF EXISTS public.availability_slots CASCADE;
-- DROP TABLE IF EXISTS public.interviewer_profiles CASCADE;
-- DROP TABLE IF EXISTS public.student_profiles CASCADE;
-- DROP TABLE IF EXISTS public.admin_allowlist CASCADE;
-- DROP TABLE IF EXISTS public.user_roles CASCADE;
-- DROP TYPE IF EXISTS public.app_role CASCADE;

-- ================================================================
-- PHASE 1: CORE TABLES (Roles, Profiles)
-- ================================================================

-- 1) ENUM: User roles
CREATE TYPE public.app_role AS ENUM ('admin', 'student', 'interviewer');

-- 2) USER ROLES TABLE
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)  -- Single role per user
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3) Helper function to check roles (avoids recursion in RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4) RLS: Users can read own roles
CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ============ ADMIN BOOTSTRAP ============

CREATE TABLE public.admin_allowlist (
  email TEXT PRIMARY KEY
);

ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.bootstrap_admin()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  SELECT raw_user_meta_data->>'email'
  INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF NOT EXISTS (SELECT 1 FROM public.admin_allowlist WHERE email = v_user_email) THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
END;
$$;

-- ============ SET ROLE RPC ============

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

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), v_role)
  ON CONFLICT (user_id) DO UPDATE SET role = v_role;
END;
$$;

-- ============ STUDENT PROFILES ============

CREATE TABLE public.student_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  education TEXT,
  target_companies TEXT[] NOT NULL DEFAULT '{}',
  interview_types TEXT[] NOT NULL DEFAULT '{}',
  timezone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student can read own profile"
ON public.student_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Student can upsert own profile"
ON public.student_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Student can update own profile"
ON public.student_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can read all student profiles"
ON public.student_profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============ INTERVIEWER PROFILES ============

CREATE TABLE public.interviewer_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_background TEXT,
  years_experience INT,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT,
  hourly_rate_cents INT,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  timezone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.interviewer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Interviewer can read own profile"
ON public.interviewer_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Interviewer can upsert own profile"
ON public.interviewer_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Interviewer can update own profile"
ON public.interviewer_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can read all interviewer profiles"
ON public.interviewer_profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Students can view approved interviewers
CREATE POLICY "Students can view approved interviewers"
ON public.interviewer_profiles
FOR SELECT
TO authenticated
USING (verification_status = 'approved');

-- Admin can update interviewer profiles (for verification)
CREATE POLICY "Admin can update interviewer profiles"
ON public.interviewer_profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ================================================================
-- PHASE 2: INTERVIEW PLATFORM FEATURES
-- ================================================================

-- ============ AVAILABILITY SLOTS ============

CREATE TABLE public.availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Interviewer can manage own availability"
ON public.availability_slots
FOR ALL
TO authenticated
USING (interviewer_id = auth.uid())
WITH CHECK (interviewer_id = auth.uid());

CREATE POLICY "Students can view approved interviewer availability"
ON public.availability_slots
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.interviewer_profiles ip
    WHERE ip.user_id = availability_slots.interviewer_id
    AND ip.verification_status = 'approved'
  )
);

-- ============ BOOKINGS ============

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  interviewer_id UUID REFERENCES auth.users(id) NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 60 CHECK (duration_minutes > 0 AND duration_minutes <= 180),
  interview_type TEXT NOT NULL,
  target_company TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  meeting_link TEXT,
  meeting_room_id TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  total_amount_cents INT NOT NULL DEFAULT 0 CHECK (total_amount_cents >= 0),
  platform_fee_cents INT NOT NULL DEFAULT 0 CHECK (platform_fee_cents >= 0),
  interviewer_amount_cents INT NOT NULL DEFAULT 0 CHECK (interviewer_amount_cents >= 0),
  stripe_payment_intent_id TEXT,
  stripe_refund_id TEXT,
  student_notes TEXT,
  cancelled_by TEXT CHECK (cancelled_by IN ('student', 'interviewer', 'admin', NULL)),
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_student ON public.bookings(student_id);
CREATE INDEX idx_bookings_interviewer ON public.bookings(interviewer_id);
CREATE INDEX idx_bookings_scheduled ON public.bookings(scheduled_at);
CREATE INDEX idx_bookings_status ON public.bookings(status);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Students can create bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Interviewers can view assigned bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (interviewer_id = auth.uid());

CREATE POLICY "Interviewers can update assigned bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (interviewer_id = auth.uid())
WITH CHECK (interviewer_id = auth.uid());

CREATE POLICY "Admin can view all bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============ INTERVIEW FEEDBACK ============

CREATE TABLE public.interview_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  technical_rating INT CHECK (technical_rating BETWEEN 1 AND 5),
  problem_solving_rating INT CHECK (problem_solving_rating BETWEEN 1 AND 5),
  communication_rating INT CHECK (communication_rating BETWEEN 1 AND 5),
  soft_skills_rating INT CHECK (soft_skills_rating BETWEEN 1 AND 5),
  confidence_rating INT CHECK (confidence_rating BETWEEN 1 AND 5),
  body_language_rating INT CHECK (body_language_rating BETWEEN 1 AND 5),
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  improvement_roadmap TEXT,
  interviewer_notes TEXT,
  recommended_resources JSONB DEFAULT '[]',
  ai_summary TEXT,
  ai_confidence_analysis TEXT,
  ai_improvement_suggestions JSONB,
  overall_rating INT CHECK (overall_rating BETWEEN 1 AND 5),
  would_hire BOOLEAN,
  hire_level TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.interview_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Interviewer can manage feedback for their bookings"
ON public.interview_feedback
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = interview_feedback.booking_id
    AND b.interviewer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = interview_feedback.booking_id
    AND b.interviewer_id = auth.uid()
  )
);

CREATE POLICY "Students can view own published feedback"
ON public.interview_feedback
FOR SELECT
TO authenticated
USING (
  is_published = true AND
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = interview_feedback.booking_id
    AND b.student_id = auth.uid()
  )
);

CREATE POLICY "Admin can view all feedback"
ON public.interview_feedback
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============ WALLETS ============

CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance_cents INT DEFAULT 0 CHECK (balance_cents >= 0),
  pending_cents INT DEFAULT 0 CHECK (pending_cents >= 0),
  total_earned_cents INT DEFAULT 0 CHECK (total_earned_cents >= 0),
  total_withdrawn_cents INT DEFAULT 0 CHECK (total_withdrawn_cents >= 0),
  payout_method TEXT DEFAULT 'manual',
  payout_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
ON public.wallets
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admin can view all wallets"
ON public.wallets
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============ WALLET TRANSACTIONS ============

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'payout', 'refund', 'adjustment')),
  amount_cents INT NOT NULL,
  balance_after_cents INT NOT NULL,
  description TEXT,
  booking_id UUID REFERENCES public.bookings(id),
  payout_reference TEXT,
  payout_status TEXT CHECK (payout_status IN ('pending', 'processing', 'completed', 'failed', NULL)),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_transactions_wallet ON public.wallet_transactions(wallet_id);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet transactions"
ON public.wallet_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.wallets w
    WHERE w.id = wallet_transactions.wallet_id
    AND w.user_id = auth.uid()
  )
);

CREATE POLICY "Admin can view all transactions"
ON public.wallet_transactions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============ PLATFORM SETTINGS ============

CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can update platform settings"
ON public.platform_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('commission_percent', '50', 'Platform commission percentage'),
  ('min_booking_hours', '24', 'Minimum hours before interview for booking'),
  ('max_duration_minutes', '120', 'Maximum interview duration'),
  ('cancellation_policy_hours', '24', 'Hours before interview when cancellation is free'),
  ('interview_types', '["DSA", "System Design", "Behavioral", "Full-stack", "Machine Learning", "Frontend", "Backend", "DevOps", "Product Management"]', 'Available interview types'),
  ('target_companies', '["Google", "Microsoft", "Amazon", "Meta", "Apple", "OpenAI", "Netflix", "Uber", "Airbnb", "Stripe", "Coinbase", "Spotify"]', 'Target company options');

-- ============ NOTIFICATIONS ============

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- ============ INTERVIEWER REVIEWS ============

CREATE TABLE public.interviewer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  interviewer_id UUID REFERENCES auth.users(id) NOT NULL,
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_interviewer ON public.interviewer_reviews(interviewer_id);

ALTER TABLE public.interviewer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view visible reviews"
ON public.interviewer_reviews
FOR SELECT
TO authenticated
USING (is_visible = true);

CREATE POLICY "Students can create reviews for their completed bookings"
ON public.interviewer_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  student_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = interviewer_reviews.booking_id
    AND b.student_id = auth.uid()
    AND b.status = 'completed'
  )
);

-- ============ HELPER FUNCTIONS ============

CREATE OR REPLACE FUNCTION public.create_interviewer_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_interviewer_profile_created
  AFTER INSERT ON public.interviewer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_interviewer_wallet();

CREATE OR REPLACE FUNCTION public.get_interviewer_rating(p_interviewer_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(AVG(rating)::NUMERIC(3,2), 0)
  FROM public.interviewer_reviews
  WHERE interviewer_id = p_interviewer_id AND is_visible = true;
$$;

CREATE OR REPLACE FUNCTION public.get_interviewer_review_count(p_interviewer_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INT
  FROM public.interviewer_reviews
  WHERE interviewer_id = p_interviewer_id AND is_visible = true;
$$;

CREATE OR REPLACE FUNCTION public.credit_interviewer_wallet(
  p_booking_id UUID,
  p_amount_cents INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interviewer_id UUID;
  v_wallet_id UUID;
  v_new_balance INT;
BEGIN
  SELECT interviewer_id INTO v_interviewer_id
  FROM public.bookings
  WHERE id = p_booking_id;

  SELECT id INTO v_wallet_id
  FROM public.wallets
  WHERE user_id = v_interviewer_id;

  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (user_id, balance_cents, total_earned_cents)
    VALUES (v_interviewer_id, p_amount_cents, p_amount_cents)
    RETURNING id INTO v_wallet_id;
    v_new_balance := p_amount_cents;
  ELSE
    UPDATE public.wallets
    SET 
      balance_cents = balance_cents + p_amount_cents,
      total_earned_cents = total_earned_cents + p_amount_cents,
      updated_at = NOW()
    WHERE id = v_wallet_id
    RETURNING balance_cents INTO v_new_balance;
  END IF;

  INSERT INTO public.wallet_transactions (
    wallet_id, type, amount_cents, balance_after_cents, description, booking_id
  ) VALUES (
    v_wallet_id, 'credit', p_amount_cents, v_new_balance, 
    'Interview earnings', p_booking_id
  );
END;
$$;

-- ============ UPDATED_AT TRIGGERS ============

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_profiles_updated_at
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_interviewer_profiles_updated_at
  BEFORE UPDATE ON public.interviewer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON public.interview_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_availability_updated_at
  BEFORE UPDATE ON public.availability_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ================================================================
-- SETUP COMPLETE!
-- ================================================================
-- Tables created:
--   - user_roles (with app_role enum)
--   - admin_allowlist
--   - student_profiles
--   - interviewer_profiles
--   - availability_slots
--   - bookings
--   - interview_feedback
--   - wallets
--   - wallet_transactions
--   - platform_settings
--   - notifications
--   - interviewer_reviews
--
-- To set up an admin user, run:
--   INSERT INTO public.admin_allowlist (email) VALUES ('your-email@example.com');
-- Then sign up/in with that email.
-- ================================================================
