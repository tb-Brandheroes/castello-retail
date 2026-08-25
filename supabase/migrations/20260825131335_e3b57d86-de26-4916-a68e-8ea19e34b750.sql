-- Kiosk uses .insert().select("id") - allow reading ONLY the id column, only for very fresh rows
GRANT SELECT (id) ON public.sessions TO anon, authenticated;

CREATE POLICY "Kiosk can read own fresh session id"
ON public.sessions FOR SELECT TO anon, authenticated
USING (started_at > now() - interval '5 minutes');