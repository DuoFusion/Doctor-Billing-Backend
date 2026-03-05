import { userModel, companyModel } from "../../database";
import { companyValidation, joiValidationOptions } from "../../validation";
import { responseMessage, ROLES, status_code } from "../../common";
import { parsePagination, sendSuccess, sendError, deleteFileIfExists } from "../../helper";
import mongoose from "mongoose";
import { getData, getFirstMatch, countData, createData, updateData, findOneAndPopulate } from "../../helper/database_service";

const resolveUserMedicalStoreId = (req: any): string => {
  const storeId = String(req.user?.medicalStoreId || "").trim();
  return mongoose.Types.ObjectId.isValid(storeId) ? storeId : "";
};

const applyMedicalStoreScope = (req: any, query: any) => {
  const requestedStoreId = String(req.query.medicalStoreId || "").trim();

  if (req.user.role === "admin") {
    if (requestedStoreId && mongoose.Types.ObjectId.isValid(requestedStoreId)) {
      query.medicalStoreId = new mongoose.Types.ObjectId(requestedStoreId);
    }
    return;
  }

  const userMedicalStoreId = resolveUserMedicalStoreId(req);

  if (requestedStoreId && mongoose.Types.ObjectId.isValid(requestedStoreId)) {
    if (userMedicalStoreId && userMedicalStoreId === requestedStoreId) {
      query.medicalStoreId = new mongoose.Types.ObjectId(requestedStoreId);
    } else {
      query.medicalStoreId = null;
    }
    return;
  }

  if (userMedicalStoreId) {
    query.medicalStoreId = new mongoose.Types.ObjectId(userMedicalStoreId);
    return;
  }

  // only set userId if it's a valid ObjectId, otherwise leave it out
  if (mongoose.Types.ObjectId.isValid(req.user._id)) {
    query.userId = new mongoose.Types.ObjectId(req.user._id);
  }
};

// ================= Add New Company =================
export const add_company = async (req, res) => {
  const { error, value } = companyValidation.companyDataValidation.validate(req.body, joiValidationOptions);
  if (error) return sendError(res, status_code.BAD_REQUEST, error.details[0].message);

  try {
    const { userId, ...companyPayload } = value;

    let logoImage = null;
    if (req.body.logoImage) {
      const parts = req.body.logoImage.toString().split("/");
      logoImage = parts[parts.length - 1] || null;
    }

    let ownerId = req.user._id;
    let medicalStoreId: any = req.user?.medicalStoreId;

    if (req.user.role === "admin") {
      if (!userId) return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("please select user"));

      const ownerUser: any = await userModel.findOne(
        { _id: userId, isDeleted: false, role: { $ne: ROLES.admin } },
        { _id: 1, medicalStoreId: 1, medicalStoreIds: 1 }
      );
      if (!ownerUser) return sendError(res, status_code.BAD_REQUEST, responseMessage.getDataNotFound("selected user"));

      ownerId = ownerUser._id;
      medicalStoreId =
        ownerUser.medicalStoreId ||
        (Array.isArray(ownerUser.medicalStoreIds)
          ? ownerUser.medicalStoreIds[0]?._id || ownerUser.medicalStoreIds[0]
          : null);

      const selectedUserStoreId = String(medicalStoreId?._id || medicalStoreId || "").trim();
      if (!selectedUserStoreId || !mongoose.Types.ObjectId.isValid(selectedUserStoreId)) {
        return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("selected user has no medical store assigned"));
      }
    }

    const selectedMedicalStoreId = String(medicalStoreId?._id || medicalStoreId || "").trim();
    if (!selectedMedicalStoreId || !mongoose.Types.ObjectId.isValid(selectedMedicalStoreId)) {
      return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("medical store is not assigned to current user"));
    }

    const result = await createData(companyModel, {
      ...companyPayload,
      userId: ownerId,
      medicalStoreId: selectedMedicalStoreId,
      logoImage,
      isActive: true,
    });

    return sendSuccess(res, { result }, responseMessage.addDataSuccess("company"));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("failed to add company"), err?.message);
  }
};

// ================= Get All Companies =================
export const get_all_company = async (req, res) => {
  console.log("get_all_company called with query", req.query, "user", req.user);
  if (!req.user) {
    return sendError(res, status_code.UNAUTHORIZED, responseMessage.notAuthenticated);
  }
  try {
    const { page, limit } = parsePagination(req.query);
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const search = (req.query.search || "").toString().trim();
    const addedBy = (req.query.addedBy || "").toString().trim();
    const sortBy = (req.query.sortBy || "createdAt").toString();
    const order = (req.query.order || "desc").toString().toLowerCase() === "asc" ? 1 : -1;

    const query: any = { isDeleted: false };
    try {
      applyMedicalStoreScope(req, query);
    } catch (scopeErr) {
      console.error("applyMedicalStoreScope error", scopeErr);
      throw scopeErr; // let outer catch handle
    }

    if (req.user.role === "admin" && addedBy && mongoose.Types.ObjectId.isValid(addedBy)) {
      query.userId = new mongoose.Types.ObjectId(addedBy);
    }

    // Search filter
    if (search) {
      const searchOr: any[] = [{ name: { $regex: search, $options: "si" } }];

      if (req.user.role === "admin") {
        const users: any = await getData(userModel, {
            isDeleted: false,
            $or: [
              { name: { $regex: search, $options: "si" } },
              { email: { $regex: search, $options: "si" } },
            ],
          }, { _id: 1 });
        if (users.length > 0) searchOr.push({ userId: { $in: users.map((u: any) => u._id) } });
      }

      query.$or = searchOr;
    }

    const sortObj: any = sortBy === "addedBy" ? { userId: order } : { createdAt: order };

    const options: any = { sort: sortObj };
    if (hasPagination) {
      options.skip = (page - 1) * limit;
      options.limit = limit;
    }
    const companiesRaw: any = await getData(companyModel, query, {}, options);
    const companies: any = await companyModel.populate(companiesRaw, [{ path: "userId", select: "name email" }]);
    const total = await countData(companyModel, query);

    const data = (companies as any[]).map((c: any) => ({
      // helpers return lean objects (plain JSON), so toObject may not exist
      ...(typeof c.toObject === "function" ? c.toObject() : c),
    }));

    return sendSuccess(res, {
      data,
      pagination: {page,limit,total,totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    }, responseMessage.getDataSuccess("companies"));
  } catch (err) {
    console.error("get_all_company error:", err);
    // additional safeguard: if the error is a CastError for ObjectId, return bad request message
    if (err && err.name === 'CastError') {
      return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("invalid query parameter"), err.message);
    }
    return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("failed to fetch companies"), err?.message);
  }
};

// ================= Get Company By ID =================
export const get_company_by_id = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("company id"));
    }

    const query: any = { _id: new mongoose.Types.ObjectId(id), isDeleted: false };
    applyMedicalStoreScope(req, query);

    const company: any = await findOneAndPopulate(companyModel, query, {}, {}, { path: "userId", select: "name email" });

    if (!company) return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("company"));

    const result = {
      ...((typeof company.toObject === "function") ? company.toObject() : company),
    };

    return sendSuccess(res, { company: result }, responseMessage.getDataSuccess("company"));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("failed to fetch company"), err?.message);
  }
};

// ================= Update Company =================
export const update_company_by_id = async (req, res) => {
  const { error, value } = companyValidation.companyUpdateDataValidation.validate(req.body, joiValidationOptions);
  if (error) return sendError(res, status_code.BAD_REQUEST, error.details[0].message);

  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("company id"));
    }
    const query: any = { _id: new mongoose.Types.ObjectId(id), isDeleted: false };
    applyMedicalStoreScope(req, query);

    const existing: any = await getFirstMatch(companyModel, query);
    if (!existing) return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("company"));

    if (req.user.role !== "admin" && value.medicalStoreId) {
      const nextStoreId = String(value.medicalStoreId);
      const currentUserMedicalStoreId = resolveUserMedicalStoreId(req);
      if (!currentUserMedicalStoreId || currentUserMedicalStoreId !== nextStoreId) {
        return sendError(res, status_code.FORBIDDEN, responseMessage.customMessage("not authorized for selected medical store"));
      }
    }

    const updatePayload: any = { ...value };
    if (req.user.role !== "admin") delete updatePayload.medicalStoreId;

    if (req.body.logoImage) {
      const newLogo = req.body.logoImage.toString().split("/").pop();
      if (newLogo && newLogo !== existing.logoImage) {
        deleteFileIfExists(existing.logoImage);
        updatePayload.logoImage = newLogo;
      }
    }

    const result = await updateData(companyModel, query, updatePayload, { new: true });
    if (!result) return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("company"));

    return sendSuccess(res, { result }, responseMessage.updateDataSuccess("company"));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.updateDataError("company"), err?.message);
  }
};

// ================= Delete Company =================
export const delete_company_by_id = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("company id"));
    }
    const query: any = { _id: new mongoose.Types.ObjectId(id) };
    applyMedicalStoreScope(req, query);

    const result = await updateData(companyModel, query, { isDeleted: true }, { new: true });
    if (!result) return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("company"));

    return sendSuccess(res, { result }, responseMessage.deleteDataSuccess("company"));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("failed to delete company"), err?.message);
  }
};

// ================= Toggle Company Active Status =================
export const toggle_company_active_status = async (req, res) => {
  const { error, value } = companyValidation.toggleCompanyStatusValidation.validate(req.body, joiValidationOptions);
  if (error) return sendError(res, status_code.BAD_REQUEST, error.details[0].message);

  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("company id"));
    }
    const query: any = { _id: new mongoose.Types.ObjectId(id) };
    applyMedicalStoreScope(req, query);

    const result = await updateData(companyModel, query, { isActive: value.isActive }, { new: true });
    if (result) await result.populate("userId", "name email");

    if (!result) return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("company"));

    return sendSuccess(res, { result }, value.isActive ? responseMessage.customMessage("company activated successfully") : responseMessage.customMessage("company deactivated successfully"));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.updateDataError("company status"), err?.message);
  }
};
