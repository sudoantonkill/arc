-- Phase 2 Schema: Interview Platform Core Features
-- Run this in your Supabase SQL editor AFTER phase1 schema

-- ============ AVAILABILITY SLOTS ============
-- Interviewers can set their weekly availability

CREATE TABLE public.availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

-- Interviewers can manage their own slots
CREATE POLICY "Interviewer can manage own availability"
ON public.availability_slots
FOR ALL
TO authenticated
USING (interviewer_id = auth.uid())
WITH CHECK (interviewer_id = auth.uid());

-- Students can view approved interviewers' availability
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
-- Core booking table linking students and interviewers

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
  -- Payment fields
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  total_amount_cents INT NOT NULL CHECK (total_amount_cents >= 0),
  platform_fee_cents INT NOT NULL CHECK (platform_fee_cents >= 0),
  interviewer_amount_cents INT NOT NULL CHECK (interviewer_amount_cents >= 0),
  stripe_payment_intent_id TEXT,
  stripe_refund_id TEXT,
  -- Metadata
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

-- Students can view and manage their own bookings
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

-- Interviewers can view and update bookings where they're the interviewer
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

-- Admin can view all bookings
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
-- Detailed feedback from interviewer to student

CREATE TABLE public.interview_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  -- Rating categories (1-5 scale)
  technical_rating INT CHECK (technical_rating BETWEEN 1 AND 5),
  problem_solving_rating INT CHECK (problem_solving_rating BETWEEN 1 AND 5),
  communication_rating INT CHECK (communication_rating BETWEEN 1 AND 5),
  soft_skills_rating INT CHECK (soft_skills_rating BETWEEN 1 AND 5),
  confidence_rating INT CHECK (confidence_rating BETWEEN 1 AND 5),
  body_language_rating INT CHECK (body_language_rating BETWEEN 1 AND 5),
  -- Qualitative feedback
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  improvement_roadmap TEXT,
  interviewer_notes TEXT,
  -- Resources and recommendations
  recommended_resources JSONB DEFAULT '[]',
  -- AI-generated content (optional)
  ai_summary TEXT,
  ai_confidence_analysis TEXT,
  ai_improvement_suggestions JSONB,
  -- Overall
  overall_rating INT CHECK (overall_rating BETWEEN 1 AND 5),
  would_hire BOOLEAN,
  hire_level TEXT, -- e.g., 'junior', 'mid', 'senior', 'not_ready'
  -- Metadata
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.interview_feedback ENABLE ROW LEVEL SECURITY;

-- Interviewers can create and manage feedback for their bookings
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

-- Students can view published feedback for their bookings
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

-- Admin can view all feedback
CREATE POLICY "Admin can view all feedback"
ON public.interview_feedback
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============ WALLETS ============
-- Interviewer earnings wallet

CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance_cents INT DEFAULT 0 CHECK (balance_cents >= 0),
  pending_cents INT DEFAULT 0 CHECK (pending_cents >= 0),
  total_earned_cents INT DEFAULT 0 CHECK (total_earned_cents >= 0),
  total_withdrawn_cents INT DEFAULT 0 CHECK (total_withdrawn_cents >= 0),
  -- Payout settings
  payout_method TEXT DEFAULT 'manual',
  payout_details JSONB DEFAULT '{}',
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Users can view their own wallet
CREATE POLICY "Users can view own wallet"
ON public.wallets
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admin can view all wallets
CREATE POLICY "Admin can view all wallets"
ON public.wallets
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============ WALLET TRANSACTIONS ============
-- Transaction history for wallets

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'payout', 'refund', 'adjustment')),
  amount_cents INT NOT NULL,
  balance_after_cents INT NOT NULL,
  description TEXT,
  booking_id UUID REFERENCES public.bookings(id),
  -- Payout specific
  payout_reference TEXT,
  payout_status TEXT CHECK (payout_status IN ('pending', 'processing', 'completed', 'failed', NULL)),
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_transactions_wallet ON public.wallet_transactions(wallet_id);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
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

-- Admin can view all transactions
CREATE POLICY "Admin can view all transactions"
ON public.wallet_transactions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============ PLATFORM SETTINGS ============
-- Global platform configuration

CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read platform settings
CREATE POLICY "Anyone can read platform settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (true);

-- Only admin can update
CREATE POLICY "Admin can update platform settings"
ON public.platform_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('commission_percent', '50', 'Platform commission percentage'),
  ('min_booking_hours', '24', 'Minimum hours before interview for booking'),
  ('max_duration_minutes', '120', 'Maximum interview duration'),
  ('cancellation_policy_hours', '24', 'Hours before interview when cancellation is free'),
  ('interview_types', '["DSA", "System Design", "Behavioral", "Full-stack", "Machine Learning", "Frontend", "Backend", "DevOps", "Product Management"]', 'Available interview types'),
  ('target_companies', '["Google", "Microsoft", "Amazon", "Meta", "Apple", "OpenAI", "Netflix", "Uber", "Airbnb", "Stripe", "Coinbase", "Spotify"]', 'Target company options');

-- ============ NOTIFICATIONS ============
-- In-app notifications

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

-- ============ REVIEWS ============
-- Student reviews for interviewers (public)

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

-- Anyone can view visible reviews
CREATE POLICY "Anyone can view visible reviews"
ON public.interviewer_reviews
FOR SELECT
TO authenticated
USING (is_visible = true);

-- Students can create reviews for completed bookings
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

-- Function to auto-create wallet when interviewer profile is created
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

-- Function to calculate interviewer average rating
CREATE OR REPLACE FUNCTION public.get_interviewer_rating(p_interviewer_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(AVG(rating)::NUMERIC(3,2), 0)
  FROM public.interviewer_reviews
  WHERE interviewer_id = p_interviewer_id AND is_visible = true;
$$;

-- Function to get interviewer review count
CREATE OR REPLACE FUNCTION public.get_interviewer_review_count(p_interviewer_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INT
  FROM public.interviewer_reviews
  WHERE interviewer_id = p_interviewer_id AND is_visible = true;
$$;

-- Function to credit interviewer wallet after completed interview
CREATE OR REPLACE FUNCTION public.credit_interviewer_wallet(
  p_booking_id UUID,
  p_amount_cents INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interviewer_id UUID;
  v_wallet_id UUID;
  v_new_balance INT;
BEGIN
  -- Get interviewer from booking
  SELECT interviewer_id INTO v_interviewer_id
  FROM public.bookings
  WHERE id = p_booking_id;

  -- Get or create wallet
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

  -- Record transaction
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

-- ============ DONE! ============
-- Run this after phase1-schema.sql
-- Tables created:
--   - availability_slots
--   - bookings
--   - interview_feedback
--   - wallets
--   - wallet_transactions
--   - platform_settings
--   - notifications
--   - interviewer_reviews
