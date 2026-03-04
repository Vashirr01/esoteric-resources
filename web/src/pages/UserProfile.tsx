import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";

const API = import.meta.env.VITE_API_URL || "http://api.localhost";

interface Profile {
  id: string;
  username: string;
  bio: string | null;
  is_public: boolean;
}

interface Board {
  id: string;
  name: string;
  description: string | null;
  _count: { resources: number };
}

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  const isOwner = user && profile && user.id === profile.id;

  useEffect(() => {
    if (!username) return;

    supabase
      .from("profiles")
      .select("id, username, bio, is_public")
      .eq("username", username)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setProfile(data);
        setBio(data.bio || "");
        setIsPublic(data.is_public);

        // Fetch boards
        fetch(`${API}/boards/by-user/${data.id}`)
          .then((r) => (r.ok ? r.json() : []))
          .then(setBoards)
          .finally(() => setLoading(false));
      });
  }, [username]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ bio: bio || null, is_public: isPublic })
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, bio: bio || null, is_public: isPublic });
      setEditing(false);
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setBio(profile?.bio || "");
    setIsPublic(profile?.is_public ?? true);
    setEditing(false);
  };

  if (loading) return <p className="empty">Loading...</p>;
  if (notFound) return <p className="empty">User not found.</p>;
  if (!profile) return null;

  // Non-owner viewing a private profile
  if (!isOwner && !profile.is_public) {
    return (
      <div className="profile-private">
        <h2>{profile.username}</h2>
        <p>This profile is private.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="profile-header">
        <div className="profile-info">
          <h2>{profile.username}</h2>
          {!editing && profile.bio && <p className="profile-bio">{profile.bio}</p>}
          {!editing && !profile.bio && isOwner && (
            <p className="profile-bio-empty">No bio yet.</p>
          )}
          {!editing && !profile.is_public && isOwner && (
            <span className="profile-visibility">Private profile</span>
          )}
        </div>
        {isOwner && !editing && (
          <button className="btn" onClick={() => setEditing(true)}>Edit profile</button>
        )}
      </div>

      {editing && (
        <div className="profile-edit">
          <label>
            Bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell others about yourself..."
            />
          </label>
          <label className="profile-checkbox">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Public profile
          </label>
          <div className="actions">
            <button className="btn" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button className="btn" onClick={handleCancel}>Cancel</button>
          </div>
        </div>
      )}

      <h3 style={{ marginTop: "1.5rem", marginBottom: "0.75rem" }}>
        Boards ({boards.length})
      </h3>

      {boards.length === 0 ? (
        <p className="empty">No public boards yet.</p>
      ) : (
        <ul className="board-list">
          {boards.map((b) => (
            <li key={b.id} className="board-item">
              <div>
                <Link to={`/board/${b.id}`}><strong>{b.name}</strong></Link>
                {b.description && <p>{b.description}</p>}
              </div>
              <span className="resource-count">{b._count.resources} resources</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
