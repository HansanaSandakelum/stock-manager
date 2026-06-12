import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff', 'deliver'], default: 'staff' },
  createdAt: { type: Date, default: Date.now },
});

// Delete cached model to always reflect the latest schema (avoids stale enum issues during hot-reload)
if (mongoose.models.User) {
  delete (mongoose.models as any).User;
}

export default mongoose.model<IUser>('User', UserSchema);
