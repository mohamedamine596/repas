import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
  {
    id: { type: String, index: true },
    mealId: { type: String, required: true, index: true },
    restaurantId: { type: String, required: true, index: true },
    receiverId: { type: String, required: true },
    score: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
    createdAt: String,
  },
  { strict: false, timestamps: false },
);

export default mongoose.model("Rating", ratingSchema);
