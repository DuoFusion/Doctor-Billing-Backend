import Joi from "joi";
import { BILL_STATUS, PAYMENT_METHOD, ROLES, STOCK_STATUS, TAX_TYPE } from "../common";

export const objectIdPattern = /^[a-fA-F0-9]{24}$/;
export const phonePattern = /^[0-9]{10}$/;
export const pincodePattern = /^[0-9]{6}$/;
export const otpPattern = /^[0-9]{6}$/;
export const gstPattern = /^[0-9A-Z]{15}$/;

export const joiValidationOptions: Joi.ValidationOptions = {
  abortEarly: false,
  stripUnknown: true,
};

export const objectIdField = Joi.string().trim().pattern(objectIdPattern).messages({
  "string.pattern.base": "Invalid id format",
});

export const nameField = Joi.string().trim().min(5).max(50);
export const emailField = Joi.string().trim().email({ tlds: { allow: false } });
export const passwordField = Joi.string().trim().min(5).max(128);
export const roleField = Joi.string().trim().valid(...Object.values(ROLES));
export const phoneField = Joi.string().trim().pattern(phonePattern).messages({
  "string.pattern.base": "Phone number must be exactly 10 digits",
});
export const pincodeField = Joi.string().trim().pattern(pincodePattern).messages({
  "string.pattern.base": "Pincode must be exactly 6 digits",
});
export const otpField = Joi.string().trim().pattern(otpPattern).messages({
  "string.pattern.base": "OTP must be exactly 6 digits",
});
export const gstField = Joi.string().trim().uppercase().pattern(gstPattern).messages({
  "string.pattern.base": "GST number must be 15 uppercase letters/numbers",
});

export const paymentMethodField = Joi.string().valid(...Object.values(PAYMENT_METHOD));
export const billStatusField = Joi.string().valid(...Object.values(BILL_STATUS));
export const stockStatusField = Joi.string().valid(...Object.values(STOCK_STATUS));
export const taxTypeField = Joi.string().valid(...Object.values(TAX_TYPE));
