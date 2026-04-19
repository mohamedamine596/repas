import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import {
  ACCOUNT_STATUS,
  USER_ROLES,
  VERIFICATION_STATUS,
  isAccountStatus,
} from "../constants/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, "../../data/db.json");
const DEFAULT_DB = {
  users: [],
  messages: [],
  meals: [],
  reports: [],
  verificationRequests: [],
};

function normalizeRole(value) {
  if (Object.values(USER_ROLES).includes(value)) {
    return value;
  }
  return USER_ROLES.RECEIVER;
}

function normalizeAccountStatus(role, user) {
  if (role === USER_ROLES.ADMIN || role === USER_ROLES.RECEIVER) {
    return ACCOUNT_STATUS.ACTIVE;
  }

  if (isAccountStatus(user.accountStatus)) {
    return user.accountStatus;
  }

  if (user.verificationStatus === VERIFICATION_STATUS.APPROVED || user.isVerified === true) {
    return ACCOUNT_STATUS.ACTIVE;
  }

  if (user.verificationStatus === VERIFICATION_STATUS.REJECTED) {
    return ACCOUNT_STATUS.SUSPENDED;
  }

  if (user.isEmailVerified === false) {
    return ACCOUNT_STATUS.EMAIL_PENDING;
  }

  if (user.donorQuiz?.passedAt || Number(user.donorQuiz?.lastScore) >= 4) {
    return ACCOUNT_STATUS.PENDING_ADMIN_REVIEW;
  }

  return ACCOUNT_STATUS.EMAIL_PENDING;
}

function normalizeVerificationStatus(role, status, accountStatus) {
  if (Object.values(VERIFICATION_STATUS).includes(status)) {
    return status;
  }

  if (role !== USER_ROLES.DONOR) {
    return VERIFICATION_STATUS.APPROVED;
  }

  if (accountStatus === ACCOUNT_STATUS.ACTIVE) {
    return VERIFICATION_STATUS.APPROVED;
  }

  if (accountStatus === ACCOUNT_STATUS.SUSPENDED) {
    return VERIFICATION_STATUS.REJECTED;
  }

  return VERIFICATION_STATUS.PENDING;
}

function normalizeRefreshSession(item) {
  return {
    id: item.id || "",
    tokenHash: item.tokenHash || "",
    createdAt: item.createdAt || new Date().toISOString(),
    expiresAt: item.expiresAt || null,
    revokedAt: item.revokedAt || null,
  };
}

function normalizeStatusHistory(history, accountStatus, createdAt) {
  const safeHistory = Array.isArray(history)
    ? history
        .filter((entry) => entry && isAccountStatus(entry.status) && entry.at)
        .map((entry) => ({
          status: entry.status,
          at: entry.at,
          reason: entry.reason || "",
        }))
    : [];

  if (!safeHistory.length || safeHistory[safeHistory.length - 1].status !== accountStatus) {
    safeHistory.push({
      status: accountStatus,
      at: createdAt || new Date().toISOString(),
      reason: "",
    });
  }

  return safeHistory.slice(-40);
}

function normalizeEmailOtp(emailOtp) {
  return {
    codeHash: emailOtp?.codeHash || "",
    expiresAt: emailOtp?.expiresAt || null,
    resendAvailableAt: emailOtp?.resendAvailableAt || null,
    attempts: Number.isFinite(Number(emailOtp?.attempts)) ? Number(emailOtp.attempts) : 0,
    lastSentAt: emailOtp?.lastSentAt || null,
    verifiedAt: emailOtp?.verifiedAt || null,
  };
}

function normalizePasswordReset(passwordReset) {
  return {
    tokenHash: passwordReset?.tokenHash || "",
    expiresAt: passwordReset?.expiresAt || null,
    requestedAt: passwordReset?.requestedAt || null,
    usedAt: passwordReset?.usedAt || null,
  };
}

function normalizeDonorQuiz(donorQuiz) {
  const document = donorQuiz?.document || {};

  return {
    attempts: Number.isFinite(Number(donorQuiz?.attempts)) ? Number(donorQuiz.attempts) : 0,
    maxAttempts: 2,
    cooldownUntil: donorQuiz?.cooldownUntil || null,
    passedAt: donorQuiz?.passedAt || null,
    lastAttemptAt: donorQuiz?.lastAttemptAt || null,
    lastScore: Number.isFinite(Number(donorQuiz?.lastScore)) ? Number(donorQuiz.lastScore) : null,
    lastWrongAnswers: Array.isArray(donorQuiz?.lastWrongAnswers)
      ? donorQuiz.lastWrongAnswers.filter((item) => Number.isFinite(Number(item))).map(Number)
      : [],
    document: {
      originalName: document.originalName || "",
      storedName: document.storedName || "",
      mimeType: document.mimeType || "",
      size: Number(document.size || 0),
      path: document.path || "",
      uploadedAt: document.uploadedAt || null,
    },
  };
}

function normalizeUser(user) {
  const role = normalizeRole(user.role);
  const accountStatus = normalizeAccountStatus(role, user);
  const verificationStatus = normalizeVerificationStatus(role, user.verificationStatus, accountStatus);
  const createdAt = user.createdAt || new Date().toISOString();
  const isEmailVerified =
    typeof user.isEmailVerified === "boolean"
      ? user.isEmailVerified
      : role === USER_ROLES.DONOR
        ? accountStatus !== ACCOUNT_STATUS.EMAIL_PENDING
        : true;
  const isVerified = role === USER_ROLES.DONOR
    ? accountStatus === ACCOUNT_STATUS.ACTIVE
    : true;

  return {
    id: user.id,
    name: (user.name || user.fullName || "").trim(),
    email: String(user.email || "").toLowerCase().trim(),
    password: user.password || user.passwordHash || "",
    role,
    isVerified,
    isEmailVerified,
    verificationStatus,
    accountStatus,
    statusHistory: normalizeStatusHistory(user.statusHistory, accountStatus, createdAt),
    bio: user.bio || "",
    phone: user.phone || "",
    createdAt,
    updatedAt: user.updatedAt || createdAt,
    emailOtp: normalizeEmailOtp(user.emailOtp),
    donorQuiz: normalizeDonorQuiz(user.donorQuiz),
    passwordReset: normalizePasswordReset(user.passwordReset),
    failedLoginCount: Number.isFinite(Number(user.failedLoginCount))
      ? Math.max(0, Number(user.failedLoginCount))
      : 0,
    lockoutUntil: user.lockoutUntil || null,
    lastFailedLoginAt: user.lastFailedLoginAt || null,
    suspensionReason: user.suspensionReason || "",
    refreshTokens: Array.isArray(user.refreshTokens)
      ? user.refreshTokens.map(normalizeRefreshSession)
      : [],
  };
}

function normalizeVerificationRequest(item) {
  const sourceType = item.sourceType === "DOCUMENT" || item.sourceType === "QUIZ"
    ? item.sourceType
    : item.document?.path
      ? "DOCUMENT"
      : "QUIZ";

  return {
    id: item.id,
    userId: item.userId,
    userEmail: String(item.userEmail || "").toLowerCase().trim(),
    status: Object.values(VERIFICATION_STATUS).includes(item.status)
      ? item.status
      : VERIFICATION_STATUS.PENDING,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
    reviewedAt: item.reviewedAt || null,
    reviewedBy: item.reviewedBy || null,
    rejectionReason: item.rejectionReason || "",
    sourceType,
    quizScore: Number.isFinite(Number(item.quizScore)) ? Number(item.quizScore) : null,
    quizTotal: Number.isFinite(Number(item.quizTotal)) ? Number(item.quizTotal) : null,
    document: {
      originalName: item.document?.originalName || "",
      storedName: item.document?.storedName || "",
      mimeType: item.document?.mimeType || "",
      size: Number(item.document?.size || 0),
      path: item.document?.path || "",
    },
  };
}

function normalizeMeal(meal, userByEmail) {
  const owner = userByEmail.get(String(meal.donor_email || "").toLowerCase().trim());

  return {
    ...meal,
    donor_name: meal.donor_name || owner?.name || meal.donor_email,
    reserved_by_name: meal.reserved_by_name || null,
  };
}

function normalizeMessage(message) {
  return {
    ...message,
    fromEmail: String(message.fromEmail || "").toLowerCase().trim(),
    toEmail: String(message.toEmail || "").toLowerCase().trim(),
  };
}

function ensureDbFile() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
  }
}

function getBaseAdminConfig() {
  return {
    email: String(process.env.BASE_ADMIN_EMAIL || "admin@coeurtablepartage.com")
      .toLowerCase()
      .trim(),
    password: String(process.env.BASE_ADMIN_PASSWORD || "Admin123456!").trim(),
    name: String(process.env.BASE_ADMIN_NAME || "Base Admin").trim(),
  };
}

function ensureBaseAdmin(normalizedDb) {
  const baseAdmin = getBaseAdminConfig();

  if (!baseAdmin.email || !baseAdmin.password || baseAdmin.password.length < 8) {
    return false;
  }

  const now = new Date().toISOString();
  let changed = false;
  let baseAdminPasswordHash = null;
  const getBaseAdminPasswordHash = () => {
    if (!baseAdminPasswordHash) {
      baseAdminPasswordHash = bcrypt.hashSync(baseAdmin.password, 12);
    }
    return baseAdminPasswordHash;
  };

  const existingBaseAdmin = normalizedDb.users.find((user) => user.email === baseAdmin.email);

  if (!existingBaseAdmin) {
    normalizedDb.users.push({
      id: nanoid(),
      name: baseAdmin.name,
      email: baseAdmin.email,
      password: getBaseAdminPasswordHash(),
      role: USER_ROLES.ADMIN,
      isVerified: true,
      isEmailVerified: true,
      verificationStatus: VERIFICATION_STATUS.APPROVED,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      statusHistory: [{ status: ACCOUNT_STATUS.ACTIVE, at: now, reason: "" }],
      bio: "",
      phone: "",
      createdAt: now,
      updatedAt: now,
      emailOtp: normalizeEmailOtp({ verifiedAt: now }),
      donorQuiz: normalizeDonorQuiz(),
      passwordReset: normalizePasswordReset(),
      failedLoginCount: 0,
      lockoutUntil: null,
      lastFailedLoginAt: null,
      suspensionReason: "",
      refreshTokens: [],
    });
    changed = true;
  } else {
    if (existingBaseAdmin.role !== USER_ROLES.ADMIN) {
      existingBaseAdmin.role = USER_ROLES.ADMIN;
      changed = true;
    }
    if (existingBaseAdmin.isVerified !== true) {
      existingBaseAdmin.isVerified = true;
      changed = true;
    }
    if (existingBaseAdmin.isEmailVerified !== true) {
      existingBaseAdmin.isEmailVerified = true;
      changed = true;
    }
    if (existingBaseAdmin.verificationStatus !== VERIFICATION_STATUS.APPROVED) {
      existingBaseAdmin.verificationStatus = VERIFICATION_STATUS.APPROVED;
      changed = true;
    }
    if (existingBaseAdmin.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
      existingBaseAdmin.accountStatus = ACCOUNT_STATUS.ACTIVE;
      changed = true;
    }
    if (!Array.isArray(existingBaseAdmin.statusHistory) || !existingBaseAdmin.statusHistory.length) {
      existingBaseAdmin.statusHistory = [{ status: ACCOUNT_STATUS.ACTIVE, at: now, reason: "" }];
      changed = true;
    }
    if (!existingBaseAdmin.name) {
      existingBaseAdmin.name = baseAdmin.name;
      changed = true;
    }
    if (!existingBaseAdmin.password) {
      existingBaseAdmin.password = getBaseAdminPasswordHash();
      changed = true;
    }
    if (changed) {
      existingBaseAdmin.updatedAt = now;
    }
  }

  for (const user of normalizedDb.users) {
    if (user.email !== baseAdmin.email && user.role === USER_ROLES.ADMIN) {
      user.role = USER_ROLES.RECEIVER;
      user.isVerified = true;
      user.isEmailVerified = true;
      user.verificationStatus = VERIFICATION_STATUS.APPROVED;
      user.accountStatus = ACCOUNT_STATUS.ACTIVE;
      user.statusHistory = normalizeStatusHistory(user.statusHistory, ACCOUNT_STATUS.ACTIVE, now);
      user.updatedAt = now;
      changed = true;
    }
  }

  return changed;
}

export function readDb() {
  ensureDbFile();
  const raw = fs.readFileSync(DB_PATH, "utf8");
  const parsed = JSON.parse(raw);
  const normalized = { ...DEFAULT_DB, ...parsed };

  if (!Array.isArray(normalized.users)) normalized.users = [];
  if (!Array.isArray(normalized.messages)) normalized.messages = [];
  if (!Array.isArray(normalized.meals)) normalized.meals = [];
  if (!Array.isArray(normalized.reports)) normalized.reports = [];
  if (!Array.isArray(normalized.verificationRequests)) normalized.verificationRequests = [];

  normalized.users = normalized.users.map(normalizeUser).filter((item) => item.id && item.email);

  const userByEmail = new Map(normalized.users.map((item) => [item.email, item]));
  normalized.messages = normalized.messages.map(normalizeMessage);
  normalized.meals = normalized.meals.map((item) => normalizeMeal(item, userByEmail));
  normalized.verificationRequests = normalized.verificationRequests
    .map(normalizeVerificationRequest)
    .filter((item) => item.id && item.userId);

  if (ensureBaseAdmin(normalized)) {
    writeDb(normalized);
  }

  return normalized;
}

export function writeDb(data) {
  const safeData = { ...DEFAULT_DB, ...data };
  fs.writeFileSync(DB_PATH, JSON.stringify(safeData, null, 2));
}
