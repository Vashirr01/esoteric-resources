import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

// GET /feed?tag=&q=&page=&limit=
router.get("/", async (req, res) => {
  const tag = req.query.tag as string | undefined;
  const q = req.query.q as string | undefined;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  try {
    const where: any = {
      boards: { some: { board: { isPublic: true } } },
    };

    if (tag) where.tags = { has: tag };
    if (q) where.title = { contains: q, mode: "insensitive" };

    const resources = await prisma.resource.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        boards: {
          where: { board: { isPublic: true } },
          take: 1,
          include: {
            board: { select: { id: true, name: true } },
          },
        },
      },
    });

    const total = await prisma.resource.count({ where });

    // Batch-fetch usernames from profiles table
    const userIds = [...new Set(resources.map((r) => r.userId))];
    const profiles: { id: string; username: string }[] =
      userIds.length > 0
        ? await prisma.$queryRawUnsafe(
            `SELECT id::text, username FROM profiles WHERE id::text IN (${userIds.map((_, i) => `$${i + 1}`).join(",")})`,
            ...userIds
          )
        : [];

    const usernameMap = new Map(profiles.map((p) => [p.id, p.username]));

    const enriched = resources.map((r) => ({
      id: r.id,
      url: r.url,
      title: r.title,
      tags: r.tags,
      createdAt: r.createdAt,
      userId: r.userId,
      username: usernameMap.get(r.userId) || null,
      board: r.boards[0]?.board || null,
    }));

    res.json({ resources: enriched, total, page, limit });
  } catch (err) {
    console.error("Feed error:", err);
    res.status(500).json({ error: "Failed to fetch feed" });
  }
});

export default router;
