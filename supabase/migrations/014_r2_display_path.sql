-- Add display_path column for R2 display-quality versions (set by Railway worker)
alter table public.media
  add column if not exists display_path text;

-- Drop the old pg_net trigger that called the Supabase Edge Function for processing.
-- Processing is now handled by the Railway worker polling processing_queue.
drop trigger if exists after_media_insert on public.media;
drop function if exists public.trigger_process_media();
