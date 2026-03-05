import express, { Express, Request, Response } from "express";
import bodyParser from "body-parser";
import { ConnectDB } from "./database";
import { router } from "./Routes";
import uploadRoutes from "./Routes/upload";
import cors from "cors";
import path from "path";
import { logger, reqInfo } from "./helper";

const app: Express = express();

void ConnectDB().catch((error: any) => {
  console.error("Initial DB connection failed:", error.message);
});

logger.info("Doctor-Billing API Server Initialized");

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

app.use((req: Request, res: Response, next) => {
  void reqInfo(req);
  next();
});

app.use("/images", express.static(path.join(__dirname, "..", "..", "images")));
app.use("/pdf", express.static(path.join(__dirname, "..", "..", "pdf")));
// upload route handles POST/PUT/DELETE operations
app.use("/upload", uploadRoutes);
app.use("/upload", express.static(path.join(__dirname, "..", "..", "upload")));

const health = (_req: Request, res: Response) => {
  res.status(200).json({ status: true, message: "Backend is running" });
};

app.get("/", health);
app.get("/health", health);
app.get("/isServerUp", (_req: Request, res: Response) => {
  res.send("Server is running");
});

app.use("/", router);

app.use(
  (err: any, _req: Request, res: Response, next: any) => {
    // ensure this is treated as an error handler by including 4 params
    console.error("Unhandled error:", err);
    if (res && typeof res.status === "function") {
      res.status(err.status || 500).json({
        status: false,
        message: err.message || "Internal server error",
      });
    } else {
      console.error("Response object not available in error handler", err);
      next(err);
    }
  }
);

export default app;
