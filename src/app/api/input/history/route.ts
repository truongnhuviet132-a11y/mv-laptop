import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";


export async function GET(req: NextRequest) {
  try {
    const kind = String(req.nextUrl.searchParams.get("kind") || "");
    const itemId = Number(req.nextUrl.searchParams.get("itemId") || 0);
    const supplierId = Number(req.nextUrl.searchParams.get("supplierId") || 0);

  if (kind === "repair") {
    if (!itemId) return NextResponse.json({ rows: [] });
    const rows = await prisma.itemRepair.findMany({
      where: { itemId, NOT: { repairType: "OTHER_COST" } },
      orderBy: { repairDate: "desc" },
      take: 50,
    });
    return NextResponse.json({
      rows: rows.map((r) => ({
        id: r.id,
        date: r.repairDate,
        type: r.repairType,
        cost: r.totalCost,
        note: r.note || r.description || "",
      })),
    });
  }

  if (kind === "warranty") {
    if (!itemId) return NextResponse.json({ rows: [] });
    const rows = await prisma.warrantyCase.findMany({
      where: { itemId },
      orderBy: { createdDate: "desc" },
      take: 50,
    });
    return NextResponse.json({
      rows: rows.map((r) => ({
        id: r.id,
        date: r.createdDate,
        issue: r.issueDescription,
        cost: r.costAmount,
        payer: r.payerType,
        note: r.note || "",
      })),
    });
  }

  if (kind === "other-item") {
    if (!itemId) return NextResponse.json({ rows: [] });
    const rows = await prisma.itemRepair.findMany({
      where: { itemId, repairType: "OTHER_COST" },
      orderBy: { repairDate: "desc" },
      take: 50,
    });
    return NextResponse.json({
      rows: rows.map((r) => ({
        id: r.id,
        date: r.repairDate,
        type: r.partName || r.repairType,
        amount: r.totalCost,
        note: r.note || r.description || "",
      })),
    });
  }

  if (kind === "other-lot") {
    const where = supplierId
      ? { referenceType: "LOT_COST" as const, referenceId: supplierId }
      : { referenceType: "LOT_COST" as const };

    const rows = await prisma.cashTransaction.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      take: 50,
    });
    return NextResponse.json({
      rows: rows.map((r) => ({
        id: r.id,
        date: r.transactionDate,
        type: r.category,
        amount: r.amount,
        note: r.note || "",
      })),
    });
  }

    return NextResponse.json({ rows: [] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Lỗi tải lịch sử";
    return NextResponse.json({ error: message, rows: [] }, { status: 500 });
  }
}
