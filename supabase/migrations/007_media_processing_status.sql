ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS processing_status text
    NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'done', 'failed')),
  ADD COLUMN IF NOT EXISTS processing_error text,
  ADD COLUMN IF NOT EXISTS processing_attempts int NOT NULL DEFAULT 0;

-- Backfill: rows with a thumbnail are already done
UPDATE public.media SET processing_status = 'done' WHERE thumbnail_path IS NOT NULL;
