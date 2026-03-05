import express from "express";
import { medicalStoreController } from "../controllers";

const router = express.Router();

router.post("/add", medicalStoreController.add_medical_store);
router.put("/:id", medicalStoreController.update_medical_store_by_id);
router.patch("/:id/status", medicalStoreController.toggle_medical_store_active_status);
router.delete("/delete/:id", medicalStoreController.delete_medical_store_by_id);
router.get("/all", medicalStoreController.get_all_medical_store);
router.get("/:id", medicalStoreController.get_medical_store_by_id);

export const medicalStoreRouter = router;
