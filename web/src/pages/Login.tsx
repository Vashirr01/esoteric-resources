import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import PasswordInput from "../components/PasswordInput";

export default function Login() {
  const { signIn, signUp, signInWithGitHub, resetPassword, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [submitting, setSubmitting] = useState(false);

  // After OAuth return, session appears via onAuthStateChange — redirect
  useEffect(() => {
    if (session) {
      const savedFrom = sessionStorage.getItem("auth_redirect");
      sessionStorage.removeItem("auth_redirect");
      navigate(savedFrom || from, { replace: true });
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      if (mode === "forgot") {
        const err = await resetPassword(email);
        if (err) {
          setError(err);
        } else {
          setMessage("Check your email for a password reset link.");
        }
        return;
      }

      const err = mode === "signup"
        ? await signUp(email, password, username)
        : await signIn(email, password);

      if (err) {
        setError(err);
      } else {
        navigate(from, { replace: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGitHub = () => {
    sessionStorage.setItem("auth_redirect", from);
    signInWithGitHub();
  };

  const title = mode === "signup" ? "Sign Up" : mode === "forgot" ? "Reset Password" : "Login";

  return (
    <div>
      <h2>{title}</h2>
      <form onSubmit={handleSubmit} className="create-form">
        {mode === "signup" && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {mode !== "forgot" && (
          <PasswordInput
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        )}
        {error && <p className="error">{error}</p>}
        {message && <p style={{ color: "#080" }}>{message}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Please wait..." : title}
        </button>
      </form>
      {mode !== "forgot" && (
        <>
          <div className="auth-divider">or</div>
          <button onClick={handleGitHub} className="github-btn" disabled={submitting}>
            Sign in with GitHub
          </button>
        </>
      )}
      {mode === "login" && (
        <p className="toggle-auth">
          <button onClick={() => setMode("forgot")} className="btn-link">Forgot password?</button>
        </p>
      )}
      <p className="toggle-auth">
        {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
        <button onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="btn-link">
          {mode === "signup" ? "Login" : "Sign Up"}
        </button>
      </p>
    </div>
  );
}
