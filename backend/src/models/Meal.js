import mongoose from "mongoose";

const mealSchema = new mongoose.Schema(
  {
    id: { type: String, index: true },
    restaurantId: { type: String, index: true },
    donorUserId: String,

    title: { type: String, required: true },
    description: { type: String, required: true },
    foodType: String,
    food_type: String,
    quantity: String,
    deliveryOption: String,
    delivery_option: String,

    // Food safety — mandatory
    photoUrl: String,
    photo_url: String,
    preparedAt: String,
    expiresAt: { type: String, index: true },

    address: String,
    latitude: Number,
    longitude: Number,

    status: {
      type: String,
      enum: [
        "available",
        "reserved",
        "confirmed",
        "collected",
        "delivered",
        "expired",
        "removed",
      ],
      default: "available",
      index: true,
    },

    donorName: String,
    donor_name: String,
    donorEmail: String,
    donor_email: String,
    reservedBy: String,
    reserved_by: String,
    reservedByName: String,
    reserved_by_name: String,
    reservedAt: String,
    confirmedAt: String,
    confirmed_at: String,
    collectedAt: String,

    auditLog: Array,
    isReported: { type: Boolean, default: false },

    createdAt: String,
    updatedAt: String,
    created_date: String,
    updated_date: String,
  },
  {
    strict: false,
    timestamps: false,
  },
);

export default mongoose.model("Meal", mealSchema);
