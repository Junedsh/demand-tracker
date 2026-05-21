-- =============================================================
-- DEMAND TRACKER — Supabase Setup SQL
-- Run this entire file in your Supabase SQL Editor
-- =============================================================

-- 1. PROFILES TABLE
-- Extends the built-in auth.users with role & display info

create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text,
  full_name   text,
  role        text not null default 'store'
                check (role in ('admin', 'lm', 'owner', 'store')),
  store_name  text,
  created_at  timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'store')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. DEMANDS TABLE

create table if not exists public.demands (
  id             uuid default gen_random_uuid() primary key,
  s_no           text,
  lm_name        text not null,
  store_name     text not null,
  original_ask   text not null,
  polished_ask   text,
  action_owner   text,
  department     text,
  month          text,
  year           int  default extract(year from now())::int,

  -- Owner review fields
  decision       text check (decision in ('Accept', 'Reject')),
  reject_reason  text,
  promise_date   text,
  status         text check (status in ('Pending', 'In Progress', 'Done')),
  remarks        text,

  -- Audit
  created_by     uuid references auth.users(id),
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists demands_updated_at on public.demands;
create trigger demands_updated_at
  before update on public.demands
  for each row execute procedure public.set_updated_at();


-- 3. ROW LEVEL SECURITY (RLS)

alter table public.profiles enable row level security;
alter table public.demands  enable row level security;

-- Profiles: users can read/update their own
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Admins can read all profiles
create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Demands: admins and LMs can read all
create policy "Admins and LMs can read all demands"
  on public.demands for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'lm')
    )
  );

-- Demands: owners can read demands assigned to them
create policy "Owners can read assigned demands"
  on public.demands for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'owner'
        and demands.action_owner ilike '%' || p.full_name || '%'
    )
  );

-- Demands: store staff can only see their store's demands
create policy "Store staff can read own store demands"
  on public.demands for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'store'
        and demands.store_name = p.store_name
    )
  );

-- Demands: admins and LMs can insert
create policy "Admins and LMs can insert demands"
  on public.demands for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'lm')
    )
  );

-- Demands: store staff can insert (to submit their own demands)
create policy "Store staff can insert demands"
  on public.demands for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'store'
    )
  );

-- Demands: admins and LMs can update any demand
create policy "Admins and LMs can update demands"
  on public.demands for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'lm')
    )
  );

-- Demands: owners can update review fields on their assigned demands
create policy "Owners can update review fields"
  on public.demands for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'owner'
        and demands.action_owner ilike '%' || p.full_name || '%'
    )
  )
  with check (
    -- Allow saving the updated row even if the action_owner has changed (reassignment)
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'owner'
    )
  );


-- 4. SEED DATA (optional — remove in production)
-- Creates sample users. You must create the actual auth users via
-- the Supabase dashboard or Auth API and then update their profiles.

-- Example: after creating users in Auth dashboard, update their roles:
-- update public.profiles set role = 'admin', full_name = 'Admin User' where email = 'admin@zenohealth.in';
-- update public.profiles set role = 'lm', full_name = 'Vaseem Khan' where email = 'vaseem@zenohealth.in';
-- update public.profiles set role = 'owner', full_name = 'Soumya' where email = 'soumya@zenohealth.in';
-- update public.profiles set role = 'store', full_name = 'Store Manager', store_name = '7 Rasta Byculla' where email = 'byculla@zenohealth.in';
