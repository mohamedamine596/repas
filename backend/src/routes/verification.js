import express from "express";
import { nanoid } from "nanoid";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { verificationUpload } from "../middleware/upload.js";
import { readDb, writeDb } from "../utils/db.js";
import { ACCOUNT_STATUS, USER_ROLES, VERIFICATION_STATUS } from "../constants/auth.js";

const router = express.Router();

function runUpload(req, res) {
  return new Promise((resolve, reject) => {
    verificationUpload.single("document")(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function ensureDonorQuizState(user) {
  if (!user.donorQuiz || typeof user.donorQuiz !== "object") {
    user.donorQuiz = {
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
    };
  }
  if (!user.donorQuiz.document || typeof user.donorQuiz.document !== "object") {
    user.donorQuiz.document = {
      originalName: "",
      storedName: "",
      mimeType: "",
      size: 0,
      path: "",
      uploadedAt: null,
    };
  }

  return user.donorQuiz;
}

function buildDocumentFromUpload(file, nowIso) {
  return {
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    path: file.path,
    uploadedAt: nowIso,
  };
}

function publicDocument(document) {
  return {
    originalName: document?.originalName || "",
    mimeType: document?.mimeType || "",
    size: document?.size || 0,
    storedName: document?.storedName || "",
    uploadedAt: document?.uploadedAt || null,
    hasFile: Boolean(document?.path),
  };
}

function publicRequest(item) {
  if (!item) return null;
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
    document: publicDocument(item.document),
    documentUploaded: Boolean(item.document?.path),
  };
}

router.post("/upload", requireAuth, requireRole(USER_ROLES.DONOR), async (req, res) => {
  try {
    await runUpload(req, res);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Invalid file upload" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "document file is required" });
  }

  const db = await readDb();
  const user = db.users.find((item) => item.id === req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (!user.isEmailVerified || user.accountStatus === ACCOUNT_STATUS.EMAIL_PENDING) {
    return res.status(409).json({
      error: "Verifiez d'abord votre email OTP avant d'envoyer un document.",
      code: "EMAIL_OTP_REQUIRED",
      accountStatus: user.accountStatus,
    });
  }

  const now = new Date().toISOString();
  const uploadedDocument = buildDocumentFromUpload(req.file, now);

  // During quiz stage, we only stage the document and wait for quiz validation.
  if (user.accountStatus === ACCOUNT_STATUS.EMAIL_VERIFIED) {
    const donorQuiz = ensureDonorQuizState(user);
    donorQuiz.document = uploadedDocument;
    user.updatedAt = now;
    await writeDb(db);

    return res.status(201).json({
      staged: true,
      message: "Document enregistre. Vous pouvez maintenant valider le quiz.",
      document: publicDocument(uploadedDocument),
      user: {
        id: user.id,
        role: user.role,
        isVerified: user.isVerified,
        verificationStatus: user.verificationStatus,
        accountStatus: user.accountStatus,
      },
    });
  }

  const pendingPlaceholder = db.verificationRequests
    .filter(
      (item) =>
        item.userId === user.id &&
        item.status === VERIFICATION_STATUS.PENDING &&
        (item.sourceType || "DOCUMENT") === "DOCUMENT"
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .find((item) => !item.document?.path);

  const request = pendingPlaceholder || {
    id: nanoid(),
    userId: user.id,
    userEmail: user.email,
    status: VERIFICATION_STATUS.PENDING,
    sourceType: "DOCUMENT",
    quizScore: null,
    quizTotal: null,
    createdAt: now,
    updatedAt: now,
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: "",
    document: {
      originalName: "",
      storedName: "",
      mimeType: "",
      size: 0,
      path: "",
    },
  };

  request.status = VERIFICATION_STATUS.PENDING;
  request.sourceType = "DOCUMENT";
  request.quizScore = null;
  request.quizTotal = null;
  request.updatedAt = now;
  request.reviewedAt = null;
  request.reviewedBy = null;
  request.rejectionReason = "";
  request.document = uploadedDocument;

  const donorQuiz = ensureDonorQuizState(user);
  donorQuiz.document = uploadedDocument;

  user.isVerified = false;
  user.isEmailVerified = true;
  user.verificationStatus = VERIFICATION_STATUS.PENDING;
  user.accountStatus = ACCOUNT_STATUS.PENDING_ADMIN_REVIEW;
  if (!Array.isArray(user.statusHistory)) {
    user.statusHistory = [];
  }
  if (user.statusHistory[user.statusHistory.length - 1]?.status !== ACCOUNT_STATUS.PENDING_ADMIN_REVIEW) {
    user.statusHistory.push({
      status: ACCOUNT_STATUS.PENDING_ADMIN_REVIEW,
      at: now,
      reason: "manual_document_upload",
    });
  }
  user.updatedAt = now;

  if (!pendingPlaceholder) {
    db.verificationRequests.push(request);
  }
  await writeDb(db);

  return res.status(201).json({
    verificationRequest: publicRequest(request),
    user: {
      id: user.id,
      role: user.role,
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
    },
  });
});

router.get("/status", requireAuth, async (req, res) => {
  const db = await readDb();
  const user = db.users.find((item) => item.id === req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (user.role !== USER_ROLES.DONOR) {
    return res.json({
      role: user.role,
      isVerified: true,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      verificationStatus: VERIFICATION_STATUS.APPROVED,
      latestRequest: null,
      message: "Verification is only required for donor accounts.",
    });
  }

  const latestRequest = db.verificationRequests
    .filter((item) => item.userId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const stagedDocument = user?.donorQuiz?.document;
  const stagedDocumentUploaded = Boolean(stagedDocument?.path);

  let message = "Verification request submitted. Awaiting admin review.";
  if (user.accountStatus === ACCOUNT_STATUS.EMAIL_PENDING) {
    message = "Veuillez verifier votre email avec le code OTP.";
  } else if (user.accountStatus === ACCOUNT_STATUS.EMAIL_VERIFIED) {
    message = "Veuillez televerser votre document d'identite puis completer le quiz de securite alimentaire.";
  } else if (user.accountStatus === ACCOUNT_STATUS.PENDING_ADMIN_REVIEW) {
    message = "Votre compte est en cours de verification (24-48h).";
  } else if (user.accountStatus === ACCOUNT_STATUS.ACTIVE) {
    message = "Votre compte donneur est actif.";
  } else if (user.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
    message = "Votre compte donneur est suspendu.";
  }

  return res.json({
    role: user.role,
    isVerified: Boolean(user.isVerified),
    isEmailVerified: Boolean(user.isEmailVerified),
    accountStatus: user.accountStatus,
    verificationStatus: user.verificationStatus,
    latestRequest: publicRequest(latestRequest),
    documentRequired: user.role === USER_ROLES.DONOR && user.accountStatus === ACCOUNT_STATUS.EMAIL_VERIFIED,
    documentUploaded: stagedDocumentUploaded,
    stagedDocument: stagedDocumentUploaded ? publicDocument(stagedDocument) : null,
    message,
  });
});

export default router;
