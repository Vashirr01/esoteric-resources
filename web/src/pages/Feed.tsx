import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import ResourceCard from "../components/ResourceCard";

const API = import.meta.env.VITE_API_URL || "http://api.localhost";
const LIMIT = 20;

interface Resource {
  id: string;
  url: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  tags: string[];
  createdAt: string;
  username?: string | null;
  avatarUrl?: string | null;
  board?: { id: string; name: string } | null;
}

export default function Feed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [resources, setResources] = useState<Resource[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
  const pageRef = useRef(1);
  const tag = searchParams.get("tag") || "";
  const q = searchParams.get("q") || "";

  const fetchFeed = useCallback((page: number, append: boolean, attempt = 0) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(LIMIT));
    if (tag) params.set("tag", tag);
    if (q) params.set("q", q);

    fetch(`${API}/feed?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setResources((prev) => append ? [...prev, ...data.resources] : data.resources);
        setHasMore(page * LIMIT < data.total);
        setLoading(false);
      })
      .catch(() => {
        if (attempt < 2) {
          setTimeout(() => fetchFeed(page, append, attempt + 1), 3000);
        } else {
          if (!append) setResources([]);
          setHasMore(false);
          setLoading(false);
        }
      });
  }, [tag, q]);

  useEffect(() => {
    pageRef.current = 1;
    fetchFeed(1, false);
  }, [fetchFeed]);

  useEffect(() => {
    const handleScroll = () => {
      if (loading || !hasMore) return;
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
        pageRef.current += 1;
        fetchFeed(pageRef.current, true);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, hasMore, fetchFeed]);

  const handleTagClick = (t: string) => {
    const next: Record<string, string> = {};
    if (t) next.tag = t;
    if (q) next.q = q;
    setSearchParams(next);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      const next: Record<string, string> = {};
      if (tag) next.tag = tag;
      if (searchInput.trim()) next.q = searchInput.trim();
      setSearchParams(next);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const clearSearch = () => {
    setSearchInput("");
  };

  return (
    <div>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search resources..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {(tag || q) && (
        <div className="active-filter">
          {tag && <>Filtering by tag: <strong>{tag}</strong></>}
          {tag && q && " · "}
          {q && <>Search: <strong>{q}</strong></>}
          {tag && <button onClick={() => handleTagClick("")} className="clear-filter">clear tag</button>}
          {q && <button onClick={clearSearch} className="clear-filter">clear search</button>}
        </div>
      )}

      {!loading && resources.length === 0 ? (
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

      {loading && (
        <div className="loader">
          <div className="spinner" />
        </div>
      )}
    </div>
  );
}
