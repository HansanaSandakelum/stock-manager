import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import Product from '@/models/Product';
import User from '@/models/User';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const product = searchParams.get('product');
    const type = searchParams.get('type');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: any = {};
    if (product) query.product = product;
    if (type) query.type = type;
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }

    await dbConnect();
    
    // Ensure models are registered
    if (!User) console.log('User model not loaded');
    if (!Product) console.log('Product model not loaded');

    const transactions = await Transaction.find(query)
      .populate('product', 'name sku')
      .populate('createdBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Transaction.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { product: productId, type, quantity, note, date } = body;

    if (!productId || !type || !quantity || quantity <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid transaction data' }, { status: 400 });
    }

    await dbConnect();

    const product = await Product.findById(productId);
    if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });

    if (type === 'out' && product.quantity < quantity) {
      return NextResponse.json({ success: false, error: `Insufficient stock. Current quantity is ${product.quantity}` }, { status: 400 });
    }

    // Update product quantity
    if (type === 'in') {
      product.quantity += quantity;
    } else {
      product.quantity -= quantity;
    }
    await product.save();

    // Create transaction
    const transaction = await Transaction.create({
      product: productId,
      type,
      quantity,
      note,
      date: date ? new Date(date) : new Date(),
      createdBy: (session.user as any).id,
    });

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
