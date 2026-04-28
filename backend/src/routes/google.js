import express from "express";
import { OAuth2Client } from "google-auth-library";
import { nanoid } from "nanoid";
import { readDb, writeDb } from "../utils/db.js";
import { publicUser } from "../utils/users.js";
import {
  issueTokenPair,
  setRefreshCookie,
  createSessionFromRefreshToken,
} from "../utils/authTokens.js";
import { USER_ROLES, VERIFICATION_STATUS } from "../constants/auth.js";

const router = express.Router();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  "http://localhost:4000/api/auth/google/callback";
const FRONTEND_URL =
  process.env.FRONTEND_APP_URL || process.env.APP_URL || "http://localhost:5173";

function pruneRefreshSessions(user) {
  const now = Date.now();
  const sessions = Array.isArray(user.refreshTokens) ? user.refreshTokens : [];
  const filtered = sessions
    .filter((item) => {
      if (!item?.id || !item?.tokenHash) return false;
      if (item.revokedAt) return false;
      if (item.expiresAt && new Date(item.expiresAt).getTime() <= now)
        return false;
      return true;
    })
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  user.refreshTokens = filtered.slice(-10);
}

/**
 * GET /api/auth/google
 * Redirect user to Google's OAuth consent screen.
 */
router.get("/google", (req, res) => {
  console.log("[Google OAuth] CLIENT_ID present:", !!CLIENT_ID); // add this
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res
      .status(503)
      .json({ error: "Google OAuth is not configured on this server." });
  }

  const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, CALLBACK_URL);

  const authorizeUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
  });

  res.redirect(authorizeUrl);
});

/**
 * GET /api/auth/google/callback
 * Exchange the code from Google, find or create the user, issue JWT.
 */
router.get("/google/callback", async (req, res) => {
  const { code, error: oauthError } = req.query;

  if (oauthError || !code) {
    return res.redirect(
      `${FRONTEND_URL}/Login?error=google_denied`,
    );
  }

  try {
    const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, CALLBACK_URL);

    // Exchange code for tokens
    const { tokens } = await client.getToken(String(code));
    client.setCredentials(tokens);

    // Verify the ID token to get user info
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleEmail = payload.email?.toLowerCase().trim();
    const googleName = payload.name || payload.email?.split("@")[0] || "User";

    if (!googleEmail) {
      return res.redirect(`${FRONTEND_URL}/Login?error=google_no_email`);
    }

    // Only allow google login for receiver accounts
    const db = await readDb();
    let user = db.users.find((u) => u.email === googleEmail);

    const now = new Date().toISOString();

    if (!user) {
      // Create a new RECEIVER account — email is already verified by Google
      user = {
        id: nanoid(),
        name: googleName,
        email: googleEmail,
        password: null, // no password for google-only accounts
        role: USER_ROLES.RECEIVER,
        isVerified: true,
        isEmailVerified: true,
        isPhoneVerified: false,
        verificationStatus: VERIFICATION_STATUS.APPROVED,
        accountStatus: "active",
        statusHistory: [
          { status: "active", at: now, reason: "google_oauth_register" },
        ],
        bio: "",
        phone: "",
        googleId: payload.sub,
        avatar: payload.picture || null,
        createdAt: now,
        updatedAt: now,
        emailOtp: {},
        phoneOtp: {},
        passwordReset: {
          tokenHash: "",
          expiresAt: null,
          requestedAt: null,
          usedAt: null,
        },
        failedLoginCount: 0,
        lockoutUntil: null,
        lastFailedLoginAt: null,
        suspensionReason: "",
        refreshTokens: [],
      };
      db.users.push(user);
    } else {
      // Existing user — only allow if RECEIVER (not restaurant / admin)
      if (
        user.role === USER_ROLES.RESTAURANT ||
        user.role === USER_ROLES.ADMIN
      ) {
        return res.redirect(
          `${FRONTEND_URL}/Login?error=google_wrong_role`,
        );
      }

      if (
        user.accountStatus === "suspended" ||
        user.accountStatus === "suspended_auto"
      ) {
        return res.redirect(
          `${FRONTEND_URL}/Login?error=account_suspended`,
        );
      }

      // Upgrade email verification if not already done
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
        user.isVerified = true;
        user.accountStatus = "active";
        user.verificationStatus = VERIFICATION_STATUS.APPROVED;
      }

      if (!user.googleId) {
        user.googleId = payload.sub;
      }

      user.updatedAt = now;
    }

    // Issue JWT pair
    const { tokenId, accessToken, refreshToken } = issueTokenPair(user);
    pruneRefreshSessions(user);
    user.refreshTokens.push(
      createSessionFromRefreshToken(refreshToken, tokenId),
    );
    user.updatedAt = new Date().toISOString();

    await writeDb(db);
    setRefreshCookie(res, refreshToken);

    // Redirect to frontend callback route with the access token
    const redirectUrl = new URL(`${FRONTEND_URL}/auth/google/callback`);
    redirectUrl.searchParams.set("token", accessToken);
    res.redirect(redirectUrl.toString());
  } catch (err) {
    console.error("[Google OAuth] Error:", err.message);
    res.redirect(`${FRONTEND_URL}/Login?error=google_failed`);
  }
});

export default router;
