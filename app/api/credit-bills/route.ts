import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import CreditBill from '@/models/CreditBill';
import Product from '@/models/Product';
import Transaction from '@/models/Transaction';
import User from '@/models/User';

// ── Helper: generate unique bill number ──────────────────────────────────────
async function generateBillNumber(): Promise<string> {
  const today = new Date();
  const dateStr =
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');

  const prefix = `CB-${dateStr}-`;
  const last = await CreditBill.findOne(
    { billNumber: { $regex: `^${prefix}` } },
    { billNumber: 1 },
    { sort: { billNumber: -1 } },
  );

  let seq = 1;
  if (last) {
    const parts = last.billNumber.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}${String(seq).padStart(3, '0')}`;
}

// ── GET /api/credit-bills ────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    await dbConnect();
    // Ensure models are registered
    void User;

    const query: Record<string, unknown> = {};
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { billNumber: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
      ];
    }

    const bills = await CreditBill.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await CreditBill.countDocuments(query);

    // Summary stats
    const [stats] = await CreditBill.aggregate([
      {
        $group: {
          _id: null,
          totalBills: { $sum: 1 },
          totalGrand: { $sum: '$grandTotal' },
          totalPaid: { $sum: '$amountPaid' },
          totalOutstanding: { $sum: { $subtract: ['$grandTotal', '$amountPaid'] } },
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      data: bills,
      pagination: { total, page, pages: Math.ceil(total / limit) },
      stats: stats || { totalBills: 0, totalGrand: 0, totalPaid: 0, totalOutstanding: 0 },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ── POST /api/credit-bills ───────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { customerName, customerPhone, customerAddress, items, discount = 0, dueDate, note, amountPaid = 0 } = body;

    if (!customerName || !items || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Customer name and at least one item are required' }, { status: 400 });
    }

    await dbConnect();
    void User;

    // Validate and enrich each item, check stock
    const enrichedItems: Array<{
      product: string;
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }> = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return NextResponse.json({ success: false, error: `Product not found: ${item.product}` }, { status: 404 });
      }
      if (product.quantity < item.quantity) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for "${product.name}". Available: ${product.quantity}` },
          { status: 400 },
        );
      }
      enrichedItems.push({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? product.unitPrice,
        total: (item.unitPrice ?? product.unitPrice) * item.quantity,
      });
    }

    const subTotal = enrichedItems.reduce((s, i) => s + i.total, 0);
    const grandTotal = Math.max(0, subTotal - (discount || 0));

    if (amountPaid < 0) {
      return NextResponse.json({ success: false, error: 'Amount paid cannot be negative' }, { status: 400 });
    }
    if (amountPaid > grandTotal) {
      return NextResponse.json({ success: false, error: 'Amount paid cannot exceed the grand total' }, { status: 400 });
    }

    const billNumber = await generateBillNumber();
    const userId = (session.user as { id?: string; email?: string }).id;

    // Deduct stock and create transaction records atomically
    for (const item of enrichedItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } });
      await Transaction.create({
        product: item.product,
        type: 'out',
        quantity: item.quantity,
        note: `Credit Bill ${billNumber} – ${item.productName}`,
        date: new Date(),
        createdBy: userId,
      });
    }

    // Create the bill
    const bill = await CreditBill.create({
      billNumber,
      customerName,
      customerPhone,
      customerAddress,
      items: enrichedItems,
      subTotal,
      discount: discount || 0,
      grandTotal,
      amountPaid,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      note,
      paymentHistory: amountPaid > 0 ? [{
        amount: amountPaid,
        date: new Date(),
        note: 'Initial payment recorded during bill creation',
        recordedBy: userId,
      }] : [],
      createdBy: userId,
    });

    return NextResponse.json({ success: true, data: bill }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

