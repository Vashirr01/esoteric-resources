import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const err = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    if (err) {
      setError(err);
    } else {
      navigate("/");
    }
  };

  return (
    <div>
      <h2>{isSignUp ? "Sign Up" : "Login"}</h2>
      <form onSubmit={handleSubmit} className="create-form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">{isSignUp ? "Sign Up" : "Login"}</button>
      </form>
      <p className="toggle-auth">
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <button onClick={() => setIsSignUp(!isSignUp)} className="btn-link">
          {isSignUp ? "Login" : "Sign Up"}
        </button>
      </p>
    </div>
  );
}
