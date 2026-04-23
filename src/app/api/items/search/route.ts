import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";


export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    if (!q) return NextResponse.json({ items: [] });

  const items = await prisma.item.findMany({
    where: {
      OR: [
        { internalCode: { contains: q, mode: "insensitive" } },
        { serialNumber: { contains: q, mode: "insensitive" } },
        { model: { modelName: { contains: q, mode: "insensitive" } } },
        { model: { brand: { contains: q, mode: "insensitive" } } },
        {
          salesItems: {
            some: {
              salesOrder: {
                customer: {
                  OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { phone: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
            },
          },
        },
      ],
    },
    include: {
      model: true,
      salesItems: {
        include: {
          salesOrder: {
            include: { customer: true },
          },
        },
        take: 1,
      },
      warrantyCases: {
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });

    return NextResponse.json({
      items: items.map((i) => {
        const sale = i.salesItems[0];
        const customer = sale?.salesOrder?.customer;
        return {
          id: i.id,
          code: i.internalCode,
          model: `${i.model.brand} ${i.model.modelName}`,
          serial: i.serialNumber || "",
          customerName: customer?.name || "",
          customerPhone: customer?.phone || "",
          saleDate: sale?.salesOrder?.saleDate || null,
          warrantyStatus: i.warrantyCases.length ? i.warrantyCases[0].status : "NONE",
        };
      }),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Lỗi tìm kiếm máy";
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
}
