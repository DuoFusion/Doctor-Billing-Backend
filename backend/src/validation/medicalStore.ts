import Joi from "joi";
import { gstField, pincodeField, taxTypeField } from "./common";

export const addMedicalStoreValidation = Joi.object({
  name: Joi.string().trim().min(2).max(200).required(),
  address: Joi.string().trim().allow("").max(500).optional(),
  city: Joi.string().trim().allow("").max(100).optional(),
  state: Joi.string().trim().allow("").max(100).optional(),
  pincode: pincodeField.allow("").optional(),
  panNumber: Joi.string().trim().allow("").max(20).optional(),
  gstNumber: gstField.allow("").optional(),
  taxType: taxTypeField.optional(),
  taxPercent: Joi.number().min(0).max(100).optional(),
  signatureImg: Joi.string().trim().allow("").optional(),
});

export const medicalStoreUpdateDataValidation = Joi.object({
  name: Joi.string().trim().min(2).max(200).optional(),
  address: Joi.string().trim().allow("").max(500).optional(),
  city: Joi.string().trim().allow("").max(100).optional(),
  state: Joi.string().trim().allow("").max(100).optional(),
  pincode: pincodeField.allow("").optional(),
  panNumber: Joi.string().trim().allow("").max(20).optional(),
  gstNumber: gstField.allow("").optional(),
  taxType: taxTypeField.optional(),
  taxPercent: Joi.number().min(0).max(100).optional(),
  signatureImg: Joi.string().trim().allow("").optional(),
  removeSignature: Joi.alternatives()
    .try(Joi.boolean(), Joi.string().trim().valid("true", "false", "1", "0"))
    .optional(),
}).min(1);

export const toggleMedicalStoreStatusValidation = Joi.object({
  isActive: Joi.boolean().required(),
});
