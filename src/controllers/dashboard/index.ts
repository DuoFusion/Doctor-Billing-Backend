import mongoose from "mongoose";
import { BILL_STATUS, responseMessage, ROLES, status_code } from "../../common";
import { billModel, categoryModel, companyModel, productModel, userModel } from "../../database";
import { sendError, sendSuccess, applyMedicalStoreScope, reqInfo, startOfDay, endOfDay } from "../../helper";
import { aggregateData, countData } from "../../helper/database_service";

export const get_dashboard_stats = async (req, res) => {
  reqInfo(req);
  try {
    const countQuery: any = { isDeleted: false };
    const amountQuery: any = { isDeleted: false };
    const otherQuery: any = { isDeleted: false };
    const userQuery: any = { isDeleted: false, role: { $ne: ROLES.admin } };

    applyMedicalStoreScope(req, countQuery);
    applyMedicalStoreScope(req, amountQuery, true);
    applyMedicalStoreScope(req, otherQuery);
    applyMedicalStoreScope(req, userQuery);

    const { fromDate, toDate, companyId } = req.query;
    if (fromDate || toDate) {
      const filter: any = {};
      if (fromDate) filter.$gte = startOfDay(new Date(fromDate as string));
      if (toDate) filter.$lte = endOfDay(new Date(toDate as string));
      if (filter.$gte && filter.$lte && filter.$gte > filter.$lte) {
        return sendError(res, status_code.BAD_REQUEST, "fromDate cannot be greater than toDate");
      }
      countQuery.purchaseDate = filter;
      amountQuery.purchaseDate = filter;
      otherQuery.createdAt = filter;
      userQuery.createdAt = filter;
    }

    if (companyId) {
      const companyIdStr = String(companyId || "").trim();
      if (!mongoose.Types.ObjectId.isValid(companyIdStr)) {
        return sendError(res, status_code.BAD_REQUEST, "Invalid company id");
      }
      const companyObjectId = new mongoose.Types.ObjectId(companyIdStr);
      countQuery["items.company"] = companyObjectId;
      amountQuery["items.company"] = companyObjectId;
    }

    const paidBillsQuery = { ...countQuery, billStatus: BILL_STATUS.paid };
    const dueBillsQuery = { ...countQuery, billStatus: BILL_STATUS.due };

    const buildAmountPipeline = (billStatus: string) => [
      { $match: { ...amountQuery, billStatus } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$grandTotal", 0] } } } },
    ];

    const [ bills, paidBills, dueBills, paidAmountAgg, dueAmountAgg, products, companies, categories, users, ] = await Promise.all([
      countData(billModel, countQuery),
      countData(billModel, paidBillsQuery),
      countData(billModel, dueBillsQuery),
      aggregateData(billModel, buildAmountPipeline(BILL_STATUS.paid)),
      aggregateData(billModel, buildAmountPipeline(BILL_STATUS.due)),
      countData(productModel, otherQuery),
      countData(companyModel, otherQuery),
      countData(categoryModel, otherQuery),
      countData(userModel, userQuery),
    ]);

    const paidAmount = paidAmountAgg?.[0]?.total || 0;
    const dueAmount = dueAmountAgg?.[0]?.total || 0;

    return sendSuccess(
      res,
      { stats: { bills, paidBills, dueBills, paidAmount, dueAmount, products, companies, categories, users } },
      responseMessage.getDataSuccess("dashboard stats")
    );
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("failed to fetch dashboard stats"), err?.message);
  }
};
