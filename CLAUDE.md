# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Journey

Full project history, decisions, problems, and fixes documented in [`docs/journey.md`](docs/journey.md).

## Project

**esoteric-resources** — Pinterest-like aggregator for CS learning materials, research papers, and mathematical models. Users create boards, add resources (links with tags), and share them publicly.

## Architecture

```
Local dev (Docker Compose + Traefik):
  localhost        → web (Vite dev server, port 5173)
  api.localhost    → api (Express, port 3000)
  auth.localhost   → keycloak (port 8080)
                     db (PostgreSQL 16)

Production (Render + Supabase):
  esoteric-resources-web.onrender.com  → frontend (Vite build, static site)
  esoteric-resources-api.onrender.com  → API (Express + Prisma, web service)
  Supabase (rcjclulpdehdlukahnwb)      → PostgreSQL + Auth (us-east-1)
```

- **API** (`api/`): Express + TypeScript + Prisma ORM. Routes: `/health`, `/feed` (public), `/boards` (CRUD + resource management).
- **Frontend** (`web/`): React 19 + Vite + TypeScript + react-router-dom. Pages: Feed (`/`), Board View (`/board/:id`), My Boards (`/my/boards`), Add Resource (`/my/boards/:id/add`), Login (`/login`).
- **Auth**: Supabase Auth in production (ES256 JWTs via JWKS). Keycloak locally. API is provider-agnostic — uses configurable `JWKS_URI` env var for JWT verification.
- **Database**: PostgreSQL with Prisma. Keycloak uses separate `keycloak` schema locally (created by `db/init.sql`).
- **Infra**: Traefik reverse proxy routes by hostname in dev. `render.yaml` blueprint for Render deployment. Terraform in `terraform/` for future Azure deployment.

## Commands

```bash
# Start everything locally
docker compose up --build

# Start with fresh database (wipes data)
docker compose down -v && docker compose up --build

# API type-check
cd api && npx tsc --noEmit

# Frontend type-check
cd web && npx tsc --noEmit

# Generate Prisma client after schema changes
cd api && npx prisma generate

# Create migration (inside running api container)
docker compose exec api npx prisma migrate dev --name <name>

# Or create migration against local DB directly
cd api && DATABASE_URL=postgresql://cloudlab:cloudlab_dev@localhost:5432/cloudlab npx prisma migrate dev --name <name>

# Install new API dependency
cd api && npm install <package>

# Install new frontend dependency
cd web && npm install <package>
```

No test framework or lint configuration is set up yet.

## Data Model

Three Prisma models in `api/prisma/schema.prisma`:
- **Resource**: url, title, tags (string array), userId
- **Board**: name, description, isPublic (default true), userId
- **BoardResource**: join table (boardId + resourceId composite key, cascade deletes)

Orphaned resources are auto-deleted when removed from their last board.

## Auth Pattern

Two middleware functions in `api/src/middleware/auth.ts`:
- `requireAuth` — rejects if no valid JWT (used for board mutations)
- `optionalAuth` — extracts userId if token present, passes through if not (used for public read endpoints)

JWT verification uses `jwks-rsa` with configurable `JWKS_URI` env var. Supports both RS256 (Keycloak) and ES256 (Supabase) algorithms. User ID comes from the JWT `sub` claim.

Frontend auth uses `@supabase/supabase-js` via `AuthContext.tsx` (React context providing session, signIn, signUp, signOut). Note: `keycloak-js` is still in web dependencies but unused in production.

## Environment

Copy `.env.example` to `.env` for local dev. Key variables:
- `DATABASE_URL` — Prisma connection string
- `JWKS_URI` — JWKS endpoint for JWT verification (Supabase or Keycloak)
- `KEYCLOAK_URL` / `KEYCLOAK_REALM` — Local Keycloak config
- `VITE_API_URL` — API base URL for frontend
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — Supabase client config
- `PORT` — API port (default 3000)

## Local URLs

| URL | Service |
|-----|---------|
| http://localhost | Frontend |
| http://api.localhost | API |
| http://auth.localhost | Keycloak |
| http://localhost:8080 | Traefik dashboard |

Test user: `demo` / `demo`

## Deployment

Render auto-deploys on push to `master`. Blueprint: `render.yaml`.

- **API build**: `npm install --include=dev && npx prisma generate && npm run build` → `npm start`
- **Frontend build**: `npm install && npm run build` → static serve from `dist/` with SPA rewrite
- **Database**: Supabase connection pooler (Supavisor session mode) — direct connections don't work from Render free tier (IPv6 issue)
- **Migrations**: Applied via Supabase MCP, not `prisma migrate deploy` (pooler doesn't support it)
