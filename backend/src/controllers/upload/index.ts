import { Request, Response } from "express";
import { sendSuccess, sendError, deleteFileIfExists, reqInfo } from "../../helper";
import { responseMessage, status_code } from "../../common";
import url from "url";
import path from "path";

// ================= helpers ==================
const extractFilename = (fileUrl: string | undefined | null) => {
  if (!fileUrl) return null;
  try {
    const parsed = url.parse(fileUrl.toString());
    const base = path.basename(parsed.pathname || "");
    return base || null;
  } catch {
    return null;
  }
};

// ================= Add / Upload File =================
export const addFile = async (req: Request, res: Response) => {
  reqInfo(req);
  try {
    const file = (req as any).file;
    if (!file) return sendError(res, status_code.BAD_REQUEST, responseMessage.getDataNotFound("file"));
    const filename = file.filename;
    const fileUrl = `${(req.protocol || "http")}://${req.get("host")}/upload/${filename}`;
    return sendSuccess(res, { filename, fileUrl }, responseMessage.addDataSuccess("file"));
  } catch (err: any) {
    return sendError(res, status_code.INTERNAL_SERVER_ERROR, responseMessage.customMessage("internal server error"), err.message);
  }
};

// ================= Update / Replace File =================
export const updateFile = async (req: Request, res: Response) => {
  reqInfo(req);
  try {
    const file = (req as any).file;
    if (!file) return sendError(res, status_code.BAD_REQUEST, responseMessage.getDataNotFound("file"));

    // delete old file if provided
    const { oldFileUrl } = req.body;
    const oldName = extractFilename(oldFileUrl);
    if (oldName) {
      deleteFileIfExists(oldName);
    }

    const filename = file.filename;
    const fileUrl = `${req.protocol}://${req.get("host")}/upload/${filename}`;
    return sendSuccess(res, { filename, fileUrl }, responseMessage.updateDataSuccess("file"));
  } catch (err: any) {
    return sendError(res, status_code.INTERNAL_SERVER_ERROR, responseMessage.customMessage("internal server error"), err.message);
  }
};

// ================= Delete File =================
export const deleteFile = async (req: Request, res: Response) => {
  reqInfo(req);
  try {
    const { fileUrl, filename } = req.body as any;
    if (!fileUrl && !filename) {
      return sendError(res, status_code.BAD_REQUEST, responseMessage.customMessage("fileurl or filename is required"));
    }

    let name = filename;
    if (!name && fileUrl) name = extractFilename(fileUrl);
    if (name) deleteFileIfExists(name);

    return sendSuccess(res, {}, responseMessage.deleteDataSuccess("file"));
  } catch (err: any) {
    return sendError(res, status_code.INTERNAL_SERVER_ERROR, responseMessage.customMessage("internal server error"), err.message);
  }
};
