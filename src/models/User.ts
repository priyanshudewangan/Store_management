import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  username: string;
  password?: string; // Optional so we don't accidentally select it and send to client
  name: string;
  role: "admin" | "cashier";
  createdAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["admin", "cashier"], default: "cashier" },
  },
  { timestamps: true }
);

// Prevent mongoose from compiling model multiple times
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
