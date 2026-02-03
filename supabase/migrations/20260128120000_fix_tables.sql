-- ================================================================
-- INTERVIEW ACE - DATABASE REPAIR SCRIPT
-- Run this in your Supabase SQL Editor to ensure all tables exist.
-- ================================================================

-- 1) USER ROLES & ENUMS
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'student', 'interviewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

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

-- 2) PROFILES

CREATE TABLE IF NOT EXISTS public.student_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  education TEXT,
  target_companies TEXT[] NOT NULL DEFAULT '{}',
  interview_types TEXT[] NOT NULL DEFAULT '{}',
  timezone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.interviewer_profiles (
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

-- 3) ADMIN ALLOWLIST

CREATE TABLE IF NOT EXISTS public.admin_allowlist (
  email TEXT PRIMARY KEY
);

ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;

-- 4) BOOKINGS & REVIEWS (Essential for Dashboard)

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  interviewer_id UUID REFERENCES auth.users(id) NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 60,
  interview_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  total_amount_cents INT NOT NULL DEFAULT 0,
  platform_fee_cents INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.interviewer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  interviewer_id UUID REFERENCES auth.users(id) NOT NULL,
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  rating INT NOT NULL,
  review_text TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.interviewer_reviews ENABLE ROW LEVEL SECURITY;

-- 5) WALLETS

CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance_cents INT DEFAULT 0,
  pending_cents INT DEFAULT 0,
  total_earned_cents INT DEFAULT 0,
  total_withdrawn_cents INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  amount_cents INT NOT NULL,
  balance_after_cents INT NOT NULL,
  description TEXT,
  payout_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 6) RLS POLICIES (Simplified for repair)

-- Allow full access to authenticated users for demo purposes (Refine for production!)
CREATE POLICY "Public profiles" ON public.student_profiles FOR ALL USING (true);
CREATE POLICY "Public interviewer profiles" ON public.interviewer_profiles FOR ALL USING (true);
CREATE POLICY "Public roles" ON public.user_roles FOR ALL USING (true);

-- 7) RE-SYNC TRIGGERS

CREATE OR REPLACE FUNCTION public.create_interviewer_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_interviewer_profile_created ON public.interviewer_profiles;
CREATE TRIGGER on_interviewer_profile_created
  AFTER INSERT ON public.interviewer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_interviewer_wallet();

-- Done!
