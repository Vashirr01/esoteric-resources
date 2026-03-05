import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

// GET /profiles/:username
router.get("/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT id::text, username, bio, is_public, avatar_url FROM profiles WHERE username = $1 LIMIT 1`,
      username
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;
