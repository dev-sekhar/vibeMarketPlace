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
| Icons | Lucide React |
| Rich text | Tiptap |

---

## Features

- **App directory** — browse, search, and filter vibe-coded apps by category
- **App detail pages** — thumbnails, tech stack, tags, live demo & repo links
- **Upvoting** — authenticated users can upvote apps (persisted via Supabase, duplicate-proof)
- **Submit an app** — authenticated users can list their own vibe-coded projects
- **Research & Whitepapers** — share and browse articles published on LinkedIn, Medium, GitHub, or elsewhere
- **Author verification** — article submissions auto-match your profile social handle to prevent impersonation
- **Profile page** — full name, social links (LinkedIn, Medium, GitHub) with a 24-hour cooldown on social link changes
- **Authentication** — GitHub OAuth via Supabase Auth
- **Localisation** — full EN / ES / ZH support
- **Navbar stats** — live app count, paper count, creator count, total upvotes, and category count
- **Session expiry indicator** — countdown timer when your session is about to expire

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
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
- The `upvotes` table records each user's vote; a `SECURITY DEFINER` trigger auto-syncs `apps.upvotes`
- Row-Level Security is enabled on all tables

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

## Project Structure

```
src/
├── components/
│   ├── AppCard/          # App listing card
│   ├── auth/             # SSO buttons
│   ├── Hero/             # Home page hero + search
│   ├── layout/           # Navbar, Footer, Layout wrapper
│   ├── PaperCard/        # Whitepaper/article card
│   └── StatsBar/         # (legacy) floating stats widget
├── config/               # home limits, social links config
├── context/              # AuthContext (Supabase session + updateProfile)
├── data/                 # Mock data (dev only)
├── i18n/                 # i18next inline resources (EN/ES/ZH)
├── lib/                  # supabaseClient
├── pages/                # Home, AppDetail, Submit, Whitepapers, Profile, Login, Register
└── types/                # VibeApp and related types
docs/
└── supabase_schema.sql   # Full DB schema + migrations
config/
└── socialLinks.json      # Enabled social platforms (LinkedIn, Medium, GitHub)
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build locally |

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
