import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

const API = import.meta.env.VITE_API_URL || "http://api.localhost";

export default function AddResource() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
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
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ url, title, tags }),
    });

    navigate(`/board/${id}`);
  };

  if (!session) {
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
