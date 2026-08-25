-- 1. Drop the permissive policies
DROP POLICY IF EXISTS "Anyone can read sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anyone can update sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anyone can insert sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anyone can read recipe_views" ON public.recipe_views;
DROP POLICY IF EXISTS "Anyone can insert recipe_views" ON public.recipe_views;
DROP POLICY IF EXISTS "Anyone can read heartbeats" ON public.device_heartbeats;
DROP POLICY IF EXISTS "Anyone can insert heartbeats" ON public.device_heartbeats;

-- 2. Revoke read access from public roles; keep insert/update needed by kiosks
REVOKE ALL ON public.sessions FROM anon, authenticated;
REVOKE ALL ON public.recipe_views FROM anon, authenticated;
REVOKE ALL ON public.device_heartbeats FROM anon, authenticated;

GRANT INSERT, UPDATE ON public.sessions TO anon, authenticated;
GRANT INSERT ON public.recipe_views TO anon, authenticated;
GRANT INSERT ON public.device_heartbeats TO anon, authenticated;

GRANT ALL ON public.sessions TO service_role;
GRANT ALL ON public.recipe_views TO service_role;
GRANT ALL ON public.device_heartbeats TO service_role;

-- 3. Validated insert policies (no SELECT policies at all -> no anon reads)
CREATE POLICY "Kiosk can insert sessions"
ON public.sessions FOR INSERT TO anon, authenticated
WITH CHECK (
  (location IS NULL OR length(location) <= 80)
  AND (duration IS NULL OR duration IN ('10-15', '20-25', '30-35'))
  AND (abandoned_step IS NULL OR length(abandoned_step) <= 40)
  AND (picked_slug IS NULL OR length(picked_slug) <= 200)
  AND (tags IS NULL OR (array_length(tags, 1) <= 10 AND array_to_string(tags, ',') = left(array_to_string(tags, ','), 300)))
  AND (shown_slugs IS NULL OR array_length(shown_slugs, 1) <= 20)
  AND (tz_offset_minutes IS NULL OR tz_offset_minutes BETWEEN -900 AND 900)
  AND started_at <= now() + interval '5 minutes'
  AND (ended_at IS NULL OR ended_at <= now() + interval '5 minutes')
);

CREATE POLICY "Kiosk can insert recipe_views"
ON public.recipe_views FOR INSERT TO anon, authenticated
WITH CHECK (
  length(recipe_slug) BETWEEN 1 AND 200
);

CREATE POLICY "Kiosk can insert heartbeats"
ON public.device_heartbeats FOR INSERT TO anon, authenticated
WITH CHECK (
  (location IS NULL OR length(location) <= 80)
  AND (app_version IS NULL OR length(app_version) <= 40)
  AND (tz_offset_minutes IS NULL OR tz_offset_minutes BETWEEN -900 AND 900)
);

-- 4. Narrow update policy: only recent sessions
CREATE POLICY "Kiosk can finish recent sessions"
ON public.sessions FOR UPDATE TO anon, authenticated
USING (started_at > now() - interval '4 hours')
WITH CHECK (started_at > now() - interval '4 hours');

-- 5. Guard which columns an update may touch
CREATE OR REPLACE FUNCTION public.sessions_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.location IS DISTINCT FROM OLD.location
     OR NEW.started_at IS DISTINCT FROM OLD.started_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Immutable session fields cannot be changed';
  END IF;

  IF NEW.duration IS NOT NULL AND NEW.duration NOT IN ('10-15', '20-25', '30-35') THEN
    RAISE EXCEPTION 'Invalid duration';
  END IF;

  IF NEW.picked_slug IS NOT NULL AND length(NEW.picked_slug) > 200 THEN
    RAISE EXCEPTION 'picked_slug too long';
  END IF;

  IF NEW.abandoned_step IS NOT NULL AND length(NEW.abandoned_step) > 40 THEN
    RAISE EXCEPTION 'abandoned_step too long';
  END IF;

  IF NEW.ended_at IS NOT NULL AND NEW.ended_at > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'ended_at cannot be in the future';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sessions_guard_update_trg ON public.sessions;
CREATE TRIGGER sessions_guard_update_trg
BEFORE UPDATE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.sessions_guard_update();