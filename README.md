# OpenVibes

> The open-source, community-led marketplace for vibe-coded applications.

OpenVibes is where builders share apps created with AI-assisted coding tools (Cursor, Copilot, Claude, etc.) and the community discovers, upvotes, and builds on them. It also hosts a curated research library of articles and whitepapers on vibe coding.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite 5 |
| Routing | React Router v7 |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage) |
| Styling | CSS Modules + custom design tokens |
| i18n | i18next (EN, ES, ZH) |
| Icons | Lucide React + inline brand SVGs |
| Rich text | Tiptap |

---

## Features

- **App directory** — browse, search, and filter vibe-coded apps by category
- **App detail pages** — thumbnails, tech stack, tags, live demo & repo links
- **Upvoting** — authenticated users can upvote apps (persisted via Supabase, duplicate-proof)
- **Submit an app** — authenticated users can list their own vibe-coded projects
- **Community links** — Slack, WhatsApp, and Telegram invite links per creator, stored in `public.profiles` and displayed live on app cards and detail pages with official brand icons
- **Research & Whitepapers** — share and browse articles published on LinkedIn, Medium, GitHub, or elsewhere
- **Author verification** — article submissions auto-match your profile social handle to prevent impersonation
- **Profile page** — full name, social links (LinkedIn, Medium, GitHub) with a 24-hour cooldown on social link changes
- **Authentication** — GitHub OAuth via Supabase Auth
- **Localisation** — full EN / ES / ZH support; language switcher always fixed at the right edge of the navbar
- **Navbar stats** — live app count, paper count, creator count, total upvotes, and category count
- **Session expiry indicator** — countdown timer when your session is about to expire
- **App version** — displayed in the footer, read from `package.json` at build time

---

## Submission quality requirements

App detail pages also have a feedback board for bugs, feature requests and improvements. Signed-in users post and vote on other people's requests; the app owner sees highest-voted items first and can update their status. Apply the migration described in [feedback board operations](docs/APP_FEEDBACK.md) before deploying this feature.

Built something useful? Share it as open source. Small experiments are welcome when others can understand, run and build on them.

All new submissions require public GitHub source, a recognised full license, a substantive README, a revision-linked TEST_REPORT.json, actual source, a nonempty .gitignore, honest project status and permission to share. Manual functional tests are acceptable. Demo links are optional. Duplicates are blocked and all qualifying submissions await human review before publication.

Read [Submission requirements and report format](docs/SUBMISSION_REQUIREMENTS.md) and [Deployment and reviewer operations](docs/GUARDRAILS_OPERATIONS.md). Automatic checks establish documentation eligibility, not safety or verified quality. Existing listings are legacy entries until separately reviewed.

New to software development? Start with the [plain-language sharing guide](docs/SHARING_GUIDE.md), also available from the app's `/templates` page. It explains each required file, GitHub editing without a terminal, manual functional tests and the report-only commit sequence. Downloads are editable English prompts, not completed documentation or evidence.

The template catalog is maintained in `src/lib/templates.ts`; `src/data/templates.ts` re-exports it so previews and downloads stay consistent. README variants cover general apps, command-line tools and APIs. Full MIT, Apache 2.0 and GPL v3 texts are provided as alternatives, alongside a test report and optional configuration/contribution/folder guides. Browser configuration contains public settings only; private AI keys belong on a protected backend. Keep the catalog and sharing guide aligned with `docs/SUBMISSION_REQUIREMENTS.md` when changing policy. See [template review notes](docs/TEMPLATE_REVIEW.md) for sources and validation.

The Resources page (`/templates`) separates **Guides** for people, **Instructions** for coding assistants and **Templates** for project files. It includes AGENTS.md, CLAUDE.md, Copilot instructions, SECURITY.md and guides to describing/evaluating AI features. Resources distinguish apps built with AI from apps using AI at runtime; all new AI resources remain optional. See [resource classification and maintenance](docs/TEMPLATE_REVIEW.md).

## Security

- All user-supplied URLs are validated through `sanitizeUrl()` before being used in `href` or `window.open()` — only `http:` and `https:` schemes are allowed, preventing `javascript:` XSS injection
- `upvotes` and `featured` columns on `public.apps` are protected by a `BEFORE UPDATE` trigger that rejects changes from authenticated user sessions — only the internal `sync_upvote_count` trigger can update them
- Thumbnail uploads are restricted to `/<user_id>/*` paths in Supabase Storage — users cannot overwrite each other's files
- All tables have Row-Level Security enabled with ownership-checked policies
- No debug logs expose user data or internal state in production builds

---

## Getting Started

### Prerequisites

- Node.js ≥ 22
- A [Supabase](https://supabase.com) project

### 1. Clone & install

```bash
git clone https://github.com/your-org/openvibes.git
cd openvibes
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set up the database

Run the SQL in [`docs/supabase_schema.sql`](docs/supabase_schema.sql) in your Supabase Dashboard → **SQL Editor**.

Key points:
- The `upvotes` table records each user's vote; a trigger auto-syncs `apps.upvotes`
- Run **Security Migration 1** to protect `upvotes`/`featured` from direct API manipulation
- Run **Security Migration 2** to restrict thumbnail uploads to each user's own storage folder
- Row-Level Security is enabled on all tables
- Apply `docs/submission_guardrails_migration.sql` once after the base schema. Follow the deployment order in `docs/GUARDRAILS_OPERATIONS.md`; the new client cannot submit without the trusted API.

### 4. Run locally

```bash
npm run dev
```

### 5. Build for production

```bash
npm run build
npm run preview
```

---

## Versioning

The app version displayed in the footer is read directly from the `"version"` field in `package.json` at build time (injected as a compile-time constant by Vite). To release a new version, update `package.json`:

```json
"version": "1.1.0"
```

---

## Project Structure

```
src/
├── components/
│   ├── AppCard/          # App listing card (live community links from profiles)
│   ├── CommunityLinks/   # Slack/WhatsApp/Telegram link buttons (AppDetail)
│   ├── auth/             # SSO buttons
│   ├── Hero/             # Home page hero + search
│   ├── layout/           # Navbar, Footer (with version), Layout wrapper
│   ├── PaperCard/        # Whitepaper/article card
│   └── StatsBar/         # (legacy) floating stats widget
├── config/               # home limits, social links config, validation config
├── context/              # AuthContext (Supabase session + updateProfile + profiles upsert)
├── data/                 # Mock data (dev only)
├── i18n/                 # i18next inline resources (EN/ES/ZH)
├── lib/
│   ├── supabaseClient.ts # Supabase client
│   └── utils.ts          # sanitizeUrl() — XSS-safe URL helper
├── pages/                # Home, AppDetail, Submit, Whitepapers, Profile, Login, Register
└── types/                # VibeApp and related types
docs/
└── supabase_schema.sql   # Full DB schema + security migrations
config/
└── socialLinks.json      # Enabled social platforms
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build locally |
| `npm test` | Validator, submission API and SQL guardrail regression tests |
| `npm run typecheck:server` | Check server, CLI and tests |
| `npm run validate-server` | Start the trusted submission/review API |
| `npm run validate-repo -- URL` | Check a public GitHub repository; nonzero exit on rejection |

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes
4. Open a pull request

Please follow the existing code style (CSS Modules, typed props, i18n keys for all user-facing strings).

---

## License

See [LICENSE](LICENSE).
# Article sharing and app discovery

The homepage shows the latest five apps, with an `/apps` directory for search, filters and sorting. Article links are unique across all users, and article authors are displayed separately from people sharing their work. Apply `docs/article_integrity_migration.sql` before deploying the updated frontend; deployment and duplicate-recovery details are in [Guardrails operations](docs/GUARDRAILS_OPERATIONS.md).
