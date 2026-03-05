import express from "express";
import { productController } from "../controllers";

const router = express.Router();

router.post("/add", productController.add_product);
router.put("/:id", productController.update_product_by_id);
router.patch("/:id/status", productController.toggle_product_active_status);
router.delete("/delete/:id", productController.delete_product_by_id);
router.get("/all", productController.get_all_product);
router.get("/get/my-products", productController.get_my_product);
router.get("/:id", productController.get_product_by_id);

export  const  productRouter = router;
