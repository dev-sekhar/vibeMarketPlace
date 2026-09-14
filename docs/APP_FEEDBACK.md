# App feedback board

Each app detail page contains a public board for bugs, feature requests and improvements. Signed-in users publish a public name, specific title and details. Bug reports ask for reproduction steps; new requirements ask for a use case. Feedback is plain text; negative criticism is welcome, while the shared profanity policy applies to all three public text fields in the client and database.

Other signed-in users can add one vote per post or withdraw it. Authors cannot vote on their own posts. Everyone, including the owner, sees server-ranked results ordered by vote count descending, creation date descending and ID ascending. Type/status filters and 12-item pages keep the board manageable. Refresh retrieves current rankings; successful vote/status changes refresh the list. There are no live subscriptions or notifications.

The owner can set Open, Planned, In progress, Completed or Closed. These controls do not permit changes to the author's text, votes or identity. The initial version has no self-service text editing/deletion, comments, attachments or GitHub issue synchronisation. Contact the maintainer for corrections or moderation; posts do not create GitHub issues.

## Deployment

In Supabase SQL Editor as postgres, apply these in order if not already applied:

1. `app_citations_migration.sql` (existing citation feature).
2. `citation_language_migration.sql` (shared text filter).
3. `app_feedback_migration.sql` (new tables, policies and vote triggers).

The feedback migration fails clearly if the shared filter is absent. Apply it before deploying the frontend; reruns preserve posts and counts. The build sends no migration or test post to production. Existing app upvotes, citations and creator badges are unaffected.

## Access and moderation

`app_feedback` stores posts and the trigger-maintained total. `app_feedback_votes` has a unique `(feedback_id,user_id)` key. Identity comes from `auth.uid()`; clients cannot insert another user's ID, set initial votes, modify counts/timestamps, or hide posts. Users can read only their own vote records. Post visibility follows existing apps RLS; hidden posts are excluded and cannot receive votes.

Atomic increment/decrement updates prevent concurrent votes from overwriting each other's totals. Account deletion removes that user's votes and updates counts. Posting does not count as an automatic vote.

Moderators can hide a reviewed post using a privileged SQL session:

```sql
-- Replace with the exact post reviewed; text and votes are preserved.
UPDATE public.app_feedback SET is_hidden=true WHERE id='REVIEWED_FEEDBACK_UUID';
```

The word filter is bounded: see [language-check scope](CITATION_LANGUAGE.md). It does not detect every language, evasion, threat or context. Owners can close requests but cannot silently erase criticism or hide posts through the client. There is no moderation dashboard or automated spam classifier. Report security vulnerabilities privately rather than publishing exploit details here.

## Verification

Run `npx tsx --test tests/app-feedback.test.ts` with installed project dependencies. Local PostgreSQL-compatible tests cover request categories, public read/authenticated write, author identity, direct profanity rejection, duplicate/self votes, vote withdrawal, owner-only statuses, protected columns, deterministic ranking, migration retry, account-deletion counts and hidden/unpublished app visibility. Browser checks use synthetic local data for guest, participant and owner views; no production posts or votes are created.
