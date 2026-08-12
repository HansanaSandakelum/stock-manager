import mongoose, { Schema, Document } from 'mongoose';

export interface IShopStock extends Document {
  shop: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  quantity: number;
  lastUpdated: Date;
}

const ShopStockSchema: Schema = new Schema({
  shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, default: 0, min: 0 },
  lastUpdated: { type: Date, default: Date.now },
});

// Each shop can only have one entry per product
ShopStockSchema.index({ shop: 1, product: 1 }, { unique: true });
ShopStockSchema.index({ shop: 1 });
ShopStockSchema.index({ product: 1 });

export default mongoose.models.ShopStock || mongoose.model<IShopStock>('ShopStock', ShopStockSchema);
