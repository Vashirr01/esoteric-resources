import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./App.css";
import keycloak from "./keycloak";

keycloak
  .init({ onLoad: "check-sso", pkceMethod: "S256", silentCheckSsoRedirectUri: window.location.origin + "/silent-check-sso.html" })
  .then(() => {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StrictMode>
    );
  })
  .catch((err) => {
    console.error("Keycloak init failed", err);
  });

// Auto-refresh token before it expires (only if authenticated)
setInterval(() => {
  if (keycloak.authenticated) {
    keycloak.updateToken(30).catch(() => keycloak.logout());
  }
}, 30000);
