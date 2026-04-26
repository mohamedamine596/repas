import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    id: { type: String, index: true },
    name: String,
    managerName: String,
    email: { type: String, unique: true, index: true, lowercase: true },
    password: String,
    role: {
      type: String,
      enum: ["ROLE_RESTAURANT", "ROLE_RECEIVER", "ROLE_ADMIN"],
    },
    isVerified: Boolean,
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    verificationStatus: String,
    accountStatus: {
      type: String,
      enum: ["email_pending", "active", "suspended", "suspended_auto"],
      default: "email_pending",
    },
    statusHistory: Array,
    bio: String,
    phone: String,
    emailOtp: Object,
    phoneOtp: Object,
    passwordReset: Object,
    failedLoginCount: Number,
    lockoutUntil: String,
    lastFailedLoginAt: String,
    suspensionReason: String,
    refreshTokens: Array,
    createdAt: String,
    updatedAt: String,
    donorQuiz: Object,
  },
  {
    strict: false,
    timestamps: false,
  },
);

export default mongoose.model("User", userSchema);
