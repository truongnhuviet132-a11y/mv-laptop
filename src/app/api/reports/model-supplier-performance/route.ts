import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type GroupKey = string;

type Agg = {
  modelId: number;
  model: string;
  supplierId: number;
  supplier: string;
  month: string;
  importedQty: number;
  soldQty: number;
  totalPurchase: number;
  totalAllocated: number;
  totalRepair: number;
  totalSale: number;
  totalCommission: number;
  totalWarrantyShop: number;
  totalNetProfit: number;
  totalDaysInStock: number;
  repairItems: Set<number>;
  warrantyItems: Set<number>;
};

export async function GET(req: NextRequest) {
  try {
    const month = req.nextUrl.searchParams.get("month") ?? "2026-03";
    const [year, mon] = month.split("-").map(Number);

  const start = new Date(Date.UTC(year, mon - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, mon, 1, 0, 0, 0));

  const items = await prisma.item.findMany({
    where: { purchaseDate: { gte: start, lt: end } },
    include: {
      model: true,
      supplier: true,
      repairs: { where: { includeInCost: true } },
      salesItems: {
        include: {
          salesOrder: true,
        },
      },
      warrantyCases: true,
    },
  });

  const map = new Map<GroupKey, Agg>();

  for (const item of items) {
    const key = `${item.modelId}-${item.supplierId}-${month}`;
    if (!map.has(key)) {
      map.set(key, {
        modelId: item.modelId,
        model: `${item.model.brand} ${item.model.modelName}`,
        supplierId: item.supplierId,
        supplier: item.supplier.name,
        month,
        importedQty: 0,
        soldQty: 0,
        totalPurchase: 0,
        totalAllocated: 0,
        totalRepair: 0,
        totalSale: 0,
        totalCommission: 0,
        totalWarrantyShop: 0,
        totalNetProfit: 0,
        totalDaysInStock: 0,
        repairItems: new Set<number>(),
        warrantyItems: new Set<number>(),
      });
    }

    const g = map.get(key)!;
    g.importedQty += 1;
    g.totalPurchase += item.purchasePrice;
    g.totalAllocated += item.allocatedCost;

    const repairCost = item.repairs.reduce((s, r) => s + r.totalCost, 0);
    if (item.repairs.length > 0) g.repairItems.add(item.id);
    g.totalRepair += repairCost;

    const sold = item.salesItems[0];
    if (sold) {
      g.soldQty += 1;
      g.totalSale += sold.salePrice;

      const comm = sold.salesOrder.collaboratorCommissionAmount ?? 0;
      g.totalCommission += comm;

      const warrantyShop = item.warrantyCases.reduce((s, w) => s + w.shopShareAmount, 0);
      if (item.warrantyCases.length > 0) g.warrantyItems.add(item.id);
      g.totalWarrantyShop += warrantyShop;

      const net = sold.salePrice - item.purchasePrice - item.allocatedCost - repairCost - comm - warrantyShop;
      g.totalNetProfit += net;

      if (item.soldAt) {
        const days = Math.max(1, Math.ceil((item.soldAt.getTime() - item.purchaseDate.getTime()) / (1000 * 60 * 60 * 24)));
        g.totalDaysInStock += days;
      }
    }
  }

  const result = Array.from(map.values()).map((g) => {
    const avgPurchase = g.importedQty ? Math.round(g.totalPurchase / g.importedQty) : 0;
    const avgRepair = g.importedQty ? Math.round(g.totalRepair / g.importedQty) : 0;
    const avgSale = g.soldQty ? Math.round(g.totalSale / g.soldQty) : 0;
    const avgCommission = g.soldQty ? Math.round(g.totalCommission / g.soldQty) : 0;
    const avgWarranty = g.soldQty ? Math.round(g.totalWarrantyShop / g.soldQty) : 0;
    const avgProfitPerItem = g.soldQty ? Math.round(g.totalNetProfit / g.soldQty) : 0;
    const avgDaysInStock = g.soldQty ? Number((g.totalDaysInStock / g.soldQty).toFixed(2)) : 0;

    const repairRate = g.importedQty ? Number(((g.repairItems.size / g.importedQty) * 100).toFixed(2)) : 0;
    const warrantyRate = g.soldQty ? Number(((g.warrantyItems.size / g.soldQty) * 100).toFixed(2)) : 0;
    const profitPerDay = avgDaysInStock > 0 ? Math.round(avgProfitPerItem / avgDaysInStock) : 0;

    return {
      month: g.month,
      modelId: g.modelId,
      model: g.model,
      supplierId: g.supplierId,
      supplier: g.supplier,
      importedQty: g.importedQty,
      soldQty: g.soldQty,
      avgPurchase,
      avgRepair,
      avgSale,
      avgCommission,
      avgWarranty,
      avgProfitPerItem,
      totalNetProfit: g.totalNetProfit,
      repairRate,
      warrantyRate,
      avgDaysInStock,
      profitPerDay,
    };
  });

    return NextResponse.json({ month, rows: result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Lỗi tải báo cáo hiệu suất";
    return NextResponse.json({ error: message, rows: [] }, { status: 500 });
  }
}
