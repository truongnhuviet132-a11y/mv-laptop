import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";


export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const kind = String(body?.kind || "");
    const id = Number(body?.id || 0);
    if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

    if (kind === "repair" || kind === "other-item") {
      const updated = await prisma.itemRepair.update({
        where: { id },
        data: {
          repairDate: body?.date ? new Date(body.date) : undefined,
          repairType: body?.type || undefined,
          partName: body?.type || undefined,
          totalCost: body?.cost != null ? Number(body.cost) : undefined,
          partCost: body?.cost != null ? Number(body.cost) : undefined,
          note: body?.note ?? undefined,
          description: body?.note ?? undefined,
        },
      });
      return NextResponse.json({ ok: true, id: updated.id });
    }

    if (kind === "warranty") {
      const updated = await prisma.warrantyCase.update({
        where: { id },
        data: {
          createdDate: body?.date ? new Date(body.date) : undefined,
          issueDescription: body?.issue ?? undefined,
          costAmount: body?.cost != null ? Number(body.cost) : undefined,
          payerType: body?.payer ?? undefined,
          note: body?.note ?? undefined,
        },
      });
      return NextResponse.json({ ok: true, id: updated.id });
    }

    if (kind === "other-lot") {
      const updated = await prisma.cashTransaction.update({
        where: { id },
        data: {
          transactionDate: body?.date ? new Date(body.date) : undefined,
          category: body?.type ?? undefined,
          amount: body?.amount != null ? Number(body.amount) : undefined,
          note: body?.note ?? undefined,
        },
      });
      return NextResponse.json({ ok: true, id: updated.id });
    }

    return NextResponse.json({ error: "kind không hợp lệ" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Lỗi cập nhật" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const kind = String(body?.kind || "");
    const id = Number(body?.id || 0);
    if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

    if (kind === "repair" || kind === "other-item") {
      await prisma.itemRepair.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    if (kind === "warranty") {
      await prisma.warrantyCase.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    if (kind === "other-lot") {
      await prisma.cashTransaction.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "kind không hợp lệ" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Lỗi xóa" }, { status: 500 });
  }
}
