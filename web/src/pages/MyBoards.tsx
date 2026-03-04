import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { fetchWithAuth } from "../lib/supabase";

const API = import.meta.env.VITE_API_URL || "http://api.localhost";

interface Board {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  _count: { resources: number };
}

export default function MyBoards() {
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const loadBoards = () => {
    if (!user) return;
    fetch(`${API}/boards/by-user/${user.id}`)
      .then((r) => r.json())
      .then(setBoards)
      .catch(() => setBoards([]));
  };

  useEffect(() => {
    loadBoards();
  }, [user]);

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await fetchWithAuth(`${API}/boards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || undefined }),
    });

    setName("");
    setDescription("");
    loadBoards();
  };

  const deleteBoard = async (id: string) => {
    await fetchWithAuth(`${API}/boards/${id}`, { method: "DELETE" });
    loadBoards();
  };

  return (
    <div>
      <h2>My Boards</h2>

      <form onSubmit={createBoard} className="create-form">
        <input
          type="text"
          placeholder="Board name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit">Create Board</button>
      </form>

      {boards.length === 0 ? (
        <p className="empty">No boards yet. Create one above.</p>
      ) : (
        <ul className="board-list">
          {boards.map((board) => (
            <li key={board.id} className="board-item">
              <div>
                <Link to={`/board/${board.id}`}><strong>{board.name}</strong></Link>
                {board.description && <p>{board.description}</p>}
                <span className="resource-count">{board._count.resources} resources</span>
              </div>
              <div className="actions">
                <Link to={`/my/boards/${board.id}/add`} className="btn">Add Resource</Link>
                <button onClick={() => deleteBoard(board.id)} className="delete">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
