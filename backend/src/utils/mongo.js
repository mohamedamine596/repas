import "dotenv/config";
import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is missing. Set it in your environment variables.");
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let isConnected = false;

export async function connectMongo() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
  }

  return client;
}

export async function getMongoDb() {
  const mongoClient = await connectMongo();
  const dbName = process.env.MONGODB_DB_NAME || "repas";
  return mongoClient.db(dbName);
}

export async function pingMongo() {
  const mongoClient = await connectMongo();
  await mongoClient.db("admin").command({ ping: 1 });
}

export async function closeMongo() {
  if (!isConnected) {
    return;
  }

  await client.close();
  isConnected = false;
}
