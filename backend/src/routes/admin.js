import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import Joi from "joi";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { readDb, writeDb } from "../utils/db.js";
import { sendVerificationDecisionEmail } from "../utils/mailer.js";
import { publicUser } from "../utils/users.js";
import { ACCOUNT_STATUS, USER_ROLES, VERIFICATION_STATUS } from "../constants/auth.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const verificationUploadsRoot = path.resolve(__dirname, "../../uploads/verifications");

const listSchema = Joi.object({
  status: Joi.string().valid(
    VERIFICATION_STATUS.PENDING,
    VERIFICATION_STATUS.APPROVED,
    VERIFICATION_STATUS.REJECTED,
    "ALL"
  ).default(VERIFICATION_STATUS.PENDING),
});

const listUsersSchema = Joi.object({
  role: Joi.string().valid(
    USER_ROLES.ADMIN,
    USER_ROLES.DONOR,
    USER_ROLES.RECEIVER,
    "ALL"
  ).default("ALL"),
  accountStatus: Joi.string().trim().max(80).default("ALL"),
});

const reviewSchema = Joi.object({
  status: Joi.string().valid(VERIFICATION_STATUS.APPROVED, VERIFICATION_STATUS.REJECTED).required(),
  reason: Joi.string().trim().allow("").max(500).default(""),
});

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
    const request = db.verificationRequests.find((item) => item.id === req.params.id);

    if (!request) {
      return res.status(404).json({ error: "Verification request not found" });
    }

    if (!request.document?.path) {
      return res.status(404).json({ error: "Document not found for this verification" });
    }

    const absolutePath = path.resolve(request.document.path);
    const relativePath = path.relative(verificationUploadsRoot, absolutePath);
    const isOutsideUploads = relativePath.startsWith("..") || path.isAbsolute(relativePath);
    if (isOutsideUploads) {
      return res.status(400).json({ error: "Invalid document path" });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "Document file is missing on server" });
    }

    const safeFilename = String(
      request.document.originalName || request.document.storedName || `verification-${request.id}`
    ).replace(/[^a-zA-Z0-9._-]/g, "_");

    const asDownload = req.query.download === "1" || req.query.download === "true";

    res.setHeader("Content-Type", request.document.mimeType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `${asDownload ? "attachment" : "inline"}; filename="${safeFilename}"`
    );

    return res.sendFile(absolutePath);
  }
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
  }
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
  }
);

router.put(
  "/verifications/:id",
  requireAuth,
  requireRole(USER_ROLES.ADMIN),
  validate(reviewSchema),
  async (req, res) => {
    const db = await readDb();
    const request = db.verificationRequests.find((item) => item.id === req.params.id);

    if (!request) {
      return res.status(404).json({ error: "Verification request not found" });
    }

    const user = db.users.find((item) => item.id === request.userId);
    if (!user) {
      return res.status(404).json({ error: "Donor account not found" });
    }

    if (req.body.status === VERIFICATION_STATUS.APPROVED && !request.document?.path) {
      return res.status(409).json({
        error: "Impossible d'approuver sans document d'identite televerse.",
        code: "DOCUMENT_REQUIRED",
      });
    }

    const now = new Date().toISOString();
    request.status = req.body.status;
    request.rejectionReason = req.body.status === VERIFICATION_STATUS.REJECTED ? req.body.reason || "" : "";
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
    if (user.statusHistory[user.statusHistory.length - 1]?.status !== user.accountStatus) {
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
  }
);

router.get("/debug", requireAuth, requireRole(USER_ROLES.ADMIN), async (req, res) => {
  const db = await readDb();

  return res.json({
    usersCount: db.users.length,
    verificationRequestsCount: db.verificationRequests.length,
    verificationRequests: db.verificationRequests,
    donorUsers: db.users
      .filter((u) => u.role === USER_ROLES.DONOR)
      .map((u) => ({
        id: u.id,
        email: u.email,
        accountStatus: u.accountStatus,
        verificationStatus: u.verificationStatus,
      })),
  });
});

export default router;
