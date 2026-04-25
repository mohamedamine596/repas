import mongoose from "mongoose";

const mealSchema = new mongoose.Schema({}, { strict: false, timestamps: false });

export default mongoose.model("Meal", mealSchema);
