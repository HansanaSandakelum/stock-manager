import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import Product from '@/models/Product';
import User from '@/models/User';
import Shop from '@/models/Shop';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const product = searchParams.get('product');
    const type = searchParams.get('type');
    const shop = searchParams.get('shop');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: Record<string, unknown> = {};
    if (product) query.product = product;
    if (type) {
      query.type = type;
    }
    if (shop) query.shop = shop;
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.$lte = new Date(dateTo);
      query.date = dateFilter;
    }

    await dbConnect();

    // Ensure models are registered
    void User;
    void Product;
    void Shop;

    const transactions = await Transaction.find(query)
      .populate('product', 'name sku')
      .populate('createdBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Transaction.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { product: productId, type, quantity, note, invoiceNumber, date } = body;

    if (!productId || !type || !quantity || quantity <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid transaction data' }, { status: 400 });
    }

    await dbConnect();

    const product = await Product.findById(productId);
    if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });

    if ((type === 'out' || type === 'free-issue') && product.quantity < quantity) {
      return NextResponse.json({ success: false, error: `Insufficient stock. Current quantity is ${product.quantity}` }, { status: 400 });
    }

    // Update product quantity
    if (type === 'in') {
      product.quantity += quantity;
    } else if (type === 'return') {
      // Returns are tracked separately — do NOT add to main stock
      product.returnedQuantity = (product.returnedQuantity || 0) + quantity;
    } else if (type === 'out') {
      product.quantity -= quantity;
    } else if (type === 'free-issue') {
      product.quantity -= quantity;
      product.freeIssuedQuantity = (product.freeIssuedQuantity || 0) + quantity;
    }
    await product.save();

    const userId = (session.user as { id?: string }).id;

    // Create transaction
    const transaction = await Transaction.create({
      product: productId,
      type,
      quantity,
      note,
      invoiceNumber: invoiceNumber ? String(invoiceNumber).trim() : undefined,
      date: date ? new Date(date) : new Date(),
      createdBy: userId,
    });

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
