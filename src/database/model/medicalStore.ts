import mongoose from "mongoose";
import { modelName, TAX_TYPE } from "../../common";

const storeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    defaultCompanyAddress: { type: String, default: "" },
    defaultCompanyCity: { type: String, default: "" },
    defaultCompanyState: { type: String, default: "" },
    defaultCompanyPincode: { type: String, default: "" },
    panNumber: { type: String, default: "" }, // pan number
    gstNumber: { type: String, default: "" }, // gst number
    taxType: { type: String, enum: Object.values(TAX_TYPE), default: TAX_TYPE.SGST_CGST },
    taxPercent: { type: Number, default: 0 },
    signatureImg: {
            path: { type: String, default: "" },
            filename: { type: String, default: "" },
            originalName: { type: String, default: "" },
            size: { type: Number, default: 0 },
            mimetype: { type: String, default: "" },
            width: { type: Number },
            height: { type: Number },
    },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false });

export const storeModel = mongoose.model(modelName.storeModelName, storeSchema); //storemodel
