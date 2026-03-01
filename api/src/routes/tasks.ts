import { Router } from "express";
import prisma from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

// Create a task
router.post("/", async (req: AuthRequest, res) => {
  const { title, description, status } = req.body;

  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  try {
    const task = await prisma.task.create({
      data: { title, description, status, userId: req.userId! },
    });
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: "Failed to create task" });
  }
});

// List all tasks
router.get("/", async (req: AuthRequest, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Get one task
router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// Update a task
router.put("/:id", async (req: AuthRequest, res) => {
  const { title, description, status } = req.body;

  try {
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { title, description, status },
    });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

// Delete a task
router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    await prisma.task.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;
