export interface DevTemplate {
    id: string;
    category: 'readme' | 'gitignore' | 'license' | 'contributing' | 'env' | 'structure';
    name: string;
    description: string;
    filename: string;
    content: string;
    tags: string[];
}

export const TEMPLATE_CATEGORIES = [
    { id: 'all', label: 'All Templates' },
    { id: 'readme', label: 'README' },
    { id: 'gitignore', label: '.gitignore' },
    { id: 'license', label: 'LICENSE' },
    { id: 'contributing', label: 'CONTRIBUTING' },
    { id: 'env', label: '.env Example' },
    { id: 'structure', label: 'Repo Structure' },
] as const;

export const TEMPLATES: DevTemplate[] = [
    // ── READMEs ──────────────────────────────────────────────────────────
    {
        id: 'readme-vibe-app',
        category: 'readme',
        name: 'Vibe-Coded App README',
        description: 'Full README for a vibe-coded project with tech stack, demo link, and contribution guide.',
        filename: 'README.md',
        tags: ['vibe', 'general', 'open-source'],
        content: `# 🚀 App Name

> One-line punchy description of what this app does.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Vibe Coded](https://img.shields.io/badge/Vibe-Coded-blueviolet)](https://vibemarket.dev)

## ✨ Features

- ⚡ Feature one
- 🎨 Feature two
- 🤖 Feature three

## 🛠 Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Styling:** CSS Variables + Lucide Icons
- **AI:** OpenAI / Claude API

## 🖥 Live Demo

👉 [Try it live](https://your-demo-url.vercel.app)

## 🏁 Quick Start

\`\`\`bash
git clone https://github.com/your-username/project-name
cd project-name
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
\`\`\`

## 📋 Prerequisites

- Node.js 18+
- Supabase account (free tier works)
- API key for the AI provider you use

## 🌍 Environment Variables

See [.env.example](.env.example) for required variables.

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## 📜 License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

---

Built with ❤️ and vibes
`
    },
    {
        id: 'readme-cli-tool',
        category: 'readme',
        name: 'CLI Tool README',
        description: 'README template optimised for command-line tools with usage examples and flags table.',
        filename: 'README.md',
        tags: ['cli', 'tool', 'terminal'],
        content: `# 🔧 cli-tool-name

> Short description of what the CLI does in one sentence.

[![npm version](https://img.shields.io/npm/v/cli-tool-name)](https://npmjs.com/package/cli-tool-name)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📦 Installation

\`\`\`bash
npm install -g cli-tool-name
# or
npx cli-tool-name
\`\`\`

## 🚀 Usage

\`\`\`bash
cli-tool-name [command] [options]
\`\`\`

### Commands

| Command | Description |
|---------|-------------|
| \`init\` | Initialise a new project |
| \`run\` | Run the main process |
| \`build\` | Build for production |

### Options

| Flag | Alias | Default | Description |
|------|-------|---------|-------------|
| \`--verbose\` | \`-v\` | \`false\` | Enable verbose logging |
| \`--output\` | \`-o\` | \`./dist\` | Output directory |
| \`--config\` | \`-c\` | \`cli.config.js\` | Config file path |

## 💡 Examples

\`\`\`bash
# Basic
cli-tool-name run

# With options
cli-tool-name build --output ./out --verbose
\`\`\`

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## 📜 License

MIT — see [LICENSE](LICENSE).
`
    },
    {
        id: 'readme-api',
        category: 'readme',
        name: 'REST API README',
        description: 'README for a REST or GraphQL API project with endpoint table and auth notes.',
        filename: 'README.md',
        tags: ['api', 'backend', 'rest'],
        content: `# 🌐 API Name

> Brief description of what this API provides.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🚀 Quick Start

\`\`\`bash
git clone https://github.com/you/api-name
cd api-name
npm install
cp .env.example .env
npm run dev   # starts on http://localhost:3000
\`\`\`

## 📡 Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | \`/auth/register\` | Create a new account |
| POST | \`/auth/login\` | Get access token |
| POST | \`/auth/refresh\` | Refresh access token |

### Resources

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`/api/v1/items\` | List all items |
| POST | \`/api/v1/items\` | Create an item |
| GET | \`/api/v1/items/:id\` | Get item by ID |
| PUT | \`/api/v1/items/:id\` | Update item |
| DELETE | \`/api/v1/items/:id\` | Delete item |

## 🔐 Authentication

Pass a Bearer token in the Authorization header:

\`\`\`
Authorization: Bearer <your-access-token>
\`\`\`

## 🌍 Environment Variables

See [.env.example](.env.example).

## 📜 License

MIT — see [LICENSE](LICENSE).
`
    },

    // ── .gitignore ───────────────────────────────────────────────────────
    {
        id: 'gitignore-node',
        category: 'gitignore',
        name: 'Node.js / React',
        description: 'Comprehensive .gitignore for Node.js, React, Vite, and TypeScript projects.',
        filename: '.gitignore',
        tags: ['node', 'react', 'vite', 'typescript'],
        content: `# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
dist-ssr/
build/
out/
.output/

# Environment variables
.env
.env.local
.env.*.local
.env.development
.env.production

# Supabase local
.supabase/

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage & testing
coverage/
*.lcov
.nyc_output/

# IDE & editors
.vscode/*
!.vscode/extensions.json
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
.DS_Store
Thumbs.db

# TypeScript cache
*.tsbuildinfo

# Vite
vite.config.ts.timestamp-*

# OS files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
`
    },
    {
        id: 'gitignore-python',
        category: 'gitignore',
        name: 'Python',
        description: '.gitignore for Python, FastAPI, Django, and data science projects.',
        filename: '.gitignore',
        tags: ['python', 'fastapi', 'django', 'data-science'],
        content: `# Byte-compiled / optimised cache
__pycache__/
*.py[cod]
*$py.class

# Virtual environments
.env
.venv
env/
venv/
ENV/
env.bak/
venv.bak/

# Environment variables
.env
.env.local
.env.*.local

# Distribution / packaging
dist/
build/
*.egg-info/
*.egg
MANIFEST
.eggs/

# Unit test / coverage
htmlcov/
.tox/
.nox/
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
*.py,cover
.pytest_cache/

# Jupyter
.ipynb_checkpoints/
*.ipynb

# mypy
.mypy_cache/
.dmypy.json
dmypy.json

# IDEs
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# SQLite
*.db
*.sqlite3
`
    },

    // ── LICENSEs ─────────────────────────────────────────────────────────
    {
        id: 'license-mit',
        category: 'license',
        name: 'MIT License',
        description: 'Permissive MIT License — the most popular open-source license.',
        filename: 'LICENSE',
        tags: ['mit', 'permissive', 'open-source'],
        content: `MIT License

Copyright (c) ${new Date().getFullYear()} YOUR NAME

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`
    },
    {
        id: 'license-apache',
        category: 'license',
        name: 'Apache 2.0 License',
        description: 'Apache 2.0 — permissive licence with patent grant and attribution requirements.',
        filename: 'LICENSE',
        tags: ['apache', 'enterprise', 'patent'],
        content: `                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   Copyright ${new Date().getFullYear()} YOUR NAME

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
`
    },
    {
        id: 'license-gpl3',
        category: 'license',
        name: 'GPL v3 License',
        description: 'GNU GPL v3 — copyleft licence; derived works must also be open-source.',
        filename: 'LICENSE',
        tags: ['gpl', 'copyleft', 'open-source'],
        content: `                    GNU GENERAL PUBLIC LICENSE
                       Version 3, 29 June 2007

 Copyright (C) ${new Date().getFullYear()} YOUR NAME

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
`
    },

    // ── CONTRIBUTING ─────────────────────────────────────────────────────
    {
        id: 'contributing-standard',
        category: 'contributing',
        name: 'CONTRIBUTING Guide',
        description: 'Standard contribution guide covering issues, PRs, commit style, and code of conduct.',
        filename: 'CONTRIBUTING.md',
        tags: ['community', 'open-source', 'pr'],
        content: `# Contributing to Project Name

Thank you for your interest in contributing! 🎉

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Commit Convention](#commit-convention)

## Code of Conduct

This project adheres to the [Contributor Covenant](https://www.contributor-covenant.org). By participating, you're expected to uphold this code.

## How Can I Contribute?

### 🐛 Reporting Bugs

1. Check existing [issues](../../issues) first.
2. Use the **Bug Report** issue template.
3. Include steps to reproduce, expected vs actual behaviour, and your environment.

### 💡 Suggesting Features

1. Open a [Feature Request](../../issues/new?template=feature_request.md).
2. Describe the problem your feature solves.

### 🔧 Submitting a Pull Request

1. Fork the repository.
2. Create a branch: \`git checkout -b feat/your-feature\`
3. Make your changes and commit (see convention below).
4. Push to your fork and open a PR against \`main\`.

## Development Setup

\`\`\`bash
git clone https://github.com/YOUR_USERNAME/project-name
cd project-name
npm install
cp .env.example .env.local
npm run dev
\`\`\`

## Pull Request Process

1. Ensure all tests pass: \`npm test\`
2. Update docs if needed.
3. Request a review from a maintainer.
4. PRs are squash-merged once approved.

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org):

| Prefix | Use when |
|--------|----------|
| \`feat:\` | Adding a new feature |
| \`fix:\` | Fixing a bug |
| \`docs:\` | Documentation changes only |
| \`style:\` | Formatting (no logic change) |
| \`refactor:\` | Code restructure (no feature/fix) |
| \`test:\` | Adding or updating tests |
| \`chore:\` | Build process or meta changes |

**Examples:**
\`\`\`
feat: add dark mode toggle
fix: prevent crash on empty search
docs: update README quickstart
\`\`\`

---

Thanks again — happy coding! 🚀
`
    },

    // ── .env.example ─────────────────────────────────────────────────────
    {
        id: 'env-supabase-react',
        category: 'env',
        name: 'Supabase + React',
        description: '.env.example for a Vite/React app using Supabase and common AI APIs.',
        filename: '.env.example',
        tags: ['supabase', 'react', 'vite', 'openai'],
        content: `# ──────────────────────────────────────────────
# Supabase
# ──────────────────────────────────────────────
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# ──────────────────────────────────────────────
# AI Providers (use whichever you need)
# ──────────────────────────────────────────────
VITE_OPENAI_API_KEY=sk-...
VITE_ANTHROPIC_API_KEY=sk-ant-...

# ──────────────────────────────────────────────
# App Config
# ──────────────────────────────────────────────
VITE_APP_URL=http://localhost:5173
VITE_APP_NAME=MyVibeApp

# ──────────────────────────────────────────────
# Analytics (optional)
# ──────────────────────────────────────────────
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# ──────────────────────────────────────────────
# NOTE: Never commit the real .env file.
# Copy this file to .env.local and fill in values.
# ──────────────────────────────────────────────
`
    },
    {
        id: 'env-node-api',
        category: 'env',
        name: 'Node.js / Express API',
        description: '.env.example for a Node.js backend with database, auth tokens, and email.',
        filename: '.env.example',
        tags: ['node', 'express', 'api', 'postgres'],
        content: `# ──────────────────────────────────────────────
# Server
# ──────────────────────────────────────────────
PORT=3000
NODE_ENV=development

# ──────────────────────────────────────────────
# Database
# ──────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# ──────────────────────────────────────────────
# Authentication
# ──────────────────────────────────────────────
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=another-long-random-string

# ──────────────────────────────────────────────
# Email (e.g. Resend, SendGrid)
# ──────────────────────────────────────────────
EMAIL_FROM=noreply@yourdomain.com
RESEND_API_KEY=re_...

# ──────────────────────────────────────────────
# Redis (optional, for caching / queues)
# ──────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ──────────────────────────────────────────────
# NOTE: Never commit the real .env file.
# ──────────────────────────────────────────────
`
    },

    // ── Repo Structure ───────────────────────────────────────────────────
    {
        id: 'structure-react-vite',
        category: 'structure',
        name: 'React + Vite Project Structure',
        description: 'Recommended folder structure for a production React/TypeScript/Vite project.',
        filename: 'STRUCTURE.md',
        tags: ['react', 'vite', 'typescript', 'structure'],
        content: `# Recommended React + Vite Project Structure

\`\`\`
my-app/
├── public/                 # Static assets (copied as-is to dist/)
│   └── icons/
├── src/
│   ├── assets/             # Images, fonts, SVGs imported by JS
│   ├── components/         # Reusable UI components
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   └── Button.module.css
│   │   └── layout/
│   │       ├── Navbar.tsx
│   │       └── Footer.tsx
│   ├── context/            # React Context providers
│   │   └── AuthContext.tsx
│   ├── data/               # Static data / mocks
│   │   └── mockData.ts
│   ├── hooks/              # Custom React hooks
│   │   └── useAuth.ts
│   ├── lib/                # Third-party client setup
│   │   └── supabaseClient.ts
│   ├── pages/              # Route-level page components
│   │   ├── Home.tsx
│   │   └── Dashboard.tsx
│   ├── types/              # TypeScript type definitions
│   │   └── app.ts
│   ├── utils/              # Pure utility functions
│   │   └── formatDate.ts
│   ├── App.tsx             # Root component with router
│   ├── index.css           # Global styles / CSS variables
│   └── main.tsx            # Entry point
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── CONTRIBUTING.md
├── LICENSE
└── README.md
\`\`\`

## Naming Conventions

- **Components:** PascalCase folders + files (e.g. \`Button/Button.tsx\`)
- **Hooks:** camelCase prefixed with \`use\` (e.g. \`useAuth.ts\`)
- **Utilities:** camelCase (e.g. \`formatDate.ts\`)
- **Types:** PascalCase interfaces/types, camelCase files (e.g. \`app.ts\` exporting \`VibeApp\`)
- **CSS Modules:** Same name as component (e.g. \`Button.module.css\`)

## Key Principles

1. Keep components small — if a file exceeds ~150 lines, split it.
2. Co-locate styles with components (CSS Modules).
3. Never put business logic in page components — move to hooks or utils.
4. Export only named exports (no default exports except pages/App).
`
    },
];
