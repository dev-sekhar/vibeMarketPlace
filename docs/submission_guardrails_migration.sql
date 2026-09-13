-- Apply after supabase_schema.sql, before deploying the new frontend/API.
-- Existing listings remain public but are explicitly legacy/unvalidated.
BEGIN;
ALTER TABLE public.apps
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS project_status text NOT NULL DEFAULT 'experimental',
  ADD COLUMN IF NOT EXISTS sharing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS repository_id bigint,
  ADD COLUMN IF NOT EXISTS validated_commit text,
  ADD COLUMN IF NOT EXISTS validation_report jsonb,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz;
ALTER TABLE public.apps ADD COLUMN IF NOT EXISTS repo_key text GENERATED ALWAYS AS
  (lower(regexp_replace(regexp_replace(btrim(repo_url), '/$', ''), '[.]git$', '', 'i'))) STORED;
ALTER TABLE public.apps ALTER COLUMN moderation_status SET DEFAULT 'pending_review';
ALTER TABLE public.apps ADD CONSTRAINT apps_moderation_status_check CHECK (moderation_status IN ('pending_review', 'published', 'rejected'));
ALTER TABLE public.apps ADD CONSTRAINT apps_project_status_check CHECK (project_status IN ('experimental', 'usable', 'maintained'));
CREATE UNIQUE INDEX apps_validated_repository_unique ON public.apps(repository_id) WHERE repository_id IS NOT NULL;
CREATE UNIQUE INDEX apps_validated_repo_url_unique ON public.apps(repo_key) WHERE validated_commit IS NOT NULL;
-- Revoke both privileges and policies: a handcrafted Supabase request must not bypass checks.
REVOKE INSERT, UPDATE ON public.apps FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.apps TO service_role;
DROP POLICY IF EXISTS "Authenticated users can insert apps" ON public.apps;
DROP POLICY IF EXISTS "Authors can update their own apps" ON public.apps;
CREATE POLICY "Client inserts are blocked" ON public.apps AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Client updates are blocked" ON public.apps AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Only published apps are visible" ON public.apps AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (moderation_status = 'published');
-- Also defend against accidental future grants or permissive policies.
CREATE OR REPLACE FUNCTION public.enforce_submission_guardrails() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN RAISE EXCEPTION 'Use the validated submission API'; END IF;
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.repo_url IS DISTINCT FROM OLD.repo_url) THEN
    IF NEW.moderation_status <> 'pending_review' OR NOT NEW.sharing_consent
      OR NEW.repository_id IS NULL OR NEW.validated_commit !~ '^[a-f0-9]{40}$' OR NEW.validated_commit IS NULL
      OR NEW.validation_report IS NULL OR NEW.validation_report->>'pass' IS DISTINCT FROM 'true'
      OR NEW.repo_url !~ '^https://github[.]com/[a-z0-9-]+/[a-z0-9_.-]+$'
    THEN RAISE EXCEPTION 'Validated repository, sharing consent and pending review are required'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER enforce_submission_guardrails BEFORE INSERT OR UPDATE ON public.apps FOR EACH ROW EXECUTE FUNCTION public.enforce_submission_guardrails();
-- Voting still needs to update derived counts after direct client UPDATE is revoked.
CREATE OR REPLACE FUNCTION public.sync_upvote_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.apps SET upvotes = (SELECT count(*) FROM public.upvotes WHERE app_id = COALESCE(NEW.app_id, OLD.app_id))
  WHERE id = COALESCE(NEW.app_id, OLD.app_id);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_upvote_count() FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.protect_app_computed_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    NEW.upvotes := OLD.upvotes;
    NEW.featured := OLD.featured;
  END IF;
  RETURN NEW;
END;
$$;
COMMIT;
