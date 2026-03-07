import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../lib/supabase";

const API = import.meta.env.VITE_API_URL || "http://api.localhost";

export default function AddResource() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [fetching, setFetching] = useState(false);

  // Auto-fetch metadata when URL changes
  useEffect(() => {
    if (!url.trim()) return;
    try { new URL(url); } catch { return; }

    const timeout = setTimeout(async () => {
      setFetching(true);
      try {
        const res = await fetch(`${API}/meta?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.title && !title) setTitle(data.title);
          if (data.description && !description) setDescription(data.description);
          if (data.image) setImageUrl(data.image);
        }
      } catch { /* ignore */ }
      setFetching(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !title.trim()) return;

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    await fetchWithAuth(`${API}/boards/${id}/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        title,
        description: description || null,
        imageUrl: imageUrl || null,
        tags,
      }),
    });

    navigate(`/board/${id}`);
  };

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
        {fetching && <span className="meta-fetching">Fetching metadata...</span>}
        {imageUrl && (
          <img src={imageUrl} alt="Preview" className="meta-preview" onError={() => setImageUrl("")} />
        )}
        <input
          type="text"
          placeholder="Resource title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
