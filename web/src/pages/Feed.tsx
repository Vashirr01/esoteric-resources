import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ResourceCard from "../components/ResourceCard";

const API = import.meta.env.VITE_API_URL || "http://api.localhost";

interface Resource {
  id: string;
  url: string;
  title: string;
  tags: string[];
  createdAt: string;
  username?: string | null;
  board?: { id: string; name: string } | null;
}

export default function Feed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [resources, setResources] = useState<Resource[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
  const tag = searchParams.get("tag") || "";
  const q = searchParams.get("q") || "";

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (tag) params.set("tag", tag);
    if (q) params.set("q", q);

    fetch(`${API}/feed?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setResources(data.resources);
        setTotal(data.total);
      })
      .catch(() => setResources([]));
  }, [page, tag, q]);

  const handleTagClick = (t: string) => {
    setPage(1);
    const next: Record<string, string> = {};
    if (t) next.tag = t;
    if (q) next.q = q;
    setSearchParams(next);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const next: Record<string, string> = {};
    if (tag) next.tag = tag;
    if (searchInput.trim()) next.q = searchInput.trim();
    setSearchParams(next);
  };

  const clearSearch = () => {
    setSearchInput("");
    setPage(1);
    const next: Record<string, string> = {};
    if (tag) next.tag = tag;
    setSearchParams(next);
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <form onSubmit={handleSearch} className="search-bar">
        <input
          type="text"
          placeholder="Search resources..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      {(tag || q) && (
        <div className="active-filter">
          {tag && <>Filtering by tag: <strong>{tag}</strong></>}
          {tag && q && " · "}
          {q && <>Search: <strong>{q}</strong></>}
          {tag && <button onClick={() => handleTagClick("")} className="clear-filter">clear tag</button>}
          {q && <button onClick={clearSearch} className="clear-filter">clear search</button>}
        </div>
      )}

      {resources.length === 0 ? (
        <p className="empty">
          No resources found.{" "}
          {tag || q ? "Try clearing filters." : "Be the first to share one!"}
        </p>
      ) : (
        <div className="masonry">
          {resources.map((r) => (
            <ResourceCard key={r.id} resource={r} onTagClick={handleTagClick} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
