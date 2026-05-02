-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.media enable row level security;
alter table public.favorites enable row level security;
alter table public.settings enable row level security;
alter table public.code_attempts enable row level security;

-- Helper function: is current user admin?
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- profiles policies
create policy "profiles_select_all" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin());

-- events policies
create policy "events_select_authenticated" on public.events
  for select using (auth.role() = 'authenticated');

create policy "events_insert_admin" on public.events
  for insert with check (public.is_admin());

create policy "events_update_admin" on public.events
  for update using (public.is_admin());

create policy "events_delete_admin" on public.events
  for delete using (public.is_admin());

-- media policies
create policy "media_select_authenticated" on public.media
  for select using (auth.role() = 'authenticated');

create policy "media_insert_authenticated" on public.media
  for insert with check (auth.role() = 'authenticated' and uploader_id = auth.uid());

create policy "media_delete_uploader_or_admin" on public.media
  for delete using (uploader_id = auth.uid() or public.is_admin());

-- favorites policies
create policy "favorites_select_own" on public.favorites
  for select using (user_id = auth.uid());

create policy "favorites_insert_own" on public.favorites
  for insert with check (user_id = auth.uid());

create policy "favorites_delete_own" on public.favorites
  for delete using (user_id = auth.uid());

-- settings policies (admin only)
create policy "settings_select_admin" on public.settings
  for select using (public.is_admin());

create policy "settings_update_admin" on public.settings
  for update using (public.is_admin());

create policy "settings_insert_admin" on public.settings
  for insert with check (public.is_admin());

-- code_attempts: service role only (no user policies needed — accessed via security definer function)
