import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  product: mongoose.Types.ObjectId;
  type: 'in' | 'out' | 'return' | 'free-issue';
  quantity: number;
  note?: string;
  date: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const TransactionSchema: Schema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  type: { type: String, enum: ['in', 'out', 'return', 'free-issue'], required: true },
  quantity: { type: Number, required: true, min: 1 },
  note: { type: String },
  date: { type: Date, default: Date.now },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
