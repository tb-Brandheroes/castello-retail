ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS tz_offset_minutes integer;

CREATE TABLE IF NOT EXISTS public.device_heartbeats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location text,
  app_version text,
  tz_offset_minutes integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.device_heartbeats TO anon;
GRANT SELECT, INSERT ON public.device_heartbeats TO authenticated;
GRANT ALL ON public.device_heartbeats TO service_role;

ALTER TABLE public.device_heartbeats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert heartbeats"
ON public.device_heartbeats FOR INSERT
TO public WITH CHECK (true);

CREATE POLICY "Anyone can read heartbeats"
ON public.device_heartbeats FOR SELECT
TO public USING (true);