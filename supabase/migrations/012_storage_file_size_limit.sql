-- Increase the per-file upload limit for the event-media bucket to 500 MB.
-- The default Supabase limit is 2 MB; files larger than the bucket limit are
-- rejected before reaching storage, which is why images ≥ 2 MB failed silently.
UPDATE storage.buckets
SET file_size_limit = 524288000  -- 500 MB in bytes
WHERE id = 'event-media';
