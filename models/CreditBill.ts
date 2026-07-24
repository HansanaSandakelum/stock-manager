import mongoose, { Schema, Document } from 'mongoose';

export interface IBillItem {
  product?: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IPaymentRecord {
  amount: number;
  date: Date;
  note?: string;
  recordedBy?: mongoose.Types.ObjectId;
}

export interface ICreditBill extends Document {
  billNumber: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: IBillItem[];
  subTotal: number;
  discount: number;
  grandTotal: number;
  amountPaid: number;
  status: 'Pending' | 'Partially Paid' | 'Paid' | 'Overdue';
  dueDate?: Date;
  note?: string;
  isHistorical: boolean;
  paymentHistory: IPaymentRecord[];
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BillItemSchema = new Schema<IBillItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: false },
    productName: { type: String, required: true },
    sku: { type: String, default: 'N/A' },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const PaymentRecordSchema = new Schema<IPaymentRecord>(
  {
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    note: { type: String },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false },
);

const CreditBillSchema: Schema = new Schema(
  {
    billNumber: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String },
    customerAddress: { type: String },
    items: { type: [BillItemSchema], required: true, validate: [(v: IBillItem[]) => v.length > 0, 'At least one item is required'] },
    subTotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['Pending', 'Partially Paid', 'Paid', 'Overdue'],
      default: 'Pending',
    },
    dueDate: { type: Date },
    note: { type: String },
    isHistorical: { type: Boolean, default: false },
    paymentHistory: { type: [PaymentRecordSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// Auto-compute status on save
CreditBillSchema.pre<ICreditBill>('save', function (this: ICreditBill) {
  if (this.amountPaid >= this.grandTotal) {
    this.status = 'Paid';
  } else if (this.amountPaid > 0) {
    this.status = 'Partially Paid';
  } else if (this.dueDate && new Date() > this.dueDate && this.amountPaid < this.grandTotal) {
    this.status = 'Overdue';
  } else {
    this.status = 'Pending';
  }
});

CreditBillSchema.index({ customerName: 1 });
CreditBillSchema.index({ customerPhone: 1 });
CreditBillSchema.index({ status: 1 });
CreditBillSchema.index({ dueDate: 1 });
CreditBillSchema.index({ createdAt: -1 });

export default mongoose.models.CreditBill || mongoose.model<ICreditBill>('CreditBill', CreditBillSchema);
