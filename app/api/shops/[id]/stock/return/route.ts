import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Shop from '@/models/Shop';
import ShopStock from '@/models/ShopStock';
import Product from '@/models/Product';
import Transaction from '@/models/Transaction';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { productId, quantity, note, date } = body;

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json({ success: false, error: 'Product and valid quantity are required' }, { status: 400 });
    }

    await dbConnect();

    const shop = await Shop.findById(id);
    if (!shop) return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404 });

    const product = await Product.findById(productId);
    if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });

    // Check shop stock
    const shopStock = await ShopStock.findOne({ shop: shop._id, product: product._id });
    if (!shopStock || shopStock.quantity < quantity) {
      return NextResponse.json({
        success: false,
        error: `Insufficient shop stock. Available at ${shop.name}: ${shopStock?.quantity || 0}`,
      }, { status: 400 });
    }

    // 1. Deduct from shop stock
    shopStock.quantity -= quantity;
    shopStock.lastUpdated = new Date();
    await shopStock.save();

    // 2. Add back to main warehouse
    product.quantity += quantity;
    await product.save();

    // 3. Create transaction record
    const userId = (session.user as { id?: string }).id;
    const transaction = await Transaction.create({
      product: product._id,
      type: 'shop-return',
      quantity,
      note: note || `Returned ${quantity} units of ${product.name} from ${shop.name} to warehouse`,
      shop: shop._id,
      date: date ? new Date(date) : new Date(),
      createdBy: userId,
    });

    return NextResponse.json({
      success: true,
      data: transaction,
      message: `${quantity} units of ${product.name} returned from ${shop.name}`,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
