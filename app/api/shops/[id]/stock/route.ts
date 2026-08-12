import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Shop from '@/models/Shop';
import ShopStock from '@/models/ShopStock';
import Product from '@/models/Product';
import Transaction from '@/models/Transaction';
import User from '@/models/User';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    await dbConnect();

    // Ensure models are registered
    void User;
    void Product;

    const shop = await Shop.findById(id);
    if (!shop) return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404 });

    const query: Record<string, unknown> = { shop: shop._id, quantity: { $gt: 0 } };

    const stockItems = await ShopStock.find(query)
      .populate('product', 'name sku unitPrice category quantity image lowStockThreshold')
      .sort({ lastUpdated: -1 })
      .lean();

    // Apply search filter after populate
    let filtered = stockItems;
    if (search) {
      const q = search.toLowerCase();
      filtered = stockItems.filter((item: any) =>
        item.product?.name?.toLowerCase().includes(q) ||
        item.product?.sku?.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ success: true, data: filtered });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { productId, quantity, note, invoiceNumber, date } = body;

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json({ success: false, error: 'Product and valid quantity are required' }, { status: 400 });
    }

    await dbConnect();

    const shop = await Shop.findById(id);
    if (!shop) return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404 });
    if (!shop.isActive) return NextResponse.json({ success: false, error: 'Shop is deactivated' }, { status: 400 });

    const product = await Product.findById(productId);
    if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });

    if (product.quantity < quantity) {
      return NextResponse.json({
        success: false,
        error: `Insufficient warehouse stock. Available: ${product.quantity}`,
      }, { status: 400 });
    }

    // 1. Deduct from main warehouse
    product.quantity -= quantity;
    await product.save();

    // 2. Add to shop stock (upsert)
    await ShopStock.findOneAndUpdate(
      { shop: shop._id, product: product._id },
      { $inc: { quantity }, $set: { lastUpdated: new Date() } },
      { upsert: true, new: true }
    );

    // 3. Create transaction record
    const userId = (session.user as { id?: string }).id;
    const transaction = await Transaction.create({
      product: product._id,
      type: 'shop-issue',
      quantity,
      note: note || `Issued ${quantity} units of ${product.name} to ${shop.name}`,
      invoiceNumber: invoiceNumber ? String(invoiceNumber).trim() : undefined,
      shop: shop._id,
      date: date ? new Date(date) : new Date(),
      createdBy: userId,
    });

    return NextResponse.json({
      success: true,
      data: transaction,
      message: `${quantity} units of ${product.name} issued to ${shop.name}`,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
