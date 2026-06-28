import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import CreditBill from '@/models/CreditBill';
import Product from '@/models/Product';
import User from '@/models/User';

// ── GET /api/credit-bills/[id] ───────────────────────────────────────────────
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();
    void User;

    const bill = await CreditBill.findById(id).populate('createdBy', 'name email');
    if (!bill) return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: bill });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ── PATCH /api/credit-bills/[id] ─────────────────────────────────────────────
// Supports: record payment, update status, update note/dueDate
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { paymentAmount, paymentNote, note, dueDate, forceStatus } = body;

    await dbConnect();
    void User;

    const bill = await CreditBill.findById(id);
    if (!bill) return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 });

    // Record a new payment
    if (paymentAmount && paymentAmount > 0) {
      const userId = (session.user as { id?: string }).id;
      bill.paymentHistory.push({
        amount: paymentAmount,
        date: new Date(),
        note: paymentNote || '',
        recordedBy: userId,
      });
      bill.amountPaid = Math.min(bill.grandTotal, (bill.amountPaid || 0) + paymentAmount);
    }

    // Update optional fields
    if (note !== undefined) bill.note = note;
    if (dueDate !== undefined) bill.dueDate = dueDate ? new Date(dueDate) : undefined;

    // Force status override (admin only)
    if (forceStatus) {
      const role = (session.user as { role?: string }).role;
      if (role === 'admin' || role === 'manager') {
        bill.status = forceStatus;
      }
    }

    // Status is auto-computed by pre-save hook
    await bill.save();

    return NextResponse.json({ success: true, data: bill });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ── DELETE /api/credit-bills/[id] ────────────────────────────────────────────
// Admin/manager only — restores stock
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const role = (session.user as { role?: string }).role;
    if (role !== 'admin' && role !== 'manager') {
      return NextResponse.json({ success: false, error: 'Forbidden: only admin/manager can delete bills' }, { status: 403 });
    }

    const { id } = await params;
    await dbConnect();
    void User;

    const bill = await CreditBill.findById(id);
    if (!bill) return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 });

    // Restore stock for each line item
    for (const item of bill.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity } });
    }

    await CreditBill.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Bill deleted and stock restored' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
