import mongoose from "mongoose";
import { responseMessage, status_code, TAX_TYPE } from "../../common";
import { storeModel } from "../../database";
import { reqInfo, sendError, sendSuccess } from "../../helper";
import { joiValidationOptions, medicalStoreValidation } from "../../validation";
import {
  getData,
  getFirstMatch,
  createData,
  countData,
  updateData,
} from "../../helper/database_service";

const ObjectId = mongoose.Types.ObjectId;

const extractFileNameFromValue = (value: any) => {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  const normalized = raw.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
};

const buildSignaturePayload = (fileName: string) => ({
  path: fileName,
  filename: fileName,
  originalName: fileName,
  size: 0,
  mimetype: "",
});

const emptySignaturePayload = () => ({ path: "",filename: "", originalName: "",size: 0,mimetype: "",});

// ================= Add New Medical Store =================
export const add_medical_store = async (req, res) => {
  reqInfo(req);
  const { error, value } = medicalStoreValidation.addMedicalStoreValidation.validate( req.body,joiValidationOptions);
  
  if (error)  return sendError(res, status_code.BAD_REQUEST, error.details[0].message);

  try {
    const escapedName = value.name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existing = await getFirstMatch(storeModel, {
      name: { $regex: new RegExp(`^${escapedName}$`, "i") },
      isDeleted: false,
    });

    if (existing) return sendError( res, status_code.BAD_REQUEST, responseMessage.dataAlreadyExist("medical store")  );

    const signatureFileName = extractFileNameFromValue(value.signatureImg);
    const store = await createData(storeModel, {
      name: value.name.trim(),
      address: value.address || "",
      city: value.city || "",
      state: value.state || "",
      pincode: value.pincode || "",
      panNumber: value.panNumber || "",
      gstNumber: value.gstNumber || "",
      taxType: value.taxType || TAX_TYPE.SGST_CGST,
      taxPercent: Number(value.taxPercent ?? 0),
      signatureImg: signatureFileName ? buildSignaturePayload(signatureFileName) : emptySignaturePayload(),
      isActive: true,
      isDeleted: false,
    });

    return sendSuccess(res,{ store }, responseMessage.addDataSuccess("medical store") );
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, "Failed to add medical store", err);
  }
};

// ================= Get All Medical Stores =================
export const get_all_medical_store = async (req, res) => {
  reqInfo(req);
  try {
    const page = parseInt((req.query.page as string) || "") || 1;
    const limit = parseInt((req.query.limit as string) || "") || 10;
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const search = (req.query.search || "").toString().trim();
    const query: any = { isDeleted: false };
   
    if (search) {
      query.name = { $regex: search, $options: "si" };
    }

    const total = await countData(storeModel, query);
    const options: any = { sort: { createdAt: -1 } };
    if (hasPagination) {
      options.skip = (page - 1) * limit;
      options.limit = limit;
    }
    const stores = await getData(storeModel, query, {}, options);

    return sendSuccess( res,
      {
        stores,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      responseMessage.getDataSuccess("medical stores")
    );
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, "Failed to fetch medical stores", err);
  }
};

// ================= Get Medical Store By Id =================
export const get_medical_store_by_id = async (req, res) => {
  reqInfo(req);
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) return sendError(  res,  status_code.BAD_REQUEST,  responseMessage.invalidId("medical store id") );

    const store = await getFirstMatch(storeModel, { _id: id, isDeleted: false });
    if (!store) return sendError(  res,  status_code.NOT_FOUND,  responseMessage.getDataNotFound("medical store") );

    return sendSuccess( res, { store }, responseMessage.getDataSuccess("medical store") );
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, "Failed to fetch medical store", err);
  }
};

// ================= Update Medical Store =================
export const update_medical_store_by_id = async (req, res) => {
  reqInfo(req);
  const { error, value } = medicalStoreValidation.medicalStoreUpdateDataValidation.validate( req.body, joiValidationOptions );

  if (error) return sendError(res, status_code.BAD_REQUEST, error.details[0].message);
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id))  return sendError(  res,  status_code.BAD_REQUEST,  responseMessage.invalidId("medical store id")  );

    const updatePayload: any = { ...value };
    if (updatePayload.taxPercent !== undefined) {
      updatePayload.taxPercent = Number(updatePayload.taxPercent);
    }
    
    const removeSignature = value.removeSignature === true || value.removeSignature === "true" || value.removeSignature === "1";
    const signatureFileName = extractFileNameFromValue(value.signatureImg);

    if (removeSignature) {
      updatePayload.signatureImg = emptySignaturePayload();
    } else if (signatureFileName) {
      updatePayload.signatureImg = buildSignaturePayload(signatureFileName);
    }

    delete updatePayload.removeSignature;
    delete updatePayload.signatureImg;

    const setPayload: any = { ...updatePayload };
    if (removeSignature) {
      setPayload.signatureImg = emptySignaturePayload();
    } else if (signatureFileName) {
      setPayload.signatureImg = buildSignaturePayload(signatureFileName);
    }

    const store = await updateData(storeModel, { _id: id, isDeleted: false }, setPayload, { new: true }  );
    if (!store) return sendError( res, status_code.NOT_FOUND, responseMessage.getDataNotFound("medical store"));

    return sendSuccess( res, { store }, responseMessage.updateDataSuccess("medical store" ));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, "Failed to update medical store", err);
  }
};

// ================= Toggle Medical Store Status =================
export const toggle_medical_store_active_status = async (req, res) => {
  reqInfo(req);
  const { error, value } = medicalStoreValidation.toggleMedicalStoreStatusValidation.validate(req.body,joiValidationOptions);
    if (error) return sendError(res, status_code.BAD_REQUEST, error.details[0].message);
  
    try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("medical store id"));
    const store = await updateData(storeModel, { _id: id, isDeleted: false }, { isActive: value.isActive }, { new: true } );

    if (!store) return sendError(res,status_code.NOT_FOUND,responseMessage.getDataNotFound("medical store") );
    return sendSuccess(res, { store }, "Medical store status updated");
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, "Failed to update status", err);
  }
};

// ================= Delete Medical Store =================
export const delete_medical_store_by_id = async (req, res) => {
  reqInfo(req);
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("medical store id"));
    const store = await updateData(storeModel, { _id: id, isDeleted: false },{ isDeleted: true },{ new: true });

    if (!store) return sendError(  res,  status_code.NOT_FOUND,  responseMessage.getDataNotFound("medical store")  );

    return sendSuccess( res, { store }, responseMessage.deleteDataSuccess("medical store"));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, "Failed to delete medical store", err);
  }
};
