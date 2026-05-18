import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import Product from '@/models/Product';
import User from '@/models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    
    if (!Product) console.log('Product model not loaded');
    if (!User) console.log('User model not loaded');

    const recentTransactions = await Transaction.find({})
      .populate('product', 'name')
      .populate('createdBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .limit(10);

    return NextResponse.json({ success: true, data: recentTransactions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
