import express from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import Joi from "joi";
import rateLimit from "express-rate-limit";
import { nanoid } from "nanoid";
import { readDb, writeDb } from "../utils/db.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  clearRefreshCookie,
  createSessionFromRefreshToken,
  getRefreshTokenFromRequest,
  hashToken,
  issueTokenPair,
  setRefreshCookie,
  verifyRefreshToken,
} from "../utils/authTokens.js";
import { sendOtpEmail, sendPasswordResetEmail } from "../utils/mailer.js";
import { publicUser } from "../utils/users.js";
import {
  ACCOUNT_STATUS,
  USER_ROLES,
  VERIFICATION_STATUS,
} from "../constants/auth.js";
import googleRoutes from "./google.js";

const router = express.Router();
const OTP_TTL_MS = Number(process.env.OTP_TTL_MS || 10 * 60 * 1000);
const OTP_RESEND_COOLDOWN_MS = Number(
  process.env.OTP_RESEND_COOLDOWN_MS || 60 * 1000,
);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const LOGIN_MAX_FAILED_ATTEMPTS = Number(
  process.env.LOGIN_MAX_FAILED_ATTEMPTS || 5,
);
const LOGIN_LOCKOUT_MS = Number(process.env.LOGIN_LOCKOUT_MS || 15 * 60 * 1000);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 50),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts. Please try again later.",
  },
});

// Receiver registration â€” public users who want to receive food
const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120),
  fullName: Joi.string().trim().min(2).max(120),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).max(128).required(),
}).or("name", "fullName");

// Restaurant registration â€” requires SIREN + address + manager name
const registerRestaurantSchema = Joi.object({
  businessName: Joi.string().trim().min(2).max(200).required(),
  managerName: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(10).max(128).required(),
  phone: Joi.string()
    .trim()
    .pattern(/^\+?[\d\s\-().]{7,20}$/)
    .required()
    .messages({ "string.pattern.base": "Format de numÃ©ro invalide" }),
  siren: Joi.string()
    .trim()
    .pattern(/^\d{9}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Le numÃ©ro SIREN doit contenir exactement 9 chiffres",
    }),
  address: Joi.object({
    street: Joi.string().trim().min(3).max(300).required(),
    city: Joi.string().trim().min(1).max(100).required(),
    postalCode: Joi.string().trim().min(3).max(20).required(),
    country: Joi.string().trim().max(100).default("FR"),
    lat: Joi.number().min(-90).max(90).allow(null).default(null),
    lng: Joi.number().min(-180).max(180).allow(null).default(null),
  }).required(),
});

// ---------------------------------------------------------------------------
// INSEE SIREN verification via the free Recherche Entreprises API (no token)
// ---------------------------------------------------------------------------
const sirenLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: Number(process.env.SIREN_RATE_LIMIT_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de vÃ©rifications SIREN. RÃ©essayez dans une heure." },
});

async function verifySirenInsee(siren) {
  const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(siren)}&page=1&per_page=5`;
  try {
    const apiRes = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "KindHarvest/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!apiRes.ok) {
      return {
        valid: false,
        apiDown: true,
        error: `API returned ${apiRes.status}`,
      };
    }
    const data = await apiRes.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    // Find the result whose siren matches exactly
    const match = results.find((r) => r.siren === siren);
    if (!match) {
      return {
        valid: false,
        reason: "NumÃ©ro SIREN introuvable dans le registre national",
      };
    }
    if (match.etat_administratif !== "A") {
      return {
        valid: false,
        reason: "Entreprise fermÃ©e ou radiÃ©e du registre Siren",
      };
    }
    return {
      valid: true,
      sirenData: {
        siren: match.siren,
        legalName: match.nom_raison_sociale || match.nom_complet || "",
        naf: match.activite_principale || "",
        createdAt: match.date_creation || null,
        address: match.siege?.adresse || "",
        city: match.siege?.commune || "",
        postalCode: match.siege?.code_postal || "",
        etatAdministratif: match.etat_administratif,
      },
    };
  } catch (err) {
    // Network timeout or API down â€” donâ€™t block registration; admin verifies docs
    return { valid: false, apiDown: true, error: err.message };
  }
}

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).max(128).required(),
});

const otpVerifySchema = Joi.object({
  email: Joi.string().trim().email().required(),
  code: Joi.string()
    .trim()
    .pattern(/^\d{6}$/)
    .required(),
});

const otpResendSchema = Joi.object({
  email: Joi.string().trim().email().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().email().required(),
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  token: Joi.string().trim().min(20).max(500).required(),
  password: Joi.string().min(8).max(128).required(),
});

const donorQuizSchema = Joi.object({}); // kept for import safety â€” quiz removed

const updateMeSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120),
  fullName: Joi.string().trim().min(2).max(120),
  bio: Joi.string().allow("").max(500),
  phone: Joi.string().allow("").max(50),
}).or("name", "fullName", "bio", "phone");

function hashSecret(raw) {
  return crypto.createHash("sha256").update(String(raw)).digest("hex");
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generatePasswordResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

function secondsUntil(isoDate) {
  if (!isoDate) return 0;
  const target = new Date(isoDate).getTime();
  if (!Number.isFinite(target)) return 0;
  const delta = target - Date.now();
  return delta > 0 ? Math.ceil(delta / 1000) : 0;
}

function ensureStatusHistory(user) {
  if (!Array.isArray(user.statusHistory)) {
    user.statusHistory = [];
  }
}

function syncRestaurantVerificationState(user) {
  if (user.role !== USER_ROLES.RESTAURANT) {
    user.isVerified = true;
    user.verificationStatus = VERIFICATION_STATUS.APPROVED;
    user.accountStatus = "approved";
    return;
  }

  if (user.accountStatus === "approved") {
    user.isVerified = true;
    user.verificationStatus = VERIFICATION_STATUS.APPROVED;
    return;
  }

  user.isVerified = false;
  user.verificationStatus =
    user.accountStatus === "suspended" || user.accountStatus === "rejected"
      ? VERIFICATION_STATUS.REJECTED
      : VERIFICATION_STATUS.PENDING;
}

// Keep the old name as an alias for backward compatibility
const syncDonorVerificationState = syncRestaurantVerificationState;

function setAccountStatus(user, status, reason = "") {
  if (user.accountStatus === status) {
    syncDonorVerificationState(user);
    return;
  }

  user.accountStatus = status;
  ensureStatusHistory(user);
  user.statusHistory.push({
    status,
    at: new Date().toISOString(),
    reason,
  });
  user.statusHistory = user.statusHistory.slice(-40);
  syncDonorVerificationState(user);
}

function setOtpForUser(user, code) {
  const now = Date.now();

  user.emailOtp = {
    codeHash: hashSecret(code),
    expiresAt: new Date(now + OTP_TTL_MS).toISOString(),
    resendAvailableAt: new Date(now + OTP_RESEND_COOLDOWN_MS).toISOString(),
    attempts: 0,
    lastSentAt: new Date(now).toISOString(),
    verifiedAt: user.emailOtp?.verifiedAt || null,
  };
}

function clearOtpForUser(user, verifiedAt = null) {
  user.emailOtp = {
    codeHash: "",
    expiresAt: null,
    resendAvailableAt: null,
    attempts: 0,
    lastSentAt: user.emailOtp?.lastSentAt || null,
    verifiedAt: verifiedAt || user.emailOtp?.verifiedAt || null,
  };
}

function resetLoginSecurity(user) {
  user.failedLoginCount = 0;
  user.lastFailedLoginAt = null;
  user.lockoutUntil = null;
}

function isUserLocked(user) {
  return secondsUntil(user.lockoutUntil) > 0;
}

function registerFailedLogin(user) {
  user.failedLoginCount = Number(user.failedLoginCount || 0) + 1;
  user.lastFailedLoginAt = new Date().toISOString();

  if (user.failedLoginCount >= LOGIN_MAX_FAILED_ATTEMPTS) {
    user.lockoutUntil = new Date(Date.now() + LOGIN_LOCKOUT_MS).toISOString();
  }
}

function dashboardPathForUser(user) {
  if (user.role === USER_ROLES.ADMIN) {
    return "/admin/dashboard";
  }

  if (user.role === USER_ROLES.RESTAURANT) {
    return "/restaurant/dashboard";
  }

  return "/receveur/dashboard";
}

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

async function startSession(res, db, user) {
  const { tokenId, accessToken, refreshToken } = issueTokenPair(user);

  pruneRefreshSessions(user);
  user.refreshTokens.push(createSessionFromRefreshToken(refreshToken, tokenId));
  user.updatedAt = new Date().toISOString();

  await writeDb(db);
  setRefreshCookie(res, refreshToken);

  return {
    accessToken,
    user: publicUser(user),
  };
}

/**
 * POST /auth/register
 * Create a receiver account. Restaurants must use /auth/register-restaurant.
 */
router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  async (req, res) => {
    const db = await readDb();
    const normalizedEmail = String(req.body.email).toLowerCase().trim();
    const exists = db.users.find((item) => item.email === normalizedEmail);

    if (exists) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const now = new Date().toISOString();
    const otpCode = generateOtpCode();

    const user = {
      id: nanoid(),
      name: String(req.body.name || req.body.fullName).trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(req.body.password, 12),
      role: USER_ROLES.RECEIVER,
      isVerified: false,
      isEmailVerified: false,
      isPhoneVerified: false,
      verificationStatus: VERIFICATION_STATUS.PENDING,
      accountStatus: "email_pending",
      statusHistory: [{ status: "email_pending", at: now, reason: "register" }],
      bio: "",
      phone: "",
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

    setOtpForUser(user, otpCode);
    db.users.push(user);
    await writeDb(db);

    let emailNotification = { delivered: false, skipped: true };
    try {
      emailNotification = await sendOtpEmail({
        to: user.email,
        name: user.name,
        code: otpCode,
      });
    } catch (error) {
      emailNotification = {
        delivered: false,
        skipped: false,
        error: error.message,
      };
    }

    return res.status(201).json({
      message: emailNotification.delivered
        ? "Compte cree. Verifiez votre email avec le code OTP."
        : "Compte cree, mais l'email OTP n'a pas pu etre envoye.",
      nextStep: "otp_verification",
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      emailNotification,
      ...(process.env.NODE_ENV !== "production"
        ? { otpDebugCode: otpCode }
        : {}),
    });
  },
);

/**
 * POST /auth/register-restaurant
 * Create a restaurant account. Requires SIREN, address, phone.
 * Account starts as email_pending; must pass email OTP â†’ phone OTP â†’ admin approval.
 */
router.post(
  "/register-restaurant",
  authLimiter,
  sirenLimiter,
  validate(registerRestaurantSchema),
  async (req, res) => {
    const db = await readDb();
    const normalizedEmail = String(req.body.email).toLowerCase().trim();
    const sirenValue = String(req.body.siren).trim();

    if (db.users.find((u) => u.email === normalizedEmail)) {
      return res
        .status(409)
        .json({ error: "Cette adresse email est dÃ©jÃ  utilisÃ©e" });
    }

    if (db.restaurants && db.restaurants.find((r) => r.siren === sirenValue)) {
      return res.status(409).json({
        error: "Un restaurant avec ce numÃ©ro SIREN est dÃ©jÃ  inscrit",
        code: "SIREN_DUPLICATE",
      });
    }

    // â€”â€”â€” Verify SIREN via the free INSEE / Recherche Entreprises API â€”â€”â€”
    const sirenResult = await verifySirenInsee(sirenValue);

    if (!sirenResult.valid && !sirenResult.apiDown) {
      // Business not found or closed â€” hard block
      return res.status(422).json({
        error:
          sirenResult.reason || "NumÃ©ro SIREN invalide ou entreprise fermÃ©e",
        code: "SIREN_INVALID",
      });
    }

    const now = new Date().toISOString();
    const otpCode = generateOtpCode();
    const restaurantId = nanoid();

    const user = {
      id: nanoid(),
      name: String(req.body.businessName).trim(),
      managerName: String(req.body.managerName).trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(req.body.password, 12),
      role: USER_ROLES.RESTAURANT,
      isVerified: false,
      isEmailVerified: false,
      isPhoneVerified: false,
      verificationStatus: VERIFICATION_STATUS.PENDING,
      accountStatus: "email_pending",
      statusHistory: [
        { status: "email_pending", at: now, reason: "register_restaurant" },
      ],
      bio: "",
      phone: String(req.body.phone || "").trim(),
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

    const restaurant = {
      id: restaurantId,
      userId: user.id,
      businessName: String(req.body.businessName).trim(),
      managerName: String(req.body.managerName).trim(),
      siren: sirenValue,
      // SIREN is considered verified if the API confirmed it; otherwise admin verifies via docs
      sirenVerified: sirenResult.valid === true,
      sirenVerifyMethod: sirenResult.valid ? "api" : "document",
      sirenVerifiedAt: sirenResult.valid ? now : null,
      sirenData: sirenResult.valid ? sirenResult.sirenData : null,
      address: {
        street: String(req.body.address?.street || "").trim(),
        city: String(req.body.address?.city || "").trim(),
        postalCode: String(req.body.address?.postalCode || "").trim(),
        country: String(req.body.address?.country || "FR")
          .trim()
          .toUpperCase(),
        lat: req.body.address?.lat ?? null,
        lng: req.body.address?.lng ?? null,
      },
      documents: [],
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: "",
      averageRating: null,
      ratingCount: 0,
      isFlaggedForReview: false,
      createdAt: now,
      updatedAt: now,
    };

    setOtpForUser(user, otpCode);

    if (!Array.isArray(db.restaurants)) db.restaurants = [];
    db.users.push(user);
    db.restaurants.push(restaurant);
    await writeDb(db);

    let emailNotification = { delivered: false, skipped: true };
    try {
      emailNotification = await sendOtpEmail({
        to: user.email,
        name: user.name,
        code: otpCode,
      });
    } catch (error) {
      emailNotification = {
        delivered: false,
        skipped: false,
        error: error.message,
      };
    }

    return res.status(201).json({
      message: emailNotification.delivered
        ? "Restaurant enregistrÃ©. VÃ©rifiez votre email avec le code OTP."
        : "Restaurant enregistrÃ©, mais lâ€™email OTP nâ€™a pas pu Ãªtre envoyÃ©.",
      nextStep: "otp_verification",
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      restaurantId,
      sirenVerified: restaurant.sirenVerified,
      sirenApiDown: sirenResult.apiDown === true,
      emailNotification,
      ...(process.env.NODE_ENV !== "production"
        ? { otpDebugCode: otpCode }
        : {}),
    });
  },
);

router.post("/login", authLimiter, validate(loginSchema), async (req, res) => {
  const db = await readDb();
  const normalizedEmail = String(req.body.email).toLowerCase().trim();
  const user = db.users.find((item) => item.email === normalizedEmail);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (isUserLocked(user)) {
    return res.status(423).json({
      error: "Compte verrouille temporairement suite a plusieurs echecs.",
      code: "ACCOUNT_LOCKED",
      lockoutRemainingSeconds: secondsUntil(user.lockoutUntil),
    });
  }

  const ok = await bcrypt.compare(req.body.password, user.password);
  if (!ok) {
    registerFailedLogin(user);
    user.updatedAt = new Date().toISOString();
    await writeDb(db);

    if (isUserLocked(user)) {
      return res.status(423).json({
        error: "Compte verrouille temporairement suite a plusieurs echecs.",
        code: "ACCOUNT_LOCKED",
        lockoutRemainingSeconds: secondsUntil(user.lockoutUntil),
      });
    }

    return res.status(401).json({
      error: "Identifiants invalides",
      code: "INVALID_CREDENTIALS",
      remainingAttempts: Math.max(
        0,
        LOGIN_MAX_FAILED_ATTEMPTS - Number(user.failedLoginCount || 0),
      ),
    });
  }

  resetLoginSecurity(user);

  if (user.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
    user.updatedAt = new Date().toISOString();
    await writeDb(db);
    return res.status(403).json({
      error: "Votre compte est suspendu. Contactez l'administration.",
      code: "ACCOUNT_SUSPENDED",
      accountStatus: user.accountStatus,
      reason: user.suspensionReason || "",
    });
  }

  if (!user.isEmailVerified) {
    user.updatedAt = new Date().toISOString();
    await writeDb(db);
    return res.status(403).json({
      error: "Email non verifie. Entrez le code OTP pour continuer.",
      code: "EMAIL_OTP_REQUIRED",
      accountStatus: user.accountStatus,
    });
  }

  // Restaurant-specific status gate
  // All verified users with "active" status can login
  const session = await startSession(res, db, user);
  return res.json({
    ...session,
    redirectPath: dashboardPathForUser(user),
  });
});
router.post("/refresh", authLimiter, async (req, res) => {
  const token = getRefreshTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ error: "Refresh token is missing" });
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    clearRefreshCookie(res);
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  if (payload.type !== "refresh") {
    clearRefreshCookie(res);
    return res.status(401).json({ error: "Invalid refresh token type" });
  }

  const db = await readDb();
  const user = db.users.find((item) => item.id === payload.sub);

  if (!user) {
    clearRefreshCookie(res);
    return res.status(401).json({ error: "User not found" });
  }

  const session = (
    Array.isArray(user.refreshTokens) ? user.refreshTokens : []
  ).find(
    (item) =>
      item.id === payload.tokenId &&
      item.tokenHash === hashToken(token) &&
      !item.revokedAt,
  );

  if (!session) {
    clearRefreshCookie(res);
    return res
      .status(401)
      .json({ error: "Refresh session revoked or unknown" });
  }

  if (
    session.expiresAt &&
    new Date(session.expiresAt).getTime() <= Date.now()
  ) {
    session.revokedAt = new Date().toISOString();
    await writeDb(db);
    clearRefreshCookie(res);
    return res.status(401).json({ error: "Refresh token expired" });
  }

  if (user.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
    session.revokedAt = new Date().toISOString();
    await writeDb(db);
    clearRefreshCookie(res);
    return res.status(403).json({
      error: "Votre compte est suspendu.",
      code: "ACCOUNT_SUSPENDED",
      reason: user.suspensionReason || "",
    });
  }

  session.revokedAt = new Date().toISOString();
  const nextSession = await startSession(res, db, user);
  return res.json(nextSession);
});

router.post("/logout", async (req, res) => {
  const token = getRefreshTokenFromRequest(req);
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      if (payload.type === "refresh") {
        const db = await readDb();
        const user = db.users.find((item) => item.id === payload.sub);

        if (user && Array.isArray(user.refreshTokens)) {
          const session = user.refreshTokens.find(
            (item) =>
              item.id === payload.tokenId &&
              item.tokenHash === hashToken(token),
          );

          if (session && !session.revokedAt) {
            session.revokedAt = new Date().toISOString();
            user.updatedAt = new Date().toISOString();
            await writeDb(db);
          }
        }
      }
    } catch {
      // Always clear the cookie even if token verification fails.
    }
  }

  clearRefreshCookie(res);
  return res.json({ ok: true });
});

router.post(
  "/otp/verify",
  authLimiter,
  validate(otpVerifySchema),
  async (req, res) => {
    const db = await readDb();
    const normalizedEmail = String(req.body.email).toLowerCase().trim();
    const user = db.users.find((item) => item.email === normalizedEmail);

    if (!user) {
      return res.status(404).json({ error: "Compte introuvable" });
    }

    if (!user.emailOtp?.codeHash) {
      return res.status(400).json({
        error: "Aucun code OTP en attente. Demandez un nouveau code.",
        code: "OTP_NOT_PENDING",
      });
    }

    if (secondsUntil(user.emailOtp.expiresAt) === 0) {
      clearOtpForUser(user);
      user.updatedAt = new Date().toISOString();
      await writeDb(db);
      return res.status(410).json({
        error: "Code OTP expire. Demandez un nouveau code.",
        code: "OTP_EXPIRED",
      });
    }

    const incomingHash = hashSecret(req.body.code);
    if (incomingHash !== user.emailOtp.codeHash) {
      user.emailOtp.attempts = Number(user.emailOtp.attempts || 0) + 1;
      user.updatedAt = new Date().toISOString();

      if (user.emailOtp.attempts >= OTP_MAX_ATTEMPTS) {
        clearOtpForUser(user);
        await writeDb(db);
        return res.status(429).json({
          error: "Trop de tentatives OTP. Demandez un nouveau code.",
          code: "OTP_TOO_MANY_ATTEMPTS",
        });
      }

      await writeDb(db);
      return res
        .status(400)
        .json({ error: "Code OTP invalide", code: "OTP_INVALID" });
    }

    const now = new Date().toISOString();
    user.isEmailVerified = true;
    clearOtpForUser(user, now);

    // All users: email verified via OTP â†’ immediately active
    setAccountStatus(user, "active", "email_otp_verified");
    user.isVerified = true;
    user.verificationStatus = VERIFICATION_STATUS.APPROVED;

    user.updatedAt = now;

    const session = await startSession(res, db, user);

    let redirectPath = dashboardPathForUser(user);

    return res.json({
      ...session,
      accountStatus: user.accountStatus,
      redirectPath,
    });
  },
);

router.post(
  "/otp/resend",
  authLimiter,
  validate(otpResendSchema),
  async (req, res) => {
    const db = await readDb();
    const normalizedEmail = String(req.body.email).toLowerCase().trim();
    const user = db.users.find((item) => item.email === normalizedEmail);

    if (!user) {
      return res.json({
        message:
          "Si ce compte existe, un nouveau code OTP vient d'etre envoye.",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        error: "Email deja verifie",
        code: "EMAIL_ALREADY_VERIFIED",
      });
    }

    const cooldownRemainingSeconds = secondsUntil(
      user.emailOtp?.resendAvailableAt,
    );
    if (cooldownRemainingSeconds > 0) {
      return res.status(429).json({
        error: "Veuillez patienter avant de renvoyer un code OTP.",
        code: "OTP_RESEND_COOLDOWN",
        retryInSeconds: cooldownRemainingSeconds,
      });
    }

    const otpCode = generateOtpCode();
    setOtpForUser(user, otpCode);
    user.updatedAt = new Date().toISOString();
    await writeDb(db);

    let emailNotification = { delivered: false, skipped: true };
    try {
      emailNotification = await sendOtpEmail({
        to: user.email,
        name: user.name,
        code: otpCode,
      });
    } catch (error) {
      emailNotification = {
        delivered: false,
        skipped: false,
        error: error.message,
      };
    }

    const resendMessage = emailNotification.delivered
      ? "Nouveau code OTP envoye."
      : "Le code OTP a ete regenere, mais l'email n'a pas pu etre envoye.";

    return res.json({
      message: resendMessage,
      emailNotification,
      ...(process.env.NODE_ENV !== "production"
        ? { otpDebugCode: otpCode }
        : {}),
    });
  },
);

router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  async (req, res) => {
    const db = await readDb();
    const normalizedEmail = String(req.body.email).toLowerCase().trim();
    const user = db.users.find((item) => item.email === normalizedEmail);

    const genericResponse = {
      message:
        "Si un compte existe pour cette adresse, un email de reinitialisation a ete envoye.",
    };

    if (!user) {
      return res.json(genericResponse);
    }

    const resetToken = generatePasswordResetToken();
    user.passwordReset = {
      tokenHash: hashSecret(resetToken),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      requestedAt: new Date().toISOString(),
      usedAt: null,
    };
    user.updatedAt = new Date().toISOString();
    await writeDb(db);

    const appBaseUrl =
      process.env.FRONTEND_APP_URL ||
      process.env.APP_URL ||
      "http://localhost:5173";
    const resetUrl = `${appBaseUrl.replace(/\/$/, "")}/ResetPassword?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(user.email)}`;

    let emailNotification = { delivered: false, skipped: true };
    try {
      emailNotification = await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });
    } catch (error) {
      emailNotification = {
        delivered: false,
        skipped: false,
        error: error.message,
      };
    }

    return res.json({
      ...genericResponse,
      emailNotification,
      ...(process.env.NODE_ENV !== "production"
        ? { resetDebugToken: resetToken }
        : {}),
    });
  },
);

router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  async (req, res) => {
    const db = await readDb();
    const normalizedEmail = String(req.body.email).toLowerCase().trim();
    const user = db.users.find((item) => item.email === normalizedEmail);

    if (!user) {
      return res
        .status(400)
        .json({ error: "Lien de reinitialisation invalide" });
    }

    if (
      !user.passwordReset?.tokenHash ||
      secondsUntil(user.passwordReset?.expiresAt) === 0
    ) {
      return res
        .status(400)
        .json({ error: "Lien de reinitialisation invalide ou expire" });
    }

    if (hashSecret(req.body.token) !== user.passwordReset.tokenHash) {
      return res
        .status(400)
        .json({ error: "Lien de reinitialisation invalide" });
    }

    user.password = await bcrypt.hash(req.body.password, 12);
    user.passwordReset = {
      tokenHash: "",
      expiresAt: null,
      requestedAt: user.passwordReset.requestedAt || null,
      usedAt: new Date().toISOString(),
    };
    resetLoginSecurity(user);
    user.refreshTokens = [];
    user.updatedAt = new Date().toISOString();

    await writeDb(db);

    return res.json({ message: "Mot de passe mis a jour avec succes" });
  },
);

router.get("/me", requireAuth, async (req, res) => {
  const db = await readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.json({ user: publicUser(user) });
});

router.patch("/me", requireAuth, validate(updateMeSchema), async (req, res) => {
  const { name, fullName, bio, phone } = req.body || {};
  const db = await readDb();
  const user = db.users.find((u) => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (name !== undefined || fullName !== undefined) {
    user.name = String(name || fullName).trim();
  }
  if (bio !== undefined) {
    user.bio = String(bio);
  }
  if (phone !== undefined) {
    user.phone = String(phone);
  }

  user.updatedAt = new Date().toISOString();

  await writeDb(db);
  return res.json({ user: publicUser(user) });
});

router.use("/", googleRoutes);

export default router;
