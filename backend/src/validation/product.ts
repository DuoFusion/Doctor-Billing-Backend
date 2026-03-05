import Joi from "joi";
import { objectIdField, stockStatusField } from "./common";

// ================= Add Product Validation =================
export const productDataValidation = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  userId: objectIdField.optional(),
  medicalStoreId: objectIdField.optional(),
  company: objectIdField.required(),
  category: Joi.string().trim().min(2).max(100).required(),
  mrp: Joi.number().min(1).max(100000).required(),
  purchasePrice: Joi.number().min(0).max(100000).required(),
  sellingPrice: Joi.number().min(0).max(100000).required(),
  stock: Joi.number().min(0).max(100000).required(),
  minStock: Joi.number().min(0).max(10000).optional(),
  stockStatus: stockStatusField.optional(),
  description: Joi.string().trim().max(500).allow(""),
  expiry: Joi.string().trim().max(10).required(),  
});

// ================= Update Product Validation =================
export const productUpdateDataValidation = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  medicalStoreId: objectIdField,
  company: objectIdField,
  category: Joi.string().trim().min(2).max(100),
  mrp: Joi.number().min(1).max(100000),
  purchasePrice: Joi.number().min(0).max(100000),
  sellingPrice: Joi.number().min(0).max(100000),
  stock: Joi.number().min(0).max(100000),
  minStock: Joi.number().min(0).max(10000),
  stockStatus: stockStatusField,
  description: Joi.string().trim().max(500).allow(""),
  expiry: Joi.string().trim().max(10),
}).min(1);

export const toggleProductStatusValidation = Joi.object({
  isActive: Joi.boolean().required(),
});
