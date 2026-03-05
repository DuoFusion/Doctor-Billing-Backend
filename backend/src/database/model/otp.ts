import mongoose, { Document } from "mongoose";
import { modelName } from "../../common";

export interface OTPDocument extends Document {
  email: string;
  otp: string;
  expireAt: Date;
  purpose: "signin" | "reset";
}

const otpSchema = new mongoose.Schema<OTPDocument>(
  {
    email: { type: String,  },
    otp: { type: String,  },
    expireAt: { type: Date,  },
    purpose: { type: String, enum: ["signin", "reset"], default: "signin" },
  },
  { timestamps: true }
);

export const otpModel = mongoose.model<OTPDocument>(modelName.otpModelName,otpSchema);

