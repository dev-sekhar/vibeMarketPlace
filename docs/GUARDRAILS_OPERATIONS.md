# Submission guardrails: deployment and review

## Changes from the old flow

The prior UI could skip validation when `VITE_VALIDATOR_API_URL` was unset or when only a demo URL was supplied. Clients inserted directly into Supabase, so UI checks were bypassable. Two conflicting validator modules used different config paths, checked filenames rather than meaningful evidence, and the CLI read `passed` instead of `pass`. This release consolidates the validator in `server/repoValidator.ts` and uses a trusted authenticated `/submit-app` endpoint.

## Rollout order

1. Back up the database and rehearse `docs/submission_guardrails_migration.sql` on a staging Supabase project. Apply it **once** after `docs/supabase_schema.sql`. Migration constraints/index names deliberately fail on an accidental second application. Do not rerun the legacy schema over an existing installation.
   Also apply `docs/article_integrity_migration.sql` before deploying this frontend; it adds the article byline column, archives duplicate records, repairs the reviewed legacy duplicate, and installs global URL uniqueness.
2. Deploy the Node submission service (`npm run validate-server`) with the server-only variables below. This is a separate long-running Node service, not part of the Vite static bundle. Use Node 22+ and an HTTPS reverse proxy in production. A static Vercel frontend deployment alone does not deploy this API.
3. Build/deploy the frontend with `VITE_VALIDATOR_API_URL` set to that HTTPS service. No URL means submissions are explicitly unavailable; there is no fallback or unchecked insert. During rollout old clients may fail to submit after the database is secured; do not undo the database protections to accommodate stale clients.
4. Verify public browsing, a rejected submission, a valid pending submission, duplicate submission and voting in staging. Confirm an authenticated handcrafted direct INSERT/UPDATE is denied. Confirm pending/rejected rows are invisible through the public API.

Server environment (never put these keys in `VITE_*` variables):

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server_only_secret
CORS_ORIGIN=https://openvibes.vercel.app
PORT=4000
GITHUB_TOKEN=optional_server_only_token_for_public_repo_API_quota
```

Frontend: existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, plus `VITE_VALIDATOR_API_URL=https://YOUR_SUBMISSION_API`. For local development use `CORS_ORIGIN=http://localhost:5173` and `VITE_VALIDATOR_API_URL=http://localhost:4000`. Supply server variables through your host/environment; `tsx` does not automatically load `.env` here.

The service verifies Supabase access tokens with `auth.getUser(token)`, derives the author from that user, validates all fields and the repository, and writes with the server-only service role. It ignores caller-supplied authors, votes, publication status and validation reports. GitHub rate limits, unavailable services, malformed/oversized responses, redirects, private repositories and incomplete trees fail closed. `/validate-repo` is an authenticated preview only and never grants publishing authority.

Requests are capped at 64 KiB, GitHub responses at 8 MiB and per-call timeouts at 15 seconds. The process accepts at most four concurrent validation operations and five attempts per authenticated user per hour. These limits are **per process and reset on restart**: configure shared gateway rate limiting and request/concurrency budgets before scaling horizontally. Never run submitted code, install submitted dependencies or fetch arbitrary demo URLs in the API.

## Database behaviour

Existing rows remain published with `validated_commit = NULL`; they are legacy entries, not retroactively validated. Audit these manually and put questionable listings into pending review. New rows require a checked repository, consent and pending status. Restrictive RLS plus revoked privileges and a trigger block direct client writes; only published rows are readable by browser roles. Service-role credentials must remain secret. The upvote count trigger runs as a constrained security-definer function so voting still works after direct app updates are revoked.

Clients cannot directly edit or replace a repo after approval. The existing author-delete policy is retained. A future edit/resubmission endpoint must repeat validation, reset review status, and update the inspected revision. Do not simply restore client UPDATE permission. Unique indexes protect new validated GitHub IDs and canonical URLs; legacy duplicates are left intact to avoid destructive cleanup during migration.

## Maintainer review (no admin UI yet)

In Supabase SQL Editor, inspect the queue using your privileged maintainer account:

```sql
SELECT id, name, repo_url, project_status, validated_commit, validation_report, created_at
FROM public.apps WHERE moderation_status = 'pending_review' ORDER BY created_at;
```

Read the repository **at validated_commit**, the README, full license and test evidence. Confirm a concrete use case, reproducible usage, working evidence, honest limitations and no duplicate/thin-clone or unrelated promotional content. Do not treat passing structural checks as independent verification. If execution is needed, use a separate disposable sandbox without credentials; the submission service must not execute it.

For the exact reviewed UUID and SHA, publish explicitly:

```sql
UPDATE public.apps SET moderation_status = 'published'
WHERE id = 'REPLACE_WITH_REVIEWED_UUID' AND moderation_status = 'pending_review'
  AND validated_commit = 'REPLACE_WITH_REVIEWED_SHA';
```

Reject with `moderation_status = 'rejected'` and send actionable feedback through an agreed contact channel. No automatic email notification or review dashboard is implemented. Rejected repositories remain reserved against duplicates. To allow resubmission, the maintainer must remove the rejected listing or implement a reviewed replacement flow; never approve by setting a client-provided validation flag.

## Verification

`npm test` exercises validator evidence, URL restrictions, stale report detection, HTTP authentication/bypass/failure paths and the SQL migration in embedded PostgreSQL. `npm run typecheck:server` checks server/CLI/tests; `npm run build` checks and builds the UI. `npm run validate-repo -- https://github.com/owner/repo` performs a read-only public-repo check and exits nonzero on rejection. Use a real repository with your own evidence for deployment smoke tests; do not manufacture passing test reports for someone else's code.

The automated suite uses synthetic GitHub responses and a local PostgreSQL fixture. It does not certify your deployed Supabase configuration, GitHub OAuth redirect configuration, production data, or external demo availability. Follow the rollout checks above before enabling promotion of the updated flow.


## Requirements modal and GitHub sign-in

The /submit route opens an accessible native modal before rendering the submission flow. Agreement is unchecked by default; Continue is disabled until checked. Escape/Not now returns home. A versioned acknowledgement is retained in tab session storage for 30 minutes so the GitHub round trip does not ask twice, and is cleared on success/cancel. This is UX acknowledgement only; server checks and the per-project sharing declaration remain mandatory.

The login button now reports errors and shows a connecting state. OAuth initiation and session restoration have bounded UI waits, late initiation results do not redirect after a timeout, and Supabase handles refresh without an app timer forcing sign-out at expiry. No auth APIs are called inside onAuthStateChange. Return destinations are allowlisted local paths.

Supabase Authentication → URL Configuration must include the production Site URL https://openvibes.vercel.app and exact Redirect URLs https://openvibes.vercel.app/ and https://openvibes.vercel.app/submit (plus /profile and /whitepapers if used). Add the corresponding localhost URLs for development. If retaining the older domain, configure it separately. GitHub OAuth app callback must remain https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback, not the Vercel URL. These are dashboard configuration steps, not changes accomplished by deploying frontend code.

If the error page says “Looks like something went wrong! We track these errors automatically”, note the domain/path without copying OAuth state or tokens. A GitHub-hosted error page cannot be caught by React after leaving OpenVibes. Test a normal/private browser session, check GitHub Status and Supabase Auth logs, and verify provider configuration. The live button reached the GitHub login screen during this review, but authenticated completion was not tested and the reported failure was not reproduced.

References: https://supabase.com/docs/guides/auth/redirect-urls and https://supabase.com/docs/guides/auth/social-login/auth-github .

## App discovery

The home page shows the latest five matching apps and links to `/apps`. The directory supports URL-based search (name, description, creator, tags and technologies), category, project status, live-demo filtering, newest/upvotes/name sorting, and twelve results per page. Published rows are fetched in batches to avoid silently truncating the directory at the API row limit. Filtering currently runs in the browser; move this to indexed database queries as the catalogue grows. Legacy projects with no status appear under Not specified.

## Article integrity and names

An article URL may be shared once globally, regardless of submitter. A generated database identity plus unique index handles concurrent submissions and direct API calls. The browser provides an early duplicate message and handles PostgreSQL unique violations. Identity normalization covers HTTP/HTTPS, www, trailing slashes, fragments, common tracking parameters, Medium post IDs, and LinkedIn activity/share IDs. Meaningful query parameters are retained. Different custom domains, URL shorteners, redirects and cross-posts with different platform IDs are not automatically resolved; use the direct publisher URL. Similar titles alone do not prove two articles are the same.

The migration keeps the first share for matching URLs. It also archives the specifically reviewed empty-URL legacy copy of “The End of the SaaS CRM”, retaining its working Medium entry. Full archived rows and retained IDs are in `public.whitepaper_duplicate_archive`, inaccessible to browser roles. Maintainers can inspect the archive and restore selected fields after reviewing identity constraints; the migration does not discard the archived contents. Review other invalid legacy URLs separately.

The submitter’s public name and the article author’s byline are separate fields, both required for new links. Neither may contain an email address. Existing email fallbacks are replaced using public-name metadata where available, otherwise “Community member”; unavailable author names remain explicitly unspecified. The reviewed Medium article is backfilled with its verified public byline, Chandrasekhar Turlapati. New bylines are supplied by the submitter and are not authenticated by Medium, LinkedIn or Substack. Cards distinguish the author from the person sharing the link and suppress legacy email strings.

Verification queries after deployment:

```sql
SELECT article_key, count(*) FROM public.whitepapers
WHERE article_key IS NOT NULL GROUP BY article_key HAVING count(*) > 1;
SELECT id,title,article_author_name,author_name FROM public.whitepapers;
SELECT original_id,kept_id,archived_at FROM public.whitepaper_duplicate_archive;
```
