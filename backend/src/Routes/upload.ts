import { Router } from "express";
import upload from "../helper/uploadFiles";
import { uploadController } from "../controllers";

const router = Router();

router.post("/", upload.single("file"), uploadController.addFile);
router.put("/", upload.single("file"), uploadController.updateFile);
router.delete("/", uploadController.deleteFile);

export default router;
