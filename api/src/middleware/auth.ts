import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const keycloakUrl = process.env.KEYCLOAK_URL || "http://auth.localhost";
const realm = process.env.KEYCLOAK_REALM || "cloud-lab";

const client = jwksClient({
  jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key?.getPublicKey());
  });
}

export interface AuthRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
    if (err) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    req.userId = (decoded as jwt.JwtPayload).sub;
    next();
  });
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
    if (!err && decoded) {
      req.userId = (decoded as jwt.JwtPayload).sub;
    }
    next();
  });
}
