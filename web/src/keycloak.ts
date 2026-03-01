import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: "http://auth.localhost",
  realm: "cloud-lab",
  clientId: "cloud-lab-web",
});

export default keycloak;
