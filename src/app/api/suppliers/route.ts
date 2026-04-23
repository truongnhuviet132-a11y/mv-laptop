import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";


export async function GET() {
  try {
    const rows = await prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      take: 200,
      select: { id: true, name: true },
    });
    return NextResponse.json({ suppliers: rows });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Lỗi tải nhà cung cấp";
    return NextResponse.json({ error: message, suppliers: [] }, { status: 500 });
  }
}
