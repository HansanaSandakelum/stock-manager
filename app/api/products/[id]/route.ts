import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import Transaction from '@/models/Transaction';
import Category from '@/models/Category';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    await dbConnect();
    if (!Category) console.log('Category not loaded');
    
    const product = await Product.findById(resolvedParams.id).populate('category', 'name');
    if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    body.updatedAt = Date.now();
    
    const resolvedParams = await params;
    await dbConnect();

    if (body.sku) {
      const existingSku = await Product.findOne({ sku: body.sku, _id: { $ne: resolvedParams.id } });
      if (existingSku) return NextResponse.json({ success: false, error: 'SKU already exists' }, { status: 400 });
    }

    const product = await Product.findByIdAndUpdate(resolvedParams.id, body, { new: true, runValidators: true });
    if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    await dbConnect();

    const product = await Product.findByIdAndDelete(resolvedParams.id);
    if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });

    // Cascade delete transactions
    await Transaction.deleteMany({ product: resolvedParams.id });

    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
