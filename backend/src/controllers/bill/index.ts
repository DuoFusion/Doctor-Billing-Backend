import { userModel, billModel, productModel, storeModel } from "../../database";
import { responseMessage, ROLES, status_code, TAX_TYPE, BILL_STATUS } from "../../common";
import mongoose from "mongoose";
import { billValidation, joiValidationOptions } from "../../validation";
import { parsePagination, sendSuccess, sendError, resolveStockStatus, resolveQuickDateRange, startOfDay, endOfDay } from "../../helper";
import { getData, getFirstMatch, countData, createData, updateData, findOneAndPopulate } from "../../helper/database_service";

// ================== Bill Number Helpers ==================
const BILL_PREFIX = "BILL-NO-";

const parseBillNumber = (bill: string) => {
  const m = bill.match(/^BILL-NO-(\d+)$/);
  return m ? Number(m[1]) : 0;
};

const formatBillNumber = (seq: number) => `${BILL_PREFIX}${String(seq).padStart(3, "0")}`;

const generateBillNumber = async () => {
  const bills = await getData(billModel, { billNumber: { $regex: /^BILL-NO-\d+$/ } }, { billNumber: 1 });

  const maxSeq = bills.reduce((max, b) => Math.max(max, parseBillNumber(b.billNumber || "")), 0);
  return formatBillNumber(maxSeq + 1);
};

const resolveUserMedicalStoreId = (req: any): string => {
  const storeId = String(req.user?.medicalStoreId || "").trim();
  return mongoose.Types.ObjectId.isValid(storeId) ? storeId : "";
};

const canAccessMedicalStore = (req: any, medicalStoreId: string) => {
  const userMedicalStoreId = resolveUserMedicalStoreId(req);
  if (!medicalStoreId || !userMedicalStoreId) return false;
  return userMedicalStoreId === String(medicalStoreId);
};

// ================== Role-based Query Helper ==================
const billQueryByRole = (req: any, id?: string) => {
  const query: any = { isDeleted: false };
  if (id) query._id = id;

  const requestedStoreId = String(req.query.medicalStoreId || "").trim();

  if (req.user.role === "admin") {
    if (requestedStoreId && mongoose.Types.ObjectId.isValid(requestedStoreId)) {
      query.medicalStoreId = requestedStoreId;
    }
    return query;
  }

  const userMedicalStoreId = resolveUserMedicalStoreId(req);

  if (requestedStoreId && mongoose.Types.ObjectId.isValid(requestedStoreId)) {
    if (userMedicalStoreId && userMedicalStoreId === requestedStoreId) {
      query.medicalStoreId = requestedStoreId;
    } else {
      query.medicalStoreId = null;
    }
    return query;
  }

  if (userMedicalStoreId) {
    query.medicalStoreId = userMedicalStoreId;
    return query;
  }

  query.userId = req.user._id;
  return query;
};

// ================== GET ALL BILLS ==================
export const get_all_bill = async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;

    const { search = "", fromDate, toDate, quickDate } = req.query;
    const query: any = billQueryByRole(req);

    if (search) {
      query.billNumber = new RegExp(search.toString().trim(), "i");
    }

    // Date filters
    const range = resolveQuickDateRange(quickDate?.toString().trim().toLowerCase());
    if (range) {
      query.createdAt = { $gte: range.from, $lte: range.to };
    } else if (fromDate || toDate) {
      const filter: any = {};
      if (fromDate) filter.$gte = startOfDay(new Date(fromDate));
      if (toDate) filter.$lte = endOfDay(new Date(toDate));
      if (filter.$gte && filter.$lte && filter.$gte > filter.$lte) {
        return sendError(res, status_code.BAD_REQUEST, "fromDate cannot be greater than toDate");
      }
      query.createdAt = filter;
    }

    const total = await countData(billModel, query);

    const options: any = { sort: { createdAt: -1 } };
    
    if (hasPagination) {
      options.skip = (page - 1) * limit;
      options.limit = limit;
    }
    const billsRaw: any = await getData(billModel, query, {}, options);
    const bills = await billModel.populate(billsRaw, [
      { path: "userId", select: "name medicalName email phone address city state pincode pan gstin signatureImg" },
      { path: "medicalStoreId", select: "name address pincode state panNumber gstNumber signatureImg" },
      { path: "items.product", select: "name category expiry mrp sellingPrice company" },
      { path: "items.company", select: "name gstNumber phone email address city state pincode logoImage" },
    ]);

    return sendSuccess(
      res,
      {
        bills,
        pagination: {
          page,
          limit,
          total,
          totalPages: hasPagination ? Math.ceil(total / limit) : total > 0 ? 1 : 0,
        },
      },
      responseMessage.getDataSuccess("bills")
    );
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, err?.message || responseMessage.customMessage("failed to fetch bills"), err);
  }
};

// ================== GET BILL BY ID ==================
export const get_bill_by_id = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("bill id"));
    }

    const bill = await billModel
      .findOne(billQueryByRole(req, id))
      .populate("userId", "name medicalName email phone address city state pincode pan gstin signatureImg")
      .populate("medicalStoreId", "name address pincode state panNumber gstNumber signatureImg")
      .populate("items.product", "name category expiry mrp sellingPrice company")
      .populate("items.company", "name gstNumber phone email address city state pincode logoImage");

    if (!bill) return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("bill"));

    return sendSuccess(res, { bill }, responseMessage.getDataSuccess("bill"));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("failed to fetch bill"), err);
  }
};

// ================== ADD BILL ==================
export const add_bill = async (req, res) => {
  const { error, value } = billValidation.addBillValidation.validate(req.body, joiValidationOptions);
  if (error) return sendError(res, status_code.BAD_REQUEST, error.details[0].message);

  try {
    const { userId, items, paymentMethod, discount = 0 } = value;
    let billUserId: any = req.user._id;
    let medicalStoreId: any = req.user?.medicalStoreId;

    // Admin user validation
    if (req.user.role === "admin") {
      if (!userId) return sendError(res, status_code.BAD_REQUEST, "Please select user");
      const owner: any = await userModel.findOne(
        { _id: String(userId), isDeleted: false, role: { $ne: ROLES.admin } },
        { _id: 1, medicalStoreId: 1, medicalStoreIds: 1 }
      );

      if (!owner) return sendError(res, status_code.BAD_REQUEST, responseMessage.getDataNotFound("selected user"));
      billUserId = owner._id;
      medicalStoreId =
        owner.medicalStoreId ||
        (Array.isArray(owner.medicalStoreIds)
          ? owner.medicalStoreIds[0]?._id || owner.medicalStoreIds[0]
          : null);

      const selectedUserStoreId = String(medicalStoreId?._id || medicalStoreId || "").trim();
      if (!selectedUserStoreId || !mongoose.Types.ObjectId.isValid(selectedUserStoreId)) {
        return sendError(res, status_code.BAD_REQUEST, "Selected user has no medical store assigned");
      }
    }

    const storeId = String(medicalStoreId?._id || medicalStoreId || "").trim();
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return sendError(res, status_code.BAD_REQUEST, "Medical store is not assigned to current user");
    }
    if (req.user.role !== "admin" && !canAccessMedicalStore(req, storeId)) {
      return sendError(res, status_code.FORBIDDEN, responseMessage.customMessage("not authorized for selected medical store"));
    }

    const store: any = await getFirstMatch(storeModel, { _id: storeId, isDeleted: false }, { taxType: 1, taxPercent: 1 });
    if (!store) return sendError(res, status_code.BAD_REQUEST, responseMessage.getDataNotFound("medical store"));
    const taxType = String(store.taxType || TAX_TYPE.SGST_CGST);
    const taxPercent = Math.max(Number(store.taxPercent) || 0, 0);

    let srNo = 1;
    let subTotal = 0;
    let totalGST = 0;
    const processedItems = [];

    // Process each item
    for (let item of items) {
      const product: any = await productModel.findOne({
        _id: item.product,
        isDeleted: false,
        ...(storeId ? { medicalStoreId: storeId } : {}),
      });

      if (!product) return sendError(res, status_code.NOT_FOUND, `Product not found: ${item.product}`);
      if (!product.isActive) return sendError(res, status_code.BAD_REQUEST, `${product.name} is inactive`);

      const qty = Number(item.qty) || 0;
      const freeQty = Number(item.freeQty) || 0;
      const itemDiscount = Number(item.discount) || 0;
      const requiredStock = qty + freeQty;

      if (requiredStock <= 0) return sendError(res, status_code.BAD_REQUEST, `Invalid quantity for ${product.name}`);
      if (product.stock < requiredStock)
        return sendError(res, status_code.BAD_REQUEST, `Insufficient stock for ${product.name}. Available: ${product.stock}`);

      const rate = Number(product.sellingPrice) || 0;
      const total = rate * qty - itemDiscount;
      const gstAmount = (total * taxPercent) / 100;
      const sgst = taxType === TAX_TYPE.SGST_CGST ? gstAmount / 2 : 0;
      const cgst = taxType === TAX_TYPE.SGST_CGST ? gstAmount / 2 : 0;
      const igst = taxType === TAX_TYPE.IGST ? gstAmount : 0;

      processedItems.push({
        srNo: srNo++,
        product: product._id,
        name: product.name,
        category: product.category,
        qty,
        freeQty,
        mrp: product.mrp,
        rate,
        expiry: product.expiry || "",
        gstAmount,
        total,
        discount: itemDiscount,
        sgst,
        cgst,
        igst,
        company: product.company,
      });

      subTotal += total;
      totalGST += gstAmount;

      // Update product stock
      product.stock = Math.max(product.stock - requiredStock, 0);
      product.stockStatus = resolveStockStatus(product.stock, product.minStock || 0);
      await product.save();
    }

    const grandTotal = subTotal + totalGST - discount;
    const billNumber = await generateBillNumber();

    const newBill = await billModel.create({
      billNumber,
      userId: billUserId,
      medicalStoreId: storeId,
      items: processedItems,
      subTotal,
      totalGST,
      discount,
      grandTotal,
      billStatus: BILL_STATUS.paid,
      paymentMethod,
      isActive: true,
    });

    return sendSuccess(res, { bill: newBill }, responseMessage.addDataSuccess("bill"));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("failed to add bill"), err);
  }
};

// ================== UPDATE BILL ==================
export const update_bill_by_id = async (req, res) => {
  const { error, value } = billValidation.updateBillValidation.validate(req.body, joiValidationOptions);
  if (error) return sendError(res, status_code.BAD_REQUEST, error.details[0].message);

  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("bill id"));
    }

    const existingBill = await getFirstMatch(billModel, billQueryByRole(req, id));
    if (!existingBill) return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("bill"));

    const { userId, items, paymentMethod, discount = 0 } = value;
    let billUserId: any = req.user._id;
    let medicalStoreId: any = req.user?.medicalStoreId;

    if (req.user.role === "admin") {
      if (!userId) return sendError(res, status_code.BAD_REQUEST, "Please select user");
      const owner: any = await getFirstMatch(
        userModel,
        { _id: String(userId), isDeleted: false, role: { $ne: ROLES.admin } },
        { _id: 1, medicalStoreId: 1, medicalStoreIds: 1 }
      );
      if (!owner) return sendError(res, status_code.BAD_REQUEST, responseMessage.getDataNotFound("selected user"));
      billUserId = owner._id;
      medicalStoreId =
        owner.medicalStoreId ||
        (Array.isArray(owner.medicalStoreIds)
          ? owner.medicalStoreIds[0]?._id || owner.medicalStoreIds[0]
          : null);

      const selectedUserStoreId = String(medicalStoreId?._id || medicalStoreId || "").trim();
      if (!selectedUserStoreId || !mongoose.Types.ObjectId.isValid(selectedUserStoreId)) {
        return sendError(res, status_code.BAD_REQUEST, "Selected user has no medical store assigned");
      }
    }

    const storeId = String(medicalStoreId?._id || medicalStoreId || "").trim();
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return sendError(res, status_code.BAD_REQUEST, "Medical store is not assigned to current user");
    }
    if (req.user.role !== "admin" && !canAccessMedicalStore(req, storeId)) {
      return sendError(res, status_code.FORBIDDEN, responseMessage.customMessage("not authorized for selected medical store"));
    }

    const store: any = await getFirstMatch(storeModel, { _id: storeId, isDeleted: false }, { taxType: 1, taxPercent: 1 });
    if (!store) return sendError(res, status_code.BAD_REQUEST, responseMessage.getDataNotFound("medical store"));
    const taxType = String(store.taxType || TAX_TYPE.SGST_CGST);
    const taxPercent = Math.max(Number(store.taxPercent) || 0, 0);

    const oldQtyByProduct = new Map<string, number>();
    for (const item of existingBill.items || []) {
      const productId = String(item?.product || "");
      if (!productId) continue;
      const consumed = (Number(item?.qty) || 0) + (Number(item?.freeQty) || 0);
      oldQtyByProduct.set(productId, (oldQtyByProduct.get(productId) || 0) + consumed);
    }

    const newQtyByProduct = new Map<string, number>();
    for (const item of items) {
      const productId = String(item.product || "");
      if (!productId) continue;
      const consumed = (Number(item.qty) || 0) + (Number(item.freeQty) || 0);
      newQtyByProduct.set(productId, (newQtyByProduct.get(productId) || 0) + consumed);
    }

    const productIds = Array.from(new Set([...oldQtyByProduct.keys(), ...newQtyByProduct.keys()]));
    const validProductIds = productIds.filter((productId) => mongoose.Types.ObjectId.isValid(productId));
    const products: any[] = await productModel.find({
      _id: { $in: validProductIds },
      isDeleted: false,
      ...(storeId ? { medicalStoreId: storeId } : {}),
    });

    const productsById = new Map<string, any>();
    for (const product of products) {
      productsById.set(String(product._id), product);
    }

    let srNo = 1;
    let subTotal = 0;
    let totalGST = 0;
    const processedItems = [];

    for (const item of items) {
      const product = productsById.get(String(item.product || ""));

      if (!product) return sendError(res, status_code.NOT_FOUND, `Product not found: ${item.product}`);
      if (!product.isActive) return sendError(res, status_code.BAD_REQUEST, `${product.name} is inactive`);

      const qty = Number(item.qty) || 0;
      const freeQty = Number(item.freeQty) || 0;
      const itemDiscount = Number(item.discount) || 0;
      const requiredStock = qty + freeQty;

      if (requiredStock <= 0) return sendError(res, status_code.BAD_REQUEST, `Invalid quantity for ${product.name}`);

      const rate = Number(product.sellingPrice) || 0;
      const total = rate * qty - itemDiscount;
      const gstAmount = (total * taxPercent) / 100;
      const sgst = taxType === TAX_TYPE.SGST_CGST ? gstAmount / 2 : 0;
      const cgst = taxType === TAX_TYPE.SGST_CGST ? gstAmount / 2 : 0;
      const igst = taxType === TAX_TYPE.IGST ? gstAmount : 0;

      processedItems.push({
        srNo: srNo++,
        product: product._id,
        name: product.name,
        category: product.category,
        qty,
        freeQty,
        mrp: product.mrp,
        rate,
        expiry: product.expiry || "",
        gstAmount,
        total,
        discount: itemDiscount,
        sgst,
        cgst,
        igst,
        company: product.company,
      });

      subTotal += total;
      totalGST += gstAmount;
    }

    const finalStockByProduct = new Map<string, number>();
    for (const productId of productIds) {
      const product = productsById.get(productId);
      if (!product) continue;

      const currentStock = Number(product.stock) || 0;
      const oldQty = oldQtyByProduct.get(productId) || 0;
      const newQty = newQtyByProduct.get(productId) || 0;
      const finalStock = currentStock + oldQty - newQty;

      if (finalStock < 0) {
        return sendError( res, status_code.BAD_REQUEST, `Insufficient stock for ${product.name}. Available: ${Math.max(currentStock + oldQty, 0)}`);
      }

      finalStockByProduct.set(productId, finalStock);
    }

    for (const [productId, finalStock] of finalStockByProduct.entries()) {
      const product = productsById.get(productId);
      if (!product) continue;
      product.stock = Math.max(finalStock, 0);
      product.stockStatus = resolveStockStatus(product.stock, product.minStock || 0);
      await product.save();
    }

    const grandTotal = subTotal + totalGST - discount;

    const bill = await updateData(
      billModel,
      billQueryByRole(req, id),
      {
        userId: billUserId,
        medicalStoreId: storeId,
        items: processedItems,
        subTotal,
        totalGST,
        discount,
        grandTotal,
        billStatus: BILL_STATUS.paid,
        paymentMethod,
      },
      { new: true }
    );

    if (!bill) return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("bill"));

    return sendSuccess(res, { bill }, responseMessage.updateDataSuccess("bill"));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, err?.message || responseMessage.updateDataError("bill"), err);
  }
};

// ================== DELETE BILL ==================
export const delete_bill_by_id = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("bill id"));

    const bill = await updateData(billModel, billQueryByRole(req, id), { isDeleted: true }, { new: true  });
    if (!bill) return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("bill"));

    return sendSuccess(res, { bill }, responseMessage.deleteDataSuccess("bill"));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("failed to delete bill"), err);
  }
};

// ================== TOGGLE BILL ACTIVE STATUS ==================
export const toggle_bill_active_status = async (req, res) => {
  const { error, value } = billValidation.toggleBillStatusValidation.validate(req.body, joiValidationOptions);
  if (error) return sendError(res, status_code.BAD_REQUEST, error.details[0].message);

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("bill id"));

    const bill = await updateData(billModel, billQueryByRole(req, id), { isActive: value.isActive },{ new: true });
    if (!bill) return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("bill"));

    return sendSuccess(res, { bill }, value.isActive ? responseMessage.customMessage("bill activated successfully") : responseMessage.customMessage("bill deactivated successfully"));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.updateDataError("bill status"), err);
  }
};
