# Development template review

The catalog supports OpenVibes' purpose: sharing useful applications as open source so others can understand, try, reuse and improve them. Small projects and manual testing remain welcome. Templates do not create functionality, prove licensing rights or certify quality.

## Coverage

| Template | Purpose and changes |
| --- | --- |
| Start here (new) | Defines technical terms, separates required from optional files, explains GitHub editing without a terminal, real testing and review. |
| General app README | Removes assumed technology, obsolete branding and unverified feature claims. Prompts for audience, reproducible setup, usage, limits, reuse and license. |
| CLI README | Explains command-line input/output and side effects; no invented package, commands or publication badges. |
| API README | Explains a real request/response, authentication and errors without inventing endpoints. |
| TEST_REPORT.json (new) | Matches the validator's fields; deliberately unfilled timestamp/SHA and skipped result prevent it being mistaken for passing evidence. |
| Node/React .gitignore | Excludes environment variants, local credentials and generated files while retaining safe examples and source. Explains already-tracked files and lockfiles. |
| Python .gitignore | Retains useful source notebooks; excludes caches and local settings, with a reminder to clear sensitive notebook outputs. |
| MIT LICENSE | Retains full terms with explicit copyright customisation guidance. |
| Apache LICENSE | Replaces the short application notice with the complete official 2.0 text. |
| GPL LICENSE | Replaces the short application notice with the complete official v3 text, preserving FSF copyright and application instructions. |
| CONTRIBUTING.md | Welcomes non-code help and defines issues, forks, branches and PRs. Removes assumed policies, commands, branches and merge strategy. |
| Vite/Supabase .env.example | Removes private provider keys from browser-exposed variables. Explains public browser keys and backend boundaries. |
| Server .env.example | Uses explicit dummy values and optional services, explains private deployment settings and required server protections. |
| STRUCTURE.md | Explains folders as an optional map, includes required sharing files and avoids imposing a framework or enterprise layout. |

## Maintenance and sources

`src/lib/templates.ts` is the single catalog for download and preview. `src/data/templates.ts` is a compatibility re-export. The downloadable start guide also appears in `docs/SHARING_GUIDE.md`; update both together. UI introduction and new category labels support EN/ES/ZH; detailed downloadable content and per-template guidance are explicitly identified as English.

- Submission contract: [requirements](SUBMISSION_REQUIREMENTS.md), `server/repoValidator.ts`, `config/validation-config.json`.
- Browser settings: [official Vite environment guidance](https://vite.dev/guide/env-and-mode).
- Complete license sources: [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0.txt), [GNU GPL v3](https://www.gnu.org/licenses/gpl-3.0.txt). Preserve their terms verbatim; put selection guidance outside downloaded license text.

## Validation

`tests/templates.test.ts` checks that the unfilled report is rejected and an illustrative completed manual report qualifies for documentation review across README variants. It preserves a skipped case to verify honest disclosure. It also checks full-license sections, excludes private browser-key assignments and verifies both catalog imports share one source. These tests do not establish legal suitability or independently verify a submitter's claims.

Build and scoped lint, plus browser checks of guide navigation, search/category filtering, preview, keyboard dismissal and download content, cover the page changes. The submission policy itself is unchanged.
