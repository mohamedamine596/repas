import mongoose from "mongoose";

export async function connectDb() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn(
      "⚠️  MONGODB_URI not set — skipping MongoDB connection (JSON flat-file mode).",
    );
    return;
  }

  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || "repas",
  });

  console.log("MongoDB connected ✅");
}

export async function disconnectDb() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
}
