import Joi from "joi";
import {
  emailField,
  nameField,
  otpField,
  passwordField,
  phoneField,
  pincodeField,
} from "./common";

export const signInValidation = Joi.object({
  email: emailField.required(),
  password: passwordField.required(),
});

export const verifyOtpValidation = Joi.object({
  email: emailField.required(),
  otp: otpField.required(),
  purpose: Joi.string().valid("signin", "reset").optional(),
});

export const updateProfileValidation = Joi.object({
  name: nameField.optional(),
  medicalName: Joi.string().trim().min(2).max(200).allow("").optional(),
  email: emailField.optional(),
  phone: phoneField.allow("").optional(),
  address: Joi.string().trim().max(500).allow("").optional(),
  city: Joi.string().trim().min(2).max(100).allow("").optional(),
  state: Joi.string().trim().min(2).max(100).allow("").optional(),
  pincode: pincodeField.allow("").optional(),
  pan: Joi.string().trim().allow("").max(20).optional(),
  gstin: Joi.string().trim().allow("").max(20).optional(),
  removeSignature: Joi.alternatives()
    .try(Joi.boolean(), Joi.string().trim().valid("true", "false", "1", "0"))
    .optional(),
}).min(1);

export const changePasswordValidation = Joi.object({
  oldPassword: passwordField.required(),
  newPassword: passwordField.required(),
  confirmPassword: passwordField.required(),
});

export const forgotPasswordSendOtpValidation = Joi.object({
  email: emailField.required(),
});

export const forgotPasswordResetValidation = Joi.object({
  email: emailField.required(),
  otp: otpField.required(),
  newPassword: passwordField.required(),
  confirmPassword: passwordField.required(),
});
