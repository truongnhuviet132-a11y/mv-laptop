import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";


export async function GET() {
  try {
    const orders = await prisma.salesOrder.findMany({
      where: { note: { contains: "[PAY_STATUS:CHO_DOI_SOAT]" } },
      include: {
        customer: true,
        items: { include: { item: true } },
      },
      orderBy: { saleDate: "desc" },
      take: 500,
    });

    return NextResponse.json({
      rows: orders.map((o) => ({
        id: o.id,
        salesOrderId: o.id,
        code: o.items[0]?.item?.internalCode || `SO-${o.id}`,
        customer: o.customer?.name || "-",
        salePrice: o.finalAmount,
        paid: o.finalAmount - (o.receivableAmount || 0),
        remain: o.receivableAmount || 0,
        status: "CHỜ ĐỐI SOÁT",
      })),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Lỗi tải danh sách COD";
    return NextResponse.json({ error: message, rows: [] }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Boolean) : [];
    if (!ids.length) return NextResponse.json({ ok: true, updated: 0 });

  const rows = await prisma.salesOrder.findMany({ where: { id: { in: ids } } });

  await prisma.$transaction(
    rows.map((o) => {
      const oldNote = o.note || "";
      const replaced = oldNote
        .replace("[PAY_STATUS:CHO_DOI_SOAT]", "[PAY_STATUS:HOAN_THANH]")
        .replace(/\[REMAIN:\d+\]/, "[REMAIN:0]")
        .replace(/\[PAID:\d+\]/, `[PAID:${o.finalAmount}]`);

      return prisma.salesOrder.update({
        where: { id: o.id },
        data: {
          receivableAmount: 0,
          cashAmount: (o.cashAmount || 0) + (o.receivableAmount || 0),
          note: replaced,
        },
      });
    })
  );

    return NextResponse.json({ ok: true, updated: ids.length });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Lỗi đối soát COD";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
