import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

// Create a task
router.post("/", async (req, res) => {
  const { title, description, status } = req.body;

  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  try {
    const task = await prisma.task.create({
      data: { title, description, status },
    });
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: "Failed to create task" });
  }
});

// List all tasks
router.get("/", async (_req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Get one task
router.get("/:id", async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
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
router.put("/:id", async (req, res) => {
  const { title, description, status } = req.body;

  try {
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { title, description, status },
    });
    res.json(task);
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.status(500).json({ error: "Failed to update task" });
  }
});

// Delete a task
router.delete("/:id", async (req, res) => {
  try {
    await prisma.task.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (err: any) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;
