import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useTheme } from "../lib/useTheme";

export default function Header() {
  const { session, user, signOut } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <header className="header">
      <Link to="/" className="logo">esoteric-resources</Link>
      <nav>
        <button onClick={toggle} className="theme-toggle" title="Toggle dark mode">
          {theme === "dark" ? "\u2600\uFE0F" : "\u{1F319}"}
        </button>
        {session ? (
          <>
            <Link to="/my/boards">My Boards</Link>
            <Link to={`/user/${user?.user_metadata?.username || user?.email}`} className="username-link">{user?.user_metadata?.username || user?.email}</Link>
            <button onClick={() => signOut()} className="btn-link">Logout</button>
          </>
        ) : (
          <Link to="/login" className="btn-link">Login</Link>
        )}
      </nav>
    </header>
  );
}
