import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import keycloak from "../keycloak";

const API = "http://api.localhost";

interface Board {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  _count: { resources: number };
}

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${keycloak.token}`,
  };
}

export default function MyBoards() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const userId = keycloak.tokenParsed?.sub;

  const fetchBoards = () => {
    if (!userId) return;
    fetch(`${API}/boards/by-user/${userId}`)
      .then((r) => r.json())
      .then(setBoards)
      .catch(() => setBoards([]));
  };

  useEffect(() => {
    fetchBoards();
  }, [userId]);

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await fetch(`${API}/boards`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name, description: description || undefined }),
    });

    setName("");
    setDescription("");
    fetchBoards();
  };

  const deleteBoard = async (id: string) => {
    await fetch(`${API}/boards/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${keycloak.token}` },
    });
    fetchBoards();
  };

  if (!keycloak.authenticated) {
    return <p className="empty">Please <button onClick={() => keycloak.login()} className="btn-link">login</button> to manage your boards.</p>;
  }

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
