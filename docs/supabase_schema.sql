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

-- MIGRATION: add authorship declaration columns
ALTER TABLE public.whitepapers
  ADD COLUMN IF NOT EXISTS is_own_article       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS article_author_handle TEXT DEFAULT NULL;
-- ============================================================

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

-- ============================================================
-- MIGRATION: whitepapers — add author LinkedIn URL column
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================
ALTER TABLE public.whitepapers
  ADD COLUMN IF NOT EXISTS author_linkedin_url TEXT DEFAULT NULL;
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

-- ============================================================
-- MIGRATION: public profiles table for community links
-- Stores Slack / WhatsApp / Telegram invite URLs per creator.
-- These are displayed on app cards instead of being stored per-app.
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slack_url    TEXT DEFAULT NULL,
  whatsapp_url TEXT DEFAULT NULL,
  telegram_url TEXT DEFAULT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all"  ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_insert_own"  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own"  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Required: grant table-level access to Supabase roles
-- (RLS policies alone are not enough when table is created via raw SQL)
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
-- ============================================================

-- ============================================================
-- SECURITY MIGRATION 1: Protect upvotes and featured from direct manipulation
-- Without this, an app author can call .update({ upvotes: 9999 }) via the API
-- and the "Authors can update their own apps" RLS policy would allow it.
-- This trigger resets those fields to their existing values whenever a JWT
-- session is active (i.e. a real user request), while still allowing the
-- sync_upvote_count trigger to update via SECURITY DEFINER context.
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================
CREATE OR REPLACE FUNCTION protect_app_computed_fields()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- auth.uid() is non-NULL only for JWT-authenticated user requests.
  -- Trigger-to-trigger updates (e.g. sync_upvote_count) run with auth.uid() = NULL.
  IF auth.uid() IS NOT NULL THEN
    NEW.upvotes := OLD.upvotes;
    NEW.featured := OLD.featured;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_app_computed_fields
BEFORE UPDATE ON public.apps
FOR EACH ROW EXECUTE FUNCTION protect_app_computed_fields();
-- ============================================================

-- ============================================================
-- SECURITY MIGRATION 2: Restrict thumbnail uploads to user's own folder
-- The original policy allowed any authenticated user to upload to any path.
-- This restricts uploads to /<user_id>/* only.
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload thumbnails" ON storage.objects;

CREATE POLICY "Users can upload own thumbnails" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'thumbnails'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
-- ============================================================
