-- Apply in the Supabase SQL Editor as the database owner, before deploying the UI.
BEGIN;
LOCK TABLE public.whitepapers IN ACCESS EXCLUSIVE MODE;
-- Older installations may retain update_whitepapers_updated_at() after the
-- legacy schema removed its column. Restore it before any data updates.
-- Leave untouched historical rows NULL rather than inventing update times.
ALTER TABLE public.whitepapers ADD COLUMN IF NOT EXISTS updated_at timestamptz;
DROP TRIGGER IF EXISTS check_article_submission ON public.whitepapers;
CREATE OR REPLACE FUNCTION public.canonical_article_key(value text) RETURNS text
LANGUAGE plpgsql IMMUTABLE STRICT SET search_path = pg_catalog AS $$
DECLARE m text[]; h text; p text; q text; article_id text;
BEGIN
  m := regexp_match(btrim(value), '^https?://([a-z0-9.-]+(?::[0-9]+)?)(/[^?#\s\\]*)?(?:\?([^#\s\\]*))?(?:#[^\s\\]*)?$', 'i');
  IF m IS NULL OR length(btrim(value)) > 2048 THEN RETURN NULL; END IF;
  h := regexp_replace(lower(m[1]), '^www\.', '');
  h := regexp_replace(h, CASE WHEN lower(value) LIKE 'https:%' THEN ':443$' ELSE ':80$' END, '');
  p := regexp_replace(coalesce(m[2], ''), '/+$', '');
  IF h = 'medium.com' OR h LIKE '%.medium.com' THEN
    article_id := substring(p from '(?:-|/)([a-fA-F0-9]{12})$');
    IF article_id IS NOT NULL THEN RETURN 'medium:' || lower(article_id); END IF;
  END IF;
  IF h = 'linkedin.com' THEN
    article_id := substring(p from '(?:activity-|activity:|share-)([0-9]+)');
    IF article_id IS NOT NULL THEN RETURN 'linkedin:activity:' || article_id; END IF;
  END IF;
  SELECT string_agg(part, '&' ORDER BY part COLLATE "C") INTO q FROM unnest(string_to_array(coalesce(m[3], ''), '&')) part
    WHERE part <> '' AND part !~* '^(utm_[^=]*|source|ref|referrer|fbclid|gclid|mc_cid|mc_eid|trk|trackingid|share|rcm|r)=';
  RETURN h || p || CASE WHEN q IS NULL THEN '' ELSE '?' || q END;
END $$;
ALTER TABLE public.whitepapers ADD COLUMN IF NOT EXISTS article_author_name text;
ALTER TABLE public.whitepapers ADD COLUMN IF NOT EXISTS article_key text GENERATED ALWAYS AS (public.canonical_article_key(external_url)) STORED;

-- Keep a private, complete copy of duplicate rows so cleanup is reversible.
CREATE TABLE IF NOT EXISTS public.whitepaper_duplicate_archive (
  original_id uuid PRIMARY KEY, kept_id uuid NOT NULL, archived_at timestamptz NOT NULL DEFAULT now(), row_data jsonb NOT NULL
);
ALTER TABLE public.whitepaper_duplicate_archive ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whitepaper_duplicate_archive FROM PUBLIC, anon, authenticated;
WITH ranked AS (
  SELECT id, first_value(id) OVER (PARTITION BY article_key ORDER BY created_at,id) AS kept_id,
    row_number() OVER (PARTITION BY article_key ORDER BY created_at,id) AS position
  FROM public.whitepapers WHERE article_key IS NOT NULL
)
INSERT INTO public.whitepaper_duplicate_archive(original_id,kept_id,row_data)
SELECT w.id,r.kept_id,to_jsonb(w) FROM ranked r JOIN public.whitepapers w ON w.id=r.id
WHERE r.position > 1 ON CONFLICT(original_id) DO NOTHING;
-- Specifically reviewed legacy duplicate: the older row has no external URL.
-- Do not deduplicate unrelated articles merely because their titles match.
INSERT INTO public.whitepaper_duplicate_archive(original_id,kept_id,row_data)
SELECT old.id,kept.id,to_jsonb(old) FROM public.whitepapers old CROSS JOIN public.whitepapers kept
WHERE old.id='7982110e-622c-428b-9e16-62e8a3dbe47a' AND old.external_url=''
  AND kept.id='2801b84f-4d11-41bc-8cc9-39cb11dd3265' AND kept.article_key='medium:d13852852e49'
  AND old.title=kept.title AND old.description=kept.description
ON CONFLICT(original_id) DO NOTHING;
DELETE FROM public.whitepapers w USING public.whitepaper_duplicate_archive a
WHERE w.id=a.original_id AND EXISTS (SELECT 1 FROM public.whitepapers kept WHERE kept.id=a.kept_id AND
  (kept.article_key=w.article_key OR (w.id='7982110e-622c-428b-9e16-62e8a3dbe47a' AND w.external_url='' AND kept.article_key='medium:d13852852e49')));
CREATE UNIQUE INDEX IF NOT EXISTS whitepapers_article_key_unique ON public.whitepapers(article_key);

-- Recover public profile names; never use the account email as a byline.
UPDATE public.whitepapers w SET author_name = coalesce((
  SELECT btrim(candidate) FROM unnest(ARRAY[u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',u.raw_user_meta_data->>'user_name',u.raw_user_meta_data->>'preferred_username']) candidate
  WHERE btrim(candidate) <> '' AND candidate !~ '\S+@\S+\.\S+' LIMIT 1
), 'Community member') FROM auth.users u
WHERE u.id=w.author_id AND (w.author_name ~ '\S+@\S+\.\S+' OR btrim(w.author_name) IN ('','Anonymous'));
UPDATE public.whitepapers SET article_author_name=author_name
WHERE is_own_article AND article_author_name IS NULL AND author_name <> 'Community member';
-- Verified directly against this Medium article's public byline on 2026-09-13.
UPDATE public.whitepapers SET article_author_name='Chandrasekhar Turlapati'
WHERE id='2801b84f-4d11-41bc-8cc9-39cb11dd3265' AND article_key='medium:d13852852e49';

CREATE OR REPLACE FUNCTION public.check_article_submission() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF public.canonical_article_key(NEW.external_url) IS NULL THEN RAISE EXCEPTION 'A valid article URL is required'; END IF;
  IF coalesce(length(btrim(NEW.author_name)),0) NOT BETWEEN 2 AND 100 OR NEW.author_name ~ '\S+@\S+\.\S+' THEN
    RAISE EXCEPTION 'A public display name is required, not an email';
  END IF;
  IF coalesce(length(btrim(NEW.article_author_name)),0) NOT BETWEEN 2 AND 100 OR NEW.article_author_name ~ '\S+@\S+\.\S+' THEN
    RAISE EXCEPTION 'The article author name is required, not an email';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS check_article_submission ON public.whitepapers;
CREATE TRIGGER check_article_submission BEFORE INSERT OR UPDATE ON public.whitepapers FOR EACH ROW EXECUTE FUNCTION public.check_article_submission();
COMMIT;
