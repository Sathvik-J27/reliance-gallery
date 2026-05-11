-- Function to enqueue stuck or failed media for reprocessing
CREATE OR REPLACE FUNCTION public.enqueue_stuck_media()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.processing_queue (media_id, attempt)
  SELECT m.id, m.processing_attempts + 1
  FROM public.media m
  WHERE m.processing_status IN ('pending', 'failed')
    AND m.processing_attempts < 5
    AND m.created_at < now() - interval '5 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM public.processing_queue pq
      WHERE pq.media_id = m.id AND pq.status IN ('queued', 'running')
    )
  ON CONFLICT DO NOTHING;
END;
$$;

-- Atomic increment helper called from the edge function
CREATE OR REPLACE FUNCTION public.increment_processing_attempts(media_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.media
  SET processing_attempts = processing_attempts + 1,
      processing_status = 'processing'
  WHERE id = media_id;
$$;

-- Scheduling is handled by the retry-stuck-media Edge Function.
-- Deploy that function and add a cron schedule in the Supabase dashboard:
--   Edge Functions → retry-stuck-media → Schedules → */5 * * * *
