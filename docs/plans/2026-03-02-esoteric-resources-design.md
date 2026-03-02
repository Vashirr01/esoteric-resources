# esoteric-resources — Design

## Goal

Replace the task manager with a Pinterest-like aggregator for CS learning materials, research papers, and mathematical models. Users create boards, add resources (links), and share them publicly.

## Data Model

### Resource
- id, url, title, tags (string array), userId, createdAt

### Board
- id, name, description (optional), isPublic (default true), userId, createdAt

### BoardResource (join table)
- boardId, resourceId, addedAt

### User
- From Keycloak token (sub, preferred_username). No separate table.

## Pages

| Page | URL | Auth? | Description |
|---|---|---|---|
| Feed | `/` | No | Masonry grid of recent public resources, filter by tag |
| Board view | `/board/:id` | No (if public) | Resources in a board |
| User profile | `/user/:username` | No (if public) | User's public boards |
| My boards | `/my/boards` | Yes | Manage your boards |
| Add resource | `/my/boards/:id/add` | Yes | Add URL + title + tags |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /feed | Recent public resources (paginated, ?tag=) |
| GET | /boards/:id | Get board with resources |
| GET | /users/:username/boards | User's public boards |
| POST | /boards | Create board |
| PUT | /boards/:id | Update board |
| DELETE | /boards/:id | Delete board |
| POST | /boards/:id/resources | Add resource to board |
| DELETE | /boards/:id/resources/:resourceId | Remove resource |

## Frontend

- Masonry grid layout for feed
- Resource cards: title, domain, tags, author
- Click opens external URL
- Feed is public, board management requires auth

## What Changes

- Prisma schema: Task → Resource, Board, BoardResource
- API routes: tasks.ts → feed.ts, boards.ts
- Frontend: task manager → feed + boards UI

## What Stays

- Docker Compose, Traefik, PostgreSQL, Keycloak
- Auth flow, CI/CD, Terraform
