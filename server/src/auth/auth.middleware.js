// server/src/auth/auth.middleware.js
import { verifyToken } from "./jwt.js";

// Attaches req.user = { id, role } if a valid token is present.
// Use on any route that requires the caller to be logged in.
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No token provided." });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { id, role, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

// Use AFTER requireAuth. Pass one or more allowed roles.
// e.g. router.get("/doctor-only", requireAuth, requireRole("DOCTOR"), handler)
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated." });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have access to this resource." });
    }
    next();
  };
}

// Use AFTER requireAuth. Checks the modules array baked into the JWT.
// e.g. router.get("/opd/x", requireAuth, requireModule("OPD"), handler)
export function requireModule(...allowedModules) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated." });
    }
    const userModules = req.user.modules || [];
    const hasAccess = allowedModules.some((m) => userModules.includes(m));
    if (!hasAccess) {
      return res.status(403).json({ message: "You are not assigned to this module." });
    }
    next();
  };
}