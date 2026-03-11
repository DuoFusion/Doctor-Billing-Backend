import { Request, Response } from "express";
import mongoose from "mongoose";
import { status_code } from "../common";

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

export const titleCase = (text: string) => {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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

// Shared medical store scope helpers
const formatScopedId = (value: string, asObjectId: boolean) =>
  asObjectId ? new mongoose.Types.ObjectId(value) : value;

export const resolveUserMedicalStoreId = (req: any): string => {
  const storeId = String(req.user?.medicalStoreId || "").trim();
  return mongoose.Types.ObjectId.isValid(storeId) ? storeId : "";
};

export const applyMedicalStoreScope = (req: any, query: any, asObjectId = false) => {
  const requestedStoreId = String(req.query.medicalStoreId || "").trim();

  if (req.user.role === "admin") {
    if (requestedStoreId && mongoose.Types.ObjectId.isValid(requestedStoreId)) {
      query.medicalStoreId = formatScopedId(requestedStoreId, asObjectId);
    }
    return;
  }

  const userMedicalStoreId = resolveUserMedicalStoreId(req);

  if (requestedStoreId && mongoose.Types.ObjectId.isValid(requestedStoreId)) {
    query.medicalStoreId =
      userMedicalStoreId && userMedicalStoreId === requestedStoreId
        ? formatScopedId(requestedStoreId, asObjectId)
        : null;
    return;
  }

  if (userMedicalStoreId) {
    query.medicalStoreId = formatScopedId(userMedicalStoreId, asObjectId);
    return;
  }

  if (asObjectId) {
    if (mongoose.Types.ObjectId.isValid(req.user._id)) {
      query.userId = new mongoose.Types.ObjectId(req.user._id);
    }
    return;
  }

  query.userId = req.user._id;
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



export const canAccessMedicalStore = (req: any, medicalStoreId: string) => {
  const userMedicalStoreId = resolveUserMedicalStoreId(req);
  if (!medicalStoreId || !userMedicalStoreId) return false;
  return userMedicalStoreId === String(medicalStoreId);
};

export const billQueryByRole = (req: any, id?: string) => {
  const query: any = buildRoleQuery(
    req.user.role,
    req.user._id,
    String(req.query.medicalStoreId || "").trim(),
    resolveUserMedicalStoreId(req)
  );

  if (id) query._id = id;
  return query;
};

export const buildBillPayload = (value: any, computed: Record<string, any>) => ({
  ...value,
  ...computed,
});
