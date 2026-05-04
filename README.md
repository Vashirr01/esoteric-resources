# esoteric-resources

A Pinterest-like aggregator for the corners of the internet that don't fit a tweet — CS learning materials, research papers, mathematical models, lecture notes, and other "esoteric" resources worth keeping around. Save links into boards, tag them, and share boards publicly.

**Live:** [esoteric-resources-web.onrender.com](https://esoteric-resources-web.onrender.com)

---

## What it does

- **Boards** — group related links however you like (e.g. *Probabilistic Numerics*, *Compilers from scratch*, *CRDT papers*).
- **Resources** — paste a URL, get an OpenGraph link preview (title, description, image) generated server-side.
- **Public profiles** — every user has a `/{username}` page showing their public boards, bio, and avatar.
- **Bookmarks** — save someone else's resource into one of your own boards in one click.
- **Auth** — email/password or GitHub OAuth via Supabase. Reset-password flow included.
- **Dark mode** — system-aware with a manual toggle.

## Tech

| Layer | Stack |
|---|---|
| Frontend | React 19, Vite, TypeScript, react-router-dom 7 |
| API | Express, TypeScript, Prisma ORM |
| Database | PostgreSQL 16 (Supabase in prod, Postgres container locally) |
| Auth | Supabase Auth (prod, ES256 JWTs via JWKS), Keycloak (local, RS256). API is provider-agnostic via configurable `JWKS_URI`. |
| Local infra | Docker Compose + Traefik (host-based routing) |
| Hosting | Render (web + API), Supabase (DB + Auth) |

## Architecture

```
Local dev (Docker Compose + Traefik):
  localhost        → web   (Vite dev server, port 5173)
  api.localhost    → api   (Express, port 3000)
  auth.localhost   → keycloak (port 8080)
                     db (PostgreSQL 16)

Production:
  esoteric-resources-web.onrender.com  → frontend (Vite static build)
  esoteric-resources-api.onrender.com  → API (Express + Prisma)
  Supabase                             → Postgres + Auth
```

The API is intentionally thin: JWT verification middleware + Prisma. RLS policies on Supabase enforce per-user write access at the database layer, so even direct anon-key access from a client is safe.

## Quick start

Requires Docker and a `.env` file (copy from `.env.example`).

```bash
git clone https://github.com/Vashirr01/esoteric-resources.git
cd esoteric-resources
cp .env.example .env
docker compose up --build
```

Then:

| URL | Service |
|---|---|
| http://localhost | Frontend |
| http://api.localhost | API |
| http://auth.localhost | Keycloak |
| http://localhost:8080 | Traefik dashboard |

Local test user (Keycloak): `demo` / `demo`.

To wipe the database and start fresh: `docker compose down -v && docker compose up --build`.

## Project layout

```
api/        Express + Prisma backend
  prisma/     schema + migrations
  src/
    routes/   /health, /feed, /boards, /profiles, /meta
    middleware/auth.ts    JWT verification (RS256 + ES256)
web/        React + Vite frontend
  src/
    pages/    Feed, BoardView, MyBoards, AddResource, UserProfile, Login
    components/  ResourceCard, SaveDropdown, Header, ProtectedRoute
    lib/      AuthContext, supabase client, fetchWithAuth
docs/
  journey.md  Full project history, decisions, and incidents
  plans/      Design and implementation notes per feature
db/         Local Postgres init (creates Keycloak schema)
keycloak/   Local realm export (cloud-lab realm, demo user)
traefik/    Reverse proxy config for local dev
terraform/  Azure IaC (unused for now; Render is the active deploy target)
render.yaml Render Blueprint for the prod deployment
```

## Data model

Three Prisma tables:

- **Resource** — `url, title, description, imageUrl, tags[], userId`
- **Board** — `name, description, isPublic, userId`
- **BoardResource** — join table (cascade-deleted; orphaned resources are auto-cleaned when their last board removes them)

A separate `profiles` table lives in Supabase (managed outside Prisma) holding `username`, `bio`, `avatar_url`, and `is_public`.

## Deployment

Render auto-deploys on push to `master` via `render.yaml`. Migrations run through the Supabase MCP rather than `prisma migrate deploy` — Supabase's connection pooler doesn't support advisory locks, so `prisma migrate deploy` fails through it.

See [`docs/journey.md`](docs/journey.md) for the full history of deployment problems and fixes (the Supavisor host typo, IPv6 issues from Render free tier, the disappearing migration, etc.).

## Status

A solo learning project. Functional and live, but expect rough edges — and please don't store anything you'd be sad to lose.
