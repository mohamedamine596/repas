export function publicUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    fullName: user.name,
    email: user.email,
    role: user.role,
    isVerified: Boolean(user.isVerified),
    isEmailVerified: Boolean(user.isEmailVerified),
    verificationStatus: user.verificationStatus,
    accountStatus: user.accountStatus,
    suspensionReason: user.suspensionReason || "",
    donorQuiz: {
      attempts: Number(user?.donorQuiz?.attempts || 0),
      maxAttempts: Number(user?.donorQuiz?.maxAttempts || 2),
      cooldownUntil: user?.donorQuiz?.cooldownUntil || null,
      passedAt: user?.donorQuiz?.passedAt || null,
      lastScore: user?.donorQuiz?.lastScore ?? null,
    },
    bio: user.bio || "",
    phone: user.phone || "",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function toDisplayName(user) {
  return user?.name || user?.fullName || user?.email || "Unknown";
}
