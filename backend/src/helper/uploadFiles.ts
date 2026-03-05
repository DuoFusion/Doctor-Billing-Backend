import multer from "multer";
import path from "path";
import fs from "fs";
import { config } from "../../config";

// ================= Upload Directory =================
const uploadBase = config.VERCEL ? "/tmp" : process.cwd();
const uploadDir = path.join(uploadBase, "upload");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ================= Multer Storage =================
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

// ================= File Filter =================
const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedMimeTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only JPG, PNG, JPEG files are allowed"));
};

// ================= Multer Instance =================
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ================= Delete File Helper =================
export const deleteFileIfExists = (input?: any) => {
  if (!input) return;

  try {
    let filePath = "";

    if (typeof input === "object") {
      filePath = String(input?.path || input?.filename || "");
    } else {
      filePath = String(input || "");
    }

    if (!filePath) return;

    if (filePath.startsWith("http") || filePath.includes("/") || filePath.includes("\\")) {
      filePath = path.basename(filePath);
    }

    if (!path.isAbsolute(filePath)) {
      filePath = path.join(uploadDir, filePath);
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // ignore errors
  }
};

export default upload;