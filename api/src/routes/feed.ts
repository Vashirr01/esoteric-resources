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
    console.error("Feed error:", err);
    res.status(500).json({ error: "Failed to fetch feed" });
  }
});

export default router;
