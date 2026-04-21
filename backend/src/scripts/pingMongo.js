import "dotenv/config";
import { closeMongo, pingMongo } from "../utils/mongo.js";

async function run() {
  try {
    await pingMongo();
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    await closeMongo();
  }
}

run().catch((error) => {
  console.error("MongoDB connection failed:", error?.message || error);
  process.exit(1);
});
