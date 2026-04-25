import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import express from "express";
import Joi from "joi";
import rateLimit from "express-rate-limit";
import { nanoid } from "nanoid";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  restaurantDocumentUpload,
  restaurantRegistrationDocuments,
  UPLOADS_DIR,
} from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { readDb, writeDb } from "../utils/db.js";
import { sendPhoneOtpSms } from "../utils/mailer.js";
import { USER_ROLES, VERIFICATION_STATUS } from "../constants/auth.js";

const router = express.Router();

const OTP_TTL_MS = Number(process.env.OTP_TTL_MS || 10 * 60 * 1000);
const OTP_RESEND_COOLDOWN_MS = Number(
  process.env.OTP_RESEND_COOLDOWN_MS || 60 * 1000,
);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const RATING_FLAG_THRESHOLD = 2.5;
const RATING_COUNT_MIN_FOR_FLAG = 5;

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP attempts. Please try again later." },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many upload attempts." },
});

const sirenSchema = Joi.object({
  siren: Joi.string()
    .trim()
    .pattern(/^\d{9}$/)
    .required()
    .messages({ "string.pattern.base": "SIREN must be exactly 9 digits" }),
});

const phoneOtpVerifySchema = Joi.object({
  code: Joi.string()
    .trim()
    .pattern(/^\d{6}$/)
    .required(),
});

const rateSchema = Joi.object({
  mealId: Joi.string().trim().required(),
  score: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().max(500).allow("").default(""),
});

function hashOtp(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function secondsUntil(isoDate) {
  if (!isoDate) return 0;
  const delta = new Date(isoDate).getTime() - Date.now();
  return delta > 0 ? Math.ceil(delta / 1000) : 0;
}

function runUpload(req, res) {
  return new Promise((resolve, reject) => {
    restaurantDocumentUpload.single("document")(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/** Recalculate restaurant average rating from db.ratings */
async function refreshRestaurantRating(db, restaurantId) {
  const ratings = (db.ratings || []).filter(
    (r) => r.restaurantId === restaurantId,
  );
  if (!ratings.length) return;

  const avg = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
  const restaurant = (db.restaurants || []).find((r) => r.id === restaurantId);
  if (!restaurant) return;

  restaurant.averageRating = Math.round(avg * 10) / 10;
  restaurant.ratingCount = ratings.length;
  restaurant.isFlaggedForReview =
    ratings.length >= RATING_COUNT_MIN_FOR_FLAG && avg <= RATING_FLAG_THRESHOLD;
}

// ---------------------------------------------------------------------------
// POST /restaurants/phone-otp/send — send phone OTP to authenticated restaurant
// ---------------------------------------------------------------------------
router.post(
  "/phone-otp/send",
  otpLimiter,
  requireAuth,
  requireRole(USER_ROLES.RESTAURANT),
  async (req, res) => {
    const db = await readDb();
    const user = db.users.find((u) => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.isPhoneVerified) {
      return res.status(400).json({
        error: "Phone already verified",
        code: "PHONE_ALREADY_VERIFIED",
      });
    }

    if (!user.phone) {
      return res
        .status(400)
        .json({ error: "No phone number on file", code: "PHONE_MISSING" });
    }

    const cooldown = secondsUntil(user.phoneOtp?.resendAvailableAt);
    if (cooldown > 0) {
      return res.status(429).json({
        error: "Please wait before requesting another code.",
        code: "OTP_RESEND_COOLDOWN",
        retryInSeconds: cooldown,
      });
    }

    const code = generateOtpCode();
    const now = Date.now();
    user.phoneOtp = {
      codeHash: hashOtp(code),
      expiresAt: new Date(now + OTP_TTL_MS).toISOString(),
      resendAvailableAt: new Date(now + OTP_RESEND_COOLDOWN_MS).toISOString(),
      attempts: 0,
      lastSentAt: new Date(now).toISOString(),
      verifiedAt: user.phoneOtp?.verifiedAt || null,
    };
    user.updatedAt = new Date().toISOString();
    await writeDb(db);

    const smsResult = await sendPhoneOtpSms({ phone: user.phone, code }).catch(
      () => ({ delivered: false }),
    );

    return res.json({
      message: "Code OTP envoye sur votre telephone.",
      smsNotification: smsResult,
      ...(process.env.NODE_ENV !== "production" ? { otpDebugCode: code } : {}),
    });
  },
);

// ---------------------------------------------------------------------------
// POST /restaurants/phone-otp/verify — verify phone OTP
// ---------------------------------------------------------------------------
router.post(
  "/phone-otp/verify",
  otpLimiter,
  requireAuth,
  requireRole(USER_ROLES.RESTAURANT),
  validate(phoneOtpVerifySchema),
  async (req, res) => {
    const db = await readDb();
    const user = db.users.find((u) => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.isPhoneVerified) {
      return res.status(400).json({
        error: "Phone already verified",
        code: "PHONE_ALREADY_VERIFIED",
      });
    }

    if (!user.phoneOtp?.codeHash) {
      return res.status(400).json({
        error: "No pending OTP. Request a new one.",
        code: "OTP_NOT_PENDING",
      });
    }

    if (secondsUntil(user.phoneOtp.expiresAt) === 0) {
      user.phoneOtp = {};
      user.updatedAt = new Date().toISOString();
      await writeDb(db);
      return res.status(410).json({
        error: "OTP expired. Request a new one.",
        code: "OTP_EXPIRED",
      });
    }

    if (hashOtp(req.body.code) !== user.phoneOtp.codeHash) {
      user.phoneOtp.attempts = Number(user.phoneOtp.attempts || 0) + 1;
      user.updatedAt = new Date().toISOString();

      if (user.phoneOtp.attempts >= OTP_MAX_ATTEMPTS) {
        user.phoneOtp = {};
        await writeDb(db);
        return res.status(429).json({
          error: "Too many attempts. Request a new OTP.",
          code: "OTP_TOO_MANY_ATTEMPTS",
        });
      }

      await writeDb(db);
      return res
        .status(400)
        .json({ error: "Invalid OTP code", code: "OTP_INVALID" });
    }

    const now = new Date().toISOString();
    user.isPhoneVerified = true;
    user.phoneOtp = {
      codeHash: "",
      expiresAt: null,
      resendAvailableAt: null,
      attempts: 0,
      verifiedAt: now,
    };
    user.accountStatus = "pending_review";
    if (!Array.isArray(user.statusHistory)) user.statusHistory = [];
    user.statusHistory.push({
      status: "pending_review",
      at: now,
      reason: "phone_otp_verified",
    });
    user.updatedAt = now;

    await writeDb(db);

    return res.json({
      message:
        "Telephone verifie. Votre dossier est maintenant en attente de validation admin.",
      accountStatus: user.accountStatus,
      nextStep: "upload_documents",
    });
  },
);

// ---------------------------------------------------------------------------
// POST /restaurants/verify-siren — auto-validate SIREN via INSEE API
// ---------------------------------------------------------------------------
router.post(
  "/verify-siren",
  requireAuth,
  requireRole(USER_ROLES.RESTAURANT),
  validate(sirenSchema),
  async (req, res) => {
    const db = await readDb();
    const restaurant = (db.restaurants || []).find(
      (r) => r.userId === req.user.id,
    );
    if (!restaurant)
      return res.status(404).json({ error: "Restaurant profile not found" });

    const { siren } = req.body;

    // Call INSEE Sirene v3 (requires INSEE bearer token in env)
    const inseeToken = process.env.INSEE_TOKEN;
    if (!inseeToken) {
      return res.status(503).json({
        error: "SIREN verification service not configured",
        code: "SIREN_API_DOWN",
        fallback: "document_required",
      });
    }

    let sirenData = null;
    try {
      const response = await fetch(
        `https://api.insee.fr/entreprises/sirene/V3/siren/${siren}`,
        {
          headers: {
            Authorization: `Bearer ${inseeToken}`,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(6000),
        },
      );

      if (response.status === 404) {
        return res.status(422).json({
          valid: false,
          reason: "SIREN not found in national registry",
        });
      }

      if (!response.ok) {
        throw new Error(`INSEE API returned ${response.status}`);
      }

      const data = await response.json();
      const unit = data.uniteLegale || {};
      const isActive = unit.etatAdministratifUniteLegale === "A";

      sirenData = {
        businessName: unit.denominationUniteLegale || unit.nomUniteLegale || "",
        legalCategory: unit.categorieJuridiqueUniteLegale || "",
        active: isActive,
      };

      if (!isActive) {
        return res.status(422).json({
          valid: false,
          reason: "This SIREN corresponds to an inactive business",
        });
      }
    } catch (err) {
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        return res.status(503).json({
          error: "SIREN verification service timeout",
          code: "SIREN_API_DOWN",
          fallback: "document_required",
        });
      }
      return res.status(503).json({
        error: "SIREN verification service unavailable",
        code: "SIREN_API_DOWN",
        fallback: "document_required",
      });
    }

    const now = new Date().toISOString();
    restaurant.sirenVerified = true;
    restaurant.sirenVerifyMethod = "api";
    restaurant.sirenVerifiedAt = now;
    restaurant.sirenData = sirenData;
    restaurant.updatedAt = now;

    await writeDb(db);

    return res.json({
      valid: true,
      businessName: sirenData.businessName,
      active: sirenData.active,
      verifiedAt: now,
    });
  },
);

// ---------------------------------------------------------------------------
// POST /restaurants/documents — upload the 3 mandatory registration documents
//   kbis, hygiene_cert, inspection_cert (multipart/form-data, one request)
// ---------------------------------------------------------------------------
router.post(
  "/documents",
  uploadLimiter,
  requireAuth,
  requireRole(USER_ROLES.RESTAURANT),
  async (req, res) => {
    // Run multi-field multer
    await new Promise((resolve, reject) => {
      restaurantRegistrationDocuments(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    }).catch((err) => {
      return res.status(400).json({ error: err.message || "Fichier invalide" });
    });

    // Bail if response already sent (multer error)
    if (res.headersSent) return;

    const files = req.files || {};
    const REQUIRED_DOCS = [
      { key: "kbis", label: "Extrait Kbis" },
      { key: "hygiene_cert", label: "Certificat d’hygiène alimentaire" },
      { key: "inspection_cert", label: "Rapport d’inspection sanitaire" },
    ];

    const missing = REQUIRED_DOCS.filter((d) => !files[d.key]?.[0]).map(
      (d) => d.label,
    );
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Documents manquants : ${missing.join(", ")}`,
        code: "MISSING_DOCUMENTS",
        missingDocuments: missing,
      });
    }

    const db = await readDb();
    const restaurant = (db.restaurants || []).find(
      (r) => r.userId === req.user.id,
    );
    if (!restaurant) {
      return res.status(404).json({ error: "Profil restaurant introuvable" });
    }

    const user = db.users.find((u) => u.id === req.user.id);
    if (!user)
      return res.status(404).json({ error: "Utilisateur introuvable" });

    const now = new Date().toISOString();

    // Build document records for each required doc
    const newDocs = REQUIRED_DOCS.map((d) => {
      const f = files[d.key][0];
      return {
        id: nanoid(),
        type: d.key,
        label: d.label,
        originalName: f.originalname,
        storedName: f.filename,
        mimeType: f.mimetype,
        size: f.size,
        path: f.path,
        uploadedAt: now,
      };
    });

    // Replace any previously uploaded docs of the same types
    const preservedTypes = new Set(REQUIRED_DOCS.map((d) => d.key));
    restaurant.documents = [
      ...(restaurant.documents || []).filter(
        (d) => !preservedTypes.has(d.type),
      ),
      ...newDocs,
    ];
    restaurant.updatedAt = now;

    // Advance restaurant account to pending admin review
    if (
      ["siren_verified", "email_pending", "phone_pending"].includes(
        user.accountStatus,
      )
    ) {
      user.accountStatus = "pending_admin_review";
      if (!Array.isArray(user.statusHistory)) user.statusHistory = [];
      user.statusHistory.push({
        status: "pending_admin_review",
        at: now,
        reason: "documents_uploaded",
      });
      user.updatedAt = now;
    }

    await writeDb(db);

    return res.status(201).json({
      message:
        "Documents reçus. Votre dossier est maintenant en cours de vérification (24–48h).",
      accountStatus: user.accountStatus,
      documents: newDocs.map((d) => ({
        id: d.id,
        type: d.type,
        label: d.label,
        originalName: d.originalName,
        mimeType: d.mimeType,
        size: d.size,
        uploadedAt: d.uploadedAt,
      })),
    });
  },
);

// ---------------------------------------------------------------------------
// GET /restaurants/me — authenticated restaurant's own profile
// ---------------------------------------------------------------------------
router.get(
  "/me",
  requireAuth,
  requireRole(USER_ROLES.RESTAURANT),
  async (req, res) => {
    const db = await readDb();
    const restaurant = (db.restaurants || []).find(
      (r) => r.userId === req.user.id,
    );
    if (!restaurant)
      return res.status(404).json({ error: "Restaurant profile not found" });

    return res.json({ restaurant: publicRestaurant(restaurant) });
  },
);

// ---------------------------------------------------------------------------
// GET /restaurants/:id — public restaurant profile
// ---------------------------------------------------------------------------
router.get("/:id", async (req, res) => {
  const db = await readDb();
  const restaurant = (db.restaurants || []).find((r) => r.id === req.params.id);
  if (!restaurant)
    return res.status(404).json({ error: "Restaurant not found" });

  // Only show approved restaurants publicly
  const user = db.users.find((u) => u.id === restaurant.userId);
  if (!user || user.accountStatus !== "approved") {
    return res.status(404).json({ error: "Restaurant not found" });
  }

  return res.json({ restaurant: publicRestaurant(restaurant) });
});

// ---------------------------------------------------------------------------
// GET /restaurants/:id/ratings — public ratings for a restaurant
// ---------------------------------------------------------------------------
router.get("/:id/ratings", async (req, res) => {
  const db = await readDb();
  const restaurant = (db.restaurants || []).find((r) => r.id === req.params.id);
  if (!restaurant)
    return res.status(404).json({ error: "Restaurant not found" });

  const ratings = (db.ratings || [])
    .filter((r) => r.restaurantId === req.params.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((r) => ({
      id: r.id,
      score: r.score,
      comment: r.comment || "",
      createdAt: r.createdAt,
    }));

  return res.json({
    restaurantId: req.params.id,
    averageRating: restaurant.averageRating,
    ratingCount: restaurant.ratingCount,
    ratings,
  });
});

// ---------------------------------------------------------------------------
// POST /restaurants/:id/rate — receiver rates a restaurant (via meal)
// ---------------------------------------------------------------------------
router.post(
  "/:id/rate",
  requireAuth,
  requireRole(USER_ROLES.RECEIVER),
  validate(rateSchema),
  async (req, res) => {
    const db = await readDb();
    const restaurant = (db.restaurants || []).find(
      (r) => r.id === req.params.id,
    );
    if (!restaurant)
      return res.status(404).json({ error: "Restaurant not found" });

    const meal = (db.meals || []).find(
      (m) => m.id === req.body.mealId && m.restaurantId === req.params.id,
    );
    if (!meal)
      return res
        .status(404)
        .json({ error: "Meal not found for this restaurant" });

    // Must be the receiver who collected this meal
    if (meal.status !== "collected" && meal.status !== "delivered") {
      return res.status(409).json({
        error: "You can only rate meals you have collected",
        code: "MEAL_NOT_COLLECTED",
      });
    }

    const isReserver =
      meal.reserved_by === req.user.email || meal.reservedBy === req.user.id;
    if (!isReserver) {
      return res.status(403).json({ error: "You did not reserve this meal" });
    }

    if (!Array.isArray(db.ratings)) db.ratings = [];

    // One rating per meal per user
    const existing = db.ratings.find(
      (r) => r.mealId === req.body.mealId && r.receiverId === req.user.id,
    );
    if (existing) {
      return res.status(409).json({
        error: "You have already rated this meal",
        code: "ALREADY_RATED",
      });
    }

    const now = new Date().toISOString();
    const rating = {
      id: nanoid(),
      mealId: req.body.mealId,
      restaurantId: req.params.id,
      receiverId: req.user.id,
      score: req.body.score,
      comment: req.body.comment || "",
      createdAt: now,
    };

    db.ratings.push(rating);
    await refreshRestaurantRating(db, req.params.id);
    await writeDb(db);

    return res.status(201).json({ rating });
  },
);

// ---------------------------------------------------------------------------
// Helper — strip internal fields from restaurant before sending to client
// ---------------------------------------------------------------------------
function publicRestaurant(r) {
  return {
    id: r.id,
    businessName: r.businessName,
    siren: r.siren,
    sirenVerified: r.sirenVerified,
    address: r.address,
    documents: (r.documents || []).map((d) => ({
      id: d.id,
      type: d.type,
      originalName: d.originalName,
      mimeType: d.mimeType,
      size: d.size,
      uploadedAt: d.uploadedAt,
    })),
    averageRating: r.averageRating,
    ratingCount: r.ratingCount,
    isFlaggedForReview: r.isFlaggedForReview,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export { publicRestaurant };
export default router;
