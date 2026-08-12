import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Shop from '@/models/Shop';
import ShopStock from '@/models/ShopStock';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const showInactive = searchParams.get('showInactive') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    await dbConnect();

    const query: Record<string, unknown> = {};
    if (!showInactive) query.isActive = true;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
      ];
    }

    const shops = await Shop.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Shop.countDocuments(query);

    // Get stock summary for each shop
    const shopIds = shops.map((s: any) => s._id);
    const stockSummary = await ShopStock.aggregate([
      { $match: { shop: { $in: shopIds }, quantity: { $gt: 0 } } },
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
          _id: '$shop',
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$productInfo.unitPrice'] } },
        },
      },
    ]);

    const stockMap = new Map(stockSummary.map((s: any) => [s._id.toString(), s]));

    const shopsWithStock = shops.map((shop: any) => {
      const stock = stockMap.get(shop._id.toString());
      return {
        ...shop,
        totalProducts: stock?.totalProducts || 0,
        totalQuantity: stock?.totalQuantity || 0,
        totalValue: stock?.totalValue || 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: shopsWithStock,
      pagination: { total, page, pages: Math.ceil(total / limit) },
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
    const { name, code, address, phone, contactPerson } = body;

    if (!name || !code) {
      return NextResponse.json({ success: false, error: 'Shop name and code are required' }, { status: 400 });
    }

    await dbConnect();

    // Check for duplicate code
    const existing = await Shop.findOne({ code: code.toUpperCase() });
    if (existing) {
      return NextResponse.json({ success: false, error: 'A shop with this code already exists' }, { status: 400 });
    }

    const shop = await Shop.create({
      name,
      code: code.toUpperCase(),
      address,
      phone,
      contactPerson,
    });

    return NextResponse.json({ success: true, data: shop }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
