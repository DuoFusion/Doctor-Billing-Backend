import dotenv from "dotenv";

// load .env variables, ignore errors
dotenv.config();

export const config = {
  PORT: process.env.PORT || "7000",
  MONGODB_URL: process.env.MONGODB_URL || "",
  SECRET_KEY: process.env.SECRET_KEY || "",
  EMAIL: process.env.EMAIL || "",
  PASS: process.env.PASS || "",
  APP_LOGO_URL: process.env.APP_LOGO_URL || "",
  VERCEL: process.env.VERCEL || "",
};
