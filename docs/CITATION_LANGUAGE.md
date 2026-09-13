# Citation language checks

Citations may include honest criticism and negative recommendations. Public names, use cases and feedback must be free of profanity. The form asks the author to rephrase rather than replacing words or silently changing meaning. Evidence URLs and the contents of external links are not scanned by this text filter.

## Deploy

1. Run `docs/citation_language_migration.sql` in Supabase SQL Editor as postgres after the original `docs/app_citations_migration.sql`.
2. Verify it succeeds, then deploy the client. The trigger blocks direct inserts, edits and attempts to unhide matching content even when someone bypasses the form.
3. Existing matching citations are hidden for moderator review; text and ownership are preserved. Re-running the migration is safe. Existing hidden rows remain hidden after an author edits them.

Review hidden matches using a privileged SQL Editor session:

```sql
SELECT id, app_id, created_at, display_name, use_case, feedback
FROM public.app_citations
WHERE is_hidden AND (
  public.citation_contains_profanity(display_name)
  OR public.citation_contains_profanity(use_case)
  OR public.citation_contains_profanity(feedback)
)
ORDER BY created_at DESC;
```

Ask the author to rephrase; do not silently rewrite their opinion. Moderators can unhide an individually reviewed citation once the offending text has been corrected. Authors cannot change moderation flags. A false-positive vocabulary change needs a reviewed code/SQL update before retrying; there is no user-controlled bypass.

## Scope and maintenance

This is a bounded word filter for common English profanity, a small Spanish vocabulary and a few Chinese phrases. It handles case, fullwidth characters, common number substitutions and inserted punctuation/spacing for the Latin vocabulary. Word boundaries avoid ordinary substrings such as Scunthorpe and assessment. It does not detect every language, disguise, insult, threat or contextual use. Ambiguous names such as Dick are deliberately not blocked as standalone words. Human moderation remains necessary; do not advertise this as a guarantee that all abusive content is prevented.

`src/lib/citationLanguage.ts` is the shared policy. After changing it, run `npx tsx scripts/generate-citation-language.ts`, review the resulting SQL and run `npx tsx --test tests/citation-language.test.ts tests/citations.test.ts`. The tests check every configured term and client/database parity, direct writes, hidden legacy rows, clean edits and existing ownership/moderation rules.

No database changes are applied by the frontend or build. Run the reviewed migration explicitly; client validation alone is not enforcement.
