import mongoose from "mongoose";
import { modelName } from "../../common";

const companySchema = new mongoose.Schema({
  // user: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: modelName.userModelName,
    
  // },
  medicalStoreId: { type: mongoose.Schema.Types.ObjectId, ref: modelName.storeModelName, required: true,},
  userId: { type: mongoose.Schema.Types.ObjectId, ref: modelName.userModelName,},
  name: { type: String,  },
  gstNumber: { type: String,  },
  phone: { type: String,  },
  email: { type: String,  },
  address: { type: String,  },
  city: { type: String,  },
  state: { type: String,  },
  pincode: { type: Number,  },
  logoImage: { type: String },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false }

}, { timestamps: true, versionKey: false });

export const companyModel = mongoose.model(
  modelName.companyModelName,
  companySchema
);


