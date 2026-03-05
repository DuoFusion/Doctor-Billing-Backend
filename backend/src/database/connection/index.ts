import mongoose from "mongoose";
import { config } from "../../../config";

mongoose.set("strictQuery", false);

const dbUrl = config.MONGODB_URL

export const ConnectDB = async () => {
  try {
    await mongoose.connect(dbUrl);
    console.log("Database successfully connected");
  } catch (error: any) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};