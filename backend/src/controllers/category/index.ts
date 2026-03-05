import { responseMessage, ROLES, status_code } from "../../common";
import { userModel, categoryModel } from "../../database";
import { categoryValidation, joiValidationOptions } from "../../validation";
import mongoose from "mongoose";
import {parsePagination, sendSuccess, sendError, buildRoleQuery,} from "../../helper";
import { getData, getFirstMatch, createData, countData, updateData, findOneAndPopulate } from "../../helper/database_service";

const resolveUserMedicalStoreId = (req: any): string => {
  const storeId = String(req.user?.medicalStoreId || "").trim();
  return mongoose.Types.ObjectId.isValid(storeId) ? storeId : "";
};

const applyMedicalStoreScope = (req: any, query: any) => {
  const requestedStoreId = String(req.query.medicalStoreId || "").trim();

  if (req.user.role === "admin") {
    if (requestedStoreId && mongoose.Types.ObjectId.isValid(requestedStoreId)) {
      query.medicalStoreId = requestedStoreId;
    }
    return;
  }

  const userMedicalStoreId = resolveUserMedicalStoreId(req);

  if (requestedStoreId && mongoose.Types.ObjectId.isValid(requestedStoreId)) {
    if (userMedicalStoreId && userMedicalStoreId === requestedStoreId) {
      query.medicalStoreId = requestedStoreId;
    } else {
      query.medicalStoreId = null;
    }
    return;
  }

  if (userMedicalStoreId) {
    query.medicalStoreId = userMedicalStoreId;
    return;
  }

  query.userId = req.user._id;
};


// ============== Add Category controller ==========================
export const add_category = async (req, res) => {

  const { error, value } = categoryValidation.addCategoryValidation.validate(req.body, joiValidationOptions);
  if (error) return sendError(res, status_code.BAD_REQUEST, error.details[0].message);

  try {
    const { userId, name } = value;
    let ownerUserId = req.user._id;
    let medicalStoreId: any = req.user?.medicalStoreId;

    if (req.user.role === "admin") {
      if (!userId) return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("please select user"));
      const ownerUser: any = await userModel.findOne(
        { _id: userId, isDeleted: false, role: { $ne: ROLES.admin } },
        { _id: 1, medicalStoreId: 1, medicalStoreIds: 1 }
      );
      
      if (!ownerUser) return sendError(res, status_code.BAD_REQUEST, responseMessage.getDataNotFound("selected user"));
      ownerUserId = ownerUser._id;
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

    const storeId = String(medicalStoreId?._id || medicalStoreId || "").trim();
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("medical store is not assigned to current user"));
    }

    const normalized = name.trim();
    const exists = await getFirstMatch(categoryModel, {
      medicalStoreId: storeId,
      name: { $regex: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      isDeleted: false,
    });
    if (exists) return sendError(res, status_code.BAD_REQUEST, responseMessage.dataAlreadyExist("category"));

    const created = await createData(categoryModel, { userId: ownerUserId, medicalStoreId: storeId, name: normalized , isActive: true });

    return sendSuccess(res, { data: created }, responseMessage.addDataSuccess("category"));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("failed to add category"), err);
  }
};


// ============== Get Categories controller ==========================
export const get_all_category = async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const search = (req.query.search || "").toString().trim();
    const addedBy = (req.query.addedBy || "").toString().trim();
    const sortBy = (req.query.sortBy || "createdAt").toString();
    const order = (req.query.order || "desc").toString().toLowerCase() === "asc" ? 1 : -1;

    const query: any = buildRoleQuery(req.user.role, req.user._id, req.query.medicalStoreId, req.user.medicalStoreId);
    if (req.user.role === "admin" && addedBy && mongoose.Types.ObjectId.isValid(addedBy)) query.userId = addedBy;

    if (search) {
      query.$or = [{ name: { $regex: search, $options: "si" } }];
    }

    const sortObj: any = sortBy === "addedBy" ? { userId: order } : { createdAt: order };
    const options: any = { sort: sortObj };
    if (hasPagination) {
      options.skip = (page - 1) * limit;
      options.limit = limit;
    }
    const categoriesRaw: any = await getData(categoryModel, query, {}, options);
    const categoriesPopulated: any = await categoryModel.populate(categoriesRaw, [{ path: "userId", select: "name email" }]);
    const total = await countData(categoryModel, query);
    const data = (categoriesPopulated as any[]).map((c: any) => ({
      ...c.toObject ? c.toObject() : c,
    }));

    return sendSuccess(res,
      {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: total > 0 ? Math.ceil(total / limit) : 0,
        },
      },

      responseMessage.getDataSuccess("categories")
    );

  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("failed to fetch categories"), err);
  }
};


// ============== Get Single Category by id controller ==========================
export const get_category_by_id = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("category id"));
    }
    const query: any = { _id: id, isDeleted: false };
    applyMedicalStoreScope(req, query);

    const category: any = await findOneAndPopulate(categoryModel, query, {}, {}, { path: "userId", select: "name email" });
    if (!category) return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("category"));

    return sendSuccess(res, { data: category }, responseMessage.getDataSuccess("category"));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("failed to fetch category"), err);
  }
};

// ============== update Category controller ==========================
export const update_category_by_id = async (req, res) => {
  const payload = { ...req.body, id: req.params.id || req.body.id };
  const { error, value } = categoryValidation.updateCategoryValidation.validate(payload,joiValidationOptions);
  if (error) return sendError(res, status_code.BAD_REQUEST, error.details[0].message);

  try {
    const { id, name, medicalStoreId } = value;

    if (req.user.role !== "admin" && medicalStoreId) {
      const nextStoreId = String(medicalStoreId);
      const currentUserMedicalStoreId = resolveUserMedicalStoreId(req);
      if (!currentUserMedicalStoreId || currentUserMedicalStoreId !== nextStoreId) {
        return sendError(res, status_code.FORBIDDEN, responseMessage.customMessage("not authorized for selected medical store"));
      }
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("category id"));
    }
    const query: any = { _id: id, isDeleted: false };
    applyMedicalStoreScope(req, query);
    if (req.user.role === "admin" && medicalStoreId && mongoose.Types.ObjectId.isValid(medicalStoreId)) query.medicalStoreId = medicalStoreId;

    const existing: any = await getFirstMatch(categoryModel, query);
    if (!existing) return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("category"));

    const normalized = name.trim();
    if (normalized !== existing.name) {
      const name = await getFirstMatch(categoryModel, {
        medicalStoreId: existing.medicalStoreId,
        name: { $regex: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        isDeleted: false,
        _id: { $ne: id },
      });
      if (name) return sendError(res, status_code.BAD_REQUEST, responseMessage.dataAlreadyExist("category name"));
    }

    const updatePayload: any = { name: normalized };
    if (req.user.role === "admin" && value.medicalStoreId && mongoose.Types.ObjectId.isValid(value.medicalStoreId)) {
      updatePayload.medicalStoreId = value.medicalStoreId;
    }
    const result = await updateData(categoryModel, { _id: id }, updatePayload, { new: true} );

    return sendSuccess(res, { data: result }, responseMessage.updateDataSuccess("category"));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.updateDataError("category"), err);
  }
};

// ============== Acive Category controller ==========================
export const toggle_category_active_status = async (req, res) => {
  const { error, value } = categoryValidation.toggleCategoryStatusValidation.validate(  req.body,  joiValidationOptions );
  if (error) return sendError(res, status_code.BAD_REQUEST, error.details[0].message);

  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("category id"));
    }
    const query: any = { _id: id, isDeleted: false };
    applyMedicalStoreScope(req, query);

    const result = await updateData(categoryModel, query, { isActive: value.isActive }, { new: true } );
    if (!result) return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("category"));

    return sendSuccess(res, { data: result }, value.isActive ? responseMessage.customMessage("category activated successfully") : responseMessage.customMessage("category deactivated successfully"));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.updateDataError("category status"), err);
  }
};

// ============== Delete Category controller ==========================
export const delete_category_by_id = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("category id"));
    }
    const query: any = { _id: id, isDeleted: false };
    applyMedicalStoreScope(req, query);

    const result = await updateData(categoryModel, query, { isDeleted: true },{ new: true } );
    if (!result) return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("category"));

    return sendSuccess(res, { data: result }, responseMessage.deleteDataSuccess("category"));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("failed to delete category"), err);
  }
};
