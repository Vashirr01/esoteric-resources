import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ResourceCard from "../components/ResourceCard";

const API = "http://api.localhost";

interface Resource {
  id: string;
  url: string;
  title: string;
  tags: string[];
  createdAt: string;
}

interface Board {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  userId: string;
  resources: { resource: Resource; addedAt: string }[];
}

export default function BoardView() {
  const { id } = useParams<{ id: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/boards/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setBoard)
      .catch(() => setError("Board not found"));
  }, [id]);

  if (error) return <p className="empty">{error}</p>;
  if (!board) return <p className="empty">Loading...</p>;

  return (
    <div>
      <div className="board-header">
        <h2>{board.name}</h2>
        {board.description && <p>{board.description}</p>}
        <span className="resource-count">{board.resources.length} resources</span>
      </div>

      {board.resources.length === 0 ? (
        <p className="empty">This board has no resources yet.</p>
      ) : (
        <div className="masonry">
          {board.resources.map(({ resource }) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  );
}
