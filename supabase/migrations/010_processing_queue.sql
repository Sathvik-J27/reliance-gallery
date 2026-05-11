CREATE TABLE public.processing_queue (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id      uuid NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  scheduled_at  timestamptz NOT NULL DEFAULT now(),
  attempt       int NOT NULL DEFAULT 1,
  status        text NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued', 'running', 'done', 'failed')),
  last_error    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.processing_queue (status, scheduled_at)
  WHERE status = 'queued';

-- Prevent duplicate active entries for the same media item
CREATE UNIQUE INDEX ON public.processing_queue (media_id)
  WHERE status IN ('queued', 'running');

ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;
