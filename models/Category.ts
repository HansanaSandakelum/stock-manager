import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  description?: string;
  createdAt: Date;
}

const CategorySchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
