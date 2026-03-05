import express from "express";
import { billController } from "../controllers";

const router = express.Router();

router.post("/add", billController.add_bill);
router.put("/:id", billController.update_bill_by_id);
router.patch("/:id/status", billController.toggle_bill_active_status);
router.delete("/delete/:id", billController.delete_bill_by_id);
router.get("/all", billController.get_all_bill);
router.get("/:id", billController.get_bill_by_id);

export const billRouter = router;
