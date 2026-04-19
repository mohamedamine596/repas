import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import {
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  REFRESH_COOKIE_NAME,
} from "../constants/auth.js";

const accessSecret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
const refreshSecret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;

if (!accessSecret || !refreshSecret) {
  throw new Error("Missing ACCESS_TOKEN_SECRET/REFRESH_TOKEN_SECRET (or JWT_SECRET fallback)");
}

function getExpiryIso(token) {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded !== "object" || !decoded.exp) {
    return null;
  }
  return new Date(decoded.exp * 1000).toISOString();
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function buildAccessToken(user) {
  return jwt.sign(
    {
      type: "access",
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      isVerified: Boolean(user.isVerified),
      isEmailVerified: Boolean(user.isEmailVerified),
      verificationStatus: user.verificationStatus,
      accountStatus: user.accountStatus,
    },
    accessSecret,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

export function buildRefreshToken(user, tokenId) {
  return jwt.sign(
    {
      type: "refresh",
      sub: user.id,
      tokenId,
    },
    refreshSecret,
    { expiresIn: REFRESH_TOKEN_TTL }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, accessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, refreshSecret);
}

export function createSessionFromRefreshToken(token, tokenId) {
  return {
    id: tokenId,
    tokenHash: hashToken(token),
    createdAt: new Date().toISOString(),
    expiresAt: getExpiryIso(token),
    revokedAt: null,
  };
}

export function issueTokenPair(user) {
  const tokenId = nanoid();
  const accessToken = buildAccessToken(user);
  const refreshToken = buildRefreshToken(user, tokenId);

  return {
    tokenId,
    accessToken,
    refreshToken,
  };
}

export function getRefreshCookieOptions() {
  const maxAgeMs = Number(process.env.REFRESH_COOKIE_MAX_AGE_MS || 1000 * 60 * 60 * 24 * 7);

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: maxAgeMs,
  };
}

export function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
}

export function getRefreshTokenFromRequest(req) {
  return req.cookies?.[REFRESH_COOKIE_NAME] || null;
}
