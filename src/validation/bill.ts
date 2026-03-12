import Joi from "joi";
import { objectIdField, paymentMethodField } from "./common";

const billItemSchema = Joi.object({
  product: objectIdField.required(),
  qty: Joi.number().integer().min(0).required(),
  freeQty: Joi.number().integer().min(0).max(10000).default(0),
  mrp: Joi.number().min(0).required(),
  rate: Joi.number().min(0).required(),
});

export const addBillValidation = Joi.object({
  billNumber: Joi.string().trim().required(),
  purchaseDate: Joi.string().trim().required(),
  userId: objectIdField.optional(),
  medicalStoreId: objectIdField.optional(),
  company: objectIdField.optional(),
  gstEnabled: Joi.boolean().default(true),
  items: Joi.array().items(billItemSchema).required(),
  paymentMethod: paymentMethodField.required(),
  discount: Joi.number().min(0).max(1000000).default(0),
});

export const updateBillValidation = addBillValidation;

export const toggleBillStatusValidation = Joi.object({
  isActive: Joi.boolean().required(),
});
