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
  const [isPublic, setIsPublic] = useState(true);

  const loadBoards = () => {
    if (!user) return;
    fetchWithAuth(`${API}/boards/by-user/${user.id}`)
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
      body: JSON.stringify({ name, description: description || undefined, isPublic }),
    });

    setName("");
    setDescription("");
    setIsPublic(true);
    loadBoards();
  };

  const toggleVisibility = async (board: Board) => {
    await fetchWithAuth(`${API}/boards/${board.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: !board.isPublic }),
    });
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
        <label className="visibility-toggle">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Public
        </label>
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
                <span className="resource-count">
                  {board._count.resources} resources
                  {!board.isPublic && <span className="board-private-badge">Private</span>}
                </span>
              </div>
              <div className="actions">
                <button onClick={() => toggleVisibility(board)} className="btn">
                  {board.isPublic ? "Make Private" : "Make Public"}
                </button>
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
