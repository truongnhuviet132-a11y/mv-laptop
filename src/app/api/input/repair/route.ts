import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const itemId = Number(body?.itemId);
    const repairDate = new Date(body?.repairDate);
    const repairType = String(body?.repairType || "OTHER");
    const cost = Number(body?.cost || 0);
    const note = String(body?.note || "");
    const includeInCost = Boolean(body?.includeInCost);

    if (!itemId || Number.isNaN(repairDate.getTime())) {
      return NextResponse.json({ error: "Thiếu item hoặc ngày sửa." }, { status: 400 });
    }

    const created = await prisma.itemRepair.create({
      data: {
        itemId,
        repairDate,
        repairType,
        description: note || null,
        partName: repairType,
        partCost: includeInCost ? cost : 0,
        laborCost: 0,
        externalCost: includeInCost ? 0 : cost,
        totalCost: cost,
        includeInCost,
        note: note || null,
      },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Lỗi lưu sửa chữa" }, { status: 500 });
  }
}
