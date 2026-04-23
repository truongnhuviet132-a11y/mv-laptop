import { ItemStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const availableStatuses = [
      ItemStatus.NEW_IMPORTED,
      ItemStatus.PENDING_CHECK,
      ItemStatus.PROCESSING_DONE_WAIT_SALE,
      ItemStatus.READY_FOR_SALE,
    ];

    const [availableItems, soldItems, soldCount, availableCount] = await Promise.all([
      prisma.item.findMany({
        where: { currentStatus: { in: availableStatuses }, salesItems: { none: {} } },
        include: { model: true, supplier: true },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      prisma.salesOrderItem.findMany({
        include: {
          item: { include: { model: true, supplier: true } },
          salesOrder: true,
        },
        orderBy: { id: "desc" },
        take: 20,
      }),
      prisma.salesOrderItem.count(),
      prisma.item.count({ where: { currentStatus: { in: availableStatuses }, salesItems: { none: {} } } }),
    ]);

    return NextResponse.json({
      availableCount,
      soldCount,
      availableItems: availableItems.map((i) => ({
        id: i.id,
        code: i.internalCode,
        model: `${i.model.brand} ${i.model.modelName}`,
        supplier: i.supplier.name,
        purchasePrice: i.purchasePrice,
        status: i.currentStatus,
      })),
      soldItems: soldItems.map((s) => ({
        itemId: s.itemId,
        code: s.item.internalCode,
        model: `${s.item.model.brand} ${s.item.model.modelName}`,
        salePrice: s.salePrice,
        orderNo: s.salesOrder.orderNo,
        saleDate: s.salesOrder.saleDate,
      })),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Lỗi tải dashboard summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
