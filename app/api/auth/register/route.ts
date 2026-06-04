import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();

    // Check if there are any users in the DB
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      // Secure check: require authenticated admin session
      const session = await getServerSession(authOptions);
      if (!session || (session.user as any)?.role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Unauthorized. Only admins can register new users.' }, { status: 403 });
      }
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // If it's the very first user, they must be an admin. Otherwise, use provided role or fallback to staff.
    const finalRole = userCount === 0 ? 'admin' : (role || 'staff');

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: finalRole,
    });

    return NextResponse.json({ success: true, data: { id: user._id, name: user.name, email: user.email, role: user.role } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await dbConnect();
    const count = await User.countDocuments();
    return NextResponse.json({ hasUsers: count > 0 });
  } catch (error: any) {
    return NextResponse.json({ hasUsers: true });
  }
}
