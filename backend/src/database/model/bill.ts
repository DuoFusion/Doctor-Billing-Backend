import mongoose from "mongoose";
import { modelName } from "../../common";
import { BILL_STATUS, PAYMENT_METHOD } from "../../common/enum";

// Bill Item Schema
const billItemSchema = new mongoose.Schema({
  srNo: { type: Number,  },            
  product: {type: mongoose.Schema.Types.ObjectId, ref: modelName.productModelName,},
  name: { type: String,  },
  category: { type: String,  },
  qty: { type: Number,  },
  freeQty: { type: Number, default: 0 },
  mrp: { type: Number,  },
  rate: { type: Number,  },            
  expiry: { type: String },                       
  gstAmount: { type: Number,  },
  total: { type: Number,  },         
  discount: { type: Number, default: 0 },          
  sgst: { type: Number, default: 0 },
  cgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  company: {                                       
    type: mongoose.Schema.Types.ObjectId,
    ref: modelName.companyModelName,
  },
}, { _id: false });

// Bill Schema
const billSchema = new mongoose.Schema({
  billNumber: { type: String, unique: true }, 
  medicalStoreId: { type: mongoose.Schema.Types.ObjectId, ref: modelName.storeModelName, },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: modelName.userModelName,},
  items: [billItemSchema],
  subTotal: { type: Number,  },    
  totalGST: { type: Number,  },
  discount: { type: Number, default: 0 },        
  grandTotal: { type: Number,  },   
  paymentMethod: {type: String,enum: Object.values(PAYMENT_METHOD),},
  billStatus: {type: String,enum: Object.values(BILL_STATUS),default: BILL_STATUS.paid},
  isActive: { type: Boolean, default: true },
  isDeleted : {type : Boolean , default : false}

}, { timestamps: true, versionKey: false });


export const billModel = mongoose.model(modelName.billModelName, billSchema);


