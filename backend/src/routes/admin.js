import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import Joi from "joi";
import { nanoid } from "nanoid";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { readDb, writeDb } from "../utils/db.js";
import { sendRestaurantDecisionEmail } from "../utils/mailer.js";
import { publicUser } from "../utils/users.js";
import { USER_ROLES, VERIFICATION_STATUS } from "../constants/auth.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const verificationUploadsRoot = path.resolve(
  __dirname,
  "../../uploads/verifications",
);

const listRestaurantsSchema = Joi.object({
  status: Joi.string()
    .valid(
      "email_pending",
      "phone_pending",
      "pending_review",
      "approved",
      "rejected",
      "suspended",
      "ALL",
    )
    .default("pending_review"),
});

const listUsersSchema = Joi.object({
  role: Joi.string()
    .valid(USER_ROLES.ADMIN, USER_ROLES.RESTAURANT, USER_ROLES.RECEIVER, "ALL")
    .default("ALL"),
  accountStatus: Joi.string().trim().max(80).default("ALL"),
});

const restaurantReviewSchema = Joi.object({
  decision: Joi.string().valid("approved", "rejected").required(),
  reason: Joi.string().trim().allow("").max(500).default(""),
});

const suspendSchema = Joi.object({
  reason: Joi.string().trim().min(5).max(500).required(),
});

const reportResolveSchema = Joi.object({
  resolution: Joi.string().valid("reviewed", "dismissed").required(),
  note: Joi.string().trim().allow("").max(500).default(""),
});

// Legacy verification schemas (kept for any existing /verifications endpoints)
const listSchema = Joi.object({
  status: Joi.string()
    .valid(
      VERIFICATION_STATUS.PENDING,
      VERIFICATION_STATUS.APPROVED,
      VERIFICATION_STATUS.REJECTED,
      "ALL",
    )
    .default(VERIFICATION_STATUS.PENDING),
});

const reviewSchema = Joi.object({
  status: Joi.string()
    .valid(VERIFICATION_STATUS.APPROVED, VERIFICATION_STATUS.REJECTED)
    .required(),
  reason: Joi.string().trim().allow("").max(500).default(""),
});

function addAuditLog(
  db,
  action,
  actorId,
  actorRole,
  targetId,
  targetType,
  ip,
  meta,
) {
  if (!Array.isArray(db.auditLog)) db.auditLog = [];
  db.auditLog.push({
    id: nanoid(),
    action,
    actorId,
    actorRole,
    targetId,
    targetType,
    ip,
    meta,
    createdAt: new Date().toISOString(),
  });
}

function publicRestaurantAdmin(restaurant, user) {
  return {
    id: restaurant.id,
    userId: restaurant.userId,
    businessName: restaurant.businessName,
    siren: restaurant.siren,
    sirenVerified: restaurant.sirenVerified,
    sirenVerifyMethod: restaurant.sirenVerifyMethod,
    address: restaurant.address,
    documents: (restaurant.documents || []).map((d) => ({
      id: d.id,
      type: d.type,
      originalName: d.originalName,
      mimeType: d.mimeType,
      size: d.size,
      uploadedAt: d.uploadedAt,
    })),
    rejectionReason: restaurant.rejectionReason || "",
    reviewedAt: restaurant.reviewedAt,
    reviewedBy: restaurant.reviewedBy,
    averageRating: restaurant.averageRating,
    ratingCount: restaurant.ratingCount,
    isFlaggedForReview: restaurant.isFlaggedForReview,
    createdAt: restaurant.createdAt,
    user: user ? publicUser(user) : null,
    accountStatus: user?.accountStatus,
  };
}

function mapVerification(item, user) {
  return {
    id: item.id,
    status: item.status,
    sourceType: item.sourceType || "DOCUMENT",
    quizScore: item.quizScore ?? null,
    quizTotal: item.quizTotal ?? null,
    rejectionReason: item.rejectionReason || "",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    reviewedAt: item.reviewedAt,
    reviewedBy: item.reviewedBy,
    document: {
      originalName: item.document?.originalName,
      mimeType: item.document?.mimeType,
      size: item.document?.size,
      storedName: item.document?.storedName,
      hasFile: Boolean(item.document?.path),
    },
    user: user ? publicUser(user) : { email: item.userEmail },
  };
}

router.get(
  "/verifications/:id/document",
  requireAuth,
  requireRole(USER_ROLES.ADMIN),
  async (req, res) => {
    const db = await readDb();
    const request = db.verificationRequests.find(
      (item) => item.id === req.params.id,
    );

    if (!request) {
      return res.status(404).json({ error: "Verification request not found" });
    }

    if (!request.document?.path) {
      return res
        .status(404)
        .json({ error: "Document not found for this verification" });
    }

    const absolutePath = path.resolve(request.document.path);
    const relativePath = path.relative(verificationUploadsRoot, absolutePath);
    const isOutsideUploads =
      relativePath.startsWith("..") || path.isAbsolute(relativePath);
    if (isOutsideUploads) {
      return res.status(400).json({ error: "Invalid document path" });
    }

    if (!fs.existsSync(absolutePath)) {
      return res
        .status(404)
        .json({ error: "Document file is missing on server" });
    }

    const safeFilename = String(
      request.document.originalName ||
        request.document.storedName ||
        `verification-${request.id}`,
    ).replace(/[^a-zA-Z0-9._-]/g, "_");

    const asDownload =
      req.query.download === "1" || req.query.download === "true";

    res.setHeader(
      "Content-Type",
      request.document.mimeType || "application/octet-stream",
    );
    res.setHeader(
      "Content-Disposition",
      `${asDownload ? "attachment" : "inline"}; filename="${safeFilename}"`,
    );

    return res.sendFile(absolutePath);
  },
);

router.get(
  "/verifications",
  requireAuth,
  requireRole(USER_ROLES.ADMIN),
  validate(listSchema, "query"),
  async (req, res) => {
    const db = await readDb();
    const status = req.query.status || VERIFICATION_STATUS.PENDING;

    let requests = db.verificationRequests;
    if (status !== "ALL") {
      requests = requests.filter((item) => item.status === status);
    }

    const result = requests
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((item) => {
        const user = db.users.find((u) => u.id === item.userId);
        return mapVerification(item, user);
      });

    return res.json({ verifications: result });
  },
);

router.get(
  "/users",
  requireAuth,
  requireRole(USER_ROLES.ADMIN),
  validate(listUsersSchema, "query"),
  async (req, res) => {
    const db = await readDb();
    const role = req.query.role || "ALL";
    const accountStatus = req.query.accountStatus || "ALL";

    let users = db.users;
    if (role !== "ALL") {
      users = users.filter((item) => item.role === role);
    }

    if (accountStatus !== "ALL") {
      users = users.filter((item) => item.accountStatus === accountStatus);
    }

    const result = users
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((item) => publicUser(item));

    return res.json({ users: result });
  },
);

router.put(
  "/verifications/:id",
  requireAuth,
  requireRole(USER_ROLES.ADMIN),
  validate(reviewSchema),
  async (req, res) => {
    const db = await readDb();
    const request = db.verificationRequests.find(
      (item) => item.id === req.params.id,
    );

    if (!request) {
      return res.status(404).json({ error: "Verification request not found" });
    }

    const user = db.users.find((item) => item.id === request.userId);
    if (!user) {
      return res.status(404).json({ error: "Donor account not found" });
    }

    if (
      req.body.status === VERIFICATION_STATUS.APPROVED &&
      !request.document?.path
    ) {
      return res.status(409).json({
        error: "Impossible d'approuver sans document d'identite televerse.",
        code: "DOCUMENT_REQUIRED",
      });
    }

    const now = new Date().toISOString();
    request.status = req.body.status;
    request.rejectionReason =
      req.body.status === VERIFICATION_STATUS.REJECTED
        ? req.body.reason || ""
        : "";
    request.reviewedAt = now;
    request.reviewedBy = req.user.id;
    request.updatedAt = now;

    user.isEmailVerified = true;
    user.isVerified = req.body.status === VERIFICATION_STATUS.APPROVED;
    user.verificationStatus = req.body.status;
    user.accountStatus =
      req.body.status === VERIFICATION_STATUS.APPROVED
        ? ACCOUNT_STATUS.ACTIVE
        : ACCOUNT_STATUS.SUSPENDED;
    user.suspensionReason =
      req.body.status === VERIFICATION_STATUS.REJECTED
        ? request.rejectionReason || ""
        : "";
    if (!Array.isArray(user.statusHistory)) {
      user.statusHistory = [];
    }
    if (
      user.statusHistory[user.statusHistory.length - 1]?.status !==
      user.accountStatus
    ) {
      user.statusHistory.push({
        status: user.accountStatus,
        at: now,
        reason:
          req.body.status === VERIFICATION_STATUS.APPROVED
            ? "admin_approved"
            : `admin_rejected:${request.rejectionReason || "none"}`,
      });
    }
    user.updatedAt = now;

    await writeDb(db);

    let emailResult = { delivered: false, skipped: true };
    try {
      emailResult = await sendVerificationDecisionEmail({
        to: user.email,
        name: user.name,
        status: req.body.status,
        reason: request.rejectionReason,
      });
    } catch (error) {
      emailResult = { delivered: false, skipped: false, error: error.message };
    }

    return res.json({
      verification: mapVerification(request, user),
      emailNotification: emailResult,
    });
  },
);

router.get(
  "/debug",
  requireAuth,
  requireRole(USER_ROLES.ADMIN),
  async (req, res) => {
    const db = await readDb();

    return res.json({
      usersCount: db.users.length,
      restaurantsCount: (db.restaurants || []).length,
      verificationRequestsCount: (db.verificationRequests || []).length,
      restaurantUsers: db.users
        .filter((u) => u.role === USER_ROLES.RESTAURANT)
        .map((u) => ({
          id: u.id,
          email: u.email,
          accountStatus: u.accountStatus,
        })),
    });
  },
);

// ---------------------------------------------------------------------------
// GET /admin/restaurants — list restaurants filtered by status
// ---------------------------------------------------------------------------
router.get(
  "/restaurants",
  requireAuth,
  requireRole(USER_ROLES.ADMIN),
  validate(listRestaurantsSchema, "query"),
  async (req, res) => {
    const db = await readDb();
    const statusFilter = req.query.status || "pending_review";

    let restaurants = db.restaurants || [];
    if (statusFilter !== "ALL") {
      restaurants = restaurants.filter((r) => {
        const user = db.users.find((u) => u.id === r.userId);
        return user?.accountStatus === statusFilter;
      });
    }

    const result = restaurants
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((r) => {
        const user = db.users.find((u) => u.id === r.userId);
        return publicRestaurantAdmin(r, user);
      });

    return res.json({ restaurants: result });
  },
);

// ---------------------------------------------------------------------------
// GET /admin/restaurants/:id — full restaurant dossier
// ---------------------------------------------------------------------------
router.get(
  "/restaurants/:id",
  requireAuth,
  requireRole(USER_ROLES.ADMIN),
  async (req, res) => {
    const db = await readDb();
    const restaurant = (db.restaurants || []).find(
      (r) => r.id === req.params.id,
    );
    if (!restaurant)
      return res.status(404).json({ error: "Restaurant not found" });

    const user = db.users.find((u) => u.id === restaurant.userId);
    return res.json({ restaurant: publicRestaurantAdmin(restaurant, user) });
  },
);

// ---------------------------------------------------------------------------
// GET /admin/restaurants/:id/document/:docIndex — stream uploaded document
// ---------------------------------------------------------------------------
router.get(
  "/restaurants/:id/document/:docIndex",
  requireAuth,
  requireRole(USER_ROLES.ADMIN),
  async (req, res) => {
    const db = await readDb();
    const restaurant = (db.restaurants || []).find(
      (r) => r.id === req.params.id,
    );
    if (!restaurant)
      return res.status(404).json({ error: "Restaurant not found" });

    const idx = parseInt(req.params.docIndex, 10);
    const doc = (restaurant.documents || [])[idx];
    if (!doc) return res.status(404).json({ error: "Document not found" });

    if (!doc.path)
      return res.status(404).json({ error: "Document file not on record" });

    const absolutePath = path.resolve(doc.path);
    const uploadsRoot = path.resolve(verificationUploadsRoot, "../");
    const rel = path.relative(uploadsRoot, absolutePath);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      return res.status(400).json({ error: "Invalid document path" });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "Document file missing on server" });
    }

    const safeFilename = String(
      doc.originalName || doc.storedName || `doc-${idx}`,
    ).replace(/[^a-zA-Z0-9._-]/g, "_");
    const asDownload =
      req.query.download === "1" || req.query.download === "true";
    res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `${asDownload ? "attachment" : "inline"}; filename="${safeFilename}"`,
    );
    return res.sendFile(absolutePath);
  },
);

// ---------------------------------------------------------------------------
// POST /admin/restaurants/:id/review — approve or reject a restaurant
// ---------------------------------------------------------------------------
router.post(
  "/restaurants/:id/review",
  requireAuth,
  requireRole(USER_ROLES.ADMIN),
  validate(restaurantReviewSchema),
  async (req, res) => {
    const db = await readDb();
    const restaurant = (db.restaurants || []).find(
      (r) => r.id === req.params.id,
    );
    if (!restaurant)
      return res.status(404).json({ error: "Restaurant not found" });

    const user = db.users.find((u) => u.id === restaurant.userId);
    if (!user) return res.status(404).json({ error: "User account not found" });

    const { decision, reason } = req.body;
    const now = new Date().toISOString();

    restaurant.reviewedBy = req.user.id;
    restaurant.reviewedAt = now;
    restaurant.rejectionReason = decision === "rejected" ? reason || "" : "";
    restaurant.updatedAt = now;

    user.accountStatus = decision === "approved" ? "approved" : "rejected";
    if (!Array.isArray(user.statusHistory)) user.statusHistory = [];
    user.statusHistory.push({
      status: user.accountStatus,
      at: now,
      reason:
        decision === "approved"
          ? "admin_approved"
          : `admin_rejected:${reason || ""}`,
    });
    user.updatedAt = now;

    addAuditLog(
      db,
      `restaurant_${decision}`,
      req.user.id,
      req.user.role,
      restaurant.id,
      "restaurant",
      req.ip,
      { reason, businessName: restaurant.businessName },
    );

    await writeDb(db);

    let emailResult = { delivered: false };
    try {
      emailResult = await sendRestaurantDecisionEmail({
        to: user.email,
        businessName: restaurant.businessName,
        status: decision,
        reason: restaurant.rejectionReason,
      });
    } catch (_) {
      emailResult = { delivered: false };
    }

    return res.json({
      restaurant: publicRestaurantAdmin(restaurant, user),
      emailNotification: emailResult,
    });
  },
);

// ---------------------------------------------------------------------------
// POST /admin/restaurants/:id/suspend — suspend a restaurant
// ---------------------------------------------------------------------------
router.post(
  "/restaurants/:id/suspend",
  requireAuth,
  requireRole(USER_ROLES.ADMIN),
  validate(suspendSchema),
  async (req, res) => {
    const db = await readDb();
    const restaurant = (db.restaurants || []).find(
      (r) => r.id === req.params.id,
    );
    if (!restaurant)
      return res.status(404).json({ error: "Restaurant not found" });

    const user = db.users.find((u) => u.id === restaurant.userId);
    if (!user) return res.status(404).json({ error: "User account not found" });

    const now = new Date().toISOString();
    user.accountStatus = "suspended";
    user.suspensionReason = req.body.reason;
    if (!Array.isArray(user.statusHistory)) user.statusHistory = [];
    user.statusHistory.push({
      status: "suspended",
      at: now,
      reason: req.body.reason,
    });
    user.updatedAt = now;
    restaurant.updatedAt = now;

    addAuditLog(
      db,
      "restaurant_suspended",
      req.user.id,
      req.user.role,
      restaurant.id,
      "restaurant",
      req.ip,
      {
        reason: req.body.reason,
        businessName: restaurant.businessName,
      },
    );

    await writeDb(db);
    return res.json({ restaurant: publicRestaurantAdmin(restaurant, user) });
  },
);

// ---------------------------------------------------------------------------
// GET /admin/audit-log — paginated audit log
// ---------------------------------------------------------------------------
router.get(
  "/audit-log",
  requireAuth,
  requireRole(USER_ROLES.ADMIN),
  async (req, res) => {
    const db = await readDb();
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit || "50", 10)),
    );
    const skip = (page - 1) * limit;

    const logs = (db.auditLog || [])
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit);

    return res.json({
      total: (db.auditLog || []).length,
      page,
      limit,
      logs,
    });
  },
);

// ---------------------------------------------------------------------------
// POST /admin/reports/:id/resolve — admin resolves a report
// ---------------------------------------------------------------------------
router.post(
  "/reports/:id/resolve",
  requireAuth,
  requireRole(USER_ROLES.ADMIN),
  validate(reportResolveSchema),
  async (req, res) => {
    const db = await readDb();
    const report = (db.reports || []).find((r) => r.id === req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });

    const now = new Date().toISOString();
    report.status = req.body.resolution;
    report.reviewedBy = req.user.id;
    report.reviewedAt = now;
    report.resolution = req.body.note || "";
    report.updatedAt = now;

    addAuditLog(
      db,
      `report_${req.body.resolution}`,
      req.user.id,
      req.user.role,
      report.id,
      "report",
      req.ip,
      {
        mealId: report.mealId,
        note: req.body.note,
      },
    );

    await writeDb(db);
    return res.json({ report });
  },
);

export default router;
