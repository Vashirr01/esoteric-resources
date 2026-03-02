# esoteric-resources Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the task manager with a Pinterest-like aggregator for CS learning materials, research papers, and mathematical models.

**Architecture:** Keep all infrastructure (Docker, Traefik, Keycloak, PostgreSQL, CI/CD). Replace Prisma schema (Task → Resource, Board, BoardResource), API routes (tasks.ts → feed.ts + boards.ts), and the entire frontend. Feed is public; board management requires auth. Frontend uses react-router-dom for multi-page navigation and CSS columns for masonry layout.

**Tech Stack:** Express + TypeScript, Prisma + PostgreSQL, React + Vite + TypeScript, react-router-dom, Keycloak (check-sso mode for public pages)

---

### Task 1: Update Prisma Schema

**Files:**
- Modify: `api/prisma/schema.prisma`

**Step 1: Replace the schema models**

Replace the Task model with Resource, Board, and BoardResource:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Resource {
  id        String   @id @default(uuid())
  url       String
  title     String
  tags      String[]
  userId    String
  createdAt DateTime @default(now())

  boards BoardResource[]

  @@index([userId])
}

model Board {
  id          String   @id @default(uuid())
  name        String
  description String?
  isPublic    Boolean  @default(true)
  userId      String
  createdAt   DateTime @default(now())

  resources BoardResource[]

  @@index([userId])
}

model BoardResource {
  boardId    String
  resourceId String
  addedAt    DateTime @default(now())

  board    Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  resource Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  @@id([boardId, resourceId])
}
```

**Step 2: Commit schema change**

```bash
git add api/prisma/schema.prisma
git commit -m "feat: replace Task schema with Resource, Board, BoardResource"
```

---

### Task 2: Create Database Migration

**Files:**
- Create: `api/prisma/migrations/<timestamp>_esoteric_resources/migration.sql` (auto-generated)

**Step 1: Delete existing migration and reset**

Since this is a dev project with no production data, delete the old migration and create a fresh one:

```bash
rm -rf api/prisma/migrations/20260301150330_init
```

**Step 2: Generate new migration**

Run inside the api container (Docker must be running):

```bash
docker compose exec api npx prisma migrate dev --name esoteric_resources
```

If Docker isn't running, alternatively bring up just the db and run locally:

```bash
docker compose up -d db
cd api && DATABASE_URL=postgresql://cloudlab:cloudlab_dev@localhost:5432/cloudlab npx prisma migrate dev --name esoteric_resources
```

Expected: Creates a new migration file with CREATE TABLE for Resource, Board, BoardResource (and drops Task).

**Step 3: Commit migration**

```bash
git add api/prisma/migrations/
git commit -m "feat: add esoteric_resources migration"
```

---

### Task 3: Add Optional Auth Middleware

**Files:**
- Modify: `api/src/middleware/auth.ts`

**Step 1: Add optionalAuth middleware**

The feed and public board views don't require auth but should extract userId if a token is present. Add this function after the existing `requireAuth`:

```typescript
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
    if (!err && decoded) {
      req.userId = (decoded as jwt.JwtPayload).sub;
    }
    next();
  });
}
```

**Step 2: Commit**

```bash
git add api/src/middleware/auth.ts
git commit -m "feat: add optionalAuth middleware for public endpoints"
```

---

### Task 4: Create Feed API Route

**Files:**
- Create: `api/src/routes/feed.ts`

**Step 1: Create the feed route**

```typescript
import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

// GET /feed?tag=&page=&limit=
router.get("/", async (req, res) => {
  const tag = req.query.tag as string | undefined;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  try {
    const where = tag ? { tags: { has: tag } } : {};

    // Only show resources that belong to at least one public board
    const resources = await prisma.resource.findMany({
      where: {
        ...where,
        boards: { some: { board: { isPublic: true } } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const total = await prisma.resource.count({
      where: {
        ...where,
        boards: { some: { board: { isPublic: true } } },
      },
    });

    res.json({ resources, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch feed" });
  }
});

export default router;
```

**Step 2: Commit**

```bash
git add api/src/routes/feed.ts
git commit -m "feat: add public feed endpoint with pagination and tag filter"
```

---

### Task 5: Create Boards API Route

**Files:**
- Create: `api/src/routes/boards.ts`

**Step 1: Create the boards route**

```typescript
import { Router } from "express";
import prisma from "../lib/prisma";
import { requireAuth, optionalAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /boards/:id — public if board is public
router.get("/:id", optionalAuth, async (req: AuthRequest, res) => {
  const id = req.params.id as string;

  try {
    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        resources: {
          include: { resource: true },
          orderBy: { addedAt: "desc" },
        },
      },
    });

    if (!board) {
      res.status(404).json({ error: "Board not found" });
      return;
    }

    if (!board.isPublic && board.userId !== req.userId) {
      res.status(404).json({ error: "Board not found" });
      return;
    }

    res.json(board);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch board" });
  }
});

// GET /boards/user/:username — public boards by username
// Note: username comes from Keycloak token preferred_username, stored nowhere in DB.
// We'll use userId (Keycloak sub) for lookups. The frontend will handle display names.
// Actually, since we don't store usernames, we'll use userId in the URL.
// GET /boards/by-user/:userId — public boards for a user
router.get("/by-user/:userId", async (req, res) => {
  const userId = req.params.userId as string;

  try {
    const boards = await prisma.board.findMany({
      where: { userId, isPublic: true },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { resources: true } },
      },
    });

    res.json(boards);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user boards" });
  }
});

// --- Auth-required routes below ---

// POST /boards — create board
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId as string;
  const { name, description, isPublic } = req.body;

  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  try {
    const board = await prisma.board.create({
      data: {
        name,
        description: description || null,
        isPublic: isPublic !== false,
        userId,
      },
    });
    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ error: "Failed to create board" });
  }
});

// PUT /boards/:id — update board (owner only)
router.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId as string;
  const id = req.params.id as string;
  const { name, description, isPublic } = req.body;

  try {
    const existing = await prisma.board.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: "Board not found" });
      return;
    }

    const board = await prisma.board.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isPublic !== undefined && { isPublic }),
      },
    });
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: "Failed to update board" });
  }
});

// DELETE /boards/:id — delete board (owner only)
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId as string;
  const id = req.params.id as string;

  try {
    const existing = await prisma.board.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: "Board not found" });
      return;
    }

    await prisma.board.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete board" });
  }
});

// POST /boards/:id/resources — add resource to board (owner only)
router.post("/:id/resources", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId as string;
  const boardId = req.params.id as string;
  const { url, title, tags } = req.body;

  if (!url || !title) {
    res.status(400).json({ error: "url and title are required" });
    return;
  }

  try {
    const board = await prisma.board.findFirst({ where: { id: boardId, userId } });
    if (!board) {
      res.status(404).json({ error: "Board not found" });
      return;
    }

    // Create resource and link to board in one transaction
    const resource = await prisma.resource.create({
      data: {
        url,
        title,
        tags: tags || [],
        userId,
        boards: {
          create: { boardId },
        },
      },
    });

    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ error: "Failed to add resource" });
  }
});

// DELETE /boards/:id/resources/:resourceId — remove resource from board (owner only)
router.delete("/:id/resources/:resourceId", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId as string;
  const boardId = req.params.id as string;
  const resourceId = req.params.resourceId as string;

  try {
    const board = await prisma.board.findFirst({ where: { id: boardId, userId } });
    if (!board) {
      res.status(404).json({ error: "Board not found" });
      return;
    }

    await prisma.boardResource.delete({
      where: { boardId_resourceId: { boardId, resourceId } },
    });

    // Also delete the resource if it's no longer on any board
    const remaining = await prisma.boardResource.count({ where: { resourceId } });
    if (remaining === 0) {
      await prisma.resource.delete({ where: { id: resourceId } });
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to remove resource" });
  }
});

export default router;
```

**Step 2: Commit**

```bash
git add api/src/routes/boards.ts
git commit -m "feat: add boards CRUD and resource management endpoints"
```

---

### Task 6: Update API Entry Point

**Files:**
- Modify: `api/src/index.ts`
- Delete: `api/src/routes/tasks.ts`

**Step 1: Replace task routes with feed + boards routes**

Replace `api/src/index.ts` contents:

```typescript
import express from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import feedRouter from "./routes/feed";
import boardsRouter from "./routes/boards";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/health", healthRouter);
app.use("/feed", feedRouter);
app.use("/boards", boardsRouter);

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
```

**Step 2: Delete the old tasks route**

```bash
rm api/src/routes/tasks.ts
```

**Step 3: Commit**

```bash
git add api/src/index.ts
git rm api/src/routes/tasks.ts
git commit -m "feat: replace task routes with feed and boards endpoints"
```

---

### Task 7: Install Frontend Dependencies

**Files:**
- Modify: `web/package.json`

**Step 1: Add react-router-dom**

```bash
cd web && npm install react-router-dom
```

**Step 2: Commit**

```bash
git add web/package.json web/package-lock.json
git commit -m "feat: add react-router-dom for multi-page navigation"
```

---

### Task 8: Update Frontend Auth to Check-SSO Mode

**Files:**
- Modify: `web/src/main.tsx`

**Step 1: Change Keycloak init to check-sso**

The feed is public — unauthenticated users should see it. Change from `login-required` to `check-sso`:

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./App.css";
import keycloak from "./keycloak";

keycloak
  .init({ onLoad: "check-sso", pkceMethod: "S256", silentCheckSsoRedirectUri: window.location.origin + "/silent-check-sso.html" })
  .then(() => {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StrictMode>
    );
  })
  .catch((err) => {
    console.error("Keycloak init failed", err);
  });

// Auto-refresh token before it expires (only if authenticated)
setInterval(() => {
  if (keycloak.authenticated) {
    keycloak.updateToken(30).catch(() => keycloak.logout());
  }
}, 30000);
```

**Step 2: Create silent-check-sso.html**

Create `web/public/silent-check-sso.html`:

```html
<!doctype html>
<html>
<body>
<script>parent.postMessage(location.href, location.origin);</script>
</body>
</html>
```

**Step 3: Commit**

```bash
git add web/src/main.tsx web/public/silent-check-sso.html
git commit -m "feat: switch to check-sso for public feed access"
```

---

### Task 9: Build Frontend — Feed Page

**Files:**
- Rewrite: `web/src/App.tsx`
- Create: `web/src/pages/Feed.tsx`
- Create: `web/src/components/ResourceCard.tsx`
- Create: `web/src/components/Header.tsx`

**Step 1: Create shared Header component**

Create `web/src/components/Header.tsx`:

```tsx
import { Link } from "react-router-dom";
import keycloak from "../keycloak";

export default function Header() {
  return (
    <header className="header">
      <Link to="/" className="logo">esoteric-resources</Link>
      <nav>
        {keycloak.authenticated ? (
          <>
            <Link to="/my/boards">My Boards</Link>
            <span className="username">{keycloak.tokenParsed?.preferred_username}</span>
            <button onClick={() => keycloak.logout()} className="btn-link">Logout</button>
          </>
        ) : (
          <button onClick={() => keycloak.login()} className="btn-link">Login</button>
        )}
      </nav>
    </header>
  );
}
```

**Step 2: Create ResourceCard component**

Create `web/src/components/ResourceCard.tsx`:

```tsx
interface Resource {
  id: string;
  url: string;
  title: string;
  tags: string[];
  createdAt: string;
}

export default function ResourceCard({ resource, onTagClick }: { resource: Resource; onTagClick?: (tag: string) => void }) {
  const domain = new URL(resource.url).hostname.replace("www.", "");

  return (
    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="resource-card">
      <h3>{resource.title}</h3>
      <span className="domain">{domain}</span>
      {resource.tags.length > 0 && (
        <div className="tags">
          {resource.tags.map((tag) => (
            <button
              key={tag}
              className="tag"
              onClick={(e) => {
                e.preventDefault();
                onTagClick?.(tag);
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </a>
  );
}
```

**Step 3: Create Feed page**

Create `web/src/pages/Feed.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ResourceCard from "../components/ResourceCard";

const API = "http://api.localhost";

interface Resource {
  id: string;
  url: string;
  title: string;
  tags: string[];
  createdAt: string;
}

export default function Feed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [resources, setResources] = useState<Resource[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const tag = searchParams.get("tag") || "";

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (tag) params.set("tag", tag);

    fetch(`${API}/feed?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setResources(data.resources);
        setTotal(data.total);
      })
      .catch(() => setResources([]));
  }, [page, tag]);

  const handleTagClick = (t: string) => {
    setPage(1);
    setSearchParams(t ? { tag: t } : {});
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      {tag && (
        <div className="active-filter">
          Filtering by: <strong>{tag}</strong>
          <button onClick={() => handleTagClick("")} className="clear-filter">clear</button>
        </div>
      )}

      {resources.length === 0 ? (
        <p className="empty">No resources yet. {tag ? "Try clearing the filter." : "Be the first to share one!"}</p>
      ) : (
        <div className="masonry">
          {resources.map((r) => (
            <ResourceCard key={r.id} resource={r} onTagClick={handleTagClick} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
```

**Step 4: Rewrite App.tsx as router shell**

Replace `web/src/App.tsx`:

```tsx
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Feed from "./pages/Feed";

export default function App() {
  return (
    <div className="container">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Feed />} />
        </Routes>
      </main>
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add web/src/App.tsx web/src/pages/Feed.tsx web/src/components/ResourceCard.tsx web/src/components/Header.tsx
git commit -m "feat: add feed page with masonry grid and tag filtering"
```

---

### Task 10: Build Frontend — Board View Page

**Files:**
- Create: `web/src/pages/BoardView.tsx`
- Modify: `web/src/App.tsx` (add route)

**Step 1: Create BoardView page**

Create `web/src/pages/BoardView.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ResourceCard from "../components/ResourceCard";

const API = "http://api.localhost";

interface Resource {
  id: string;
  url: string;
  title: string;
  tags: string[];
  createdAt: string;
}

interface Board {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  userId: string;
  resources: { resource: Resource; addedAt: string }[];
}

export default function BoardView() {
  const { id } = useParams<{ id: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/boards/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setBoard)
      .catch(() => setError("Board not found"));
  }, [id]);

  if (error) return <p className="empty">{error}</p>;
  if (!board) return <p className="empty">Loading...</p>;

  return (
    <div>
      <div className="board-header">
        <h2>{board.name}</h2>
        {board.description && <p>{board.description}</p>}
        <span className="resource-count">{board.resources.length} resources</span>
      </div>

      {board.resources.length === 0 ? (
        <p className="empty">This board has no resources yet.</p>
      ) : (
        <div className="masonry">
          {board.resources.map(({ resource }) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Add route to App.tsx**

Add import and route:

```tsx
import BoardView from "./pages/BoardView";
```

Add route inside `<Routes>`:

```tsx
<Route path="/board/:id" element={<BoardView />} />
```

**Step 3: Commit**

```bash
git add web/src/pages/BoardView.tsx web/src/App.tsx
git commit -m "feat: add board view page"
```

---

### Task 11: Build Frontend — My Boards Page

**Files:**
- Create: `web/src/pages/MyBoards.tsx`
- Modify: `web/src/App.tsx` (add route)

**Step 1: Create MyBoards page**

Create `web/src/pages/MyBoards.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import keycloak from "../keycloak";

const API = "http://api.localhost";

interface Board {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  _count: { resources: number };
}

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${keycloak.token}`,
  };
}

export default function MyBoards() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const userId = keycloak.tokenParsed?.sub;

  const fetchBoards = () => {
    if (!userId) return;
    fetch(`${API}/boards/by-user/${userId}`)
      .then((r) => r.json())
      .then(setBoards)
      .catch(() => setBoards([]));
  };

  useEffect(() => {
    fetchBoards();
  }, [userId]);

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await fetch(`${API}/boards`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name, description: description || undefined }),
    });

    setName("");
    setDescription("");
    fetchBoards();
  };

  const deleteBoard = async (id: string) => {
    await fetch(`${API}/boards/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${keycloak.token}` },
    });
    fetchBoards();
  };

  if (!keycloak.authenticated) {
    return <p className="empty">Please <button onClick={() => keycloak.login()} className="btn-link">login</button> to manage your boards.</p>;
  }

  return (
    <div>
      <h2>My Boards</h2>

      <form onSubmit={createBoard} className="create-form">
        <input
          type="text"
          placeholder="Board name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit">Create Board</button>
      </form>

      {boards.length === 0 ? (
        <p className="empty">No boards yet. Create one above.</p>
      ) : (
        <ul className="board-list">
          {boards.map((board) => (
            <li key={board.id} className="board-item">
              <div>
                <Link to={`/board/${board.id}`}><strong>{board.name}</strong></Link>
                {board.description && <p>{board.description}</p>}
                <span className="resource-count">{board._count.resources} resources</span>
              </div>
              <div className="actions">
                <Link to={`/my/boards/${board.id}/add`} className="btn">Add Resource</Link>
                <button onClick={() => deleteBoard(board.id)} className="delete">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**Step 2: Add route to App.tsx**

Add import and route:

```tsx
import MyBoards from "./pages/MyBoards";
```

```tsx
<Route path="/my/boards" element={<MyBoards />} />
```

**Step 3: Commit**

```bash
git add web/src/pages/MyBoards.tsx web/src/App.tsx
git commit -m "feat: add my boards page with create and delete"
```

---

### Task 12: Build Frontend — Add Resource Page

**Files:**
- Create: `web/src/pages/AddResource.tsx`
- Modify: `web/src/App.tsx` (add route)

**Step 1: Create AddResource page**

Create `web/src/pages/AddResource.tsx`:

```tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import keycloak from "../keycloak";

const API = "http://api.localhost";

export default function AddResource() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !title.trim()) return;

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    await fetch(`${API}/boards/${id}/resources`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${keycloak.token}`,
      },
      body: JSON.stringify({ url, title, tags }),
    });

    navigate(`/board/${id}`);
  };

  if (!keycloak.authenticated) {
    return <p className="empty">Please login to add resources.</p>;
  }

  return (
    <div>
      <h2>Add Resource</h2>
      <form onSubmit={handleSubmit} className="create-form">
        <input
          type="url"
          placeholder="https://example.com/paper.pdf"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Resource title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Tags (comma-separated: cs, math, algorithms)"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
        />
        <button type="submit">Add Resource</button>
      </form>
    </div>
  );
}
```

**Step 2: Add route to App.tsx**

Add import and route:

```tsx
import AddResource from "./pages/AddResource";
```

```tsx
<Route path="/my/boards/:id/add" element={<AddResource />} />
```

**Step 3: Commit**

```bash
git add web/src/pages/AddResource.tsx web/src/App.tsx
git commit -m "feat: add resource submission page"
```

---

### Task 13: Update Frontend Styles

**Files:**
- Rewrite: `web/src/App.css`

**Step 1: Replace CSS with new styles**

Replace `web/src/App.css` with styles for the new layout:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #f0f0f0;
  color: #333;
}

.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #ddd;
}

.logo {
  font-size: 1.25rem;
  font-weight: 700;
  color: #333;
  text-decoration: none;
}

.header nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
}

.header nav a {
  color: #555;
  text-decoration: none;
}

.header nav a:hover {
  color: #000;
}

.username {
  color: #888;
}

.btn-link {
  background: none;
  border: none;
  color: #555;
  cursor: pointer;
  font-size: inherit;
  text-decoration: underline;
}

/* Masonry Grid */
.masonry {
  column-count: 3;
  column-gap: 1rem;
}

@media (max-width: 768px) {
  .masonry { column-count: 2; }
}

@media (max-width: 480px) {
  .masonry { column-count: 1; }
}

/* Resource Card */
.resource-card {
  display: block;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  break-inside: avoid;
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.15s;
}

.resource-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.resource-card h3 {
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
  line-height: 1.3;
}

.domain {
  font-size: 0.75rem;
  color: #888;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.5rem;
}

.tag {
  font-size: 0.7rem;
  padding: 0.125rem 0.5rem;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 12px;
  cursor: pointer;
  color: #555;
}

.tag:hover {
  background: #e0e0e0;
}

/* Active Filter */
.active-filter {
  margin-bottom: 1rem;
  padding: 0.5rem 0.75rem;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.875rem;
}

.clear-filter {
  margin-left: 0.5rem;
  background: none;
  border: none;
  color: #c00;
  cursor: pointer;
  text-decoration: underline;
  font-size: inherit;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin: 2rem 0;
  font-size: 0.875rem;
}

.pagination button {
  padding: 0.375rem 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: default;
}

/* Board Header */
.board-header {
  margin-bottom: 1.5rem;
}

.board-header h2 {
  margin-bottom: 0.25rem;
}

.board-header p {
  color: #666;
  font-size: 0.875rem;
}

.resource-count {
  font-size: 0.75rem;
  color: #888;
}

/* Board List */
.board-list {
  list-style: none;
}

.board-item {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.board-item a {
  color: #333;
  text-decoration: none;
}

.board-item a:hover {
  text-decoration: underline;
}

.board-item p {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.25rem;
}

/* Forms */
.create-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  max-width: 500px;
}

.create-form input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

.create-form button {
  padding: 0.5rem;
  background: #333;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

/* Actions */
.actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn {
  padding: 0.25rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 0.8rem;
  text-decoration: none;
  color: #333;
}

.delete {
  padding: 0.25rem 0.5rem;
  border: 1px solid #c00;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 0.8rem;
  color: #c00;
}

/* Utilities */
.empty {
  color: #999;
  text-align: center;
  margin-top: 3rem;
}

h2 {
  margin-bottom: 1rem;
}
```

**Step 2: Commit**

```bash
git add web/src/App.css
git commit -m "feat: add masonry grid and esoteric-resources styles"
```

---

### Task 14: Rebuild and Test

**Step 1: Wipe old database volume and rebuild**

Since the schema changed completely, drop the old volume:

```bash
docker compose down -v
docker compose up --build
```

**Step 2: Verify feed loads at http://localhost (should show empty feed, no login required)**

**Step 3: Login via header link, create a board at /my/boards**

**Step 4: Add a resource to the board via /my/boards/:id/add**

**Step 5: Verify resource appears on feed at / and on the board at /board/:id**

**Step 6: Verify tag filtering works on the feed**

---

### Task 15: Final Commit

After verifying everything works:

```bash
git add -A
git commit -m "feat: complete esoteric-resources implementation"
```
