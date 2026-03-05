import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { status_code, responseMessage } from "../common";
import { config } from "../../config";
import { userModel } from "../database";

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        name: string;
        email: string;
        role: string;
        medicalStoreId?: string;
      };
    }
  }
}

const resolveMedicalStoreId = (user: any): string => {
  const directStoreId = String(user?.medicalStoreId?._id || user?.medicalStoreId || "").trim();
  if (directStoreId) return directStoreId;

  const legacyStore = Array.isArray(user?.medicalStoreIds) ? user.medicalStoreIds[0] : "";
  const legacyStoreId = String(legacyStore?._id || legacyStore || "").trim();
  return legacyStoreId;
};

/**
 * Middleware to verify JWT token and attach user to request
 * Expected JWT payload: { user: { _id, name, email, role } }
 */
export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ")
    ? req.headers.authorization.slice(7).trim()
    : null;

  if (!token)
    return res.status(status_code.UNAUTHORIZED).json({ status: false, message: responseMessage.notAuthenticated });

  const secretKey = config.SECRET_KEY;
  if (!secretKey) {
    console.error("[verifyToken] SECRET_KEY missing in environment");
    return res.status(status_code.INTERNAL_SERVER_ERROR).json({ status: false, message: "Server configuration error" });
  }

  try {
    const decoded = jwt.verify(token, secretKey) as { user?: any };
    if (!decoded?.user) throw new Error("Invalid token payload");

    const currentUser: any = await userModel
      .findById(decoded.user._id)
      .select("_id name email role medicalStoreId medicalStoreIds isDeleted");

    if (!currentUser || currentUser.isDeleted) {
      return res.status(status_code.UNAUTHORIZED).json({ status: false, message: responseMessage.invalidToken });
    }

    req.user = {
      _id: String(currentUser._id),
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      medicalStoreId: resolveMedicalStoreId(currentUser),
    };
    next();
  } catch (err: any) {
    console.error(`[verifyToken] ${err instanceof jwt.TokenExpiredError ? "Token expired" : "Invalid token"}:`, err.message);
    return res.status(status_code.UNAUTHORIZED).json({ status: false, message: responseMessage.invalidToken });
  }
};
