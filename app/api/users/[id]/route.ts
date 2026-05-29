import { NextResponse } from 'next/server';
import { getServerSession, Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User, { IUser } from '@/models/User';

// ── Types ────────────────────────────────────────────────────────────────────

type UserRole = 'admin' | 'staff';

/** Shape of the next-auth session user, extended with our custom fields. */
interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: UserRole;
}

/** Typed request body for PUT /api/users/[id] */
interface PutRequestBody {
  name: string;
  email: string;
  role: UserRole;
  password?: string;
}

/** Returns the typed session user or null if not authenticated / not admin. */
function getAdminUser(session: Session | null): SessionUser | null {
  const user = session?.user as SessionUser | undefined;
  if (!user || user.role !== 'admin') return null;
  return user;
}

// ── PUT ──────────────────────────────────────────────────────────────────────

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const adminUser = getAdminUser(session);
    if (!adminUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body: PutRequestBody = await req.json();
    const { name, email, role, password } = body;

    const resolvedParams = await params;
    const userId = resolvedParams.id;

    // ── Field validation ───────────────────────────────────────────────────
    if (!name || !email || !role) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const validRoles: UserRole[] = ['admin', 'staff'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, { status: 400 });
    }

    // ── Protect against self-demotion ──────────────────────────────────────
    if (adminUser.id === userId && role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Cannot demote your own account' }, { status: 400 });
    }

    await dbConnect();

    const user: IUser | null = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // ── Duplicate email check ──────────────────────────────────────────────
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      _id: { $ne: userId },
    });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 400 });
    }

    // ── Apply updates ──────────────────────────────────────────────────────
    user.name = name;
    user.email = email.toLowerCase();
    user.role = role;

    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }

    await user.save();

    return NextResponse.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const adminUser = getAdminUser(session);
    if (!adminUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = resolvedParams.id;

    // ── Prevent self-deletion ──────────────────────────────────────────────
    if (adminUser.id === userId) {
      return NextResponse.json(
        { success: false, error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    await dbConnect();

    const user: IUser | null = await User.findByIdAndDelete(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


