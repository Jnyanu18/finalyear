import mongoose from "mongoose";
import { env } from "./env.js";

mongoose.set("strictQuery", true);

export async function connectDatabase() {
  await mongoose.connect(env.mongodbUri, {
    autoIndex: true
  });
  console.log(`[DB] Connected: ${mongoose.connection.host}`);
}
