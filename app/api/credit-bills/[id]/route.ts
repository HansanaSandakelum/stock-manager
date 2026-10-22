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

    const bill = await CreditBill.findById(id)
      .populate('createdBy', 'name email')
      .populate('paymentHistory.recordedBy', 'name');
    if (!bill) return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: bill });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ── PATCH /api/credit-bills/[id] ─────────────────────────────────────────────
// Supports: record payment, update status, update note/dueDate, update chequeStatus
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const role = (session.user as { role?: string }).role;
    if (role === 'deliver') {
      return NextResponse.json({ success: false, error: 'Forbidden: Deliver role is not permitted to edit credit bills or record payments' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      paymentAmount,
      paymentNote,
      paymentMethod = 'Cash',
      chequeNumber,
      bankName,
      chequeDate,
      chequeStatus = 'Pending',
      note,
      dueDate,
      forceStatus,
    } = body;

    await dbConnect();
    void User;

    const bill = await CreditBill.findById(id);
    if (!bill) return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 });

    // Record a new payment
    if (paymentAmount && paymentAmount > 0) {
      if (paymentMethod === 'Cheque' && (!chequeNumber || !chequeNumber.trim())) {
        return NextResponse.json({ success: false, error: 'Cheque number is required for cheque payments' }, { status: 400 });
      }

      const userId = (session.user as { id?: string }).id;
      const isCheque = paymentMethod === 'Cheque';
      const resolvedChequeDate = isCheque && chequeDate ? new Date(chequeDate) : (isCheque ? new Date() : undefined);

      bill.paymentHistory.push({
        amount: paymentAmount,
        date: new Date(),
        paymentMethod: paymentMethod || 'Cash',
        chequeNumber: isCheque ? chequeNumber.trim() : undefined,
        bankName: isCheque ? (bankName ? bankName.trim() : undefined) : undefined,
        chequeDate: resolvedChequeDate,
        chequeStatus: isCheque ? (chequeStatus || 'Pending') : undefined,
        note: paymentNote || (isCheque ? `Cheque #${chequeNumber.trim()}${bankName ? ' (' + bankName.trim() + ')' : ''}` : ''),
        recordedBy: userId,
      });
      bill.amountPaid = Math.min(bill.grandTotal, (bill.amountPaid || 0) + paymentAmount);

      if (isCheque) {
        bill.paymentMethod = 'Cheque';
        bill.chequeNumber = chequeNumber.trim();
        bill.bankName = bankName ? bankName.trim() : undefined;
        bill.chequeDate = resolvedChequeDate;
        bill.chequeStatus = chequeStatus || 'Pending';
      }
    }

    // Direct cheque status update
    if (chequeStatus && (!paymentAmount || paymentAmount <= 0)) {
      bill.chequeStatus = chequeStatus;
      if (bill.paymentHistory && bill.paymentHistory.length > 0) {
        for (let i = bill.paymentHistory.length - 1; i >= 0; i--) {
          if (bill.paymentHistory[i].paymentMethod === 'Cheque') {
            bill.paymentHistory[i].chequeStatus = chequeStatus;
            break;
          }
        }
      }
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
