ALTER TABLE public.sessions REPLICA IDENTITY FULL;
ALTER TABLE public.recipe_views REPLICA IDENTITY FULL;
ALTER TABLE public.device_heartbeats REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recipe_views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_heartbeats;