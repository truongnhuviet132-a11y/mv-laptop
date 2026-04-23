import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";


export async function GET(req: NextRequest) {
  try {
    const id = Number(req.nextUrl.searchParams.get("id") || 0);
    if (!id) return NextResponse.json({ item: null, repairs: [] });

  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      model: true,
      supplier: true,
      repairs: { orderBy: { repairDate: "desc" } },
    },
  });

    if (!item) return NextResponse.json({ item: null, repairs: [] });

    return NextResponse.json({
      item: {
        id: item.id,
        code: item.internalCode,
        serial: item.serialNumber,
        model: `${item.model.brand} ${item.model.modelName}`,
        supplier: item.supplier.name,
        purchaseDate: item.purchaseDate.toISOString().slice(0, 10),
        purchasePrice: item.purchasePrice,
        allocatedCost: item.allocatedCost,
        status: item.currentStatus,
        note: item.note || "",
      },
      repairs: item.repairs.map((r) => ({
        id: r.id,
        date: r.repairDate.toISOString().slice(0, 10),
        type: r.repairType,
        amount: r.totalCost,
        note: r.note || r.description || "",
      })),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Lỗi tải chi tiết tồn kho";
    return NextResponse.json({ error: message, item: null, repairs: [] }, { status: 500 });
  }
}
