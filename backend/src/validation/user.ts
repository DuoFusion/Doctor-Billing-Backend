import Joi from "joi";
import { emailField, objectIdField, passwordField, phoneField } from "./common";

export const addUserValidation = Joi.object({
  email: emailField.required(),
  name: Joi.string().trim().min(3).max(200).required(),
  password: passwordField.required(),
  phone: phoneField.allow("").optional(),
  medicalStoreId: objectIdField.required().messages({
    "any.required": "Please select medical store",
  }),
});

export const userValidaiton = Joi.object({
  email: emailField.required(),
  name: Joi.string().trim().min(3).max(200).required(),
  phone: phoneField.allow("").optional(),
  medicalStoreId: objectIdField.required().messages({
    "any.required": "Please select medical store",
  }),
});

export const toggleUserStatusValidation = Joi.object({
  isActive: Joi.boolean().required(),
});
