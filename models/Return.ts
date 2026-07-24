import mongoose, { Schema, Document } from 'mongoose';

export interface IReturn extends Document {
  product: mongoose.Types.ObjectId;
  quantity: number;
  reason: string;
  status: 'Pending' | 'Restocked' | 'Discarded';
  customerName?: string;
  date: Date;
  processedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReturnSchema: Schema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Restocked', 'Discarded'], default: 'Pending' },
  customerName: { type: String },
  date: { type: Date, default: Date.now },
  processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ReturnSchema.index({ status: 1 });
ReturnSchema.index({ product: 1 });
ReturnSchema.index({ date: -1 });

export default mongoose.models.Return || mongoose.model<IReturn>('Return', ReturnSchema);
