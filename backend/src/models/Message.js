import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({}, { strict: false, timestamps: false });

export default mongoose.model("Message", messageSchema);
