import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
  {
    id: { type: String, index: true },
    userId: { type: String, required: true, index: true },
    businessName: { type: String, required: true },
    siren: { type: String, required: true, index: true },

    sirenVerified: { type: Boolean, default: false },
    sirenVerifyMethod: {
      type: String,
      enum: ["api", "document"],
      default: "document",
    },
    sirenVerifiedAt: { type: String, default: null },
    sirenData: Object,

    address: {
      street: String,
      city: String,
      postalCode: String,
      country: { type: String, default: "FR" },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    documents: Array,

    reviewedBy: { type: String, default: null },
    reviewedAt: { type: String, default: null },
    rejectionReason: { type: String, default: "" },

    averageRating: { type: Number, default: null },
    ratingCount: { type: Number, default: 0 },
    isFlaggedForReview: { type: Boolean, default: false },

    createdAt: String,
    updatedAt: String,
  },
  { strict: false, timestamps: false },
);

export default mongoose.model("Restaurant", restaurantSchema);
