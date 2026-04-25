import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    id: { type: String, index: true },
    action: { type: String, required: true, index: true },
    actorId: { type: String, index: true },
    actorRole: String,
    targetId: String,
    targetType: String,
    ip: String,
    meta: Object,
    createdAt: String,
  },
  { strict: false, timestamps: false },
);

export default mongoose.model("AuditLog", auditLogSchema);
