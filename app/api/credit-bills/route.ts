import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import CreditBill from '@/models/CreditBill';
import Product from '@/models/Product';
import Transaction from '@/models/Transaction';
import User from '@/models/User';

// ── Helper: generate unique bill number ──────────────────────────────────────
async function generateBillNumber(sku: string): Promise<string> {
  // Get current date string in Colombo timezone
  const nowStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' });
  const today = new Date(nowStr);
  
  const dateStr =
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');

  const prefix = `CB-${dateStr}-${sku}-`;
  const last = await CreditBill.findOne(
    { billNumber: { $regex: `^${prefix}` } },
    { billNumber: 1 },
    { sort: { billNumber: -1 } },
  );

  let seq = 1;
  if (last) {
    const parts = last.billNumber.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}${String(seq).padStart(3, '0')}`;
}

// ── GET /api/credit-bills ────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate') || searchParams.get('dateFrom');
    const endDate = searchParams.get('endDate') || searchParams.get('dateTo');
    const dateType = searchParams.get('dateType') === 'dueDate' ? 'dueDate' : 'createdAt';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    await dbConnect();
    // Ensure models are registered
    void User;

    const query: Record<string, unknown> = {};
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { billNumber: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { chequeNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) {
        const d = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00.000`);
        if (!isNaN(d.getTime())) {
          d.setHours(0, 0, 0, 0);
          dateFilter.$gte = d;
        }
      }
      if (endDate) {
        const d = new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999`);
        if (!isNaN(d.getTime())) {
          d.setHours(23, 59, 59, 999);
          dateFilter.$lte = d;
        }
      }
      if (Object.keys(dateFilter).length > 0) {
        if (dateType === 'dueDate') {
          query.dueDate = dateFilter;
        } else {
          query.createdAt = dateFilter;
        }
      }
    }

    const sortOrder: Record<string, 1 | -1> =
      dateType === 'dueDate' ? { dueDate: -1, createdAt: -1 } : { createdAt: -1 };

    const bills = await CreditBill.find(query)
      .populate('createdBy', 'name')
      .sort(sortOrder)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await CreditBill.countDocuments(query);

    // Summary stats (reflecting active filters)
    const statsPipeline: any[] = [];
    if (Object.keys(query).length > 0) {
      statsPipeline.push({ $match: query });
    }
    statsPipeline.push({
      $group: {
        _id: null,
        totalBills: { $sum: 1 },
        totalGrand: { $sum: '$grandTotal' },
        totalPaid: { $sum: '$amountPaid' },
        totalOutstanding: { $sum: { $subtract: ['$grandTotal', '$amountPaid'] } },
      },
    });

    const [stats] = await CreditBill.aggregate(statsPipeline);

    // Compute monthly stats for current month and last 3 months
    const now = new Date();
    const fourMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0, 0);

    const monthlyPipeline: any[] = [
      {
        $match: {
          createdAt: { $gte: fourMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: { date: '$createdAt', timezone: '+05:30' } },
            month: { $month: { date: '$createdAt', timezone: '+05:30' } },
          },
          totalBills: { $sum: 1 },
          totalSales: { $sum: '$grandTotal' },
          totalCollected: { $sum: '$amountPaid' },
          outstanding: { $sum: { $subtract: ['$grandTotal', '$amountPaid'] } },
        },
      },
      {
        $sort: {
          '_id.year': -1,
          '_id.month': -1,
        },
      },
    ];

    const monthlyRaw = await CreditBill.aggregate(monthlyPipeline);

    const monthlyDetails = [0, 1, 2, 3].map((offset) => {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const yr = d.getFullYear();
      const mth = d.getMonth() + 1;
      const found = monthlyRaw.find(
        (item: any) => item._id && item._id.year === yr && item._id.month === mth,
      );
      const monthName = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const firstDay = new Date(yr, mth - 1, 1);
      const lastDay = new Date(yr, mth, 0);
      const formatDateStr = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      return {
        monthKey: `${yr}-${String(mth).padStart(2, '0')}`,
        label: monthName,
        shortLabel: d.toLocaleString('en-US', { month: 'short' }),
        year: yr,
        month: mth,
        startDate: formatDateStr(firstDay),
        endDate: formatDateStr(lastDay),
        isCurrent: offset === 0,
        offset,
        totalBills: found?.totalBills || 0,
        totalSales: found?.totalSales || 0,
        totalCollected: found?.totalCollected || 0,
        outstanding: Math.max(0, found?.outstanding || 0),
      };
    });

    const currentMonthStats = monthlyDetails[0];
    const previous3MonthsList = monthlyDetails.slice(1, 4);
    const last3MonthsCombinedStats = {
      totalBills: monthlyDetails.slice(0, 3).reduce((acc, m) => acc + m.totalBills, 0),
      totalSales: monthlyDetails.slice(0, 3).reduce((acc, m) => acc + m.totalSales, 0),
      totalCollected: monthlyDetails.slice(0, 3).reduce((acc, m) => acc + m.totalCollected, 0),
      outstanding: monthlyDetails.slice(0, 3).reduce((acc, m) => acc + m.outstanding, 0),
    };

    return NextResponse.json({
      success: true,
      data: bills,
      pagination: { total, page, pages: Math.ceil(total / limit) },
      stats: stats || { totalBills: 0, totalGrand: 0, totalPaid: 0, totalOutstanding: 0 },
      monthlyDetails,
      currentMonthStats,
      previous3MonthsList,
      last3MonthsCombinedStats,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ── POST /api/credit-bills ───────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      customerName,
      customerPhone,
      customerAddress,
      items,
      discount = 0,
      dueDate,
      note,
      amountPaid = 0,
      isHistorical = false,
      billDate,
      paymentMethod = 'Cash',
      chequeNumber,
      bankName,
      chequeDate,
      chequeStatus = 'Pending',
    } = body;

    if (!customerName || !items || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Customer name and at least one item are required' }, { status: 400 });
    }

    if (paymentMethod === 'Cheque' && amountPaid > 0) {
      if (!chequeNumber || !chequeNumber.trim()) {
        return NextResponse.json({ success: false, error: 'Cheque number is required for cheque payments' }, { status: 400 });
      }
    }

    await dbConnect();
    void User;

    const userId = (session.user as { id?: string; email?: string }).id;

    const enrichedItems: Array<{
      product?: string;
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }> = [];

    if (isHistorical) {
      // ── Historical bill: free-text items, no stock check or deduction ──
      for (const item of items) {
        if (!item.productName || !item.quantity || !item.unitPrice) {
          return NextResponse.json(
            { success: false, error: 'Each item requires a product name, quantity, and unit price' },
            { status: 400 },
          );
        }
        const qty = Number(item.quantity);
        const price = Number(item.unitPrice);
        enrichedItems.push({
          productName: item.productName,
          sku: item.sku || 'N/A',
          quantity: qty,
          unitPrice: price,
          total: qty * price,
        });
      }
    } else {
      // ── Normal bill: validate stock, deduct, create transactions ──
      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
          return NextResponse.json({ success: false, error: `Product not found: ${item.product}` }, { status: 404 });
        }
        if (product.quantity < item.quantity) {
          return NextResponse.json(
            { success: false, error: `Insufficient stock for "${product.name}". Available: ${product.quantity}` },
            { status: 400 },
          );
        }
        enrichedItems.push({
          product: product._id,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice ?? product.unitPrice,
          total: (item.unitPrice ?? product.unitPrice) * item.quantity,
        });
      }
    }

    const subTotal = enrichedItems.reduce((s, i) => s + i.total, 0);
    const grandTotal = Math.max(0, subTotal - (discount || 0));

    if (amountPaid < 0) {
      return NextResponse.json({ success: false, error: 'Amount paid cannot be negative' }, { status: 400 });
    }
    if (amountPaid > grandTotal) {
      return NextResponse.json({ success: false, error: 'Amount paid cannot exceed the grand total' }, { status: 400 });
    }

    const mainSku = enrichedItems.length > 0 ? (enrichedItems[0].sku || 'HIST') : 'HIST';
    const billNumber = await generateBillNumber(mainSku);

    if (!isHistorical) {
      // Deduct stock and create transaction records for normal bills only
      for (const item of enrichedItems) {
        await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } });
        await Transaction.create({
          product: item.product,
          type: 'out',
          quantity: item.quantity,
          note: `Credit Bill ${billNumber} – ${item.productName}`,
          date: new Date(),
          createdBy: userId,
        });
      }
    }

    const isCheque = paymentMethod === 'Cheque' && amountPaid > 0;
    const resolvedChequeDate = isCheque && chequeDate ? new Date(chequeDate) : (isCheque ? new Date() : undefined);

    // Create the bill
    const bill = await CreditBill.create({
      billNumber,
      customerName,
      customerPhone,
      customerAddress,
      items: enrichedItems,
      subTotal,
      discount: discount || 0,
      grandTotal,
      amountPaid,
      paymentMethod: amountPaid > 0 ? paymentMethod : 'Credit',
      chequeNumber: isCheque ? chequeNumber.trim() : undefined,
      bankName: isCheque ? (bankName ? bankName.trim() : undefined) : undefined,
      chequeDate: resolvedChequeDate,
      chequeStatus: isCheque ? (chequeStatus || 'Pending') : undefined,
      isHistorical,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      note,
      createdAt: billDate ? new Date(billDate) : new Date(),
      paymentHistory: amountPaid > 0 ? [{
        amount: amountPaid,
        date: new Date(),
        paymentMethod: paymentMethod || 'Cash',
        chequeNumber: isCheque ? chequeNumber.trim() : undefined,
        bankName: isCheque ? (bankName ? bankName.trim() : undefined) : undefined,
        chequeDate: resolvedChequeDate,
        chequeStatus: isCheque ? (chequeStatus || 'Pending') : undefined,
        note: isHistorical
          ? (isCheque ? `Cheque #${chequeNumber.trim()}${bankName ? ' (' + bankName.trim() + ')' : ''}` : 'Initial payment recorded during historical bill import')
          : (isCheque ? `Cheque #${chequeNumber.trim()}${bankName ? ' (' + bankName.trim() + ')' : ''}` : 'Initial payment recorded during bill creation'),
        recordedBy: userId,
      }] : [],
      createdBy: userId,
    });

    return NextResponse.json({ success: true, data: bill }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

