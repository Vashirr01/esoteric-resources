# Project Journey — From Zero to esoteric-resources

This documents every step taken building this project, the decisions made, problems hit, and lessons learned. Written for future Claude instances to understand context.

---

## Phase 1: Local Cloud Simulation

### Goal
Learn cloud computing best practices without spending money. User has Azure student plan ($100 credits) but wanted to start free and local.

### Learning path designed
1. Local Docker simulation (done)
2. Local Kubernetes with minikube (paused)
3. Azure free tier deployment (in progress — pivoted to Render + Supabase first)
4. Azure with credits (future)

### Decisions made
- **Stack**: Node.js + Express + TypeScript, Prisma ORM, PostgreSQL, React + Vite frontend
- **Structure**: Flat monorepo with `api/`, `web/`, `traefik/`, `keycloak/`, `db/`, `terraform/`
- **Approach**: Single `docker-compose.yml` (not microservices — YAGNI for learning)
- **Directory name**: Kept as `azure` even though it's not Azure-specific yet

### What was built (in order)

#### 1. Docker Compose + Traefik + Express API
- Created `docker-compose.yml` with 5 services: traefik, api, keycloak, web, db
- Traefik v3.6 as reverse proxy with Docker provider (auto-discovers containers via labels)
- Express API with health endpoint
- PostgreSQL 16 with health checks
- Hostname-based routing: `localhost` → web, `api.localhost` → api, `auth.localhost` → keycloak

#### 2. Prisma + Task CRUD
- Added Prisma ORM with PostgreSQL
- Task model: id, title, description, status, userId, timestamps
- Full REST CRUD: POST/GET/PUT/DELETE `/tasks`
- Prisma client singleton in `api/src/lib/prisma.ts`

#### 3. React Frontend
- Vite + React + TypeScript SPA
- Task list with create form, inline edit, toggle status, delete
- CORS enabled on API for cross-origin fetch from `localhost` to `api.localhost`
- Served through Traefik at `localhost`

#### 4. Keycloak Authentication
- Keycloak 26.0 container with realm auto-import from JSON
- OAuth2 Authorization Code flow with PKCE
- `keycloak-js` on frontend for login/logout
- JWT validation on API using `jsonwebtoken` + `jwks-rsa` against JWKS endpoint
- Tasks became per-user (filtered by userId from JWT `sub` claim)
- Two auth middleware: `requireAuth` (rejects unauthenticated) and later `optionalAuth` (passes through)
- Keycloak uses separate PostgreSQL schema (`keycloak`) to avoid Prisma migration drift

#### 5. GitHub Actions CI
- Two parallel jobs: API type-check and frontend type-check
- Later removed — Render handles builds, making CI redundant for this project

#### 6. Terraform for Azure
- `terraform/` directory with: main.tf, variables.tf, outputs.tf, acr.tf, appservice.tf, database.tf, keyvault.tf
- Defines: Resource Group, Azure Container Registry, App Service Plan (F1 free), 2 Linux Web Apps (API + frontend), PostgreSQL Flexible Server, Key Vault
- Plan-only — never applied, no credits spent
- `terraform plan` successfully showed 10 resources

---

## Phase 2: esoteric-resources (App Pivot)

### Why
User wanted to build a real app instead of a learning task manager. Chose a Pinterest-like aggregator for CS learning materials, research papers, and mathematical models.

### What changed
- **Prisma schema**: Task model → Resource, Board, BoardResource (join table)
- **API routes**: `tasks.ts` → `feed.ts` (public) + `boards.ts` (CRUD + resource management)
- **Frontend**: Task manager UI → multi-page app with react-router-dom
- **Auth mode**: Changed from `login-required` to `check-sso` so feed is public

### What stayed the same
- All infrastructure: Docker Compose, Traefik, PostgreSQL, Keycloak, Terraform
- Auth middleware pattern (just added `optionalAuth`)
- Project structure and tooling

### Data model
- **Resource**: url, title, tags (string array), userId
- **Board**: name, description, isPublic (default true), userId
- **BoardResource**: composite key (boardId, resourceId), addedAt, cascade deletes

### API endpoints
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | /feed | None | Public feed, paginated, ?tag= filter |
| GET | /boards/:id | Optional | View board (public or owner) |
| GET | /boards/by-user/:userId | None | User's public boards |
| POST | /boards | Required | Create board |
| PUT | /boards/:id | Required | Update board (owner only) |
| DELETE | /boards/:id | Required | Delete board (owner only) |
| POST | /boards/:id/resources | Required | Add resource to board |
| DELETE | /boards/:id/resources/:resourceId | Required | Remove resource from board |

### Frontend pages
| Path | Component | Auth | Description |
|------|-----------|------|-------------|
| / | Feed | No | Masonry grid of public resources, tag filtering, pagination |
| /board/:id | BoardView | No (if public) | Resources in a board |
| /my/boards | MyBoards | Yes | Create/delete boards, see resource counts |
| /my/boards/:id/add | AddResource | Yes | Form: URL + title + comma-separated tags |

### Design details
- CSS columns for masonry layout (3 → 2 → 1 responsive)
- Resource cards show: title, domain extracted from URL, clickable tag pills
- Feed filters by tag via URL search params (`?tag=ml`)
- Orphaned resources auto-deleted when removed from last board

---

## Problems Encountered and Fixes

### 1. Directory rename broke Bash CWD
**Problem**: Renaming `azure` → `cloud-lab` made all Bash commands fail because CWD no longer existed.
**Fix**: Created placeholder dir to restore Bash. User decided to keep name as `azure`.

### 2. Docker permission denied
**Problem**: `docker compose up` failed with permission denied.
**Fix**: `sudo usermod -aG docker $USER` + re-login.

### 3. Traefik v3.3 + Docker 29 API version mismatch
**Problem**: Traefik's Docker client used API v1.24, Docker 29 requires minimum v1.44.
**Attempted**: `DOCKER_API_VERSION=1.44` env var — didn't work.
**Fix**: Upgraded to `traefik:v3.6` which has automatic API version negotiation.

### 4. Prisma + Keycloak schema drift
**Problem**: Both Prisma and Keycloak used the `public` schema. Prisma saw Keycloak tables as drift and refused to migrate.
**Fix**: Gave Keycloak its own schema via `?currentSchema=keycloak` in JDBC URL. Created `db/init.sql` with `CREATE SCHEMA IF NOT EXISTS keycloak;`.

### 5. Missing userId column in migration
**Problem**: Migration SQL was generated before adding userId to the Task model.
**Fix**: Rewrote the migration SQL to include userId column and index.

### 6. Migration file owned by root
**Problem**: Docker created migration files as root. Couldn't edit them.
**Fix**: `sudo chown -R $(whoami) ~/azure/api/prisma/migrations/`.

### 7. TypeScript type errors in CI
**Problem**: `req.userId` typed as `string | undefined` and `req.params.id` as `string | string[]`.
**Fix**: Explicit type assertions: `const userId = req.userId as string`.

### 8. Frontend "UI visible then disappears"
**Problem**: React app rendered briefly, then vanished.
**Root cause**: API returned 500 (missing userId column) → `tasks.map()` crashed on error object → React unmounted.
**Fix**: Fixed the migration (problem #5). Not a frontend issue.

### 9. Port 8080 already in use on rebuild
**Problem**: Traefik couldn't bind port 8080 during `docker compose up`.
**Fix**: Kill the process on 8080, then `docker compose stop traefik && docker compose rm -f traefik && docker compose up -d traefik` to recreate with port bindings.

---

## Phase 3: Deployment to Render + Supabase

### Architecture (Live)
```
Render Static Site  → frontend (Vite build)    → https://esoteric-resources-web.onrender.com
Render Web Service  → API (Express + Prisma)   → https://esoteric-resources-api.onrender.com
Supabase            → PostgreSQL + Auth         → rcjclulpdehdlukahnwb (us-east-1)
```

### Why Render + Supabase (not Azure yet)
- Free tiers for learning
- Simpler than Azure (platform vs infrastructure)
- Supabase free Postgres doesn't expire (Render's expires after 90 days)
- Supabase Auth replaces Keycloak (managed, lighter, same OAuth2 concepts)
- Azure is planned for later — Terraform already written

### Auth swap: Keycloak → Supabase
- API: `auth.ts` middleware now uses configurable `JWKS_URI` env var (works with any OIDC provider)
- Frontend: Removed `keycloak-js`, added `@supabase/supabase-js`
- New: `AuthContext.tsx` (React context), `Login.tsx` (email/password form), `supabase.ts` (client init)
- All API URLs configurable via `VITE_API_URL` env var

### Supabase setup
- Project: `rcjclulpdehdlukahnwb` in `us-east-1`, free tier ($0/month)
- Tables created via Supabase MCP migration (Resource, Board, BoardResource)
- Row Level Security (RLS) enabled: public read for public boards/resources, owner-only writes

### Render setup
- API Web Service: `srv-d6j2ddcr85hc73fpef50` (Node, free, ohio)
- Frontend Static Site: `srv-d6j2di5m5p6s73derqlg` (static, free, ohio)
- Auto-deploy on git push to master
- `render.yaml` blueprint in repo root

### Problems Encountered

#### 10. Render build fails — missing @types/express
**Problem**: `NODE_ENV=production` causes `npm install` to skip devDependencies. TypeScript build fails without type definitions.
**Fix**: Changed build command to `npm install --include=dev`.

#### 11. Prisma can't reach Supabase direct connection
**Problem**: `P1001: Can't reach database server at db.ref.supabase.co:5432`. Supabase uses IPv6 for direct connections; Render free tier may not support IPv6.
**Fix**: Use Supabase connection pooler (Supavisor session mode) instead of direct connection.

#### 12. Supavisor "Tenant or user not found"
**Problem**: Using wrong pooler host. Had `aws-0-us-east-1.pooler.supabase.com` but correct host was `aws-1-us-east-1.pooler.supabase.com`.
**Fix**: Copied exact connection string from Supabase dashboard Connect button.

#### 13. Prisma migrate deploy fails on pooler
**Problem**: `prisma migrate deploy` in start command failed with connection errors through Supavisor.
**Fix**: Removed `prisma migrate deploy` from start command — tables already created via Supabase MCP. Start command is now just `npm start`.

#### 14. PrismaClientInitializationError (empty message)
**Problem**: API health endpoint worked but all Prisma queries failed silently. Error logging revealed `PrismaClientInitializationError` with no message.
**Root cause**: Database password was wrong — used password from a different Supabase project.
**Fix**: Reset database password in Supabase dashboard and updated `DATABASE_URL` on Render.

### Deployment env vars
| Service | Key | Source |
|---------|-----|--------|
| API | `DATABASE_URL` | Supabase pooler session mode string (set manually) |
| API | `JWKS_URI` | Supabase JWKS endpoint |
| API | `NODE_ENV` | `production` |
| Frontend | `VITE_API_URL` | Render API URL |
| Frontend | `VITE_SUPABASE_URL` | Supabase project URL |
| Frontend | `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

---

## Key Concepts Learned

1. **Docker Compose**: Multi-container orchestration, bind mounts for hot reload, health checks, multi-stage Dockerfiles (dev vs prod)
2. **Reverse Proxy (Traefik)**: Host-based routing, auto-discovery via Docker labels, TLS termination concept
3. **OAuth2/OIDC**: Authorization Code flow with PKCE, JWTs, JWKS endpoints, token refresh
4. **Prisma ORM**: Schema-first design, migrations as code, composite keys, cascade deletes, relation queries
5. **Infrastructure as Code (Terraform)**: Declarative resource definitions, plan before apply, state management
6. **Dev vs Prod differences**: Traefik/Docker locally vs managed services in cloud, env vars for configuration, build steps vs dev servers
7. **CI/CD**: GitHub Actions for type-checking (removed), Render auto-deploy from git push
8. **Database schema separation**: Isolating third-party tools (Keycloak) from app schema to prevent migration drift
9. **Platform deployment (Render)**: Blueprint files, auto-deploy from git, env var management, build vs start commands, free tier limitations
10. **Managed database (Supabase)**: Connection pooling (Supavisor session vs transaction mode), IPv6 vs IPv4, RLS policies, MCP-driven migrations
11. **Auth provider swap**: Abstracting auth via JWKS_URI makes provider swaps painless — API doesn't care if it's Keycloak or Supabase

---

## Phase 6: Auth Flow UX Improvements

### Goal
Polish the authentication experience — add loading feedback, smart redirects, centralized route protection, username uniqueness, GitHub OAuth, and automatic session refresh.

### What was done

1. **Loading state on form submit** — Login and ResetPassword pages now show "Please wait..." / "Updating..." with disabled button while submitting. Prevents double-submits and gives visual feedback.

2. **Return-to redirect** — Visiting a protected page while logged out redirects to `/login` with the intended destination stored in router state. After successful login, navigates back to that page instead of always going to `/`.

3. **ProtectedRoute wrapper** — New `ProtectedRoute` component replaces duplicated `if (!session)` guards in MyBoards and AddResource. Shows nothing while auth is loading, redirects to `/login` with return-to state if no session, renders children otherwise. Routes wrapped in App.tsx.

4. **Username uniqueness** — Created `profiles` table in Supabase with `username TEXT UNIQUE`, RLS policies (public read, owner insert/update). `signUp` checks for existing username before creating user, inserts profile row after. Handles race conditions via unique constraint catch.

5. **GitHub OAuth login** — Added `signInWithGitHub` to AuthContext using Supabase OAuth. Login page has "Sign in with GitHub" button with dark styling. Return-to path stored in `sessionStorage` before OAuth redirect (router state doesn't survive full-page redirects). `useEffect` on Login detects session after OAuth return and redirects.

6. **Session expiry handling** — New `fetchWithAuth` helper in supabase.ts attaches current token, on 401 refreshes session and retries once, on refresh failure signs out. MyBoards and AddResource use `fetchWithAuth` instead of raw `fetch` with manual Authorization headers. ProtectedRoute handles the redirect after signout.

### Problems & decisions
- **OAuth redirect loses router state**: Full-page redirect to GitHub means `location.state` is lost. Solved with `sessionStorage.setItem("auth_redirect", from)` before redirect, read and cleared on return.
- **Username race condition**: Two users could check-then-insert the same username. Handled by catching Postgres unique constraint error (code 23505) as a fallback.
- **No API changes needed**: All improvements are frontend-only. The API's JWT verification is provider-agnostic and works with both email/password and OAuth tokens.

### Prerequisite (manual)
GitHub OAuth requires creating a GitHub OAuth App and enabling the GitHub provider in Supabase dashboard. Not automated.

---

## Phase 7: User Profile Pages

### Goal
Give users public profile pages to showcase their boards and bio, with owner-controlled visibility.

### What was done

1. **Supabase migration** — Added `bio TEXT` and `is_public BOOLEAN DEFAULT true` columns to the existing `profiles` table.

2. **UserProfile page** (`web/src/pages/UserProfile.tsx`) — New page at `/user/:username`.
   - Fetches profile from Supabase by username, boards from existing API (`/boards/by-user/:userId`)
   - Three states: loading, private (non-owner sees "This profile is private"), visible profile with boards list
   - Owner sees "Edit profile" button → inline edit mode with textarea for bio, checkbox for visibility, save/cancel

3. **Route** — Added `<Route path="/user/:username">` in App.tsx (public, no ProtectedRoute)

4. **Header link** — Username `<span>` changed to `<Link>` navigating to own profile

5. **CSS** — Profile header card, bio display, edit form, private message, username hover styles

### Decisions
- No new API endpoints — profile CRUD via Supabase client (RLS handles auth), boards via existing API
- Inline editing rather than separate edit page
- Profile public by default (matches existing board default)

---

## Phase 8: Board Public/Private Visibility

### Goal
Let users control whether individual boards are public or private.

### What was done

1. **API fix** (`api/src/routes/boards.ts`) — `GET /boards/by-user/:userId` now uses `optionalAuth`. If the requester is the board owner, returns all boards (including private). Non-owners still only see public boards.

2. **MyBoards UI** (`web/src/pages/MyBoards.tsx`):
   - Create form has "Public" checkbox (checked by default, unchecked = private board)
   - Each board shows a "Make Private" / "Make Public" toggle button
   - Private boards show a "Private" badge next to resource count
   - `loadBoards` now uses `fetchWithAuth` so the API can identify the owner

3. **CSS** — Visibility toggle label and private badge styles

### Already working (no changes needed)
- `POST /boards` already accepts `isPublic` in body
- `PUT /boards/:id` already accepts `isPublic` for updates
- `GET /boards/:id` already hides private boards from non-owners
- Board model already has `isPublic` column (default true)

### Deploy note
The API change (`by-user` with `optionalAuth`) must be deployed for owners to see their own private boards in the list. Until then, private boards are created correctly but vanish from the owner's My Boards view.

---

## Phase 9: Search Bar & Resource Card Metadata

### Goal
Add text search to the feed and show board/user attribution on resource cards with clickable links.

### What was done

1. **Feed API** (`api/src/routes/feed.ts`) — Added `q` query parameter for case-insensitive title search (Prisma `contains` + `mode: insensitive`). Feed now includes board name and username with each resource via Prisma `include` + raw SQL profiles lookup.

2. **Search bar** (`web/src/pages/Feed.tsx`) — Text input + Search button above the feed. Search term stored in URL (`?q=`), combinable with tag filter (`?tag=ml&q=neural`). Separate "clear tag" and "clear search" buttons.

3. **Resource card metadata** (`web/src/components/ResourceCard.tsx`) — Each card now shows the board name (links to `/board/:id`) and username (links to `/user/:username`) below the domain. Gracefully handles missing data (backwards-compatible with old API response).

4. **CSS** — Search bar layout, resource metadata links with dot separator

### Deploy note
API changes (search + enriched response) need deploy to Render for full functionality. Until then, search bar renders but doesn't filter, and cards don't show board/user links.

---

## Phase 10: UI Polish & Dark Mode

### What was done

1. **Feed loading & retry** — Feed now shows "Loading resources..." instead of "No resources found" while API is waking up. Auto-retries up to 2 times with 3s delay (handles Render free tier cold starts).

2. **Dark mode** — CSS custom properties for all colors. `[data-theme="dark"]` with deep navy palette. `useTheme` hook persists to localStorage, respects `prefers-color-scheme`. Toggle button in header using lucide-react Sun/Moon icons.

3. **Search bar redesign** — Removed submit button, search-on-type with 300ms debounce, centered and narrower input.

4. **Infinite scroll** — Replaced pagination with scroll-triggered loading. Appends next page when user is within 300px of bottom.

5. **Footer** — Simple footer with site name and GitHub link.

6. **Profile photos** — Added `avatar_url` column to Supabase `profiles` table. Supabase Storage bucket `avatars` with RLS policies. Profile page shows circular avatar with camera overlay for upload. DiceBear thumbs avatars as defaults for seed users.

7. **Avatars on cards & header** — Feed API returns `avatarUrl` from profiles join. ResourceCard shows small avatar next to username. Header shows logged-in user's avatar fetched from Supabase profiles.

8. **Local seed data** — Prisma migration creates `profiles` table locally with seed data: 5 users, 9 boards, 22 resources with DiceBear avatars. Removed `VITE_API_URL` from `web/.env` so local dev uses `api.localhost`.

9. **Site width** — Container widened from 960px to 1200px.

### Problems & decisions
- **Render cold start**: Free tier spins down after inactivity. Old code showed "No resources found" immediately. Fixed with loading state + retry.
- **lucide-react in Docker**: Installing npm packages on host doesn't affect container. Need `docker compose up --build` to rebuild with new deps.
- **`web/.env` pointed to production**: Local frontend was hitting Render API instead of local. Removed `VITE_API_URL` so it falls back to `http://api.localhost`.
- **Profiles table local vs Supabase**: Created via Prisma migration (not `db/init.sql`) to avoid Prisma schema drift errors. Seed data included in migration SQL.
- **Avatar consistency**: Header avatar comes from Supabase (for logged-in user), card avatars come from local API. Will be consistent once deployed to production.

### Deploy note
Push to master needed for: dark mode, infinite scroll, feed retry, avatar support on cards, search-on-type. Production API currently lacks `avatarUrl` in feed response.

---

## Phase 11: Bookmarks / Save to Board

### Goal
Let users save any public resource to one of their own boards (like Pinterest repins). Saves create an independent copy of the resource.

### What was built

1. **API: `POST /boards/:id/save`** — Copies a resource (new Resource row + BoardResource link) to the user's board. Returns 409 if the board already has a resource with the same URL.

2. **API: `GET /boards/my`** — Returns the logged-in user's boards. Accepts optional `?url=` param to flag which boards already contain that URL (`hasDuplicate: true`).

3. **API: `GET /profiles/:username`** — New endpoint so frontend reads profiles from the API (same data source as feed) instead of directly from Supabase. Fixes avatar mismatch between profile page and resource cards on local dev.

4. **SaveDropdown component** — Bookmark icon (lucide `Bookmark`) on top-right of every resource card. Click opens a dropdown listing user's boards. Boards with the same URL already saved show a checkmark (disabled). "New board" option at bottom with inline text input for quick board creation + auto-save.

5. **Header/Profile consistency** — Header avatar fetch moved from Supabase direct query to API endpoint, so all avatar reads go through the same data source.

### Design decisions
- **Copy, not link**: Saving creates an independent Resource row owned by the saving user. Original owner deleting their resource doesn't affect saves.
- **Duplicate prevention**: Checked by URL match within the target board, not by resource ID.
- **Bookmark icon visibility**: Only appears on card hover to keep the UI clean.

---

## Phase 12: Link Previews

### Goal
Auto-fetch OG metadata when adding a URL. Display description and image on resource cards for a richer feed.

### What was built

1. **API: `GET /meta?url=...`** — Server-side fetch of URL, parses `og:title`, `og:description`, `og:image` (falls back to `<title>` tag). 5s timeout, reads first 50KB only. Resolves relative image URLs.

2. **Schema update** — Added `description` (optional) and `imageUrl` (optional) to Resource model. Migration adds columns to existing table.

3. **AddResource page** — Debounced auto-fetch (500ms) when user pastes a URL. Title, description auto-fill (editable). Image preview shown if OG image found.

4. **ResourceCard** — Shows OG image as thumbnail above title, description as 2-line truncated snippet below domain.

5. **Save/copy** — description and imageUrl are copied when saving a resource to another board.

6. **Route ordering fix** — `GET /boards/my` was being caught by `GET /boards/:id` (Express matched "my" as an id). Moved specific routes above parameterized ones.

---

## Repo: Vashirr01/azure (private)
## Branch: master
