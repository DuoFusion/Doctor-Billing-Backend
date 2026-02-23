import mongoose from "mongoose";

let cachedConnectionPromise: Promise<typeof mongoose> | null = null;

export const ConnectDB = async () => {
  const MongoDB_URL = process.env.MONGODB_URL as string | undefined;

  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!MongoDB_URL) {
    throw new Error("MONGODB_URL is not defined");
  }

  if (!cachedConnectionPromise) {
    cachedConnectionPromise = mongoose.connect(MongoDB_URL);
  }

  try {
    await cachedConnectionPromise;
    console.log("DB connected successfully");
  } catch (error: any) {
    cachedConnectionPromise = null;
    console.error("DB connection failed:", error.message);
    throw error;
  }
};
