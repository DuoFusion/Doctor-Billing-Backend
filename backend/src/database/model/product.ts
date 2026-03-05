import mongoose from "mongoose";
import { modelName, STOCK_STATUS } from "../../common";

const productSchema = new mongoose.Schema(
  {
    name: { type: String,  trim: true },
    company: {type: mongoose.Schema.Types.ObjectId,ref: modelName.companyModelName,},
    userId : {type : mongoose.Schema.Types.ObjectId , ref : modelName.userModelName },
    medicalStoreId: { type: mongoose.Schema.Types.ObjectId, ref: modelName.storeModelName, required: true,},
    category: {type: String},
    mrp: { type: Number,  },
    purchasePrice: { type: Number,  },
    sellingPrice: { type: Number,  },
    stock: { type: Number,  default: 0 },
    minStock: { type: Number,  default: 10 },
    stockStatus: {type: String,enum: Object.values(STOCK_STATUS),default: STOCK_STATUS.inStock,},
    isActive: { type: Boolean, default: true },
    description: { type: String },
    expiry: { type: String , required : true},    
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false });

export const productModel = mongoose.model(modelName.productModelName, productSchema);


