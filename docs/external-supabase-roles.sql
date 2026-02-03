-- External Supabase: roles must be stored in a separate table (NOT profiles, NOT auth.users metadata)
-- Run this in your Supabase SQL editor.

-- 1) Enum for roles
create type public.app_role as enum ('admin', 'student', 'interviewer');

-- 2) Roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- 3) Security definer helper to avoid infinite recursion in RLS policies
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

-- 4) Allow users to read their own roles
create policy "Users can read own roles"
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());

-- 5) RPC to set a role for the current user (prevents self-assigning admin)
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

  -- Validate role input
  if _role not in ('student', 'interviewer') then
    raise exception 'Invalid role';
  end if;

  v_role := _role::public.app_role;

  insert into public.user_roles (user_id, role)
  values (auth.uid(), v_role)
  on conflict (user_id, role) do nothing;
end;
$$;

-- IMPORTANT: No insert/update/delete policies are added for user_roles.
-- Roles should be granted via the RPC above (student/interviewer) and by admins (admin) via server/admin tooling.
