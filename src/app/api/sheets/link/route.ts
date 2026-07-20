import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/user";
import { requireRole } from "@/lib/middleware-helpers";

export async function POST(request: NextRequest) {
  const result = await requireRole(request, ["ADMIN"]);
  if (result.error) return result.error;

  try {
    const { userId, spreadsheetId, spreadsheetUrl } = await request.json();

    if (!userId || !spreadsheetId) {
      return NextResponse.json(
        { error: "userId y spreadsheetId son requeridos" },
        { status: 400 },
      );
    }

    await connectDB();

    const user = await User.findByIdAndUpdate(
      userId,
      {
        spreadsheetId,
        spreadsheetUrl:
          spreadsheetUrl ||
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      },
      { new: true },
    )
      .select("-password")
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Hoja de cálculo vinculada exitosamente",
      user,
    });
  } catch (error) {
    console.error("Link sheet error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const result = await requireRole(request, ["ADMIN"]);
  if (result.error) return result.error;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId es requerido" }, { status: 400 });
  }

  await connectDB();

  const user = await User.findById(userId)
    .select("spreadsheetId spreadsheetUrl")
    .lean();

  if (!user) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    spreadsheetId: user.spreadsheetId,
    spreadsheetUrl: user.spreadsheetUrl,
  });
}
