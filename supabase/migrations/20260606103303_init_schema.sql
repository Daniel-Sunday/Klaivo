-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- Create public.profiles table
create table public.profiles (
  id uuid not null primary key references auth.users(id) on delete cascade,
  first_name text,
  email text,
  academic_level text,
  institution_type text,
  country text,
  onboarding_complete boolean default false,
  session_count integer default 0,
  daily_count integer default 0,
  last_used_date text,
  greeting_index integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  is_pro boolean default false,
  is_trial boolean default false,
  pro_expires_at timestamp with time zone,
  role text default 'user',
  subject_context text,
  onboarding_step integer default 0,
  theme text default 'dark',
  total_uses_used integer default 0,
  free_window_start timestamp with time zone default now()
);

-- Create public.sessions table
create table public.sessions (
  id uuid not null primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  topic text,
  mode text,
  level text,
  depth text,
  subject_type text,
  emotional_context text,
  result_json jsonb,
  follow_up_count integer default 0,
  created_at timestamp with time zone default now(),
  uploaded_file_url text,
  is_shared boolean default false,
  essay_question text
);

-- Create public.answer_cache table
create table public.answer_cache (
  id uuid not null primary key default gen_random_uuid(),
  topic_normalized text,
  mode text,
  level text,
  depth text,
  subject_type text,
  result_json jsonb,
  hit_count integer default 0,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone default (now() + '30 days'::interval),
  cache_key text unique
);

-- Create public.follow_ups table
create table public.follow_ups (
  id uuid not null primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  question text,
  answer text,
  created_at timestamp with time zone default now()
);

-- Create public.feedback table
create table public.feedback (
  id uuid not null primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  message text,
  created_at timestamp with time zone default now()
);

-- Create public.rate_limits table
create table public.rate_limits (
  id uuid not null primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  window_start timestamp with time zone default now(),
  call_count integer default 0,
  updated_at timestamp with time zone default now()
);

-- Create public.user_events table
create table public.user_events (
  id uuid not null primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  event_name text not null,
  properties jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.answer_cache enable row level security;
alter table public.follow_ups enable row level security;
alter table public.feedback enable row level security;
alter table public.rate_limits enable row level security;
alter table public.user_events enable row level security;

-- Admin check helper function (stable security definer)
create or replace function public.is_admin()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- RLS Policies

-- profiles
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Users can view own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Users can read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Admins read all profiles" on public.profiles for select to authenticated using ((auth.uid() = id) or public.is_admin());

-- sessions
create policy "Users can view own sessions" on public.sessions for select to authenticated using (auth.uid() = user_id);
create policy "Users can read own sessions" on public.sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own sessions" on public.sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can delete own sessions" on public.sessions for delete to authenticated using (auth.uid() = user_id);
create policy "Shared sessions are publicly readable" on public.sessions for select to authenticated using (is_shared = true);
create policy "Admins read all sessions" on public.sessions for select to authenticated using ((auth.uid() = user_id) or (is_shared = true) or public.is_admin());

-- follow_ups
create policy "Users can view own follow ups" on public.follow_ups for select to authenticated using (auth.uid() = user_id);
create policy "Users can read own follow ups" on public.follow_ups for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own follow ups" on public.follow_ups for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Admins read all follow ups" on public.follow_ups for select to authenticated using ((auth.uid() = user_id) or public.is_admin());

-- feedback
create policy "Users can insert feedback" on public.feedback for insert to authenticated with check ((select auth.uid()) = user_id);

-- answer_cache
create policy "Anyone can read cache" on public.answer_cache for select using (true);
create policy "Anyone can insert cache" on public.answer_cache for insert with check (true);
create policy "Anyone can update cache" on public.answer_cache for update using (true);

-- rate_limits
create policy "Users read own rate limit" on public.rate_limits for select to authenticated using (auth.uid() = user_id);

-- user_events
create policy "Users can insert own events" on public.user_events for insert to authenticated with check (auth.uid() = user_id);
create policy "Admins read all user events" on public.user_events for select to authenticated using ((auth.uid() = user_id) or public.is_admin());
