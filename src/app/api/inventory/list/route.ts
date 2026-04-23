import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";


export async function GET(req: NextRequest) {
  try {
    const model = (req.nextUrl.searchParams.get("model") || "ALL").trim();
    const supplier = (req.nextUrl.searchParams.get("supplier") || "ALL").trim();
    const status = (req.nextUrl.searchParams.get("status") || "ALL").trim();
    const minDays = Number(req.nextUrl.searchParams.get("minDays") || 0);
    const minCost = Number(req.nextUrl.searchParams.get("minCost") || 0);
    const maxCost = Number(req.nextUrl.searchParams.get("maxCost") || 999999999);
    const sortBy = (req.nextUrl.searchParams.get("sortBy") || "daysInStock") as "daysInStock" | "currentCost" | "model";
    const sortDir = (req.nextUrl.searchParams.get("sortDir") || "desc") as "asc" | "desc";

  const items = await prisma.item.findMany({
    where: {
      salesItems: { none: {} },
      ...(status !== "ALL" ? { currentStatus: status as any } : {}),
      ...(model !== "ALL" ? { model: { modelName: { equals: model, mode: "insensitive" } } } : {}),
      ...(supplier !== "ALL" ? { supplier: { name: { equals: supplier, mode: "insensitive" } } } : {}),
    },
    include: {
      model: true,
      supplier: true,
      repairs: true,
    },
    take: 800,
  });

  const now = Date.now();
  const rows = items
    .map((it) => {
      const processingCost = it.repairs.reduce((s, r) => s + r.totalCost, 0);
      const currentCost = it.purchasePrice + it.allocatedCost + processingCost;
      const daysInStock = Math.max(1, Math.ceil((now - it.purchaseDate.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        id: it.id,
        code: it.internalCode,
        model: `${it.model.brand} ${it.model.modelName}`,
        modelName: it.model.modelName,
        supplier: it.supplier.name,
        serial: it.serialNumber,
        purchaseDate: it.purchaseDate.toISOString().slice(0, 10),
        purchasePrice: it.purchasePrice,
        processingCost,
        currentCost,
        daysInStock,
        status: it.currentStatus,
        note: it.note || "",
      };
    })
    .filter((x) => x.daysInStock >= minDays && x.currentCost >= minCost && x.currentCost <= maxCost);

  rows.sort((a, b) => {
    const av = sortBy === "model" ? a.model.localeCompare(b.model) : (a as any)[sortBy];
    const bv = sortBy === "model" ? 0 : (b as any)[sortBy];
    if (sortBy === "model") return sortDir === "asc" ? a.model.localeCompare(b.model) : b.model.localeCompare(a.model);
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const models = Array.from(new Set(items.map((x) => x.model.modelName))).sort();
  const suppliers = Array.from(new Set(items.map((x) => x.supplier.name))).sort();
  const statuses = Array.from(new Set(items.map((x) => x.currentStatus))).sort();

    return NextResponse.json({ rows, filters: { models, suppliers, statuses } });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Lỗi tải danh sách tồn kho";
    return NextResponse.json({ error: message, rows: [], filters: { models: [], suppliers: [], statuses: [] } }, { status: 500 });
  }
}
