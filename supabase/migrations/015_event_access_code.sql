-- Per-event access code (optional, plaintext).
-- NULL means the event is publicly accessible to anyone with gallery/dashboard access.
-- Non-null means visitors must enter this code before viewing the event.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS access_code TEXT DEFAULT NULL;
