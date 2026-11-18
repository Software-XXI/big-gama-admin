import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/user';
import { requireRole } from '@/lib/middleware-helpers';
import { getDriverSheetTarget } from '@/lib/queue';
import { formatZodError, userCreateSchema, userQuerySchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const result = await requireRole(request, ['ADMIN']);
  if (result.error) return result.error;

  const { searchParams } = new URL(request.url);
  const parsed = userQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries())
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  const { page, limit, isActive, role } = parsed.data;

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (isActive === 'true') filter.isActive = true;
  if (isActive === 'false') filter.isActive = false;
  if (role) filter.role = role;

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return NextResponse.json({
    data: users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  const result = await requireRole(request, ['ADMIN']);
  if (result.error) return result.error;

  try {
    const body = await request.json().catch(() => null);
    const parsed = userCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con este email' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role: 'CONDUCTOR',
      isActive: true,
    });

    let sheetTab: string | undefined;
    try {
      const target = await getDriverSheetTarget(user.toObject());
      if (target) {
        sheetTab = target.sheetTab;
        await User.findByIdAndUpdate(user._id, {
          spreadsheetId: target.spreadsheetId,
          sheetTab: target.sheetTab,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${target.spreadsheetId}`,
        });
      }
    } catch (sheetErr) {
      console.error(
        'Create user: failed to create driver sheet tab:',
        sheetErr instanceof Error ? sheetErr.message : sheetErr
      );
    }

    const userWithoutPassword = user.toObject() as unknown as Record<string, unknown>;
    delete userWithoutPassword.password;

    return NextResponse.json(
      { ...userWithoutPassword, sheetTab },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
