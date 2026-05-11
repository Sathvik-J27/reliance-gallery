-- Covers gallery queries filtered by file type
CREATE INDEX IF NOT EXISTS idx_media_event_filetype_created
  ON public.media (event_id, file_type, created_at DESC);

-- Covers gallery queries filtered by uploader
CREATE INDEX IF NOT EXISTS idx_media_event_uploader_created
  ON public.media (event_id, uploader_id, created_at DESC);

-- Covers the retry cron finding stuck records
CREATE INDEX IF NOT EXISTS idx_media_processing_status
  ON public.media (processing_status, created_at DESC)
  WHERE processing_status IN ('pending', 'failed');
