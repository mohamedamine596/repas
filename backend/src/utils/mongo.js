import "dotenv/config";
import mongoose from "mongoose";
import { connectDb, disconnectDb } from "../config/mongoose.js";

export async function connectMongo() {
  await connectDb();
  return mongoose.connection;
}

export async function getMongoDb() {
  const connection = await connectMongo();
  return connection.db;
}

export async function pingMongo() {
  const db = await getMongoDb();
  await db.command({ ping: 1 });
}

export async function closeMongo() {
  await disconnectDb();
}
