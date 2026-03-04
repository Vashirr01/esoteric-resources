import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function Header() {
  const { session, user, signOut } = useAuth();

  return (
    <header className="header">
      <Link to="/" className="logo">esoteric-resources</Link>
      <nav>
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
