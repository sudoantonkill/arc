-- Phase 1 schema for external Supabase: role-based dashboards, single admin, email allowlist
-- Run in your Supabase SQL editor.

-- ============ ROLES (single role per user, email-allowlist admin) ============

create type public.app_role as enum ('admin', 'student', 'interviewer');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id)  -- SINGLE ROLE per user (changed from multi-role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

create policy "Users can read own roles"
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());

-- ============ ADMIN BOOTSTRAP (email allowlist) ============

create table public.admin_allowlist (
  email text primary key
);

alter table public.admin_allowlist enable row level security;

-- No RLS policies; only direct SQL can manage this table.
-- Insert your admin emails via Supabase SQL editor:
-- INSERT INTO public.admin_allowlist (email) VALUES ('admin@example.com');

create or replace function public.bootstrap_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_email text;
begin
  if auth.uid() is null then
    return;
  end if;

  -- 1) Get the calling user's email
  select raw_user_meta_data->>'email'
  into v_user_email
  from auth.users
  where id = auth.uid();

  -- 2) If email not in allowlist, exit
  if not exists (select 1 from public.admin_allowlist where email = v_user_email) then
    return;
  end if;

  -- 3) If any admin already exists, exit
  if exists (select 1 from public.user_roles where role = 'admin') then
    return;
  end if;

  -- 4) Grant admin role
  insert into public.user_roles (user_id, role)
  values (auth.uid(), 'admin')
  on conflict (user_id) do update set role = 'admin';
end;
$$;

-- ============ set_my_role RPC (prevents self-assigning admin; enforces single role) ============

create or replace function public.set_my_role(_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if _role not in ('student', 'interviewer') then
    raise exception 'Invalid role';
  end if;

  v_role := _role::public.app_role;

  insert into public.user_roles (user_id, role)
  values (auth.uid(), v_role)
  on conflict (user_id) do update set role = v_role;
end;
$$;

-- ============ PROFILES (student + interviewer dashboards) ============

create table public.student_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  education text,
  target_companies text[] not null default '{}',
  interview_types text[] not null default '{}',
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interviewer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_background text,
  years_experience int,
  specialties text[] not null default '{}',
  bio text,
  hourly_rate_cents int,
  verification_status text not null default 'pending',
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_profiles enable row level security;
alter table public.interviewer_profiles enable row level security;

create policy "Student can read own profile"
on public.student_profiles
for select
to authenticated
using (user_id = auth.uid());

create policy "Student can upsert own profile"
on public.student_profiles
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Student can update own profile"
on public.student_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Interviewer can read own profile"
on public.interviewer_profiles
for select
to authenticated
using (user_id = auth.uid());

create policy "Interviewer can upsert own profile"
on public.interviewer_profiles
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Interviewer can update own profile"
on public.interviewer_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Admin visibility example (use security definer helper; avoids recursion)
create policy "Admin can read all student profiles"
on public.student_profiles
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admin can read all interviewer profiles"
on public.interviewer_profiles
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- ============ DONE! ============
-- Next steps:
-- 1) Insert your admin email(s):
--    INSERT INTO public.admin_allowlist (email) VALUES ('admin@example.com');
-- 2) (Optional) Run first-time admin bootstrap manually for your own user:
--    SELECT public.bootstrap_admin();
-- 3) Now sign in with that email (OAuth or password); you'll get admin role automatically.
