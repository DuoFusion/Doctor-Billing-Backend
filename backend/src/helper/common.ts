import { Request, Response } from "express";
import { status_code, STOCK_STATUS } from "../common";

// ================= Pagination Helpers ==========================

export const parsePagination = (query: any) => {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.max(1, parseInt(query.limit as string) || 10);
  return { page, limit };
};

export const safeParseInt = (val: any, fallback: number) => {
  const n = parseInt(val);
  return Number.isFinite(n) ? n : fallback;
};

// ================= Search Helpers ==========================

export const buildSearchQuery = (search: string, fields: string[]) => {
  if (!search) return {};
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "i");
  return { $or: fields.map((f) => ({ [f]: regex })) };
};

// ================= Response Helpers ==========================

export const sendSuccess = (res: Response, data: object = {}, message?: string) => {
  return res.status(status_code.SUCCESS).json({ status: true, message, ...data });
};

export const sendError = ( res: Response,  code = status_code.BAD_REQUEST, message = "", error?: any) => {
  return res.status(code).json({ status: false, message, ...(error && { error }) });
};

// ================= Stock Helpers ==========================
export const resolveStockStatus = (stock: number, minStock: number) => {
  if (stock <= 0) return STOCK_STATUS.outOfStock;
  if (stock <= minStock) return STOCK_STATUS.lowStock;
  return STOCK_STATUS.inStock;
};


// ================= Role Based Query Helpers ==========================
export const buildRoleQuery = (role: string, userId?: string, medicalStoreId?: string, userMedicalStoreId?: string) => {
  const q: any = { isDeleted: false };

  if (role !== "admin") {
    const scopedStoreId = String(userMedicalStoreId || "").trim();
    const requestedStoreId = String(medicalStoreId || "").trim();

    if (requestedStoreId) {
      if (!scopedStoreId || scopedStoreId === requestedStoreId) {
        q.medicalStoreId = requestedStoreId;
      } else {
        q.medicalStoreId = null;
      }
      return q;
    }

    if (scopedStoreId) {
      q.medicalStoreId = scopedStoreId;
      return q;
    }

    if (userId) {
      q.userId = userId;
      return q;
    }
  }

  if (medicalStoreId) {
    q.medicalStoreId = medicalStoreId;
  }
  return q;
};


// ================= Date Helpers ==========================
export const startOfDay = (dateValue: Date) => {
  const value = new Date(dateValue);
  value.setHours(0, 0, 0, 0);
  return value;
};

export const endOfDay = (dateValue: Date) => {
  const value = new Date(dateValue);
  value.setHours(23, 59, 59, 999);
  return value;
};

export const resolveQuickDateRange = (quickDate: string) => {
  if (!quickDate) return null;

  const now = new Date();
  const base = startOfDay(now);

  if (quickDate === "yesterday") {
    base.setDate(base.getDate() - 1);
  } else if (quickDate === "tomorrow") {
    base.setDate(base.getDate() + 1);
  } else if (quickDate !== "today") {
    return null;
  }

  return { from: startOfDay(base), to: endOfDay(base) };
};
