-- Run after app_citations_migration.sql and citation_language_migration.sql.
-- New tables only; existing app votes, citations and badges are unchanged.
BEGIN;
DO $$ BEGIN
  IF to_regprocedure('public.citation_contains_profanity(text)') IS NULL THEN
    RAISE EXCEPTION 'Run citation_language_migration.sql before app_feedback_migration.sql';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.app_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 100 AND display_name !~ '\S+@\S+\.\S+'),
  kind text NOT NULL CHECK (kind IN ('bug','feature','improvement')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 5 AND 120),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 30 AND 3000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','planned','in_progress','completed','closed')),
  vote_count integer NOT NULL DEFAULT 0 CHECK (vote_count >= 0),
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_feedback_ranking ON public.app_feedback(app_id,vote_count DESC,created_at DESC,id) WHERE NOT is_hidden;
CREATE TABLE IF NOT EXISTS public.app_feedback_votes (
  feedback_id uuid NOT NULL REFERENCES public.app_feedback(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(feedback_id,user_id)
);
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_feedback_votes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.app_feedback,public.app_feedback_votes FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.app_feedback TO anon,authenticated;
GRANT INSERT(app_id,display_name,kind,title,description) ON public.app_feedback TO authenticated;
GRANT UPDATE(status) ON public.app_feedback TO authenticated;
GRANT SELECT,DELETE ON public.app_feedback_votes TO authenticated;
GRANT INSERT(feedback_id) ON public.app_feedback_votes TO authenticated;
GRANT ALL ON public.app_feedback,public.app_feedback_votes TO service_role;

DROP POLICY IF EXISTS feedback_read ON public.app_feedback;
CREATE POLICY feedback_read ON public.app_feedback FOR SELECT USING (
  NOT is_hidden AND EXISTS(SELECT 1 FROM public.apps WHERE id=app_id)
);
DROP POLICY IF EXISTS feedback_add ON public.app_feedback;
CREATE POLICY feedback_add ON public.app_feedback FOR INSERT TO authenticated WITH CHECK (
  user_id=auth.uid() AND NOT is_hidden AND status='open' AND vote_count=0
  AND EXISTS(SELECT 1 FROM public.apps WHERE id=app_id)
);
DROP POLICY IF EXISTS feedback_owner_status ON public.app_feedback;
CREATE POLICY feedback_owner_status ON public.app_feedback FOR UPDATE TO authenticated
USING (NOT is_hidden AND EXISTS(SELECT 1 FROM public.apps WHERE id=app_id AND author_id=auth.uid()))
WITH CHECK (NOT is_hidden AND EXISTS(SELECT 1 FROM public.apps WHERE id=app_id AND author_id=auth.uid()));
DROP POLICY IF EXISTS feedback_votes_read_own ON public.app_feedback_votes;
CREATE POLICY feedback_votes_read_own ON public.app_feedback_votes FOR SELECT TO authenticated USING (
  user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.app_feedback WHERE id=feedback_id)
);
DROP POLICY IF EXISTS feedback_vote_add ON public.app_feedback_votes;
CREATE POLICY feedback_vote_add ON public.app_feedback_votes FOR INSERT TO authenticated WITH CHECK (
  user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.app_feedback WHERE id=feedback_id AND user_id<>auth.uid())
);
DROP POLICY IF EXISTS feedback_vote_remove ON public.app_feedback_votes;
CREATE POLICY feedback_vote_remove ON public.app_feedback_votes FOR DELETE TO authenticated USING (
  user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.app_feedback WHERE id=feedback_id)
);

CREATE OR REPLACE FUNCTION public.check_app_feedback_text() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF public.citation_contains_profanity(NEW.display_name)
    OR public.citation_contains_profanity(NEW.title)
    OR public.citation_contains_profanity(NEW.description) THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='FEEDBACK_PROFANITY: Please rephrase without profanity.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS feedback_language ON public.app_feedback;
CREATE TRIGGER feedback_language BEFORE INSERT OR UPDATE OF display_name,title,description ON public.app_feedback
FOR EACH ROW EXECUTE FUNCTION public.check_app_feedback_text();

-- Only the trigger can maintain counts; clients have no vote_count write grant.
-- Atomic increments/decrements avoid lost votes under concurrent requests.
CREATE OR REPLACE FUNCTION public.sync_app_feedback_votes() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE public.app_feedback SET vote_count=vote_count+1 WHERE id=NEW.feedback_id;
    RETURN NEW;
  ELSE
    UPDATE public.app_feedback SET vote_count=vote_count-1 WHERE id=OLD.feedback_id;
    RETURN OLD;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.sync_app_feedback_votes() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS feedback_vote_count ON public.app_feedback_votes;
CREATE TRIGGER feedback_vote_count AFTER INSERT OR DELETE ON public.app_feedback_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_app_feedback_votes();

CREATE OR REPLACE FUNCTION public.touch_app_feedback_status() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS feedback_status_updated ON public.app_feedback;
CREATE TRIGGER feedback_status_updated BEFORE UPDATE OF status ON public.app_feedback
FOR EACH ROW EXECUTE FUNCTION public.touch_app_feedback_status();
COMMIT;
