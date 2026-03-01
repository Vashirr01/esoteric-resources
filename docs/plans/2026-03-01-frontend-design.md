# React Frontend — Design

## Goal

Add a Vite + React frontend to the Docker Compose setup, served through Traefik at localhost.

## Routing

- Frontend at `http://localhost` via Traefik
- API stays at `http://api.localhost`
- Frontend calls API with `fetch("http://api.localhost/tasks")`
- CORS enabled on the API

## Container

- `web/` directory alongside `api/`
- Vite dev server on port 5173
- Dockerfile with dev + prod targets
- Traefik routes `localhost` to web container
- Bind mount `./web/src` for hot-reload

## UI

Single page with:
- Task list (title, status, description)
- Create form (title + description)
- Inline actions (toggle status, delete)
- Edit functionality

No routing library, no state management — just useState/useEffect/fetch.

## Files

- Create: `web/` directory with Vite + React + TypeScript scaffold
- Modify: `api/src/index.ts` — add CORS middleware
- Modify: `api/package.json` — add cors dependency
- Modify: `docker-compose.yml` — add web service with Traefik labels

## Styling

Minimal CSS — functional, not pretty. Focus is on cloud patterns, not design.
