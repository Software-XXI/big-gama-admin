import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/user';
import { requireRole } from '@/lib/middleware-helpers';
import { getDefaultSheet, verifySheetAccess, ensureDriverTab } from '@/lib/google-sheets';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole(request, ['ADMIN']);
  if (result.error) return result.error;

  try {
    const { id } = await params;
    await connectDB();

    const user = await User.findById(id).select('-password').lean();
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const sheet = getDefaultSheet();
    if (!sheet) {
      return NextResponse.json(
        { error: 'No hay hoja de cálculo predeterminada configurada (GOOGLE_SHEETS_DEFAULT_ID)' },
        { status: 500 }
      );
    }

    const accessible = await verifySheetAccess(sheet.spreadsheetId);
    if (!accessible) {
      return NextResponse.json(
        { error: 'La hoja predeterminada no es accesible. Asegúrate de compartirla con big-gama-sheets@sistema-conductores-dashboard.iam.gserviceaccount.com como Editor.' },
        { status: 500 }
      );
    }

    const tabName = await ensureDriverTab(sheet.spreadsheetId, user.name);
    if (!tabName) {
      return NextResponse.json(
        { error: 'Error al crear la pestaña para el conductor en la hoja de cálculo.' },
        { status: 500 }
      );
    }

    const updated = await User.findByIdAndUpdate(
      id,
      {
        spreadsheetId: sheet.spreadsheetId,
        spreadsheetUrl: sheet.spreadsheetUrl,
        sheetTab: tabName,
      },
      { new: true }
    )
      .select('-password')
      .lean();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Create sheet error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
