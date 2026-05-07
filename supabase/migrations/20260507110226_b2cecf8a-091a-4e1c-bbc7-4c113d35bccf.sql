
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  completed BOOLEAN NOT NULL DEFAULT false,
  abandoned_step TEXT,
  duration TEXT,
  tags TEXT[],
  shown_slugs TEXT[],
  picked_slug TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.recipe_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  recipe_slug TEXT NOT NULL,
  picked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_location ON public.sessions(location);
CREATE INDEX idx_sessions_started_at ON public.sessions(started_at DESC);
CREATE INDEX idx_recipe_views_session ON public.recipe_views(session_id);
CREATE INDEX idx_recipe_views_slug ON public.recipe_views(recipe_slug);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert sessions" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sessions" ON public.sessions FOR UPDATE USING (true);
CREATE POLICY "Anyone can read sessions" ON public.sessions FOR SELECT USING (true);

CREATE POLICY "Anyone can insert recipe_views" ON public.recipe_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read recipe_views" ON public.recipe_views FOR SELECT USING (true);
