import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css";
import keycloak from "./keycloak";

keycloak
  .init({ onLoad: "login-required", pkceMethod: "S256" })
  .then((authenticated) => {
    if (authenticated) {
      createRoot(document.getElementById("root")!).render(
        <StrictMode>
          <App />
        </StrictMode>
      );
    }
  })
  .catch((err) => {
    console.error("Keycloak init failed", err);
  });

// Auto-refresh token before it expires
setInterval(() => {
  keycloak.updateToken(30).catch(() => keycloak.logout());
}, 30000);
