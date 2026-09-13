-- Run this complete file in Supabase SQL Editor as postgres before deploying.
BEGIN;
CREATE TABLE IF NOT EXISTS public.app_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 100 AND display_name !~ '\S+@\S+\.\S+'),
  use_case text NOT NULL CHECK (char_length(btrim(use_case)) BETWEEN 20 AND 500),
  feedback text NOT NULL CHECK (char_length(btrim(feedback)) BETWEEN 30 AND 2000),
  recommendation text NOT NULL CHECK (recommendation IN ('recommend','mixed','not_recommended')),
  evidence_url text CHECK (evidence_url IS NULL OR (char_length(evidence_url) <= 2048 AND evidence_url ~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?([/?#][^\s\\]*)?$')),
  has_used boolean NOT NULL CHECK (has_used IS TRUE),
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(app_id,user_id)
);
CREATE INDEX IF NOT EXISTS app_citations_listing ON public.app_citations(app_id,created_at DESC,id);
ALTER TABLE public.app_citations ENABLE ROW LEVEL SECURITY;

-- Explicit column grants protect author identity, moderation and timestamps.
REVOKE ALL ON public.app_citations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.app_citations TO anon, authenticated;
GRANT INSERT(app_id,display_name,use_case,feedback,recommendation,evidence_url,has_used) ON public.app_citations TO authenticated;
GRANT UPDATE(display_name,use_case,feedback,recommendation,evidence_url,has_used) ON public.app_citations TO authenticated;
GRANT DELETE ON public.app_citations TO authenticated;
GRANT ALL ON public.app_citations TO service_role;

DROP POLICY IF EXISTS citations_read ON public.app_citations;
CREATE POLICY citations_read ON public.app_citations FOR SELECT USING (
  (NOT is_hidden OR user_id=auth.uid()) AND EXISTS (SELECT 1 FROM public.apps WHERE id=app_id)
);
DROP POLICY IF EXISTS citations_insert ON public.app_citations;
CREATE POLICY citations_insert ON public.app_citations FOR INSERT TO authenticated WITH CHECK (
  user_id=auth.uid() AND NOT is_hidden AND EXISTS (SELECT 1 FROM public.apps WHERE id=app_id AND author_id<>auth.uid())
);
DROP POLICY IF EXISTS citations_update ON public.app_citations;
CREATE POLICY citations_update ON public.app_citations FOR UPDATE TO authenticated
USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid() AND EXISTS (SELECT 1 FROM public.apps WHERE id=app_id AND author_id<>auth.uid()));
DROP POLICY IF EXISTS citations_delete ON public.app_citations;
CREATE POLICY citations_delete ON public.app_citations FOR DELETE TO authenticated USING (user_id=auth.uid());

CREATE OR REPLACE FUNCTION public.touch_app_citation() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS app_citation_updated ON public.app_citations;
CREATE TRIGGER app_citation_updated BEFORE UPDATE ON public.app_citations FOR EACH ROW EXECUTE FUNCTION public.touch_app_citation();
COMMIT;
