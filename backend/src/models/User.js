import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    id: { type: String, index: true },
    name: String,
    email: { type: String, unique: true, index: true },
    password: String,
    role: String,
    isVerified: Boolean,
    isEmailVerified: Boolean,
    verificationStatus: String,
    accountStatus: String,
    statusHistory: Array,
    bio: String,
    phone: String,
    emailOtp: Object,
    donorQuiz: Object,
    passwordReset: Object,
    failedLoginCount: Number,
    lockoutUntil: String,
    lastFailedLoginAt: String,
    suspensionReason: String,
    refreshTokens: Array,
    createdAt: String,
    updatedAt: String,
  },
  {
    timestamps: false,
  }
);

export default mongoose.model("User", userSchema);
