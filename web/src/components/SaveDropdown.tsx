import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, Check, Plus } from "lucide-react";
import { useAuth } from "../lib/AuthContext";

const API = import.meta.env.VITE_API_URL || "http://api.localhost";

interface Board {
  id: string;
  name: string;
  hasDuplicate?: boolean;
}

export default function SaveDropdown({ resourceId, resourceUrl }: { resourceId: string; resourceUrl: string }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setNewName("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const fetchBoards = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const token = session.access_token;
      const res = await fetch(`${API}/boards/my?url=${encodeURIComponent(resourceUrl)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setBoards(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) { navigate("/login"); return; }
    if (open) { setOpen(false); return; }
    setOpen(true);
    fetchBoards();
  };

  const handleSave = async (e: React.MouseEvent, boardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) return;
    setSaving(boardId);
    try {
      const res = await fetch(`${API}/boards/${boardId}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ resourceId }),
      });
      if (res.ok || res.status === 409) {
        setSaved(boardId);
        setTimeout(() => setOpen(false), 600);
      }
    } catch { /* ignore */ }
    setSaving(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session || !newName.trim()) return;
    setSaving("new");
    try {
      const createRes = await fetch(`${API}/boards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (createRes.ok) {
        const board = await createRes.json();
        // Now save the resource to the new board
        await fetch(`${API}/boards/${board.id}/save`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ resourceId }),
        });
        setSaved(board.id);
        setNewName("");
        setCreating(false);
        setTimeout(() => setOpen(false), 600);
      }
    } catch { /* ignore */ }
    setSaving(null);
  };

  return (
    <div className="save-dropdown" ref={ref}>
      <button
        className="save-btn"
        onClick={handleOpen}
        title="Save to board"
      >
        <Bookmark size={14} />
      </button>
      {open && (
        <div className="save-popover" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          {loading ? (
            <div className="save-loading">Loading...</div>
          ) : (
            <>
              {boards.length === 0 && !creating && (
                <div className="save-empty">No boards yet</div>
              )}
              {boards.map((b) => (
                <button
                  key={b.id}
                  className="save-option"
                  disabled={b.hasDuplicate || saving !== null}
                  onClick={(e) => handleSave(e, b.id)}
                >
                  <span className="save-option-name">{b.name}</span>
                  {(b.hasDuplicate || saved === b.id) && <Check size={12} />}
                </button>
              ))}
              {creating ? (
                <form className="save-new-form" onSubmit={handleCreate} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="Board name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" disabled={!newName.trim() || saving !== null}>
                    {saving === "new" ? "..." : "Add"}
                  </button>
                </form>
              ) : (
                <button
                  className="save-option save-new-btn"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCreating(true); }}
                >
                  <Plus size={12} />
                  <span>New board</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
