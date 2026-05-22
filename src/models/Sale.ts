import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISaleItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  sellingPrice: number;
  purchasePrice: number; // Stored to compute exact profit margin later
  taxRate: number; // GST / tax percentage (e.g. 18 for 18% GST)
}

export interface ISale extends Document {
  invoiceNumber: string;
  items: ISaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: "cash" | "upi" | "card";
  cashierId: mongoose.Types.ObjectId;
  cashierName: string; // denormalized for speed & offline use
  cashReceived?: number;
  changeDue?: number;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  sellingPrice: { type: Number, required: true, min: 0 },
  purchasePrice: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0 },
});

const SaleSchema: Schema<ISale> = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    items: [SaleItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ["cash", "upi", "card"], required: true },
    cashierId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    cashierName: { type: String, required: true },
    cashReceived: { type: Number },
    changeDue: { type: Number },
  },
  { timestamps: true }
);

const Sale: Model<ISale> = mongoose.models.Sale || mongoose.model<ISale>("Sale", SaleSchema);

export default Sale;
