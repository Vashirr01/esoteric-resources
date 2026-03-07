import { Router } from "express";

const router = Router();

// GET /meta?url=... — fetch OG metadata from a URL
router.get("/", async (req, res) => {
  const url = req.query.url as string | undefined;

  if (!url) {
    res.status(400).json({ error: "url is required" });
    return;
  }

  try {
    new URL(url);
  } catch {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; esoteric-resources/1.0)" },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      res.json({ title: null, description: null, image: null });
      return;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      res.json({ title: null, description: null, image: null });
      return;
    }

    // Only read first 50KB to avoid downloading huge pages
    const reader = response.body?.getReader();
    if (!reader) {
      res.json({ title: null, description: null, image: null });
      return;
    }

    let html = "";
    const decoder = new TextDecoder();
    let bytesRead = 0;
    const maxBytes = 50_000;

    while (bytesRead < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      bytesRead += value.length;
    }
    reader.cancel();

    const getTag = (property: string): string | null => {
      const regex = new RegExp(
        `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']|<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
        "i"
      );
      const match = html.match(regex);
      return match?.[1] || match?.[2] || null;
    };

    const getTitleTag = (): string | null => {
      const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      return match?.[1]?.trim() || null;
    };

    const ogTitle = getTag("og:title");
    const ogDesc = getTag("og:description") || getTag("description");
    const ogImage = getTag("og:image");

    // Resolve relative image URLs
    let image = ogImage;
    if (image && !image.startsWith("http")) {
      try {
        image = new URL(image, url).href;
      } catch {
        image = null;
      }
    }

    res.json({
      title: ogTitle || getTitleTag() || null,
      description: ogDesc || null,
      image: image || null,
    });
  } catch {
    res.json({ title: null, description: null, image: null });
  }
});

export default router;
