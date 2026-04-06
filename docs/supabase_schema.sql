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
  featured          BOOLEAN NOT NULL DEFAULT FALSE,
  community_links   JSONB DEFAULT NULL
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

-- 5. Whitepapers table (links to externally published articles)
CREATE TABLE IF NOT EXISTS public.whitepapers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  external_url TEXT NOT NULL,
  source       TEXT NOT NULL DEFAULT 'Other',
  author_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name  TEXT NOT NULL DEFAULT 'Anonymous'
);

ALTER TABLE public.whitepapers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Whitepapers are publicly readable"        ON public.whitepapers FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can insert whitepapers" ON public.whitepapers FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can delete their own whitepapers"  ON public.whitepapers FOR DELETE USING (auth.uid() = author_id);

-- ============================================================
-- MIGRATION: whitepapers — switch from content to external_url
-- Run this in Supabase Dashboard → SQL Editor if the table
-- already exists with the old schema.
-- ============================================================
ALTER TABLE public.whitepapers
  ADD COLUMN IF NOT EXISTS external_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source       TEXT NOT NULL DEFAULT 'Other';

ALTER TABLE public.whitepapers
  DROP COLUMN IF EXISTS content,
  DROP COLUMN IF EXISTS content_type,
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS app_id;

-- Remove the default after migration (new rows must supply a real URL)
ALTER TABLE public.whitepapers
  ALTER COLUMN external_url DROP DEFAULT;
-- ============================================================

-- 5. Geo metadata is stored in auth.users.raw_user_meta_data (Supabase user_metadata).
-- The following fields are set during registration when the user grants location permission:
--   geo_city          TEXT    — e.g. "San Francisco"
--   geo_region        TEXT    — e.g. "California"
--   geo_country       TEXT    — e.g. "United States"
--   geo_country_code  TEXT    — e.g. "US"
--   geo_lat           FLOAT   — latitude rounded to ~1 km precision
--   geo_lng           FLOAT   — longitude rounded to ~1 km precision
--   geo_registered_at TIMESTAMPTZ — ISO timestamp of when geo was captured
--
-- To query geo data across users (admin use only):
-- SELECT id, raw_user_meta_data->>'geo_city' AS city,
--        raw_user_meta_data->>'geo_country_code' AS country_code
-- FROM auth.users;
