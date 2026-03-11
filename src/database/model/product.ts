import mongoose from "mongoose";
import { modelName } from "../../common";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    category: { type: String, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: modelName.userModelName },
    medicalStoreId: { type: mongoose.Schema.Types.ObjectId, ref: modelName.storeModelName, required: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false });

export const productModel = mongoose.model(modelName.productModelName, productSchema);
