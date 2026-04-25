import mongoose from "mongoose";

/**
 * Report (Signalement) model — used by receivers to report issues with restaurants
 * Key features:
 * - After 3 open reports, restaurant is auto-suspended (status -> "suspended_auto")
 * - Admins can review, resolve, or dismiss reports
 * - All admin actions are logged
 */
const reportSchema = new mongoose.Schema(
  {
    id: { type: String, index: true },
    restaurantId: { type: String, required: true, index: true },
    reportedBy: { type: String, required: true, index: true }, // receiver user id
    mealId: { type: String, index: true }, // optional - the meal concerned
    reason: {
      type: String,
      enum: [
        "aliment_avarie",
        "peremption_depassee",
        "hygiene",
        "informations_incorrectes",
        "autre",
      ],
      required: true,
    },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["ouvert", "en_cours", "resolu", "classe_sans_suite"],
      default: "ouvert",
    },
    adminNotes: { type: String, default: "" },
    resolvedBy: { type: String }, // admin user id
    resolvedAt: { type: String },
    dismissedReason: { type: String },
    createdAt: { type: String },
    updatedAt: { type: String },
  },
  {
    timestamps: false,
  },
);

export default mongoose.model("Report", reportSchema);
