# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**esoteric-resources** — Pinterest-like aggregator for CS learning materials, research papers, and mathematical models. Users create boards, add resources (links with tags), and share them publicly.

## Architecture

```
Local dev (Docker Compose + Traefik):
  localhost        → web (Vite dev server, port 5173)
  api.localhost    → api (Express, port 3000)
  auth.localhost   → keycloak (port 8080)
                     db (PostgreSQL 16)

Production (planned):
  Render Static Site  → frontend (Vite build)
  Render Web Service  → API (Express + Prisma)
  Supabase            → PostgreSQL + Auth
```

- **API** (`api/`): Express + TypeScript + Prisma ORM. Routes: `/health`, `/feed` (public), `/boards` (CRUD + resource management).
- **Frontend** (`web/`): React 19 + Vite + TypeScript + react-router-dom. Pages: Feed (`/`), Board View (`/board/:id`), My Boards (`/my/boards`), Add Resource (`/my/boards/:id/add`).
- **Auth**: Keycloak locally (JWT + JWKS, `check-sso` mode so feed is public). Migrating to Supabase Auth for production.
- **Database**: PostgreSQL with Prisma. Keycloak uses separate `keycloak` schema (created by `db/init.sql`).
- **Infra**: Traefik reverse proxy routes by hostname in dev. Terraform in `terraform/` for future Azure deployment.

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

## Data Model

Three Prisma models in `api/prisma/schema.prisma`:
- **Resource**: url, title, tags (string array), userId
- **Board**: name, description, isPublic (default true), userId
- **BoardResource**: join table (boardId + resourceId composite key, cascade deletes)

## Auth Pattern

Two middleware functions in `api/src/middleware/auth.ts`:
- `requireAuth` — rejects if no valid JWT (used for board mutations)
- `optionalAuth` — extracts userId if token present, passes through if not (used for public read endpoints)

The API uses `KEYCLOAK_URL` env var for JWKS endpoint. Locally this is `http://keycloak:8080` (Docker internal network), while the frontend uses `http://auth.localhost` (via Traefik).

## Environment

Copy `.env.example` to `.env` for local dev. Key variables:
- `DATABASE_URL` — Prisma connection string
- `KEYCLOAK_URL` / `KEYCLOAK_REALM` — Auth server config
- `PORT` — API port (default 3000)

## Local URLs

| URL | Service |
|-----|---------|
| http://localhost | Frontend |
| http://api.localhost | API |
| http://auth.localhost | Keycloak |
| http://localhost:8080 | Traefik dashboard |

Test user: `demo` / `demo`

## Deployment Targets

- **Render**: API as Web Service, frontend as Static Site (not yet configured)
- **Supabase**: PostgreSQL database + Auth (replacing Keycloak for production)
- **Azure**: Terraform IaC in `terraform/` (App Service, PostgreSQL Flexible Server, ACR, Key Vault) — future phase
