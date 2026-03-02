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

## Deployment Plan (Current)

### Architecture
```
Render Static Site  → frontend (Vite build)
Render Web Service  → API (Express + Prisma)
Supabase            → PostgreSQL database + Auth (replacing Keycloak)
```

### Why Render + Supabase (not Azure yet)
- Free tiers for learning
- Simpler than Azure (platform vs infrastructure)
- Supabase free Postgres doesn't expire (Render's expires after 90 days)
- Supabase Auth replaces Keycloak (managed, lighter, same OAuth2 concepts)
- Azure is planned for later — Terraform already written

### What needs to change for production
- API URL: `http://api.localhost` → Render Web Service URL
- Database: local Docker Postgres → Supabase Postgres
- Auth: Keycloak → Supabase Auth (swap JWT validation + frontend SDK)
- CORS: allow Render frontend domain
- Frontend: build-time env var for API URL
- HTTPS: automatic on Render

### What stays the same
- All application code (Express routes, Prisma schema, React components)
- Docker Compose for local dev
- Terraform for future Azure deployment

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

---

## Repo: Vashirr01/azure (private)
## Branch: master
