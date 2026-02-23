import express from "express";
import bodyParser from "body-parser";
import { ConnectDB } from "./database/connection";
import { router } from "./Routes";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();
const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "https://hk-bhupendra-doctors-billing.vercel.app",
];
const envAllowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...defaultAllowedOrigins, ...envAllowedOrigins]);
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
};

void ConnectDB().catch((error: any) => {
  console.error("Initial DB connection failed:", error.message);
});

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.status(200).json({ status: true, message: "Backend is running" });
});

app.use("/", router);

export default app;
