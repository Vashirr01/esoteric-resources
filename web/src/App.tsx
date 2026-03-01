import { useEffect, useState } from "react";
import keycloak from "./keycloak";

const API = "http://api.localhost";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${keycloak.token}`,
  };
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const fetchTasks = async () => {
    const res = await fetch(`${API}/tasks`, {
      headers: { Authorization: `Bearer ${keycloak.token}` },
    });
    const data = await res.json();
    setTasks(data);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await fetch(`${API}/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title, description: description || undefined }),
    });

    setTitle("");
    setDescription("");
    fetchTasks();
  };

  const toggleStatus = async (task: Task) => {
    const next = task.status === "done" ? "todo" : "done";
    await fetch(`${API}/tasks/${task.id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ status: next }),
    });
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await fetch(`${API}/tasks/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${keycloak.token}` },
    });
    fetchTasks();
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
  };

  const saveEdit = async (id: string) => {
    await fetch(`${API}/tasks/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ title: editTitle, description: editDescription || undefined }),
    });
    setEditingId(null);
    fetchTasks();
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div className="container">
      <header className="app-header">
        <h1>Task Manager</h1>
        <div className="user-info">
          <span>{keycloak.tokenParsed?.preferred_username}</span>
          <button onClick={() => keycloak.logout()} className="logout">
            Logout
          </button>
        </div>
      </header>

      <form onSubmit={createTask} className="create-form">
        <input
          type="text"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit">Add Task</button>
      </form>

      <ul className="task-list">
        {tasks.map((task) => (
          <li key={task.id} className={task.status === "done" ? "done" : ""}>
            {editingId === task.id ? (
              <div className="edit-form">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
                <div className="actions">
                  <button onClick={() => saveEdit(task.id)}>Save</button>
                  <button onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="task-content" onClick={() => startEdit(task)}>
                  <strong>{task.title}</strong>
                  {task.description && <p>{task.description}</p>}
                  <span className="status">{task.status}</span>
                </div>
                <div className="actions">
                  <button onClick={() => toggleStatus(task)}>
                    {task.status === "done" ? "Undo" : "Done"}
                  </button>
                  <button onClick={() => deleteTask(task.id)} className="delete">
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {tasks.length === 0 && <p className="empty">No tasks yet. Add one above.</p>}
    </div>
  );
}
