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

    const products = await Product.find({});
    
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
    const lowStockCount = products.filter(p => p.quantity <= p.lowStockThreshold).length;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyTransactions = await Transaction.countDocuments({
      date: { $gte: startOfMonth }
    });

    return NextResponse.json({
      success: true,
      data: {
        totalProducts,
        totalValue,
        lowStockCount,
        monthlyTransactions
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
