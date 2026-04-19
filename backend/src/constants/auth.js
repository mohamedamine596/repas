export const USER_ROLES = {
  DONOR: "DONOR",
  RECEIVER: "RECEIVER",
  ADMIN: "ADMIN",
};

export const ACCOUNT_STATUS = {
  EMAIL_PENDING: "email_pending",
  EMAIL_VERIFIED: "email_verified",
  QUIZ_PASSED: "quiz_passed",
  PENDING_ADMIN_REVIEW: "pending_admin_review",
  ACTIVE: "active",
  SUSPENDED: "suspended",
};

export const VERIFICATION_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

export const REFRESH_COOKIE_NAME = "ctp_refresh_token";

export const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
export const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || "7d";

export function isUserRole(value) {
  return Object.values(USER_ROLES).includes(value);
}

export function isAccountStatus(value) {
  return Object.values(ACCOUNT_STATUS).includes(value);
}

export function isVerificationStatus(value) {
  return Object.values(VERIFICATION_STATUS).includes(value);
}
