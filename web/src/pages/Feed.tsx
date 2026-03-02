import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ResourceCard from "../components/ResourceCard";

const API = "http://api.localhost";

interface Resource {
  id: string;
  url: string;
  title: string;
  tags: string[];
  createdAt: string;
}

export default function Feed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [resources, setResources] = useState<Resource[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const tag = searchParams.get("tag") || "";

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (tag) params.set("tag", tag);

    fetch(`${API}/feed?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setResources(data.resources);
        setTotal(data.total);
      })
      .catch(() => setResources([]));
  }, [page, tag]);

  const handleTagClick = (t: string) => {
    setPage(1);
    setSearchParams(t ? { tag: t } : {});
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      {tag && (
        <div className="active-filter">
          Filtering by: <strong>{tag}</strong>
          <button onClick={() => handleTagClick("")} className="clear-filter">clear</button>
        </div>
      )}

      {resources.length === 0 ? (
        <p className="empty">No resources yet. {tag ? "Try clearing the filter." : "Be the first to share one!"}</p>
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
