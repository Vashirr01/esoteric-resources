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
