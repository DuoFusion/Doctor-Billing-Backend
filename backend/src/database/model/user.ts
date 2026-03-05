import mongoose from "mongoose";
import { modelName, ROLES } from "../../common";

const userSchema = new mongoose.Schema(
  {
    name: { type: String,trim: true },
    email: { type: String,unique: true, lowercase: true, trim: true },
    password: { type: String},
    phone: { type: String, default: "" },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.user,},
    medicalStoreId: { type: mongoose.Schema.Types.ObjectId, ref: modelName.storeModelName },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false},
  },
  { timestamps: true, versionKey: false }
);

export const userModel = mongoose.model(modelName.userModelName,userSchema);



// import mongoose from "mongoose";
// import { modelName, ROLES } from "../../common";

// const authSchema = new mongoose.Schema({
//     name : {type : String , },
//     medicalName: { type: String, default: "" },
//     email : {type : String , },
//     password : {type : String , },
//     role : {type : String , enum : Object.values(ROLES) , default : ROLES.user},
//     isActive : {type : Boolean , default : true},
//     phone : {type : String , default : ""},
//     address : {type : String , default : ""},
//     city : {type : String , default : ""},
//     state : {type : String , default : ""},
//     pincode : {type : String , default : ""},
//     pan: { type: String, default: "" },
//     gstin: { type: String, default: "" },
//     signatureImg: {
//         path: { type: String, default: "" },
//         filename: { type: String, default: "" },
//         originalName: { type: String, default: "" },
//         size: { type: Number, default: 0 },
//         mimetype: { type: String, default: "" },
//         width: { type: Number },
//         height: { type: Number },
//     },
//     // userId: {type: mongoose.Schema.Types.ObjectId, ref: "auth"},
//     isDeleted : {type : Boolean , default : false}
// } , {timestamps : true  , versionKey : false})

// export const authCollection = mongoose.model(modelName.authModelName, authSchema);

