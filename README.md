# Al Riyadi — Photo Gallery

A photo gallery for **Al Riyadi** with an animated marquee viewer, public photo uploads, and a passcode-protected admin panel for moderation and ordering.

[![Build](https://img.shields.io/github/actions/workflow/status/archeroff/riy/deploy.yml?job=build&label=Build)](https://github.com/archeroff/riy/actions/workflows/deploy.yml)
[![Supabase](https://img.shields.io/github/actions/workflow/status/archeroff/riy/deploy.yml?job=deploy-backend&label=Supabase)](https://github.com/archeroff/riy/actions/workflows/deploy.yml)
[![Cloudflare](https://img.shields.io/github/actions/workflow/status/archeroff/riy/deploy.yml?job=deploy-frontend&label=Cloudflare)](https://github.com/archeroff/riy/actions/workflows/deploy.yml)

- **Live site**: [alriyadi.pages.dev](https://alriyadi.pages.dev)
- **CI/CD**: GitHub Actions — `deploy.yml` (build + Supabase backend + Cloudflare Pages frontend)
- **Version**: 0.0.0 (`package.json`)
- **License**: Not detected (no license file in the repository)

---

## Overview

Al Riyadi is a single-page photo gallery where visitors can browse approved photos through two animated marquee presentations, submit their own photos for review, and site owners can moderate, approve, and order photos behind a passcode-protected admin panel.

**Main purpose:** Display an ever-growing gallery of Al Riyadi photos in a visually striking, animated marquee format, driven by community submissions.

**Intended users:**

- Visitors — view the gallery and upload photos
- Site owner / admin — review, approve, reject, delete, and reorder photos

**Key features:**

- Two full-screen marquee views: a diagonal multi-row CSS marquee and a GSAP-powered card-fan carousel
- Public upload flow with drag-and-drop, multi-file selection, per-file validation, and live upload status
- Moderation pipeline — uploads land as `pending` and only appear publicly once approved
- Passcode-protected admin panel with bulk approve/reject/delete, search, filters, and drag-to-reorder
- Rotatable admin passcode (server-side hash comparison) backed by a master password
- Serverless backend entirely on Supabase (PostgreSQL, Storage, RLS, RPCs)
- Dark/light theme support (Tailwind CSS v4 with `dark:` variants)

---

## Features

- Animated **diagonal marquee** viewer (5 rows, alternating directions, pause on hover)
- **Card-fan carousel** viewer with GSAP elastic animations and touch/button navigation
- Public **photo upload** page with drag-and-drop, multi-select, type/size validation (JPEG, PNG, WebP, GIF; max 10 MB)
- Uploads queued as **pending review**; only approved photos are shown publicly
- **Admin panel** with passcode login, pending/approved/all filters, text search, and live status badges
- **Bulk moderation** — multi-select toolbar for approve / reject / delete
- **Drag-to-reorder** and arrow-button ordering of approved photos with automatic persistence
- **Passcode management** — rotate the admin passcode using the master password
- Empty-state and configuration diagnostics (Supabase URL, storage bucket status) surfaced in the UI

---

## Tech Stack

### Frontend

- React 19
- Vite 8
- TypeScript 7
- React Router 7
- Tailwind CSS 4 (via `@tailwindcss/vite`)
- shadcn/ui (Base UI) — Base UI primitives, `class-variance-authority`, `tailwind-merge`
- GSAP (card-fan carousel animations)
- Motion
- lucide-react (icons)
- Geist Variable font (`@fontsource-variable/geist`)
- Oxlint (linting)

### Backend

- Supabase (managed PostgreSQL + PostgREST)
- SQL functions (`security definer`) for admin operations
- Supabase Storage (public `photos` bucket)
- Row Level Security (RLS)

### Database

- PostgreSQL (via Supabase)
- Storage buckets, RLS policies, and RPCs defined in `supabase/schema.sql`

### Infrastructure

- Cloudflare Pages (frontend hosting)
- Supabase (database, storage, serverless backend)
- GitHub Actions (CI/CD)

---

## Project Structure

```text
.
├── .github
│   └── workflows
│       └── deploy.yml              # Build + deploy backend (Supabase) + frontend (Cloudflare Pages)
├── components
│   └── ui                          # Reusable UI components
│       ├── button.tsx
│       ├── card-fan-carousel.tsx   # GSAP card-fan carousel
│       ├── card-fan-carousel-demo.tsx
│       ├── great-ui-diagonal-marquee-carousel.tsx  # Diagonal marquee rows
│       ├── great-ui-diagonal-marquee-carousel-demo.tsx
│       ├── demo.tsx
│       ├── marquee-along-svg-path.tsx
│       ├── orbiting-circles-02.tsx
│       ├── orbiting-circles-02-demo.tsx
│       └── orbiting-circles-02-utils
│           └── particalsphear.tsx
├── lib
│   ├── photos.ts                   # Supabase data layer (photos, uploads, admin RPCs)
│   ├── supabase.ts                 # Supabase client + env config
│   └── utils.ts                    # cn() class-name helper
├── public
│   ├── _redirects                  # SPA fallback for Cloudflare Pages
│   ├── favicon.png
│   ├── favicon.svg
│   └── icons.svg
├── scripts
│   └── seed-photos.mjs             # Bootstrap schema + seed photos from a local folder
├── src
│   ├── pages
│   │   ├── AdminPage.tsx           # Passcode login + moderation panel
│   │   ├── MarqueeViewer.tsx       # Public marquee viewer (/)
│   │   └── UploadPage.tsx          # Public photo upload (/upload)
│   ├── App.tsx                     # Route definitions
│   ├── index.css                   # Tailwind theme + design tokens
│   ├── main.tsx                    # App entry point
│   └── vite-env.d.ts
├── supabase
│   └── schema.sql                  # Full backend schema (bucket, policies, tables, RLS, RPCs)
├── .env.example
├── .gitignore
├── .oxlintrc.json
├── components.json                 # shadcn/ui configuration
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

**Directory purposes:**

- `src/pages` — the three application screens (viewer, upload, admin)
- `components/ui` — presentational/carousel UI components
- `lib` — Supabase client setup and the photo data-access layer
- `supabase` — the complete backend definition (SQL)
- `scripts` — Node seeding/bootstrap utilities
- `.github/workflows` — CI/CD pipeline

---

## Architecture

The project is a **serverless single-page application**: a React SPA frontend hosted on **Cloudflare Pages** that communicates directly with **Supabase** (PostgreSQL via PostgREST, Storage, and RPC functions). There is no custom application server — the "backend" is Supabase's database, storage, and SQL functions protected by Row Level Security.

**Request flow:**

1. **Viewing (`/`)** — `MarqueeViewer` calls `listApproved()` in `lib/photos.ts`, which selects `photos` rows where `status = 'approved'`. RLS enforces the approved-only read policy. Results feed the diagonal-marquee and card-fan carousels.
2. **Uploading (`/upload`)** — `UploadPage` validates files client-side (type + size), uploads each to the public `photos` Storage bucket, then inserts a row into `photos` with `status = 'pending'`. RLS allows anonymous inserts.
3. **Moderation (`/admin`)** — `AdminPage` authenticates the user with a passcode, then calls `security definer` SQL functions to list, approve, reject, delete, and reorder photos, bypassing the approved-only read policy.

**Authentication flow:** The admin enters a passcode. The client compares it against a build-time master value and/or calls the `verify_password(pwd)` RPC, which compares a SHA-256 digest against the hash stored in the (server-side-only) `settings` table. A successful login is recorded in `sessionStorage`.

**Deployment topology:**

```text
Visitor ──► Cloudflare Pages (React SPA)
                 │  HTTPS (PostgREST / Storage / RPCs)
                 ▼
            Supabase
          ├── PostgreSQL (photos, settings)
          ├── Storage bucket "photos" (public)
          └── SQL functions + RLS
```

---

## Frontend

- **Framework**: React 19 (StrictMode), TypeScript, Vite 8
- **Routing**: React Router 7 — `/` (viewer), `/upload`, `/admin`, catch-all redirect
- **State management**: Local component state / hooks; no global store
- **UI library**: shadcn/ui (Base UI) + lucide-react icons
- **Styling**: Tailwind CSS v4 with `@theme` tokens, `tw-animate-css`, Geist font, light/dark themes via `@custom-variant dark`
- **API layer**: Supabase client (`lib/supabase.ts`) + typed data layer (`lib/photos.ts`)
- **Animations**: GSAP (card-fan carousel), CSS keyframe marquees, Motion
- **Forms/validation**: Client-side validation in `UploadPage` (MIME type allowlist, 10 MB max) and `AdminPage` (passcode length/match)
- **Data fetching**: `useEffect` + async Supabase calls with cancellation guards
- **Build system**: Vite with `@vitejs/plugin-react`, `@tailwindcss/vite`, `@` alias to project root

---

## Backend

The backend is defined entirely in `supabase/schema.sql` and runs on Supabase:

- **Database**: PostgreSQL tables `photos` (id, url, alt, sort_order, status, created_at) and `settings` (key/value store for password hashes)
- **Storage**: Public `photos` bucket with a 10 MB file-size limit
- **RLS**: Enabled on both tables — public reads limited to approved photos; `settings` has no read policy (stays server-side)
- **Security functions** (`security definer`, restricted `search_path`):
  - `verify_password(pwd)` — server-side hash comparison
  - `set_admin_password(master, new_pwd)` — rotate passcode, requires master password
  - `list_photos_all()` — list every photo regardless of status
  - `approve_photo(p_id)` / `set_photo_status(p_ids, p_status)` — single and bulk status updates
  - `delete_photo(p_id)` — delete a photo row (client removes the Storage object)
  - `update_order(ids)` — persist a custom ordering
- **Queues / cron jobs / caching / logging**: Not detected from the repository

Schema changes are applied remotely through the Supabase **Management API** during CI (requires a Supabase access token) or manually via the Supabase SQL editor.

---

## Services Used

| Service | Purpose | Where it is used |
| ------- | ------- | ---------------- |
| **Supabase** | Managed PostgreSQL, Storage, RLS, and SQL RPCs | Database + storage for the gallery; admin operations via RPC; schema bootstrap via the Management API in CI |
| **Cloudflare Pages** | Static frontend hosting | SPA deployed with `wrangler pages deploy` (project `alriyadi`); `public/_redirects` provides SPA fallback |
| **GitHub Actions** | CI/CD | Build, Supabase schema deployment, and Cloudflare Pages deployment on push to `main` |

Other services (Stripe, Clerk, Auth0, Firebase, Sentry, Resend, SendGrid, OpenAI, Redis, etc.): **Not detected from the repository.**

---

## Database

- **Engine**: PostgreSQL (managed by Supabase)
- **ORM**: None — data is accessed via the Supabase client (PostgREST) and SQL functions
- **Schema organization**: Single schema maintained idempotently in `supabase/schema.sql`
- **Migrations**: No migration framework; schema is (re)applied via the Management API in CI or manually in the SQL editor. All statements are idempotent (`create table if not exists`, `drop policy if exists`).
- **Tables**:
  - `photos` — `id uuid PK`, `url text`, `alt text`, `sort_order bigint`, `status text ('pending'|'approved')`, `created_at timestamptz`
  - `settings` — `key text PK`, `value text` (holds `master_password_hash` / `admin_password_hash`)
- **Relationships**: No relational references; `photos.url` points to the public Storage object path
- **Storage**: Public `photos` bucket, 10 MB file cap; public read/upload/delete policies on `storage.objects` for `anon, authenticated`

---

## API

There is no custom REST/GraphQL API. The application uses:

- **PostgREST** (via the Supabase JS client) for table queries and inserts (`photos` select/insert)
- **Supabase Storage API** for uploads, listing, public URLs, and object deletion
- **RPC functions** (see Backend) for all admin operations
- **Supabase Management API** (in CI only) for remote schema application

**Key data-layer functions** (`lib/photos.ts`):

| Function | Description |
| -------- | ----------- |
| `listApproved()` | Fetch approved photos ordered by sort order |
| `uploadPhoto(file)` | Upload to Storage and insert a `pending` row |
| `getUploadStatus()` | Probe the Storage bucket and surface configuration state |
| `listAll()` | RPC `list_photos_all` — all photos for admin |
| `approvePhoto(id)` / `setPhotoStatus(ids, status)` | Single / bulk moderation |
| `deletePhoto(id, url)` | Remove Storage object + delete row |
| `updateOrder(ids)` | Persist drag/drop ordering |
| `verifyAdminPassword(pwd)` / `setAdminPassword(master, pwd)` | Passcode verification and rotation |

---

## Authentication

Passcode-based admin authentication — **not** Supabase Auth / OAuth / JWT:

- The admin passcode is verified by the `verify_password` RPC, which compares a SHA-256 digest inside the database; the hash never leaves the server.
- The **master password** (build-time `VITE_ADMIN_MASTER_PASS`, seeded as `master_password_hash`) is required to rotate the admin passcode via `set_admin_password`.
- A successful login sets a `sessionStorage` flag (`alriyadi_admin_authed`) for the browser session.
- Public uploads require no authentication; RLS and SQL functions constrain what anonymous users can do.
- ⚠️ **Note:** `lib/supabase.ts` contains a hardcoded fallback master passcode (`alriyadi-master`) used when `VITE_ADMIN_MASTER_PASS` is unset — see Security.

---

## Environment Variables

| Variable | Description | Required |
| -------- | ----------- | -------- |
| `VITE_SUPABASE_URL` | Supabase project URL (e.g. `https://<ref>.supabase.co`) | Yes — Supabase features |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key | Yes — Supabase features |
| `VITE_ADMIN_MASTER_PASS` | Master password used to seed/rotate the admin passcode hash | Yes — admin auth (has a code fallback) |
| `SUPABASE_SECRET_KEY` | Supabase service-role key; lets the seed script create buckets/upload | Only for `scripts/seed-photos.mjs` |
| `SUPABASE_ACCESS_TOKEN` | Supabase personal access token; applies the schema via the Management API | Only for CI schema deploy (otherwise apply manually) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | Yes — Cloudflare Pages deploy |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | Yes — Cloudflare Pages deploy |

`CLOUDFLARE_*`, `SUPABASE_ACCESS_TOKEN`, and `ADMIN_MASTER_PASS` are consumed only by the GitHub Actions workflow, not the app itself. The app reads the three `VITE_*` variables at build time (see `.env.example`).

---

## Installation

Requirements: Node.js 20+ (CI uses Node 24) and npm.

```bash
git clone git@github.com:archeroff/riy.git
cd riy
npm install
```

Copy `.env.example` to `.env.local` and fill in the Supabase values:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_ADMIN_MASTER_PASS=...
```

---

## Development

**Run the frontend dev server:**

```bash
npm run dev
```

**Bootstrap the backend** (one-time). Either run `supabase/schema.sql` in the Supabase SQL editor, or with a Supabase access token:

```bash
node scripts/seed-photos.mjs --schema-only
```

**Seed photos from a local folder** (default `./pix`, ignored by git):

```bash
node scripts/seed-photos.mjs --dir ./pix --status approved
```

No local database or Docker setup is required — the backend runs entirely on Supabase.

---

## Build

```bash
npm run build    # tsc -b && vite build
npm run preview  # preview the production build locally
```

The build output is written to `dist/`.

---

## Testing

**Not detected from the repository.** No unit, integration, or end-to-end test framework or test files are present.

---

## Deployment

Deployment is automated via GitHub Actions (see CI/CD) on every push to `main`.

### Frontend — Cloudflare Pages

The SPA is deployed to Cloudflare Pages (project `alriyadi`) and is live at [https://alriyadi.pages.dev](https://alriyadi.pages.dev):

- `wrangler pages project create alriyadi --production-branch=main` (idempotent)
- `wrangler pages deploy dist --project-name=alriyadi --branch=main`
- `public/_redirects` (`/* /index.html 200`) enables the SPA fallback
- **Not used:** Cloudflare Workers, D1, KV, R2, Durable Objects

### Backend — Supabase

- **Database**: `photos` + `settings` tables with RLS, created from `supabase/schema.sql`
- **Storage**: public `photos` bucket (10 MB cap)
- **Auth**: passcode-based, verified through SQL functions
- **Edge functions**: none — schema is applied via the Management API during CI, or manually in the SQL editor

---

## CI/CD

`.github/workflows/deploy.yml` runs on push to `main` and manual dispatch (concurrency-limited, cancel-in-progress):

1. **Build** — checkout, Node 24 + npm cache, `npm ci`, `npm run build` with `VITE_*` env vars, upload `dist/` artifact.
2. **Deploy backend (Supabase)** — after build; runs `node scripts/seed-photos.mjs --schema-only`, which applies `supabase/schema.sql` and seeds the master password hash via the Management API (`SUPABASE_ACCESS_TOKEN`; skips non-fatally if absent).
3. **Deploy frontend (Cloudflare Pages)** — after build; downloads the `dist/` artifact and deploys with Wrangler.

---

## Scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check (`tsc -b`) then production-build with Vite |
| `npm run lint` | Lint the codebase with Oxlint |
| `npm run preview` | Preview the production build locally |
| `node scripts/seed-photos.mjs` | Apply schema / seed photos (flags: `--dir`, `--status`, `--reset`, `--schema-only`) |

---

## Security

- **Row Level Security** is enabled on `photos` and `settings`; the public read policy exposes only `approved` rows.
- **Server-side password hashing** — admin passcodes are stored as SHA-256 digests and compared inside the database via `security definer` functions; hashes are never sent to or read by the client.
- **Restricted function context** — `security definer` functions pin `search_path` to reduce privilege-escalation risk.
- **Anonymous upload constraints** — anyone may insert a photo, but it lands as `pending` and is invisible until approved.
- **Secrets** — all keys/secrets are supplied through GitHub Actions secrets and build-time environment variables; `.env*` and `dist/` are gitignored.
- **Notable risk:** `lib/supabase.ts` hardcodes a default master passcode fallback (`"alriyadi-master"`) when `VITE_ADMIN_MASTER_PASS` is not set, and the master value itself is compiled into the client bundle. If a strong barrier is required, do not rely on the bundled master value; always set `VITE_ADMIN_MASTER_PASS` at build time.
- The schema applies broad `insert`/`delete` policies on storage objects and public execution grants on admin RPCs — this keeps the admin UI simple, but rely on the passcode flow as the primary gate.

---

## Contributing

Contributions are welcome. To contribute:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feat/your-feature`).
3. Make your changes; run `npm run lint` and `npm run build` to verify.
4. Commit with a clear, descriptive message and open a pull request against `main`.
5. In the PR description, explain the motivation, the change, and how it was tested.

For schema changes, update `supabase/schema.sql` (keep statements idempotent) and note any manual SQL-editor steps. For passcode-related changes, consider the security notes above.

---

## License

**Not detected from the repository** — no `LICENSE` file or license metadata is present in `package.json`. Contact the owner for licensing terms.

---

## Notes

- **Tests**: Not detected from the repository.
- **Code coverage**: Not detected from the repository.
- **Monorepo / workspaces**: Not applicable — single-package project.
- **Docker / containerization**: Not detected — no `Dockerfile` or `docker-compose.yml`.
- **License**: Not detected from the repository.
- The app title is **"Al Riyadi"** (`index.html`), and the Cloudflare Pages project is named `alriyadi`, though the npm package is named `web` (version `0.0.0`).
- Unused/demo components (`demo.tsx`, `orbiting-circles-02*`, `marquee-along-svg-path.tsx`) are present in `components/ui` but are not referenced by the active routes.
