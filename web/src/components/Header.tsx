import { Link } from "react-router-dom";
import keycloak from "../keycloak";

export default function Header() {
  return (
    <header className="header">
      <Link to="/" className="logo">esoteric-resources</Link>
      <nav>
        {keycloak.authenticated ? (
          <>
            <Link to="/my/boards">My Boards</Link>
            <span className="username">{keycloak.tokenParsed?.preferred_username}</span>
            <button onClick={() => keycloak.logout()} className="btn-link">Logout</button>
          </>
        ) : (
          <button onClick={() => keycloak.login()} className="btn-link">Login</button>
        )}
      </nav>
    </header>
  );
}
