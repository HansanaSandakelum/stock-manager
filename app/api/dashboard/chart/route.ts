import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    // Calculate exactly 7 days ago in Colombo midnight, converted to UTC
    const nowStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' });
    const colomboNow = new Date(nowStr);
    colomboNow.setDate(colomboNow.getDate() - 7);
    colomboNow.setHours(0, 0, 0, 0);
    
    const colomboOffsetMs = 5.5 * 60 * 60 * 1000;
    const sevenDaysAgoUTC = new Date(colomboNow.getTime() - colomboOffsetMs);

    const transactions = await Transaction.find({
      date: { $gte: sevenDaysAgoUTC }
    });

    // Aggregate by day
    const chartDataMap: Record<string, { date: string, in: number, out: number }> = {};
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { timeZone: 'Asia/Colombo', month: 'short', day: 'numeric' });
      chartDataMap[dateStr] = { date: dateStr, in: 0, out: 0 };
    }

    transactions.forEach(t => {
      const dateStr = new Date(t.date).toLocaleDateString('en-US', { timeZone: 'Asia/Colombo', month: 'short', day: 'numeric' });
      if (chartDataMap[dateStr]) {
        if (t.type === 'in') {
          chartDataMap[dateStr].in += t.quantity;
        } else {
          chartDataMap[dateStr].out += t.quantity;
        }
      }
    });

    const chartData = Object.values(chartDataMap);

    return NextResponse.json({ success: true, data: chartData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
