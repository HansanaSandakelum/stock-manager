import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Category from '@/models/Category';
import Product from '@/models/Product';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { name, description } = await req.json();
    const resolvedParams = await params;
    await dbConnect();

    const category = await Category.findByIdAndUpdate(
      resolvedParams.id,
      { name, description },
      { new: true, runValidators: true }
    );

    if (!category) return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: category });
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

    // Check if products exist for this category
    const productCount = await Product.countDocuments({ category: resolvedParams.id });
    if (productCount > 0) {
      return NextResponse.json({ success: false, error: 'Cannot delete category with assigned products' }, { status: 400 });
    }

    const category = await Category.findByIdAndDelete(resolvedParams.id);
    if (!category) return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    
    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
