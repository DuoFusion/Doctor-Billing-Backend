import express from "express";
import { categoryController } from "../controllers";

const router = express.Router();

router.post("/add", categoryController.add_category);
router.put("/:id", categoryController.update_category_by_id);
router.patch("/:id/status", categoryController.toggle_category_active_status);
router.delete("/delete/:id", categoryController.delete_category_by_id);
router.get("/all", categoryController.get_all_category);
router.get("/:id", categoryController.get_category_by_id);

export const CatergoryRouter = router;
