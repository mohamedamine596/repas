import mongoose from "mongoose";

const verificationSchema = new mongoose.Schema({}, { strict: false, timestamps: false });

export default mongoose.model("VerificationRequest", verificationSchema);
