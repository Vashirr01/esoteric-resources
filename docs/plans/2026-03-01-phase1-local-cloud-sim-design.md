# Phase 1: Local Cloud Simulation — Design

## Goal

Build a minimal local cloud environment using Docker Compose to learn cloud computing best practices. The environment simulates what you'd see in a production cloud setup: reverse proxy, API service, managed database — all defined as code.

## Decisions

- **Backend:** Node.js + Express + TypeScript
- **App domain:** Task/Project Manager (CRUD)
- **ORM:** Prisma (type-safe, migrations-as-code)
- **Architecture:** Single docker-compose.yml, flat directory structure (Approach A)
- **Scope:** Minimal — API + DB + Traefik. Health endpoint only. CRUD routes added later.

## Project Structure

```
cloud-lab/
├── api/
│   ├── src/
│   │   ├── index.ts            # Express entry point
│   │   └── routes/
│   │       └── health.ts       # GET /health
│   ├── prisma/
│   │   └── schema.prisma       # Task model
│   ├── Dockerfile              # Multi-stage (dev + prod targets)
│   ├── package.json
│   └── tsconfig.json
├── traefik/
│   └── traefik.yml             # Static config
├── docker-compose.yml          # 3 services: traefik, api, db
├── .env.example
├── .env                        # gitignored
├── .gitignore
└── .dockerignore
```

## Services

| Service | Image | Exposed Ports | Internal Port | Role |
|---------|-------|---------------|---------------|------|
| traefik | traefik:v3 | 80, 8080 | — | Reverse proxy + dashboard |
| api | Custom (node:22-alpine) | None | 3000 | Express API |
| db | postgres:16-alpine | 5432 | 5432 | PostgreSQL database |

All services on a shared Docker bridge network (`cloud-lab-net`).

## Routing

- Traefik uses Docker provider — discovers services via labels on containers.
- `http://api.localhost` routes to the API container on port 3000.
- `http://localhost:8080` serves the Traefik dashboard.
- DB port 5432 is mapped to host for local tooling (psql, pgAdmin) but not routed through Traefik.

## API

- Single `GET /health` endpoint returning `{ status: "ok", timestamp, uptime }`.
- Prisma schema defines a `Task` model (id, title, description, status, createdAt, updatedAt). Migration runs on container start. No routes wired yet.
- Multi-stage Dockerfile: `dev` target uses ts-node-dev for hot-reload, `prod` target compiles TS and runs with node.
- All config via environment variables (`DATABASE_URL`, `PORT`, `NODE_ENV`).

## Environment Variables

```env
POSTGRES_USER=cloudlab
POSTGRES_PASSWORD=cloudlab_dev
POSTGRES_DB=cloudlab
DATABASE_URL=postgresql://cloudlab:cloudlab_dev@db:5432/cloudlab
PORT=3000
NODE_ENV=development
```

## Future Phases

- Phase 2: Full CRUD routes, auth (Keycloak), Terraform IaC
- Phase 3: Kubernetes (minikube), monitoring (Prometheus + Grafana)
- Phase 4: Deploy to Azure free tier, then AKS with credits
