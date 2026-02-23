import multer from "multer";
import path from "path";
import fs from "fs";

// Upload directory
const uploadBase = process.env.VERCEL ? "/tmp" : process.cwd();
const uploadDir = path.join(uploadBase, "upload");
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (error: any) {
  console.error("Upload directory initialization failed:", error.message);
}

// Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedMimeTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only JPG, PNG, JPEG files are allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export default upload;
