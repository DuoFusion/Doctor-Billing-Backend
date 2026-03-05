import express from "express";
import { userController } from "../controllers";

const router = express.Router();

router.post("/add", userController.add_user);
router.put("/:id", userController.update_user_by_id);
router.patch("/:id/status", userController.toggle_user_active_status);
router.delete("/delete/:id", userController.delete_user_by_id);
router.get("/all", userController.get_all_user);
router.get("/:id", userController.get_user_by_id);

export const userRouter = router;
