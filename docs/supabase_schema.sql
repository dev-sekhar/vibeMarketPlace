-- ============================================================
-- VibeMarket — Supabase Database Schema
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Apps table
CREATE TABLE IF NOT EXISTS public.apps (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL,
  long_description  TEXT NOT NULL,
  category          TEXT NOT NULL,
  tags              TEXT[] DEFAULT '{}',
  tech_stack        TEXT[] DEFAULT '{}',
  repo_url          TEXT NOT NULL,
  app_url           TEXT NOT NULL,
  thumbnail_url     TEXT DEFAULT '',
  author_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name       TEXT NOT NULL DEFAULT 'Anonymous',
  upvotes           INTEGER NOT NULL DEFAULT 0,
  featured          BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apps are publicly readable" ON public.apps FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can insert apps" ON public.apps FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update their own apps" ON public.apps FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete their own apps" ON public.apps FOR DELETE USING (auth.uid() = author_id);

-- 2. Upvotes table
CREATE TABLE IF NOT EXISTS public.upvotes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id     UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(app_id, user_id)
);

ALTER TABLE public.upvotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Upvotes are publicly readable" ON public.upvotes FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can upvote" ON public.upvotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their own upvote" ON public.upvotes FOR DELETE USING (auth.uid() = user_id);

-- 3. Auto-sync upvote count
CREATE OR REPLACE FUNCTION sync_upvote_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.apps
  SET upvotes = (SELECT COUNT(*) FROM public.upvotes WHERE app_id = COALESCE(NEW.app_id, OLD.app_id))
  WHERE id = COALESCE(NEW.app_id, OLD.app_id);
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_upvote_change
AFTER INSERT OR DELETE ON public.upvotes
FOR EACH ROW EXECUTE FUNCTION sync_upvote_count();

-- 4. Storage bucket (or create manually in Dashboard → Storage)
INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', TRUE) ON CONFLICT DO NOTHING;
CREATE POLICY "Public thumbnail access" ON storage.objects FOR SELECT USING (bucket_id = 'thumbnails');
CREATE POLICY "Authenticated users can upload thumbnails" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'thumbnails' AND auth.role() = 'authenticated');
