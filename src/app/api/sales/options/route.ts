import { ItemStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";


export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const availableStatuses = [
      ItemStatus.NEW_IMPORTED,
      ItemStatus.PENDING_CHECK,
      ItemStatus.PROCESSING_DONE_WAIT_SALE,
      ItemStatus.READY_FOR_SALE,
    ];

  const items = await prisma.item.findMany({
    where: {
      currentStatus: { in: availableStatuses },
      salesItems: { none: {} },
      ...(q
        ? {
            OR: [
              { internalCode: { contains: q, mode: "insensitive" } },
              { serialNumber: { contains: q, mode: "insensitive" } },
              { model: { modelName: { contains: q, mode: "insensitive" } } },
              { model: { brand: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      model: true,
      supplier: true,
    },
    orderBy: { createdAt: "desc" },
    take: 120,
  });

    return NextResponse.json({
      items: items.map((i) => ({
        id: i.id,
        internalCode: i.internalCode,
        serialNumber: i.serialNumber,
        model: `${i.model.brand} ${i.model.modelName}`,
        supplier: i.supplier.name,
        purchasePrice: i.purchasePrice,
        purchaseDate: i.purchaseDate,
        currentStatus: i.currentStatus,
      })),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Lỗi tải danh sách máy bán";
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
}
