import mongoose, { Schema, Document } from 'mongoose';

export interface IShop extends Document {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  contactPerson?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShopSchema: Schema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  address: { type: String },
  phone: { type: String },
  contactPerson: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

ShopSchema.index({ name: 1 });
ShopSchema.index({ code: 1 });
ShopSchema.index({ isActive: 1 });

export default mongoose.models.Shop || mongoose.model<IShop>('Shop', ShopSchema);
