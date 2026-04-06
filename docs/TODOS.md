# VibeMarket — TODO & Roadmap

This document tracks:
1. **Gaps** — features specified in `vibe_marketplace_spec.md` that are not yet implemented
2. **Enhancements** — improvements that would materially increase usability or community adoption

Items are grouped by priority tier. PRs for any item are welcome.

---

## Priority 1 — Critical Gaps (Specified but Missing)

These features were defined in the original spec and are absent from v1.0.0.

### 1.1 Community Reporting & Moderation Queue
**Spec reference:** §2B — Post-Moderation Model

- [ ] Add a **"Report App"** button on `AppDetail` (inappropriate, broken, or harmful content)
- [ ] Create a `reports` table in Supabase with `app_id`, `reporter_id`, `reason`, `created_at`
- [ ] Auto-hide apps that exceed a report threshold (e.g. 5 reports) pending admin review
- [ ] Build a minimal `/admin` route (RLS-gated to an `is_admin` user flag) listing flagged apps
- [ ] Expose an admin action: Approve / Remove / Verify app

### 1.2 Admin "Verified" Badge & Featured Curation
**Spec reference:** §2B — The "Admin Verified" Tier

- [ ] Add a `verified` boolean column to the `apps` table
- [ ] Display a "Verified" badge icon on `AppCard` and `AppDetail` for verified apps
- [ ] Add a "Featured" column; featured apps render in a dedicated hero carousel on the Home page
- [ ] Admin UI action to toggle `verified` and `featured` flags

### 1.3 Follow Creators
**Spec reference:** §2B — Follow Creators

- [ ] Create a `follows` table (`follower_id`, `followee_id`, `created_at`)
- [ ] Add a **"Follow"** button on `AppDetail` and future user profile pages
- [ ] Show follower/following counts on profile
- [ ] Trigger Supabase Edge Function to send email notification (via SendGrid/Resend) when a followed user submits a new app

### 1.4 User Profile Pages
**Spec reference:** Implied by author attribution on cards

- [ ] Create `/user/:username` route and `Profile` page
- [ ] Display user's submitted apps, badge, follower/following counts, and bio
- [ ] Allow authenticated users to edit their own profile (avatar, bio, social links)
- [ ] Update `AppCard` author name to link to `/user/:username`

### 1.5 App Screenshots / Carousel
**Spec reference:** §2C — Expanded Details

- [ ] Extend the `apps` table with a `screenshots` text[] column (array of Supabase Storage URLs)
- [ ] Add a multi-image upload step to the `Submit` form
- [ ] Render a lightbox/carousel on `AppDetail` in place of the single thumbnail
- [ ] Add keyboard navigation (arrow keys + Escape) for accessibility

### 1.6 LinkedIn Share Button
**Spec reference:** §2C — Social Sharing (LinkedIn)

- [ ] Add a "Share to LinkedIn" button on `AppDetail`
- [ ] Deep-link to `https://www.linkedin.com/sharing/share-offsite/?url=<encoded-app-url>`
- [ ] Include Open Graph meta tags (`og:title`, `og:description`, `og:image`) in page `<head>` for each app detail page so the share card renders correctly

### 1.7 Creator Tipping (Web 2.5 / Crypto Wallet)
**Spec reference:** §2B — Creator Tipping

- [ ] Integrate a wallet-connect library (e.g. RainbowKit + wagmi) — keep it optional/progressive
- [ ] Add an optional `wallet_address` field to the user profile
- [ ] Render a **"Tip Creator"** button on `AppDetail` when the submitter has a wallet address set
- [ ] Support ETH / MATIC tip transactions; display a confirmation toast on success

---

## Priority 2 — High-Impact Enhancements

Not in the original spec, but significantly improve usability and community growth.

### 2.1 Automated Content Screening
- [ ] On app submission, call a background Supabase Edge Function to scan the repo URL and description for indicators of malware, NSFW content, or policy violations
- [ ] Integrate a URL safety API (e.g. Google Safe Browsing API) to check live demo and repo URLs
- [ ] Flag submissions automatically; hold `status = 'pending_review'` if flagged

### 2.2 Pagination / Infinite Scroll on Home
- [ ] The current Home page loads all apps in one query — this will degrade at scale
- [ ] Implement cursor-based pagination on the Supabase `apps` query
- [ ] Either add page controls (Previous / Next) or implement an intersection-observer infinite scroll

### 2.3 Category/Tag Dedicated Pages
- [ ] Add `/category/:slug` routes that pre-filter the grid (e.g. `/category/productivity`)
- [ ] Render category pages as SEO-friendly, server-side-renderable views (consider Vite SSR or a meta-framework)
- [ ] Update Navbar with a "Categories" dropdown linking to the most popular tags

### 2.4 Dark / Light Mode Toggle
- [ ] The current design is dark-mode only; a light mode increases accessibility and broader appeal
- [ ] Add a `theme` CSS class on `<html>` toggled by a button in the Navbar
- [ ] Persist preference to `localStorage`

### 2.5 App Comments / Discussions
- [ ] Add a `comments` table (or integrate Giscus for a GitHub Discussions-backed comment system)
- [ ] Render a comment thread at the bottom of `AppDetail`
- [ ] Require authentication to comment; support nested replies (depth 1)

### 2.6 Creator Analytics Dashboard
- [ ] Add a `/dashboard` route for authenticated users showing:
  - Views per app (requires an `app_views` event table)
  - Upvote trend over time
  - Whitepaper read count
  - Follower growth
- [ ] Charts via a lightweight library (e.g. Recharts or Chart.js)

### 2.7 App Status Indicator
- [ ] Add a `status` enum to `apps` (`active`, `archived`, `deprecated`)
- [ ] Display a warning badge on cards/detail pages for archived or deprecated apps
- [ ] Allow submitters to update their app's status from their profile or dashboard

---

## Priority 3 — Developer Experience & Quality

### 3.1 Test Suite
- [ ] Add Vitest + React Testing Library for unit tests on key components (`AppCard`, `Hero`, `Submit` form validation)
- [ ] Add Playwright or Cypress E2E tests for the critical happy path: browse → view detail → submit app → upvote
- [ ] Set up CI via `.github/workflows/ci.yml` to run tests on every PR

### 3.2 CI/CD Pipeline
- [ ] `.github/workflows/ci.yml` — lint + type-check + test on every PR
- [ ] `.github/workflows/deploy.yml` — auto-deploy to Vercel on merge to `main`
- [ ] Add branch protection rules requiring CI to pass before merge

### 3.3 Supabase RLS Documentation
- [ ] Document all Row Level Security policies in `schema.sql` comments and in the spec
- [ ] Verify RLS policies are active in production; add a checklist to the deployment guide in README

### 3.4 Rate Limiting on Repo Validator
- [ ] The `server/index.ts` endpoint has no rate limiting; it can be abused to clone arbitrary repositories
- [ ] Add per-IP rate limiting (e.g. 10 requests/minute) using a simple in-memory store or Redis
- [ ] Add a `CORS_ORIGIN` env var check so only the production domain can call the validator

### 3.5 Email / Password Reset Flow
- [ ] The current email-auth flow has no password reset path
- [ ] Implement a "Forgot password" link on the Login page using `supabase.auth.resetPasswordForEmail()`
- [ ] Add a `/reset-password` route to handle the email deep-link callback

### 3.6 PWA Support
- [ ] Add a `vite-plugin-pwa` Web App Manifest so VibeMarket is installable
- [ ] Configure service worker for offline shell caching
- [ ] Add app icons in standard PWA sizes

### 3.7 Accessibility Audit
- [ ] Run an automated audit (axe-core or Lighthouse) and resolve all critical A11y violations
- [ ] Ensure all interactive elements have visible focus rings
- [ ] Verify colour contrast ratios meet WCAG 2.1 AA across all colour token combinations

---

## Completed (v1.0.0 baseline)

- [x] App discovery grid with search & category filters
- [x] App detail page (tech stack, links, community channels)
- [x] App submission form with repo validation server
- [x] Google & GitHub SSO (Supabase Auth)
- [x] Email/password auth (register + login)
- [x] Community upvoting (deduplicated per user)
- [x] Research whitepapers with TipTap rich editor
- [x] XSS protection on whitepaper render (DOMPurify)
- [x] Whitepaper publish gate (requires ≥1 submitted app)
- [x] Developer templates page (10 downloadable boilerplates)
- [x] Badge system — 5 tiers based on app count
- [x] i18n — English, Spanish, Mandarin
- [x] Language cycle toggle in Navbar
- [x] Glassmorphic dark-mode UI with neon gradients
- [x] 404 catch-all route
- [x] llms.txt for AI/GEO crawlers
- [x] Vercel SPA rewrite config
- [x] TypeScript strict mode — zero compile errors
- [x] Production audit — no hardcoded secrets, no debug logs
