export function publicUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    fullName: user.name,
    managerName: user.managerName || "",
    email: user.email,
    role: user.role,
    isVerified: Boolean(user.isVerified),
    isEmailVerified: Boolean(user.isEmailVerified),
    isPhoneVerified: Boolean(user.isPhoneVerified),
    verificationStatus: user.verificationStatus,
    accountStatus: user.accountStatus,
    suspensionReason: user.suspensionReason || "",
    bio: user.bio || "",
    phone: user.phone || "",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function toDisplayName(user) {
  return user?.name || user?.fullName || user?.email || "Unknown";
}
