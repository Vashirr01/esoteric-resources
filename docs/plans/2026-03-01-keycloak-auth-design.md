# Keycloak Auth — Design

## Goal

Add authentication using Keycloak so tasks are per-user. Learn OAuth2/OIDC patterns that map to Azure AD B2C later.

## Flow

1. User visits localhost, frontend checks for token
2. No token → redirect to Keycloak login at auth.localhost
3. User logs in, Keycloak redirects back with authorization code
4. Frontend exchanges code for JWT access token (PKCE)
5. Frontend sends Bearer token with every API request
6. API validates JWT against Keycloak's public keys
7. API extracts userId from token, filters tasks by user

## Keycloak Container

- Image: `keycloak/keycloak:26.0`
- Route: `auth.localhost` via Traefik
- Database: same PostgreSQL instance
- Realm config auto-imported from JSON file
- Realm: `cloud-lab`, Client: `cloud-lab-web` (public, PKCE)
- Test user: `demo` / `demo`

## Changes

### Frontend
- Add `keycloak-js` package
- Wrap app in auth check — redirect to login if no token
- Pass Bearer token with every fetch call
- Add logout button

### API
- Add `jsonwebtoken` + `jwks-rsa` packages
- Auth middleware: validate Bearer token, extract userId
- Filter all task queries by userId

### Database
- Add `userId String` to Task model
- New Prisma migration

### Docker Compose
- Add keycloak service with Traefik labels
- Add Keycloak env vars
