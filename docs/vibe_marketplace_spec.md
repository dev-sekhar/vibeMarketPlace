# OpenVibes — Vibe-Coded Apps Marketplace
**Requirement Specification & Implementation Guide**
*Last updated: April 2026 — reflects current build state*

---

## 1. Overview & Vision

OpenVibes is an open-source, community-led directory and marketplace where creators showcase, discover, and share applications built primarily via AI-assisted coding ("vibe coding"). It also hosts a curated research library of articles and whitepapers on vibe-coding methodology.

**The "Web 2.5" Approach:**
The core application runs on Web2 infrastructure (React + Supabase + GitHub OAuth) for blazing-fast performance and zero-friction onboarding. Optional Web3 features (creator tipping via crypto wallet) are planned for a future phase.

The platform must feel state-of-the-art and "alive" — exceptional visual aesthetics, smooth micro-interactions, accessibility, and an intuitive UX that reflects the bleeding-edge nature of AI-generated software.

---

## 2. Feature Status

### ✅ A. Landing & Discovery Page
- **Hero Section**: High-impact banner with bold headline, sub-headline, and CTAs ("Submit Your App", "Explore Apps").
- **Search & Filtering**: Prominent search bar with pill-shaped category filter tags (`Web App`, `CLI Tool`, `Productivity`, `Game`, `Developer Tool`, `Finance`, `AI Assistant`).
- **App Grid Layout**: Responsive grid maximising screen real estate. Caps at `HOME_APPS_LIMIT` with a "Show all" toggle. Homepage also shows a horizontal **Featured Spotlight** for admin-curated apps and a **Latest Research** row.
- **App Cards** (`<AppCard />`): Thumbnail with hover scale + brightness effect, overlay quick-actions (Live Demo, Source Code), category badge, upvote button (duplicate-proof, persisted via `upvotes` table), author name, short description, tech stack tags.
- **Live Navbar Stats**: App count, paper/article count, creator count, total upvotes, category count — updated in real time on upvote.

### ✅ B. App Detail & Community View
- **Detail page** at `/app/:slug` with full thumbnail, long description, tech stack tags, category, author, publish date.
- **"What it does" / "How to use it" / "Tech Stack"** information sections.
- **Live Demo + Source Code** action buttons (Live Demo conditionally hidden if no `app_url`).
- **Social Sharing**: "Share to LinkedIn" button opens a pre-composed LinkedIn share intent.
- **Research & Whitepapers**: Global `/whitepapers` page (see §E).

### ✅ C. User Accounts, Profiles & Trust System
- **Authentication**: GitHub OAuth via Supabase Auth. Email/password registration also supported. Google SSO available in `AuthContext` but not yet surfaced in the login UI.
- **Onboarding Modal**: On first login, users are prompted to set their full name and social profile links before proceeding.
- **Profile Page** (`/profile`): Edit full name; add/update social links (LinkedIn, Medium, GitHub — driven by `config/socialLinks.json`). Social link changes trigger a **24-hour article-submission cooldown** to prevent abuse.
- **Creator Badges**: Gamified badge tiers displayed in the Navbar next to the user's name, earned by submitting apps:
  | Badge | Tier | Requirement |
  |---|---|---|
  | 🥉 Newcomer | newcomer | 1+ apps |
  | 🥈 Builder | builder | 3+ apps |
  | 🥇 Maker | maker | 5+ apps |
  | 💎 Vibe Champion | champion | 10+ apps |
  | 🌟 Vibe Legend | legend | 20+ apps |
- **Session Management**: `AuthContext` exposes `sessionTimeLeft` + `isSessionExpiring`. Navbar shows a countdown at < 5 minutes remaining; auto-signs out at expiry.

### ✅ D. App Submission Portal
- **Submit App** form at `/submit` (authenticated only).
- **Fields**: App Name, Category, Repository URL, App URL (Live Demo), Short Description, Long Description, Thumbnail upload (Supabase Storage `thumbnails` bucket).
- **Post-moderation model**: Apps go live immediately on submit.
- **Featured tier**: `featured` boolean column — set manually by admins to promote apps to the Featured Spotlight on the home page.

### ✅ E. Research & Whitepapers
- **Global `/whitepapers` page**: Browse + submit externally-published articles and research.
- **Supported platforms**: LinkedIn, Medium, GitHub (configured via `config/socialLinks.json`; additional platforms can be unlocked by setting `enabled: true`).
- **Submission gates** (3 layers of validation):
  1. User must have submitted ≥ 1 vibe-coded app (proves they are a builder).
  2. 24-hour cooldown after any social link change (prevents impersonation via profile-swap).
  3. When claiming authorship (`isOwnArticle: true`), the author handle extracted from the article URL must match the handle in the user's stored profile URL for that platform — auto-matched, no manual input.
- **Article card** (`<PaperCard />`): Platform badge, title, description, "Read more →" link, author row.

### ✅ F. Developer Templates
- `/templates` page: Downloadable boilerplate files (`.gitignore`, `README.md`, `LICENSE`, `CONTRIBUTING.md`, `.env` example, repo structure guides).
- Searchable by keyword and filterable by category.

### ✅ G. Internationalisation (i18n)
- Full translation coverage across **English, Spanish (es), and Mandarin Chinese (zh)**.
- All keys managed inline in `src/i18n/i18n.ts` (no external JSON files).
- Language cycle button in Navbar (EN → ES → ZH → EN).

---

## 3. Not Yet Built (Planned)

### 🔲 Follow Creators
- `follows` table (`follower_id`, `followee_id`, `created_at`).
- "Follow" button on AppDetail and public user profile pages.
- Follower/following counts on profile.
- Email notification (Supabase Edge Function + SendGrid/Resend) when a followed creator submits a new app.

### 🔲 Public User Profile Pages (`/user/:username`)
- Display user's submitted apps, badge, follower/following counts, and bio.
- `AppCard` author name links to this page.
- *(Note: `/profile` — the self-edit page — is built. Public profile pages are separate.)*

### 🔲 Creator Tipping (Web 2.5)
- Optional crypto wallet connection for direct creator donations.
- No blocking dependency on this for core functionality.

### 🔲 Automated Harmful Content Screening
- Background task on submission to scan URLs and descriptions for malware/NSFW/harmful content.
- Until built: rely on community reporting and manual admin moderation.

### 🔲 App Detail — Screenshot Carousel
- Spec calls for multiple screenshots; currently only a single thumbnail is supported.
- DB schema has room for this (`thumbnail_url` is a single field — needs extending to `thumbnails TEXT[]`).

### 🔲 Community Links / Chat Integrations
- `community_links JSONB` column exists in the `apps` table — not yet surfaced in the UI.
- Planned: display Slack/Telegram/Discord/WhatsApp links on the App Detail page.

### 🔲 Google SSO
- `signInWithGoogle()` is implemented in `AuthContext` but not surfaced in the Login UI.
- Only GitHub OAuth is visible to users today.

---

## 4. Technology Stack & Architecture

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite 5 | Strict TS throughout; CSS Modules |
| Routing | React Router v7 | Client-side SPA routing |
| Auth / BaaS | Supabase (PostgreSQL + Auth + Storage) | RLS on all tables; GitHub OAuth |
| Styling | Vanilla CSS + CSS Variables | No utility-class framework; `index.css` design tokens |
| State | React Context (`AuthContext`) + component `useState` | No external state library |
| i18n | `react-i18next` (inline resources) | EN / ES / ZH |
| Icons | Lucide React | SVG icon set; no MUI |
| Rich text | Tiptap | Used in Whitepapers editor |
| Config | `config/socialLinks.json` | Toggles which social platforms are enabled |

**Key architectural decisions:**
- `useVibeAuth()` — typed hook wrapping the full Supabase Auth lifecycle including session timers, profile updates, and social link cooldown logic.
- Upvoting is recorded in a dedicated `upvotes(app_id, user_id)` table with a `UNIQUE` constraint (duplicate-proof). A `SECURITY DEFINER` trigger auto-syncs `apps.upvotes`.
- Social link management lives in Supabase `user_metadata` (`social_linkedin`, `social_medium`, `social_github`, `social_links_updated_at`).

---

## 5. Design Aesthetics & Accessibility

- **Theme**: Deep polished Dark Mode — surface colors `~#0F0F13`.
- **Accents**: Neon gradients (Electric Blue → Purple) for primary CTAs and glow effects.
- **Glassmorphism**: `backdrop-filter: blur` on Navbar, modals, and glass-panel cards.
- **Typography**: Inter / geometric sans-serif; sharp size contrast between headings and body.
- **Motion**: Card hover scale + glow, button `transform: scale(0.98)` press, image fade-in.
- **Accessibility**: Semantic HTML, ARIA labels on icon-only buttons, sufficient contrast in neon palette, keyboard-navigable forms.

---

## 6. Build Phases — Status

| Phase | Description | Status |
|---|---|---|
| 1 | Foundation & Design Tokens (`index.css` CSS variables) | ✅ Complete |
| 2 | Shell — Navbar (glassmorphic + live stats + badge) + Footer + Layout | ✅ Complete |
| 3 | Data & Components — `AppCard`, `PaperCard`, mock data | ✅ Complete |
| 4 | Landing Page — Hero, search/filter, app grid, featured spotlight | ✅ Complete |
| 5 | Routing + App Detail page | ✅ Complete |
| 6 | Auth — GitHub OAuth, email/password, session timer, onboarding | ✅ Complete |
| 7 | Submit App form + Supabase persistence | ✅ Complete |
| 8 | Whitepapers page + article submission gates | ✅ Complete |
| 9 | Profile page + social links + cooldown | ✅ Complete |
| 10 | Developer Templates page | ✅ Complete |
| 11 | Creator badge system (Navbar) | ✅ Complete |
| 12 | i18n — full EN / ES / ZH coverage | ✅ Complete |
| 13 | Rebrand to OpenVibes | ✅ Complete |
| — | Follow Creators | 🔲 Planned |
| — | Public user profile pages (`/user/:username`) | 🔲 Planned |
| — | Screenshot carousel on App Detail | 🔲 Planned |
| — | Community links / chat integrations on App Detail | 🔲 Planned |
| — | Automated harmful content screening | 🔲 Planned |
| — | Creator tipping (Web 2.5 / crypto wallet) | 🔲 Planned |
| — | Google SSO surfaced in Login UI | 🔲 Planned |
