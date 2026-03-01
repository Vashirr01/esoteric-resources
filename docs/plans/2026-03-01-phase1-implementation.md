# Phase 1: Local Cloud Simulation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scaffold a Docker Compose environment with Traefik reverse proxy, Express+TypeScript API, and PostgreSQL — all runnable with a single `docker compose up`.

**Architecture:** Three containers on a shared Docker network. Traefik auto-discovers the API via Docker labels and routes `api.localhost` to it. API connects to Postgres internally. Prisma handles schema and migrations.

**Tech Stack:** Node.js 22, Express, TypeScript, Prisma, PostgreSQL 16, Traefik v3, Docker Compose

---

### Task 1: Project root files (.gitignore, .env.example, .env, .dockerignore)

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `.env`
- Create: `.dockerignore`

**Step 1: Create .gitignore**

```gitignore
node_modules/
dist/
.env
*.log
```

**Step 2: Create .env.example (checked into git — documents required vars)**

```env
POSTGRES_USER=cloudlab
POSTGRES_PASSWORD=cloudlab_dev
POSTGRES_DB=cloudlab
DATABASE_URL=postgresql://cloudlab:cloudlab_dev@db:5432/cloudlab
PORT=3000
NODE_ENV=development
```

**Step 3: Create .env (copy of .env.example — gitignored)**

Same contents as .env.example. This is the actual file Docker Compose reads.

**Step 4: Create .dockerignore**

```dockerignore
node_modules
dist
.git
.env
*.md
docs
```

**Step 5: Commit**

```bash
git add .gitignore .env.example .dockerignore
git commit -m "chore: add project root files (.gitignore, .env.example, .dockerignore)"
```

---

### Task 2: API — package.json and tsconfig.json

**Files:**
- Create: `api/package.json`
- Create: `api/tsconfig.json`

**Step 1: Create api/package.json**

```json
{
  "name": "cloud-lab-api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prisma:migrate": "prisma migrate deploy",
    "prisma:generate": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^6.4.1",
    "express": "^4.21.2"
  },
  "devDependencies": {
    "@types/express": "^5.0.1",
    "@types/node": "^22.13.9",
    "prisma": "^6.4.1",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.8.2"
  }
}
```

**Step 2: Create api/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Commit**

```bash
git add api/package.json api/tsconfig.json
git commit -m "chore: add API package.json and tsconfig"
```

---

### Task 3: API — Prisma schema

**Files:**
- Create: `api/prisma/schema.prisma`

**Step 1: Create the Prisma schema with Task model**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Task {
  id          String   @id @default(uuid())
  title       String
  description String?
  status      String   @default("todo")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Step 2: Commit**

```bash
git add api/prisma/schema.prisma
git commit -m "feat: add Prisma schema with Task model"
```

---

### Task 4: API — Express app and health route

**Files:**
- Create: `api/src/routes/health.ts`
- Create: `api/src/index.ts`

**Step 1: Create the health route**

```typescript
// api/src/routes/health.ts
import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
```

**Step 2: Create the Express entry point**

```typescript
// api/src/index.ts
import express from "express";
import healthRouter from "./routes/health";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use("/health", healthRouter);

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
```

**Step 3: Commit**

```bash
git add api/src/
git commit -m "feat: add Express app with health endpoint"
```

---

### Task 5: API — Multi-stage Dockerfile

**Files:**
- Create: `api/Dockerfile`

**Step 1: Create multi-stage Dockerfile**

```dockerfile
# --- Base ---
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npx prisma generate

# --- Dev ---
FROM base AS dev
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]

# --- Prod ---
FROM base AS prod
RUN npm run build
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
```

**Step 2: Commit**

```bash
git add api/Dockerfile
git commit -m "feat: add multi-stage Dockerfile for API (dev + prod)"
```

---

### Task 6: Traefik config

**Files:**
- Create: `traefik/traefik.yml`

**Step 1: Create Traefik static configuration**

```yaml
api:
  dashboard: true
  insecure: true

entryPoints:
  web:
    address: ":80"

providers:
  docker:
    exposedByDefault: false
    network: cloud-lab-net
```

**Step 2: Commit**

```bash
git add traefik/
git commit -m "feat: add Traefik static config"
```

---

### Task 7: Docker Compose

**Files:**
- Create: `docker-compose.yml`

**Step 1: Create docker-compose.yml with all 3 services**

```yaml
services:
  traefik:
    image: traefik:v3.3
    ports:
      - "80:80"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro
    networks:
      - cloud-lab-net

  api:
    build:
      context: ./api
      target: dev
    env_file: .env
    volumes:
      - ./api/src:/app/src
      - ./api/prisma:/app/prisma
    depends_on:
      db:
        condition: service_healthy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.localhost`)"
      - "traefik.http.routers.api.entrypoints=web"
      - "traefik.http.services.api.loadbalancer.server.port=3000"
    networks:
      - cloud-lab-net

  db:
    image: postgres:16-alpine
    env_file: .env
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER}"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - cloud-lab-net

networks:
  cloud-lab-net:
    driver: bridge

volumes:
  pgdata:
```

**Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add Docker Compose with Traefik, API, and PostgreSQL"
```

---

### Task 8: Verify — docker compose up

**Step 1: Run docker compose up**

```bash
docker compose up --build
```

Expected: All 3 services start. API waits for DB health check, runs Prisma migration, then serves on port 3000.

**Step 2: Test health endpoint**

```bash
curl http://api.localhost/health
```

Expected: `{"status":"ok","timestamp":"...","uptime":...}`

**Step 3: Check Traefik dashboard**

Open `http://localhost:8080` — should show the api service registered.

**Step 4: Commit docs**

```bash
git add docs/
git commit -m "docs: add Phase 1 design and implementation plan"
```
