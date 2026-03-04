import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import PasswordInput from "../components/PasswordInput";

export default function Login() {
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

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
      navigate("/");
    }
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
        <button type="submit">{title}</button>
      </form>
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
