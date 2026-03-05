import { Router } from "express";
import prisma from "../lib/prisma";
import { requireAuth, optionalAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /boards/my — current user's boards (with optional duplicate check)
// MUST be before /:id to avoid "my" matching as an id param
router.get("/my", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId as string;
  const url = req.query.url as string | undefined;

  try {
    const boards = await prisma.board.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        resources: url
          ? { where: { resource: { url } }, select: { resourceId: true }, take: 1 }
          : false,
      },
    });

    const result = boards.map((b: any) => ({
      id: b.id,
      name: b.name,
      ...(url ? { hasDuplicate: b.resources?.length > 0 } : {}),
    }));

    res.json(result);
  } catch (err) {
    console.error("My boards error:", err);
    res.status(500).json({ error: "Failed to fetch boards" });
  }
});

// GET /boards/by-user/:userId — public boards for a user (or all boards if owner)
router.get("/by-user/:userId", optionalAuth, async (req: AuthRequest, res) => {
  const userId = req.params.userId as string;
  const isOwner = req.userId === userId;

  try {
    const boards = await prisma.board.findMany({
      where: { userId, ...(isOwner ? {} : { isPublic: true }) },
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

// POST /boards/:id/save — save (copy) a resource to your board
router.post("/:id/save", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId as string;
  const boardId = req.params.id as string;
  const { resourceId } = req.body;

  if (!resourceId) {
    res.status(400).json({ error: "resourceId is required" });
    return;
  }

  try {
    const board = await prisma.board.findFirst({ where: { id: boardId, userId } });
    if (!board) {
      res.status(404).json({ error: "Board not found" });
      return;
    }

    const original = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!original) {
      res.status(404).json({ error: "Resource not found" });
      return;
    }

    // Check if board already has a resource with the same URL
    const existing = await prisma.resource.findFirst({
      where: {
        url: original.url,
        boards: { some: { boardId } },
      },
    });
    if (existing) {
      res.status(409).json({ error: "Resource already in this board" });
      return;
    }

    const copy = await prisma.resource.create({
      data: {
        url: original.url,
        title: original.title,
        tags: original.tags,
        userId,
        boards: { create: { boardId } },
      },
    });

    res.status(201).json(copy);
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ error: "Failed to save resource" });
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
