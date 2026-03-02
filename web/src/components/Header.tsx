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
            <span className="username">{user?.email}</span>
            <button onClick={() => signOut()} className="btn-link">Logout</button>
          </>
        ) : (
          <Link to="/login" className="btn-link">Login</Link>
        )}
      </nav>
    </header>
  );
}
