import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";


export async function GET() {
  try {
    const rows = await prisma.collaborator.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      take: 200,
    });

    return NextResponse.json({
      collaborators: rows.map((x) => ({ id: x.id, name: x.name })),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Lỗi tải danh sách cộng tác viên";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
