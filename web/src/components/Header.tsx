import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useTheme } from "../lib/useTheme";
import { supabase } from "../lib/supabase";

export default function Header() {
  const { session, user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const username = user?.user_metadata?.username || user?.email;

  useEffect(() => {
    if (!user) { setAvatarUrl(null); return; }
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setAvatarUrl(data?.avatar_url || null));
  }, [user]);

  return (
    <header className="header">
      <Link to="/" className="logo">esoteric-resources</Link>
      <nav>
        <button onClick={toggle} className="theme-toggle" title="Toggle dark mode">
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        {session ? (
          <>
            <Link to="/my/boards">My Boards</Link>
            <Link to={`/user/${username}`} className="username-link header-user">
              {avatarUrl && <img src={avatarUrl} alt="" className="header-avatar" />}
              {username}
            </Link>
            <button onClick={() => signOut()} className="btn-link">Logout</button>
          </>
        ) : (
          <Link to="/login" className="btn-link">Login</Link>
        )}
      </nav>
    </header>
  );
}
