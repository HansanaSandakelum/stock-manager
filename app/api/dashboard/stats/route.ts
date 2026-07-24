import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import Transaction from '@/models/Transaction';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    // Use MongoDB aggregation for fast DB-level calculation
    const [productStats] = await Product.aggregate([
      {
        $facet: {
          totalProducts: [{ $count: 'count' }],
          totalValue: [
            {
              $group: {
                _id: null,
                sum: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
              },
            },
          ],
          lowStockCount: [
            {
              $match: {
                $expr: { $lte: ['$quantity', { $ifNull: ['$lowStockThreshold', 10] }] },
              },
            },
            { $count: 'count' },
          ],
        },
      },
    ]);

    const totalProducts = productStats?.totalProducts?.[0]?.count || 0;
    const totalValue = productStats?.totalValue?.[0]?.sum || 0;
    const lowStockCount = productStats?.lowStockCount?.[0]?.count || 0;

    // Get start of month in Colombo timezone to correctly query UTC dates
    const nowStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' });
    const colomboNow = new Date(nowStr);
    colomboNow.setDate(1);
    colomboNow.setHours(0, 0, 0, 0);

    // Convert back to UTC for MongoDB querying
    const colomboOffsetMs = 5.5 * 60 * 60 * 1000;
    const startOfMonthUTC = new Date(colomboNow.getTime() - colomboOffsetMs);

    const monthlyTransactions = await Transaction.countDocuments({
      date: { $gte: startOfMonthUTC },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalProducts,
        totalValue,
        lowStockCount,
        monthlyTransactions,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
