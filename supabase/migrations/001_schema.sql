-- Enable extensions
create extension if not exists "pgcrypto";

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text check (role in ('admin','staff')) default 'staff',
  created_at timestamptz default now()
);

-- events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  event_date date not null,
  cover_image_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- media
create table public.media (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  uploader_id uuid references public.profiles(id),
  storage_path text not null,
  thumbnail_path text,
  file_type text check (file_type in ('image','video')),
  mime_type text,
  file_size_bytes bigint,
  width int,
  height int,
  duration_seconds numeric,
  original_filename text,
  created_at timestamptz default now()
);

-- favorites
create table public.favorites (
  user_id uuid references public.profiles(id) on delete cascade,
  media_id uuid references public.media(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, media_id)
);

-- settings (single row)
create table public.settings (
  id int primary key default 1 check (id = 1),
  visitor_access_code_hash text not null,
  updated_at timestamptz default now(),
  updated_by uuid references public.profiles(id)
);

-- rate limiting for visitor code attempts
create table public.code_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_address text not null,
  attempted_at timestamptz default now()
);

-- indexes
create index on public.media (event_id, created_at desc);
create index on public.media (uploader_id);
create index on public.favorites (user_id);
create index on public.code_attempts (ip_address, attempted_at desc);
