import Joi from "joi";
import { objectIdField } from "./common";

export const addCategoryValidation = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  userId: objectIdField.optional(),
  medicalStoreId: objectIdField.optional(),
});

export const updateCategoryValidation = Joi.object({
  id: objectIdField.required(),
  medicalStoreId: objectIdField.optional(),
  name: Joi.string().trim().min(2).max(100).required(),
});

export const deleteCategoryValidation = Joi.object({
  id: objectIdField.required(),
});

export const toggleCategoryStatusValidation = Joi.object({
  isActive: Joi.boolean().required(),
});
