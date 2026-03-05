import Joi from "joi";
import { emailField, gstField, objectIdField, phoneField, pincodeField } from "./common";

export const companyDataValidation = Joi.object({
  name: Joi.string().trim().min(3).max(200).required(),
  userId: objectIdField.optional(),
  medicalStoreId: objectIdField.optional(),
  gstNumber: gstField.required(),
  phone: phoneField.required(),
  email: emailField.required(),
  address: Joi.string().trim().min(5).max(500).required(),
  city: Joi.string().trim().min(2).max(100).required(),
  state: Joi.string().trim().min(2).max(100).required(),
  pincode: Joi.alternatives().try(
    pincodeField,
    Joi.number().integer().min(100000).max(999999)
  ).required(),
});

export const companyUpdateDataValidation = Joi.object({
  name: Joi.string().trim().min(3).max(200).required(),
  medicalStoreId: objectIdField.optional(),
  gstNumber: gstField.required(),
  phone: phoneField.required(),
  email: emailField.required(),
  address: Joi.string().trim().min(5).max(500).required(),
  city: Joi.string().trim().min(2).max(100).required(),
  state: Joi.string().trim().min(2).max(100).required(),
  pincode: Joi.alternatives().try(
    pincodeField,
    Joi.number().integer().min(100000).max(999999)
  ).required(),
});

export const toggleCompanyStatusValidation = Joi.object({
  isActive: Joi.boolean().required(),
});

