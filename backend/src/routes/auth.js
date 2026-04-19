import express from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import Joi from "joi";
import rateLimit from "express-rate-limit";
import { nanoid } from "nanoid";
import { readDb, writeDb } from "../utils/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
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

const router = express.Router();
const OTP_TTL_MS = Number(process.env.OTP_TTL_MS || 10 * 60 * 1000);
const OTP_RESEND_COOLDOWN_MS = Number(process.env.OTP_RESEND_COOLDOWN_MS || 60 * 1000);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const LOGIN_MAX_FAILED_ATTEMPTS = Number(process.env.LOGIN_MAX_FAILED_ATTEMPTS || 5);
const LOGIN_LOCKOUT_MS = Number(process.env.LOGIN_LOCKOUT_MS || 15 * 60 * 1000);
const QUIZ_RETRY_DELAY_MS = Number(process.env.QUIZ_RETRY_DELAY_MS || 10 * 60 * 1000);

const DONOR_QUIZ_ITEMS = [
  {
    question: "A quelle temperature maximale les aliments froids doivent-ils etre conserves ?",
    options: ["0C", "4C", "10C", "15C"],
    correctAnswerIndex: 1,
    explanation: "Les aliments froids doivent etre maintenus a 4C maximum pour limiter les risques bacteriens.",
  },
  {
    question: "Peut-on donner un aliment dont la date limite de consommation (DLC) est depassee ?",
    options: ["Oui, si ca sent bon", "Oui, de 1-2 jours", "Non, jamais", "Oui si c'est cuit"],
    correctAnswerIndex: 2,
    explanation: "Un produit avec DLC depassee ne doit jamais etre donne.",
  },
  {
    question: "Comment doit etre emballe un aliment avant donation ?",
    options: ["Dans un sac ouvert", "Dans un emballage propre et ferme", "A la main", "Peu importe"],
    correctAnswerIndex: 1,
    explanation: "Un emballage propre et ferme evite les contaminations.",
  },
  {
    question: "Lequel de ces aliments est INTERDIT a la donation ?",
    options: ["Pain rassis", "Fruits entiers", "Viande crue non emballee", "Conserves fermees"],
    correctAnswerIndex: 2,
    explanation: "La viande crue non emballee est interdite a la donation.",
  },
  {
    question: "Que faire si vous n'etes pas sur de la fraicheur d'un aliment ?",
    options: ["Le donner quand meme", "Le rechauffer avant", "Ne pas le donner", "Le gouter d'abord"],
    correctAnswerIndex: 2,
    explanation: "En cas de doute, il ne faut pas donner l'aliment.",
  },
];

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 50),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again later." },
});

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120),
  fullName: Joi.string().trim().min(2).max(120),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid(USER_ROLES.DONOR, USER_ROLES.RECEIVER).default(USER_ROLES.RECEIVER),
}).or("name", "fullName");

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).max(128).required(),
});

const otpVerifySchema = Joi.object({
  email: Joi.string().trim().email().required(),
  code: Joi.string().trim().pattern(/^\d{6}$/).required(),
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

const donorQuizSchema = Joi.object({
  answers: Joi.array().items(Joi.number().integer().min(0).max(3)).length(DONOR_QUIZ_ITEMS.length).required(),
});

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

function syncDonorVerificationState(user) {
  if (user.role !== USER_ROLES.DONOR) {
    user.isVerified = true;
    user.verificationStatus = VERIFICATION_STATUS.APPROVED;
    user.accountStatus = ACCOUNT_STATUS.ACTIVE;
    return;
  }

  if (user.accountStatus === ACCOUNT_STATUS.ACTIVE) {
    user.isVerified = true;
    user.verificationStatus = VERIFICATION_STATUS.APPROVED;
    return;
  }

  user.isVerified = false;
  user.verificationStatus =
    user.accountStatus === ACCOUNT_STATUS.SUSPENDED
      ? VERIFICATION_STATUS.REJECTED
      : VERIFICATION_STATUS.PENDING;
}

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

  if (user.role === USER_ROLES.DONOR) {
    return "/donneur/dashboard";
  }

  return "/receveur/dashboard";
}

function normalizeQuizDocument(document, fallbackUploadedAt = null) {
  return {
    originalName: document?.originalName || "",
    storedName: document?.storedName || "",
    mimeType: document?.mimeType || "",
    size: Number(document?.size || 0),
    path: document?.path || "",
    uploadedAt: document?.uploadedAt || fallbackUploadedAt || null,
  };
}

function ensureQuizRequest(db, user, score, total, nowIso, donorDocument) {
  const normalizedDocument = normalizeQuizDocument(donorDocument, nowIso);
  const existingPending = db.verificationRequests
    .filter(
      (item) =>
        item.userId === user.id &&
        item.sourceType === "QUIZ" &&
        item.status === VERIFICATION_STATUS.PENDING
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  const quizRequest = existingPending || {
    id: nanoid(),
    userId: user.id,
    userEmail: user.email,
    status: VERIFICATION_STATUS.PENDING,
    sourceType: "QUIZ",
    quizScore: score,
    quizTotal: total,
    createdAt: nowIso,
    updatedAt: nowIso,
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: "",
    document: normalizedDocument,
  };

  quizRequest.status = VERIFICATION_STATUS.PENDING;
  quizRequest.sourceType = "QUIZ";
  quizRequest.quizScore = score;
  quizRequest.quizTotal = total;
  quizRequest.updatedAt = nowIso;
  quizRequest.reviewedAt = null;
  quizRequest.reviewedBy = null;
  quizRequest.rejectionReason = "";
  quizRequest.document = normalizedDocument;

  if (!existingPending) {
    db.verificationRequests.push(quizRequest);
  }
}

function formatWrongAnswers(wrongIndexes) {
  return wrongIndexes.map((index) => ({
    questionIndex: index,
    question: DONOR_QUIZ_ITEMS[index].question,
    correctAnswerIndex: DONOR_QUIZ_ITEMS[index].correctAnswerIndex,
    explanation: DONOR_QUIZ_ITEMS[index].explanation,
  }));
}

function donorQuizStatusPayload(user) {
  const attempts = Number(user?.donorQuiz?.attempts || 0);
  const maxAttempts = Number(user?.donorQuiz?.maxAttempts || 2);
  const cooldownRemainingSeconds = secondsUntil(user?.donorQuiz?.cooldownUntil);
  const attemptsRemaining = Math.max(0, maxAttempts - attempts);
  const documentUploaded = Boolean(user?.donorQuiz?.document?.path);

  return {
    accountStatus: user.accountStatus,
    attempts,
    maxAttempts,
    attemptsRemaining,
    cooldownUntil: user?.donorQuiz?.cooldownUntil || null,
    cooldownRemainingSeconds,
    passedAt: user?.donorQuiz?.passedAt || null,
    documentRequired: user.accountStatus === ACCOUNT_STATUS.EMAIL_VERIFIED,
    documentUploaded,
    document: documentUploaded
      ? {
          originalName: user?.donorQuiz?.document?.originalName || "",
          mimeType: user?.donorQuiz?.document?.mimeType || "",
          size: Number(user?.donorQuiz?.document?.size || 0),
          uploadedAt: user?.donorQuiz?.document?.uploadedAt || null,
        }
      : null,
    canAttempt:
      user.accountStatus === ACCOUNT_STATUS.EMAIL_VERIFIED &&
      attemptsRemaining > 0 &&
      cooldownRemainingSeconds === 0 &&
      documentUploaded,
  };
}

function pruneRefreshSessions(user) {
  const now = Date.now();
  const sessions = Array.isArray(user.refreshTokens) ? user.refreshTokens : [];

  const filtered = sessions
    .filter((item) => {
      if (!item?.id || !item?.tokenHash) return false;
      if (item.revokedAt) return false;
      if (item.expiresAt && new Date(item.expiresAt).getTime() <= now) return false;
      return true;
    })
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  user.refreshTokens = filtered.slice(-10);
}

function startSession(res, db, user) {
  const { tokenId, accessToken, refreshToken } = issueTokenPair(user);

  pruneRefreshSessions(user);
  user.refreshTokens.push(createSessionFromRefreshToken(refreshToken, tokenId));
  user.updatedAt = new Date().toISOString();

  writeDb(db);
  setRefreshCookie(res, refreshToken);

  return {
    accessToken,
    user: publicUser(user),
  };
}

router.post("/register", authLimiter, validate(registerSchema), async (req, res) => {
  const db = readDb();
  const normalizedEmail = String(req.body.email).toLowerCase().trim();
  const exists = db.users.find((item) => item.email === normalizedEmail);

  if (exists) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const now = new Date().toISOString();
  const role = req.body.role || USER_ROLES.RECEIVER;
  const isDonor = role === USER_ROLES.DONOR;
  const initialAccountStatus = isDonor ? ACCOUNT_STATUS.EMAIL_PENDING : ACCOUNT_STATUS.ACTIVE;
  const otpCode = generateOtpCode();

  const user = {
    id: nanoid(),
    name: String(req.body.name || req.body.fullName).trim(),
    email: normalizedEmail,
    password: await bcrypt.hash(req.body.password, 12),
    role,
    isVerified: !isDonor,
    isEmailVerified: false,
    verificationStatus: isDonor ? VERIFICATION_STATUS.PENDING : VERIFICATION_STATUS.APPROVED,
    accountStatus: initialAccountStatus,
    statusHistory: [{ status: initialAccountStatus, at: now, reason: "register" }],
    bio: "",
    phone: "",
    createdAt: now,
    updatedAt: now,
    donorQuiz: {
      attempts: 0,
      maxAttempts: 2,
      cooldownUntil: null,
      passedAt: null,
      lastAttemptAt: null,
      lastScore: null,
      lastWrongAnswers: [],
      document: {
        originalName: "",
        storedName: "",
        mimeType: "",
        size: 0,
        path: "",
        uploadedAt: null,
      },
    },
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

  writeDb(db);

  let emailNotification = { delivered: false, skipped: true };
  try {
    emailNotification = await sendOtpEmail({
      to: user.email,
      name: user.name,
      code: otpCode,
    });
  } catch (error) {
    emailNotification = { delivered: false, skipped: false, error: error.message };
  }

  const registerMessage = emailNotification.delivered
    ? "Compte cree. Verifiez votre email avec le code OTP."
    : "Compte cree, mais l'email OTP n'a pas pu etre envoye. Verifiez la configuration SMTP.";

  return res.status(201).json({
    message: registerMessage,
    nextStep: "otp_verification",
    email: user.email,
    role: user.role,
    accountStatus: user.accountStatus,
    emailNotification,
    ...(process.env.NODE_ENV !== "production" ? { otpDebugCode: otpCode } : {}),
  });
});

router.post("/login", authLimiter, validate(loginSchema), async (req, res) => {
  const db = readDb();
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
    writeDb(db);

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
      remainingAttempts: Math.max(0, LOGIN_MAX_FAILED_ATTEMPTS - Number(user.failedLoginCount || 0)),
    });
  }

  resetLoginSecurity(user);

  if (user.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return res.status(403).json({
      error: "Votre compte est suspendu. Contactez l'administration.",
      code: "ACCOUNT_SUSPENDED",
      accountStatus: user.accountStatus,
      reason: user.suspensionReason || "",
    });
  }

  if (!user.isEmailVerified) {
    user.updatedAt = new Date().toISOString();
    writeDb(db);
    return res.status(403).json({
      error: "Email non verifie. Entrez le code OTP pour continuer.",
      code: user.role === USER_ROLES.DONOR ? "DONOR_EMAIL_PENDING" : "EMAIL_OTP_REQUIRED",
      accountStatus: user.accountStatus,
    });
  }

  if (
    user.role === USER_ROLES.DONOR &&
    user.accountStatus !== ACCOUNT_STATUS.ACTIVE &&
    user.accountStatus !== ACCOUNT_STATUS.EMAIL_VERIFIED
  ) {
    user.updatedAt = new Date().toISOString();
    writeDb(db);

    if (user.accountStatus === ACCOUNT_STATUS.EMAIL_PENDING) {
      return res.status(403).json({
        error: "Email non verifie. Entrez le code OTP pour continuer.",
        code: "DONOR_EMAIL_PENDING",
        accountStatus: user.accountStatus,
      });
    }

    return res.status(403).json({
      error: "Votre compte donneur est en cours de verification admin.",
      code: "DONOR_PENDING_ADMIN_REVIEW",
      accountStatus: user.accountStatus,
    });
  }

  const session = startSession(res, db, user);
  const redirectPath =
    user.role === USER_ROLES.DONOR && user.accountStatus === ACCOUNT_STATUS.EMAIL_VERIFIED
      ? "/DonorDocumentUpload"
      : dashboardPathForUser(user);

  return res.json({
    ...session,
    redirectPath,
  });
});

router.post("/refresh", authLimiter, (req, res) => {
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

  const db = readDb();
  const user = db.users.find((item) => item.id === payload.sub);

  if (!user) {
    clearRefreshCookie(res);
    return res.status(401).json({ error: "User not found" });
  }

  const session = (Array.isArray(user.refreshTokens) ? user.refreshTokens : []).find(
    (item) =>
      item.id === payload.tokenId &&
      item.tokenHash === hashToken(token) &&
      !item.revokedAt
  );

  if (!session) {
    clearRefreshCookie(res);
    return res.status(401).json({ error: "Refresh session revoked or unknown" });
  }

  if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
    session.revokedAt = new Date().toISOString();
    writeDb(db);
    clearRefreshCookie(res);
    return res.status(401).json({ error: "Refresh token expired" });
  }

  if (user.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
    session.revokedAt = new Date().toISOString();
    writeDb(db);
    clearRefreshCookie(res);
    return res.status(403).json({
      error: "Votre compte est suspendu.",
      code: "ACCOUNT_SUSPENDED",
      reason: user.suspensionReason || "",
    });
  }

  session.revokedAt = new Date().toISOString();
  const nextSession = startSession(res, db, user);
  return res.json(nextSession);
});

router.post("/logout", (req, res) => {
  const token = getRefreshTokenFromRequest(req);
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      if (payload.type === "refresh") {
        const db = readDb();
        const user = db.users.find((item) => item.id === payload.sub);

        if (user && Array.isArray(user.refreshTokens)) {
          const session = user.refreshTokens.find((item) =>
            item.id === payload.tokenId && item.tokenHash === hashToken(token)
          );

          if (session && !session.revokedAt) {
            session.revokedAt = new Date().toISOString();
            user.updatedAt = new Date().toISOString();
            writeDb(db);
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

router.post("/otp/verify", authLimiter, validate(otpVerifySchema), (req, res) => {
  const db = readDb();
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
    writeDb(db);
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
      writeDb(db);
      return res.status(429).json({
        error: "Trop de tentatives OTP. Demandez un nouveau code.",
        code: "OTP_TOO_MANY_ATTEMPTS",
      });
    }

    writeDb(db);
    return res.status(400).json({ error: "Code OTP invalide", code: "OTP_INVALID" });
  }

  const now = new Date().toISOString();
  user.isEmailVerified = true;
  clearOtpForUser(user, now);

  if (user.role === USER_ROLES.DONOR && user.accountStatus === ACCOUNT_STATUS.EMAIL_PENDING) {
    setAccountStatus(user, ACCOUNT_STATUS.EMAIL_VERIFIED, "otp_verified");
  }

  if (user.role !== USER_ROLES.DONOR) {
    setAccountStatus(user, ACCOUNT_STATUS.ACTIVE, "otp_verified");
  }

  user.updatedAt = now;

  const session = startSession(res, db, user);
  const needsDonorQuiz =
    user.role === USER_ROLES.DONOR && user.accountStatus === ACCOUNT_STATUS.EMAIL_VERIFIED;

  return res.json({
    ...session,
    accountStatus: user.accountStatus,
    nextStep: needsDonorQuiz ? "donor_document_upload" : "dashboard",
    redirectPath: needsDonorQuiz ? "/DonorDocumentUpload" : dashboardPathForUser(user),
  });
});

router.post("/otp/resend", authLimiter, validate(otpResendSchema), async (req, res) => {
  const db = readDb();
  const normalizedEmail = String(req.body.email).toLowerCase().trim();
  const user = db.users.find((item) => item.email === normalizedEmail);

  if (!user) {
    return res.json({
      message: "Si ce compte existe, un nouveau code OTP vient d'etre envoye.",
    });
  }

  if (user.isEmailVerified) {
    return res.status(400).json({
      error: "Email deja verifie",
      code: "EMAIL_ALREADY_VERIFIED",
    });
  }

  const cooldownRemainingSeconds = secondsUntil(user.emailOtp?.resendAvailableAt);
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
  writeDb(db);

  let emailNotification = { delivered: false, skipped: true };
  try {
    emailNotification = await sendOtpEmail({
      to: user.email,
      name: user.name,
      code: otpCode,
    });
  } catch (error) {
    emailNotification = { delivered: false, skipped: false, error: error.message };
  }

  const resendMessage = emailNotification.delivered
    ? "Nouveau code OTP envoye."
    : "Le code OTP a ete regenere, mais l'email n'a pas pu etre envoye.";

  return res.json({
    message: resendMessage,
    emailNotification,
    ...(process.env.NODE_ENV !== "production" ? { otpDebugCode: otpCode } : {}),
  });
});

router.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), async (req, res) => {
  const db = readDb();
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
  writeDb(db);

  const appBaseUrl =
    process.env.FRONTEND_APP_URL || process.env.APP_URL || "http://localhost:5173";
  const resetUrl = `${appBaseUrl.replace(/\/$/, "")}/ResetPassword?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(user.email)}`;

  let emailNotification = { delivered: false, skipped: true };
  try {
    emailNotification = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });
  } catch (error) {
    emailNotification = { delivered: false, skipped: false, error: error.message };
  }

  return res.json({
    ...genericResponse,
    emailNotification,
    ...(process.env.NODE_ENV !== "production" ? { resetDebugToken: resetToken } : {}),
  });
});

router.post("/reset-password", authLimiter, validate(resetPasswordSchema), async (req, res) => {
  const db = readDb();
  const normalizedEmail = String(req.body.email).toLowerCase().trim();
  const user = db.users.find((item) => item.email === normalizedEmail);

  if (!user) {
    return res.status(400).json({ error: "Lien de reinitialisation invalide" });
  }

  if (!user.passwordReset?.tokenHash || secondsUntil(user.passwordReset?.expiresAt) === 0) {
    return res.status(400).json({ error: "Lien de reinitialisation invalide ou expire" });
  }

  if (hashSecret(req.body.token) !== user.passwordReset.tokenHash) {
    return res.status(400).json({ error: "Lien de reinitialisation invalide" });
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

  writeDb(db);

  return res.json({ message: "Mot de passe mis a jour avec succes" });
});

router.get("/donor-quiz/status", requireAuth, requireRole(USER_ROLES.DONOR), (req, res) => {
  const db = readDb();
  const user = db.users.find((item) => item.id === req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({
    quiz: donorQuizStatusPayload(user),
    questions: DONOR_QUIZ_ITEMS.map((item, index) => ({
      id: index + 1,
      question: item.question,
      options: item.options,
    })),
  });
});

router.post(
  "/donor-quiz/submit",
  requireAuth,
  requireRole(USER_ROLES.DONOR),
  validate(donorQuizSchema),
  (req, res) => {
    const db = readDb();
    const user = db.users.find((item) => item.id === req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.accountStatus !== ACCOUNT_STATUS.EMAIL_VERIFIED) {
      return res.status(409).json({
        error: "Le quiz n'est pas disponible pour ce statut de compte.",
        code: "QUIZ_NOT_AVAILABLE",
        accountStatus: user.accountStatus,
      });
    }

    if (!user?.donorQuiz?.document?.path) {
      return res.status(400).json({
        error: "Veuillez televerser votre document d'identite avant de valider le quiz.",
        code: "DOCUMENT_REQUIRED",
      });
    }

    const quiz = user.donorQuiz || {
      attempts: 0,
      maxAttempts: 2,
      cooldownUntil: null,
      passedAt: null,
      lastAttemptAt: null,
      lastScore: null,
      lastWrongAnswers: [],
    };

    user.donorQuiz = quiz;
    const cooldownRemainingSeconds = secondsUntil(quiz.cooldownUntil);
    if (cooldownRemainingSeconds > 0) {
      return res.status(429).json({
        error: "Nouvelle tentative disponible apres le delai de 10 minutes.",
        code: "QUIZ_COOLDOWN",
        cooldownRemainingSeconds,
        retryAvailableAt: quiz.cooldownUntil,
      });
    }

    const maxAttempts = Number(quiz.maxAttempts || 2);
    const attempts = Number(quiz.attempts || 0);
    if (attempts >= maxAttempts) {
      return res.status(403).json({
        error: "Nombre maximum de tentatives atteint.",
        code: "QUIZ_ATTEMPTS_EXCEEDED",
        attempts,
        maxAttempts,
      });
    }

    const answers = req.body.answers.map((value) => Number(value));
    let score = 0;
    const wrongIndexes = [];

    DONOR_QUIZ_ITEMS.forEach((question, index) => {
      if (answers[index] === question.correctAnswerIndex) {
        score += 1;
      } else {
        wrongIndexes.push(index);
      }
    });

    const now = new Date().toISOString();
    quiz.attempts = attempts + 1;
    quiz.lastAttemptAt = now;
    quiz.lastScore = score;
    quiz.lastWrongAnswers = wrongIndexes;

    const total = DONOR_QUIZ_ITEMS.length;
    const passed = score >= 4;

    if (passed) {
      quiz.passedAt = now;
      quiz.cooldownUntil = null;

      setAccountStatus(user, ACCOUNT_STATUS.QUIZ_PASSED, "quiz_passed");
      setAccountStatus(user, ACCOUNT_STATUS.PENDING_ADMIN_REVIEW, "waiting_admin_review");

      ensureQuizRequest(db, user, score, total, now, user?.donorQuiz?.document);
      user.updatedAt = now;
      writeDb(db);

      return res.json({
        passed: true,
        score,
        total,
        wrongAnswers: [],
        accountStatus: user.accountStatus,
        nextStep: "pending_admin_review",
        message: "Quiz valide. Votre document et votre compte sont en cours de verification (24-48h).",
        user: publicUser(user),
      });
    }

    const attemptsRemaining = Math.max(0, maxAttempts - quiz.attempts);
    if (attemptsRemaining > 0) {
      quiz.cooldownUntil = new Date(Date.now() + QUIZ_RETRY_DELAY_MS).toISOString();
    } else {
      quiz.cooldownUntil = null;
      user.suspensionReason =
        "Echec du quiz de securite alimentaire apres 2 tentatives. Contactez le support.";
      setAccountStatus(user, ACCOUNT_STATUS.SUSPENDED, "quiz_failed_twice");
    }

    user.updatedAt = now;
    writeDb(db);

    return res.json({
      passed: false,
      score,
      total,
      attempts: quiz.attempts,
      maxAttempts,
      attemptsRemaining,
      retryAvailableAt: quiz.cooldownUntil,
      wrongAnswers: formatWrongAnswers(wrongIndexes),
      accountStatus: user.accountStatus,
      message:
        attemptsRemaining > 0
          ? "Quiz non valide. Vous pourrez reessayer dans 10 minutes."
          : "Quiz non valide. Nombre maximum de tentatives atteint. Contactez le support.",
      user: publicUser(user),
    });
  }
);

router.get("/me", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.json({ user: publicUser(user) });
});

router.patch("/me", requireAuth, validate(updateMeSchema), (req, res) => {
  const { name, fullName, bio, phone } = req.body || {};
  const db = readDb();
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

  writeDb(db);
  return res.json({ user: publicUser(user) });
});

export default router;
