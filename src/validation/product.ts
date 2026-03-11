import Joi from "joi";
import { objectIdField } from "./common";

// ================= Add Product Validation =================
export const productDataValidation = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  category: Joi.string().trim().min(2).max(100).required(),
  userId: objectIdField.optional(),
  medicalStoreId: objectIdField.optional(),
});

// ================= Update Product Validation =================
export const productUpdateDataValidation = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  category: Joi.string().trim().min(2).max(100),
  userId: objectIdField,
  medicalStoreId: objectIdField,
}).min(1);

export const toggleProductStatusValidation = Joi.object({
  isActive: Joi.boolean().required(),
});
