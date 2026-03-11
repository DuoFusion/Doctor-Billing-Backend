import Joi from "joi";
import { emailField, gstField, objectIdField, phoneField, pincodeField } from "./common";

export const companyDataValidation = Joi.object({
  name: Joi.string().trim().min(3).max(200).required(),
  userId: objectIdField.optional(),
  medicalStoreId: objectIdField.optional(),
  gstNumber: gstField.required(),
  phone: phoneField.required(),
  email: Joi.alternatives().try(emailField, Joi.string().trim().allow("")).optional(),
  address: Joi.string().trim().min(5).max(500).optional(),
  city: Joi.string().trim().min(2).max(100).optional(),
  state: Joi.string().trim().min(2).max(100).optional(),
  pincode: Joi.alternatives().try(
    pincodeField,
    Joi.number().integer().min(100000).max(999999)
  ).optional(),
});

export const companyUpdateDataValidation = Joi.object({
  name: Joi.string().trim().min(3).max(200).required(),
  userId: objectIdField.optional(),
  medicalStoreId: objectIdField.optional(),
  gstNumber: gstField.required(),
  phone: phoneField.required(),
  email: Joi.alternatives().try(emailField, Joi.string().trim().allow("")).optional(),
  address: Joi.string().trim().min(5).max(500).optional(),
  city: Joi.string().trim().min(2).max(100).optional(),
  state: Joi.string().trim().min(2).max(100).optional(),
  pincode: Joi.alternatives().try(
    pincodeField,
    Joi.number().integer().min(100000).max(999999)
  ).optional(),
});

export const toggleCompanyStatusValidation = Joi.object({
  isActive: Joi.boolean().required(),
});

