import mongoose from "mongoose";
import { modelName } from "../../common";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, },
    medicalStoreId: { type: mongoose.Schema.Types.ObjectId, ref: modelName.storeModelName, required: true,},
    userId: { type: mongoose.Schema.Types.ObjectId, ref: modelName.userModelName},
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

export const categoryModel = mongoose.model(modelName.categoryModelName, categorySchema);