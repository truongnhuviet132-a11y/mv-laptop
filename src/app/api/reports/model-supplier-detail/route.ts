import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";


export async function GET(req: NextRequest) {
  try {
    const month = req.nextUrl.searchParams.get("month") ?? "2026-03";
    const modelId = Number(req.nextUrl.searchParams.get("modelId") || 0);
    const supplierId = Number(req.nextUrl.searchParams.get("supplierId") || 0);

    if (!modelId || !supplierId) {
      return NextResponse.json({ items: [], repairs: [], warranties: [] });
    }

  const [year, mon] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, mon, 1, 0, 0, 0));

  const items = await prisma.item.findMany({
    where: { modelId, supplierId, purchaseDate: { gte: start, lt: end } },
    include: {
      repairs: true,
      warrantyCases: true,
      salesItems: { include: { salesOrder: true } },
    },
    orderBy: { purchaseDate: "desc" },
  });

  const itemRows = items.map((it) => {
    const sale = it.salesItems[0];
    const repair = it.repairs.reduce((s, x) => s + x.totalCost, 0);
    const warranty = it.warrantyCases.reduce((s, x) => s + x.shopShareAmount, 0);
    const comm = sale?.salesOrder.collaboratorCommissionAmount ?? 0;
    const netProfit = sale ? sale.salePrice - it.purchasePrice - it.allocatedCost - repair - warranty - comm : null;

    return {
      id: it.id,
      code: it.internalCode,
      serial: it.serialNumber,
      purchaseDate: it.purchaseDate.toISOString().slice(0, 10),
      soldAt: it.soldAt ? it.soldAt.toISOString().slice(0, 10) : null,
      purchasePrice: it.purchasePrice,
      salePrice: sale?.salePrice ?? null,
      netProfit,
      status: sale ? "Đã bán" : "Tồn kho",
    };
  });

  const repairs = items.flatMap((it) => it.repairs.map((r) => ({
    id: r.id,
    itemId: it.id,
    itemCode: it.internalCode,
    date: r.repairDate.toISOString().slice(0, 10),
    type: r.repairType,
    totalCost: r.totalCost,
    note: r.note,
  })));

  const warranties = items.flatMap((it) => it.warrantyCases.map((w) => ({
    id: w.id,
    itemId: it.id,
    itemCode: it.internalCode,
    date: w.createdDate.toISOString().slice(0, 10),
    issue: w.issueDescription,
    shopShareAmount: w.shopShareAmount,
    payer: w.payerType,
  })));

    return NextResponse.json({ month, modelId, supplierId, items: itemRows, repairs, warranties });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Lỗi tải báo cáo chi tiết";
    return NextResponse.json({ error: message, items: [], repairs: [], warranties: [] }, { status: 500 });
  }
}
