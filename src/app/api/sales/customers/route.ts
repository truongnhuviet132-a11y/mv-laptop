import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (q.length < 2) {
      return NextResponse.json({ customers: [] });
    }

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, name: true, phone: true, address: true },
    });

    return NextResponse.json({ customers });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Không tải được danh sách khách hàng";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
