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

export async function requireAuth(req, res, next) {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const payload = verifyAccessToken(token);
    if (!payload || payload.type !== "access") {
      return res.status(401).json({ error: "Invalid token type" });
    }

    const db = await readDb();
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
      isPhoneVerified: Boolean(user.isPhoneVerified),
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

/**
 * Guard for restaurant food-posting actions.
 * Requires ROLE_RESTAURANT with accountStatus === "approved".
 */
export function requireApprovedRestaurant(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (req.user.role !== USER_ROLES.RESTAURANT) {
    return res
      .status(403)
      .json({ error: "Only approved restaurants can perform this action" });
  }

  if (req.user.accountStatus !== ACCOUNT_STATUS.APPROVED) {
    return res.status(403).json({
      error: "Restaurant account is not yet approved",
      code: "RESTAURANT_NOT_APPROVED",
      accountStatus: req.user.accountStatus,
    });
  }

  return next();
}

// Legacy alias kept for any imports that still use requireVerifiedDonor
export const requireVerifiedDonor = requireApprovedRestaurant;

export const authRequired = requireAuth;
export const isAuthenticated = requireAuth;
export const isDonneur = requireRole(USER_ROLES.RESTAURANT);
export const isReceveur = requireRole(USER_ROLES.RECEIVER);
export const isAdmin = requireRole(USER_ROLES.ADMIN);
