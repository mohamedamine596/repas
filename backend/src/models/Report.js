import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({}, { strict: false, timestamps: false });

export default mongoose.model("Report", reportSchema);
