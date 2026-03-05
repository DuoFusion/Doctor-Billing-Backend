import { responseMessage, ROLES, status_code } from "../../common";
import mongoose from "mongoose";
import { userModel, companyModel, productModel } from "../../database";
import { joiValidationOptions, productValidation } from "../../validation";
import { parsePagination, sendSuccess, sendError, resolveStockStatus } from "../../helper";
import {
  getData,
  getFirstMatch,
  countData,
  createData,
  updateData,
  findOneAndPopulate,
} from "../../helper/database_service";

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

// ================= Get All Products =================
export const get_all_product = async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const search = (req.query.search || "").trim();
    const category = (req.query.category || "").trim();
    const billable = req.query.billable === true || req.query.billable === "true";
    const sortBy = (req.query.sortBy || "createdAt").trim();
    const order: 1 | -1 = (req.query.order || "desc").toLowerCase() === "asc" ? 1 : -1;

    const query: any = { isDeleted: false };
    applyMedicalStoreScope(req, query);
    if (category) query.category = category;
    if (billable) query.$and = [{ $or: [{ isActive: true }, { isActive: { $exists: false } }] }, { stock: { $gt: 0 } }];
    if (search) {
      const regex = new RegExp(search, "i");
      const companyIds = (await getData(companyModel, { isDeleted: false, name: regex }, { _id: 1 })).map((c: any) => c._id);
      query.$or = [{ name: regex }, { company: { $in: companyIds } }];
    }

    const safeSortBy = sortBy === "sellingPrice" ? "sellingPrice" : "createdAt";
    const options: any = { sort: { [safeSortBy]: order } };
    if (hasPagination) {
      options.skip = (page - 1) * limit;
      options.limit = limit;
    }
    const productsRaw: any = await getData(productModel, query, {}, options);
    const products = await productModel.populate(productsRaw, [
      { path: "company" },
      { path: "userId", select: "name email role" },
    ]);
    const total = await countData(productModel, query);

    return sendSuccess(res, { products, pagination: { page: hasPagination ? page : 1, limit: hasPagination ? limit : total, total, totalPages: hasPagination ? Math.ceil(total / limit) : 1 } }, responseMessage.getDataSuccess("products"));

  } catch (error) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("failed to fetch products"), error?.message);
  }
};

// ================= Get My Products =================
export const get_my_product = async (req, res) => {
  try {
    const filter: any = { isDeleted: false };
    applyMedicalStoreScope(req, filter);
    const productsRaw: any = await getData(productModel, filter);
    const products = await productModel.populate(productsRaw, [
      { path: "company" },
      { path: "userId", select: "name email role" },
    ]);
    return sendSuccess(res, { products }, responseMessage.getDataSuccess("my products"));
  } catch (error) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("failed to fetch my products"), error?.message);
  }
};

// ================= Add New Product =================
export const add_product = async (req, res) => {
  const { error, value } = productValidation.productDataValidation.validate(req.body, joiValidationOptions);
  if (error) return sendError(res, status_code.BAD_REQUEST, error.details[0].message);

  try {
    const { userId, ...payload } = value;
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

    const storeId = String(medicalStoreId?._id || medicalStoreId || "").trim();
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("medical store is not assigned to current user"));
    }

    const stock = Math.max(Number(value.stock) || 0, 0);
    const minStock = value.minStock !== undefined ? Math.max(Number(value.minStock) || 0, 0) : 10;

    const result = await createData(productModel, {
      ...payload,
      stock,
      minStock,
      stockStatus: resolveStockStatus(stock, minStock),
      userId: ownerId,
      medicalStoreId: storeId,
      isActive: true,
    });

    return sendSuccess(res, { result }, responseMessage.addDataSuccess("product"));
  } catch (error) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("failed to add product"), error?.message);
  }
};

// ================= Get Product By Id =================
export const get_product_by_id = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("product id"));
    }
    const query: any = { _id: id, isDeleted: false };
    applyMedicalStoreScope(req, query);

    const product: any = await findOneAndPopulate(productModel, query, {}, {}, [
      { path: "company" },
      { path: "userId", select: "name email role" },
    ]);
    if (!product) return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("product"));

    return sendSuccess(res, { product }, responseMessage.getDataSuccess("product"));
  } catch (error) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("failed to fetch product"), error?.message);
  }
};

// ================= Update Product =================
export const update_product_by_id = async (req, res) => {
  const { error, value } = productValidation.productUpdateDataValidation.validate(req.body, joiValidationOptions);
  if (error) return sendError(res, status_code.BAD_REQUEST, error.details[0].message);

  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("product id"));
    }
    const query: any = { _id: id, isDeleted: false };
    applyMedicalStoreScope(req, query);

    const existing: any = await getFirstMatch(productModel, query);
    if (!existing) return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("product"));

    if (req.user.role !== "admin" && value.medicalStoreId) {
      const currentUserMedicalStoreId = resolveUserMedicalStoreId(req);
      const nextStoreId = String(value.medicalStoreId);
      if (!currentUserMedicalStoreId || currentUserMedicalStoreId !== nextStoreId) {
        return sendError(res, status_code.FORBIDDEN, responseMessage.customMessage("not authorized for selected medical store"));
      }
    }

    const stock = value.stock !== undefined ? Math.max(Number(value.stock) || 0, 0) : existing.stock;
    const minStock = value.minStock !== undefined ? Math.max(Number(value.minStock) || 0, 0) : existing.minStock;

    const updatePayload: any = { ...value, stock, minStock, stockStatus: resolveStockStatus(stock, minStock) };
    if (req.user.role !== "admin") delete updatePayload.medicalStoreId;
    const result = await updateData(productModel, query, updatePayload, { new: true });

    return sendSuccess(res, { result }, responseMessage.updateDataSuccess("product"));
  } catch (error) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.updateDataError("product"), error?.message);
  }
};

// ================= Toggle Product Active Status =================
export const toggle_product_active_status = async (req, res) => {
  const { error, value } = productValidation.toggleProductStatusValidation.validate(req.body, joiValidationOptions);
  if (error) return sendError(res, status_code.BAD_REQUEST, error.details[0].message);

  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("product id"));
    }
    const query: any = { _id: id, isDeleted: false };
    applyMedicalStoreScope(req, query);

    const result = await updateData(productModel, query, { isActive: value.isActive }, { new: true });
    if (!result) return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("product"));

    return sendSuccess(res, { result }, value.isActive ? responseMessage.customMessage("product activated successfully") : responseMessage.customMessage("product deactivated successfully"));
  } catch (error) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.updateDataError("product status"), error?.message);
  }
};

// ================= Delete Product =================
export const delete_product_by_id = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("product id"));
    }
    const query: any = { _id: id, isDeleted: false };
    applyMedicalStoreScope(req, query);

    const result = await updateData(productModel, query, { isDeleted: true }, { new: true });
    if (!result) return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("product"));

    return sendSuccess(res, { result }, responseMessage.deleteDataSuccess("product"));
  } catch (error) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("failed to delete product"), error?.message);
  }
};
