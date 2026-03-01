# Task CRUD Routes — Design

## Goal

Add full CRUD endpoints for the Task model to the existing Express API.

## Endpoints

| Method | Path | Body | Response | Description |
|---|---|---|---|---|
| `POST` | `/tasks` | `{ title, description?, status? }` | `201` + created task | Create a task |
| `GET` | `/tasks` | — | `200` + array of tasks | List all tasks |
| `GET` | `/tasks/:id` | — | `200` + task or `404` | Get one task |
| `PUT` | `/tasks/:id` | `{ title?, description?, status? }` | `200` + updated task or `404` | Update a task |
| `DELETE` | `/tasks/:id` | — | `204` or `404` | Delete a task |

## Files

- **Create:** `api/src/lib/prisma.ts` — Prisma client singleton
- **Create:** `api/src/routes/tasks.ts` — all 5 route handlers
- **Modify:** `api/src/index.ts` — mount tasksRouter at `/tasks`

## Decisions

- **Status:** Free-text string, no validation
- **Listing:** Return all tasks, no pagination/filtering
- **Error handling:** 400 for missing title, 404 for not found, 500 for unexpected
- **Architecture:** Routes handle everything directly, no controller/service layers
- **No tests yet** — added in a future step

## Not included (YAGNI)

- Pagination, filtering, sorting
- Input validation library
- Separate controller/service layers
