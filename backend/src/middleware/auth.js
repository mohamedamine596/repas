import { ACCOUNT_STATUS, USER_ROLES } from "../constants/auth.js";
import { verifyAccessToken } from "../utils/authTokens.js";
import { readDb } from "../utils/db.js";

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

export function requireAuth(req, res, next) {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const payload = verifyAccessToken(token);
    if (!payload || payload.type !== "access") {
      return res.status(401).json({ error: "Invalid token type" });
    }

    const db = readDb();
    const user = db.users.find((item) => item.id === payload.sub);
    if (!user) {
      return res.status(401).json({ error: "User account does not exist" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      isVerified: Boolean(user.isVerified),
      isEmailVerified: Boolean(user.isEmailVerified),
      verificationStatus: user.verificationStatus,
      accountStatus: user.accountStatus,
      suspensionReason: user.suspensionReason || "",
    };

    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient role permissions" });
    }

    return next();
  };
}

export function requireVerifiedDonor(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (req.user.role !== USER_ROLES.DONOR) {
    return res.status(403).json({ error: "Only donor accounts can perform this action" });
  }

  if (!req.user.isVerified || req.user.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
    return res.status(403).json({
      error: "Donor account is not verified yet",
      code: "DONOR_NOT_VERIFIED",
    });
  }

  return next();
}

export const authRequired = requireAuth;
export const isAuthenticated = requireAuth;
export const isDonneur = requireRole(USER_ROLES.DONOR);
export const isReceveur = requireRole(USER_ROLES.RECEIVER);
export const isAdmin = requireRole(USER_ROLES.ADMIN);
