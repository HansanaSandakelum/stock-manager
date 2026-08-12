import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Shop from '@/models/Shop';
import ShopStock from '@/models/ShopStock';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const shop = await Shop.findById(id).lean();
    if (!shop) return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404 });

    // Get stock summary
    const stockSummary = await ShopStock.aggregate([
      { $match: { shop: shop._id, quantity: { $gt: 0 } } },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: '$productInfo' },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$productInfo.unitPrice'] } },
        },
      },
    ]);

    const summary = stockSummary[0] || { totalProducts: 0, totalQuantity: 0, totalValue: 0 };

    return NextResponse.json({
      success: true,
      data: { ...shop, ...summary },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { name, code, address, phone, contactPerson, isActive } = body;

    await dbConnect();

    const shop = await Shop.findById(id);
    if (!shop) return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404 });

    // Check for duplicate code if changed
    if (code && code.toUpperCase() !== shop.code) {
      const existing = await Shop.findOne({ code: code.toUpperCase(), _id: { $ne: id } });
      if (existing) {
        return NextResponse.json({ success: false, error: 'A shop with this code already exists' }, { status: 400 });
      }
    }

    if (name !== undefined) shop.name = name;
    if (code !== undefined) shop.code = code.toUpperCase();
    if (address !== undefined) shop.address = address;
    if (phone !== undefined) shop.phone = phone;
    if (contactPerson !== undefined) shop.contactPerson = contactPerson;
    if (isActive !== undefined) shop.isActive = isActive;

    await shop.save();

    return NextResponse.json({ success: true, data: shop });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const shop = await Shop.findById(id);
    if (!shop) return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404 });

    // Soft delete — deactivate
    shop.isActive = false;
    await shop.save();

    return NextResponse.json({ success: true, message: 'Shop deactivated' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
