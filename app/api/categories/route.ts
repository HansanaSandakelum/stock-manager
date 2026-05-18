import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Category from '@/models/Category';
import Product from '@/models/Product';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const categories = await Category.find({}).sort({ name: 1 });
    
    // Get product count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const count = await Product.countDocuments({ category: cat._id });
        return { ...cat.toObject(), productCount: count };
      })
    );

    return NextResponse.json({ success: true, data: categoriesWithCount });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { name, description } = await req.json();
    if (!name) return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });

    await dbConnect();
    
    const existing = await Category.findOne({ name });
    if (existing) return NextResponse.json({ success: false, error: 'Category already exists' }, { status: 400 });

    const category = await Category.create({ name, description });
    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
