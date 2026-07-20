import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/user';
import { requireRole } from '@/lib/middleware-helpers';

export async function GET(request: NextRequest) {
  const result = await requireRole(request, ['ADMIN']);
  if (result.error) return result.error;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const isActive = searchParams.get('isActive');
  const role = searchParams.get('role');

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
