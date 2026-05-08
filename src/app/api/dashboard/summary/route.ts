import { ItemStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type GroupRow = {
  modelId: number;
  model: string;
  supplierId: number;
  supplier: string;
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
};

function getDateRange(preset: string | null) {
  const weeks = preset === "8W" ? 8 : preset === "12W" ? 12 : 4;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - weeks * 7 + 1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function extractChannel(note?: string | null) {
  const match = note?.match(/Kênh:\s*([^|]+)/i);
  return match?.[1]?.trim() || "Không rõ";
}

function divide(total: number, count: number) {
  return count ? Math.round(total / count) : 0;
}

export async function GET(req: NextRequest) {
  try {
    const rangePreset = req.nextUrl.searchParams.get("range") || "4W";
    const modelFilter = req.nextUrl.searchParams.get("model") || "ALL";
    const supplierFilter = req.nextUrl.searchParams.get("supplier") || "ALL";
    const { start, end } = getDateRange(rangePreset);

    const availableStatuses = [
      ItemStatus.NEW_IMPORTED,
      ItemStatus.PENDING_CHECK,
      ItemStatus.PROCESSING_DONE_WAIT_SALE,
      ItemStatus.READY_FOR_SALE,
    ];

    // Production uses Supabase pooler with connection_limit=1, so keep DB reads sequential.
    const availableItems = await prisma.item.findMany({
      where: { currentStatus: { in: availableStatuses }, salesItems: { none: {} } },
      include: { model: true, supplier: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    const soldItems = await prisma.salesOrderItem.findMany({
      where: {
        salesOrder: { saleDate: { gte: start, lte: end } },
        ...(modelFilter !== "ALL" ? { item: { modelId: Number(modelFilter) } } : {}),
        ...(supplierFilter !== "ALL" ? { item: { supplierId: Number(supplierFilter) } } : {}),
      },
      include: {
        item: { include: { model: true, supplier: true, repairs: { where: { includeInCost: true } }, warrantyCases: true } },
        salesOrder: true,
      },
      orderBy: { id: "desc" },
    });

    const availableCount = await prisma.item.count({ where: { currentStatus: { in: availableStatuses }, salesItems: { none: {} } } });
    const allModels = await prisma.productModel.findMany({ where: { isActive: true }, orderBy: [{ brand: "asc" }, { modelName: "asc" }] });
    const allSuppliers = await prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    const cashAgg = await prisma.cashTransaction.aggregate({ _sum: { amount: true }, where: { transactionType: "IN" } });
    const expenseAgg = await prisma.cashTransaction.aggregate({ _sum: { amount: true }, where: { transactionType: "OUT" } });

    const groupMap = new Map<string, GroupRow>();
    const channelMap = new Map<string, { name: string; profit: number }>();
    let totalSale = 0;
    let totalPurchase = 0;
    let totalRepair = 0;
    let totalCommission = 0;
    let totalWarrantyShop = 0;
    let totalProfit = 0;
    let totalDaysInStock = 0;

    for (const sold of soldItems) {
      const item = sold.item;
      const model = `${item.model.brand} ${item.model.modelName}`;
      const supplier = item.supplier.name;
      const key = `${item.modelId}-${item.supplierId}`;
      const repairCost = item.repairs.reduce((sum, repair) => sum + repair.totalCost, 0);
      const warrantyShop = item.warrantyCases.reduce((sum, warranty) => sum + warranty.shopShareAmount, 0);
      const commission = sold.salesOrder.collaboratorCommissionAmount || 0;
      const netProfit = sold.salePrice - item.purchasePrice - item.allocatedCost - repairCost - commission - warrantyShop;
      const daysInStock = item.soldAt ? Math.max(1, Math.ceil((item.soldAt.getTime() - item.purchaseDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          modelId: item.modelId,
          model,
          supplierId: item.supplierId,
          supplier,
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
        });
      }

      const group = groupMap.get(key)!;
      group.soldQty += 1;
      group.importedQty += 1;
      group.totalPurchase += item.purchasePrice;
      group.totalAllocated += item.allocatedCost;
      group.totalRepair += repairCost;
      group.totalSale += sold.salePrice;
      group.totalCommission += commission;
      group.totalWarrantyShop += warrantyShop;
      group.totalNetProfit += netProfit;
      group.totalDaysInStock += daysInStock;

      const channel = extractChannel(sold.note || sold.salesOrder.note);
      const prev = channelMap.get(channel) || { name: channel, profit: 0 };
      prev.profit += netProfit;
      channelMap.set(channel, prev);

      totalSale += sold.salePrice;
      totalPurchase += item.purchasePrice + item.allocatedCost;
      totalRepair += repairCost;
      totalCommission += commission;
      totalWarrantyShop += warrantyShop;
      totalProfit += netProfit;
      totalDaysInStock += daysInStock;
    }

    const rows = Array.from(groupMap.values()).map((g) => {
      const avgDaysInStock = g.soldQty ? g.totalDaysInStock / g.soldQty : 0;
      const profit = divide(g.totalNetProfit, g.soldQty);
      return {
        modelId: g.modelId,
        model: g.model,
        supplierId: g.supplierId,
        supplier: g.supplier,
        sold: g.soldQty,
        buy: divide(g.totalPurchase + g.totalAllocated, g.soldQty),
        repair: divide(g.totalRepair, g.soldQty),
        sale: divide(g.totalSale, g.soldQty),
        profit,
        profitDay: avgDaysInStock ? Math.round(profit / avgDaysInStock) : 0,
        suggestion: profit >= 2200000 ? "NÊN" : profit >= 1800000 ? "CÂN NHẮC" : "KHÔNG",
      };
    }).sort((a, b) => b.profit - a.profit);

    const inventoryCapital = availableItems.reduce((sum, item) => sum + item.purchasePrice + item.allocatedCost, 0);
    const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

    return NextResponse.json({
      range: { start, end },
      kpi: {
        monthlyProfit: totalProfit,
        soldCount: soldItems.length,
        avgProfit: divide(totalProfit, soldItems.length),
        stockCount: availableCount,
        inventoryCapital,
        cashOnHand: Number(cashAgg._sum.amount || 0) - Number(expenseAgg._sum.amount || 0),
        ownerTotalExpense: Number(expenseAgg._sum.amount || 0),
        totalRevenue: totalSale,
        totalCost: totalPurchase + totalRepair + totalCommission + totalWarrantyShop,
        avgDaysInStock: soldItems.length ? Number((totalDaysInStock / soldItems.length).toFixed(1)) : 0,
      },
      filters: {
        models: allModels.map((m) => ({ id: m.id, name: `${m.brand} ${m.modelName}` })),
        suppliers: allSuppliers.map((s) => ({ id: s.id, name: s.name })),
      },
      rows,
      costStructure: {
        purchase: totalPurchase,
        repair: totalRepair,
        warranty: totalWarrantyShop,
        commission: totalCommission,
      },
      saleChannels: Array.from(channelMap.values()).sort((a, b) => b.profit - a.profit).map((c, index) => ({ ...c, color: colors[index % colors.length] })),
      availableItems: availableItems.map((i) => ({
        id: i.id,
        code: i.internalCode,
        model: `${i.model.brand} ${i.model.modelName}`,
        supplier: i.supplier.name,
        purchasePrice: i.purchasePrice,
        status: i.currentStatus,
      })),
      soldItems: soldItems.slice(0, 20).map((s) => ({
        itemId: s.itemId,
        code: s.item.internalCode,
        model: `${s.item.model.brand} ${s.item.model.modelName}`,
        supplier: s.item.supplier.name,
        salePrice: s.salePrice,
        orderNo: s.salesOrder.orderNo,
        saleDate: s.salesOrder.saleDate,
      })),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Lỗi tải dashboard summary";
    return NextResponse.json({ error: message, rows: [], saleChannels: [] }, { status: 500 });
  }
}
