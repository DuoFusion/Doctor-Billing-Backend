import express from "express";
import { companyController } from "../controllers";

const router = express.Router();

router.post("/add", companyController.add_company);
router.put("/:id", companyController.update_company_by_id);
router.patch("/:id/status", companyController.toggle_company_active_status);
router.delete("/delete/:id", companyController.delete_company_by_id);
router.get("/all", companyController.get_all_company);
router.get("/:id", companyController.get_company_by_id);

export  const companyRouter =  router;
