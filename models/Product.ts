import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  sku: string;
  category: mongoose.Types.ObjectId;
  quantity: number;
  returnedQuantity: number;
  freeIssuedQuantity: number;
  unitPrice: number;
  supplier?: string;
  lowStockThreshold: number;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
  quantity: { type: Number, required: true, default: 0, min: 0 },
  returnedQuantity: { type: Number, default: 0, min: 0 },
  freeIssuedQuantity: { type: Number, default: 0, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  supplier: { type: String },
  lowStockThreshold: { type: Number, default: 10 },
  image: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
