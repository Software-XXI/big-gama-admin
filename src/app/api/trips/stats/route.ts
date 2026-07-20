import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Trip } from '@/lib/models/trip';
import { requireRole } from '@/lib/middleware-helpers';

export async function GET(request: NextRequest) {
  const result = await requireRole(request, ['ADMIN']);
  if (result.error) return result.error;

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const brand = searchParams.get('brand');
  const userId = searchParams.get('userId');

  await connectDB();

  const filter: Record<string, unknown> = {};

  if (brand) filter.brand = brand;
  if (userId) filter.userId = userId;

  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    filter.createdAt = dateFilter;
  }

  const [totalStats, byBrand, byDriver] = await Promise.all([
    Trip.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          totalKm: { $sum: '$distanceKm' },
          totalTimeMin: { $sum: '$travelTimeMin' },
        },
      },
    ]),
    Trip.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$brand',
          count: { $sum: 1 },
          totalKm: { $sum: '$distanceKm' },
        },
      },
      { $sort: { totalKm: -1 } },
    ]),
    Trip.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { userId: '$userId', driverName: '$driverName' },
          count: { $sum: 1 },
          totalKm: { $sum: '$distanceKm' },
        },
      },
      { $sort: { totalKm: -1 } },
      {
        $project: {
          _id: 0,
          userId: '$_id.userId',
          driverName: '$_id.driverName',
          count: 1,
          totalKm: 1,
        },
      },
    ]),
  ]);

  const stats = totalStats[0] || { totalTrips: 0, totalKm: 0, totalTimeMin: 0 };

  return NextResponse.json({
    totalTrips: stats.totalTrips,
    totalKm: Math.round(stats.totalKm * 100) / 100,
    totalTimeMin: Math.round(stats.totalTimeMin),
    byBrand: byBrand.map((b) => ({
      brand: b._id,
      count: b.count,
      totalKm: Math.round(b.totalKm * 100) / 100,
    })),
    byDriver: byDriver.map((d) => ({
      ...d,
      totalKm: Math.round(d.totalKm * 100) / 100,
    })),
  });
}
