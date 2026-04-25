export const USER_ROLES = {
  RESTAURANT: "ROLE_RESTAURANT",
  RECEIVER: "ROLE_RECEIVER",
  ADMIN: "ROLE_ADMIN",
  // Legacy alias kept for db.json backward compatibility
  DONOR: "ROLE_RESTAURANT",
};

export const ACCOUNT_STATUS = {
  EMAIL_PENDING: "email_pending", // registered, email OTP not yet verified
  ACTIVE: "active", // email verified via OTP — full access
  SUSPENDED: "suspended", // manually suspended by admin
  SUSPENDED_AUTO: "suspended_auto", // auto-suspended after 3+ reports
  // Legacy aliases — kept for backward compatibility with old db.json
  SIREN_VERIFIED: "active",
  PENDING_ADMIN_REVIEW: "active",
  APPROVED: "active",
  PHONE_PENDING: "active",
  PENDING_REVIEW: "active",
  EMAIL_VERIFIED: "active",
  QUIZ_PASSED: "active",
  REJECTED: "suspended",
  REVALIDATION_REQUIRED: "active",
};

export const VERIFICATION_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

export const SIREN_VERIFY_METHOD = {
  API: "api",
  DOCUMENT: "document",
};

export const REFRESH_COOKIE_NAME = "ctp_refresh_token";

export const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
export const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || "7d";

export function isUserRole(value) {
  return Object.values(USER_ROLES).includes(value);
}

export function isAccountStatus(value) {
  const canonical = new Set([
    "email_pending",
    "active",
    "suspended",
    "suspended_auto",
  ]);
  return canonical.has(value);
}

export function isVerificationStatus(value) {
  return Object.values(VERIFICATION_STATUS).includes(value);
}
