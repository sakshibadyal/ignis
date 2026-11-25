import mongoose from "mongoose";

export default async function connectDB() {
  const { MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    console.error("MONGODB_URI is missing in environment variables");
    throw new Error("Missing MONGODB_URI");
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection error:", err?.message || err);
    throw err;
  }
}

