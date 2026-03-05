import Joi from "joi";
import { objectIdField, paymentMethodField } from "./common";

const billItemSchema = Joi.object({
  product: objectIdField.required(),
  qty: Joi.number().integer().min(1).max(10000).required(),
  freeQty: Joi.number().integer().min(0).max(10000).default(0),
  discount: Joi.number().min(0).max(1000000).default(0),
});

export const addBillValidation = Joi.object({
  userId: objectIdField.optional(),
  medicalStoreId: objectIdField.optional(),
  company: objectIdField.optional(),
  items: Joi.array().items(billItemSchema).min(1).required(),
  paymentMethod: paymentMethodField.required(),
  discount: Joi.number().min(0).max(1000000).default(0),
});

export const updateBillValidation = addBillValidation;

export const toggleBillStatusValidation = Joi.object({
  isActive: Joi.boolean().required(),
});
