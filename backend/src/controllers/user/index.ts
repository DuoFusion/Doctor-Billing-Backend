import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { responseMessage, ROLES, status_code } from "../../common";
import { userModel } from "../../database";
import { parsePagination, reqInfo, sendError, sendSuccess } from "../../helper";
import { joiValidationOptions } from "../../validation";
import { addUserValidation, userValidaiton, toggleUserStatusValidation } from "../../validation/user";
import { getData, getFirstMatch, countData, createData, updateData } from "../../helper/database_service";

const ObjectId = mongoose.Types.ObjectId;

// ================= Add New User =================
export const add_user = async (req, res) => {
  reqInfo(req);
  const { error, value } = addUserValidation.validate(req.body, joiValidationOptions);
  if (error) return sendError(res, status_code.BAD_REQUEST, error.details[0].message);

  try {
    const exists = await getFirstMatch(userModel, { email: value.email.toLowerCase(), isDeleted: false });

    if (exists) return sendError(res, status_code.BAD_REQUEST, responseMessage.dataAlreadyExist("user"));

    const hashedPassword = await bcrypt.hash(value.password, 10);
    const user = await createData(userModel, {
      name: value.name.trim(),
      email: value.email.toLowerCase(),
      password: hashedPassword,
      phone: value.phone || "",
      role: ROLES.user,
      medicalStoreId: value.medicalStoreId,
      isActive: true,
      isDeleted: false,
    });

    return sendSuccess(res, { user }, responseMessage.addDataSuccess("user"));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, "Failed to add user", err);
  }
};

// ================= Get All Users =================
export const get_all_user = async (req, res) => {
  reqInfo(req);

  try {
    const { page, limit } = parsePagination(req.query);
    const search = (req.query.search || "").toString().trim();
    const query: any = { isDeleted: false };

    if (search) query.name = { $regex: search, $options: "i" };

    const total = await countData(userModel, query);

    const users = await getData(userModel, query, "-password", {
      skip: (page - 1) * limit,
      limit,
      sort: { createdAt: -1 },
    });

    return sendSuccess(
      res,
      {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      responseMessage.getDataSuccess("users")
    );
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, "Failed to fetch users", err);
  }
};

// ================= Get User By Id =================
export const get_user_by_id = async (req, res) => {
  reqInfo(req);

  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("user id"));

    const user = await getFirstMatch(userModel, { _id: id, isDeleted: false }, "-password");
    if (!user)
      return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("user"));

    return sendSuccess(res, { user }, responseMessage.getDataSuccess("user"));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, "Failed to fetch user", err);
  }
};

// ================= Update User =================
export const update_user_by_id = async (req, res) => {
  reqInfo(req);
  const { error, value } = userValidaiton.validate(req.body, joiValidationOptions);
  if (error) return sendError(res, status_code.BAD_REQUEST, error.details[0].message);

  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id))  return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("user id"));

    const user = await updateData(userModel, { _id: id, isDeleted: false },
      {
        name: value.name.trim(),
        email: value.email.toLowerCase(),
        phone: value.phone || "",
        medicalStoreId: value.medicalStoreId,
        role: ROLES.user,
      },
      { new: true, select: "-password" }
    );

    if (!user)
      return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("user"));

    return sendSuccess(res, { user }, responseMessage.updateDataSuccess("user"));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, "Failed to update user", err);
  }
};

// ================= Toggle User Status =================
export const toggle_user_active_status = async (req, res) => {
  reqInfo(req);

  const { error, value } = toggleUserStatusValidation.validate(req.body, joiValidationOptions);
  if (error) return sendError(res, status_code.BAD_REQUEST, error.details[0].message);

  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id))
      return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("user id"));

    const user = await updateData(userModel, { _id: id, isDeleted: false }, { isActive: value.isActive }, { new: true, select: "-password" });

    if (!user)
      return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("user"));

    return sendSuccess(res, { user }, "User status updated");
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, "Failed to update status", err);
  }
};

// ================= Delete User =================
export const delete_user_by_id = async (req, res) => {
  reqInfo(req);

  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id))
      return sendError(res, status_code.BAD_REQUEST, responseMessage.invalidId("user id"));

    const user = await updateData(userModel, { _id: id, isDeleted: false }, { isDeleted: true }, { new: true });

    if (!user)
      return sendError(res, status_code.NOT_FOUND, responseMessage.getDataNotFound("user"));

    return sendSuccess(res, { user }, responseMessage.deleteDataSuccess("user"));
  } catch (err) {
    return sendError(res, status_code.BAD_REQUEST, "Failed to delete user", err);
  }
};
