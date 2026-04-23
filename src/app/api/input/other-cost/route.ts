import { NextResponse } from "next/server";
import { AccountType, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";


async function getOrCreateSystemUserId() {
  let user = await prisma.user.findFirst({ where: { isActive: true } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        username: "system",
        passwordHash: "system-no-login",
        fullName: "System",
        role: "OWNER",
        isActive: true,
      },
    });
  }
  return user.id;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mode = String(body?.mode || "item");
    const date = new Date(body?.date);
    const category = String(body?.category || "KHAC");
    const amount = Number(body?.amount || 0);
    const note = String(body?.note || "");
    const includeInCost = Boolean(body?.includeInCost);

    if (Number.isNaN(date.getTime()) || amount <= 0) {
      return NextResponse.json({ error: "Ngày/số tiền không hợp lệ." }, { status: 400 });
    }

    if (mode === "item") {
      const itemId = Number(body?.itemId);
      if (!itemId) return NextResponse.json({ error: "Chưa chọn máy." }, { status: 400 });

      const created = await prisma.itemRepair.create({
        data: {
          itemId,
          repairDate: date,
          repairType: "OTHER_COST",
          description: `${category} - ${note}`,
          partName: category,
          partCost: includeInCost ? amount : 0,
          laborCost: 0,
          externalCost: includeInCost ? 0 : amount,
          totalCost: amount,
          includeInCost,
          note: note || null,
        },
      });

      return NextResponse.json({ ok: true, mode, id: created.id });
    }

    const userId = await getOrCreateSystemUserId();
    const supplierId = Number(body?.supplierId || 0) || null;

    const created = await prisma.cashTransaction.create({
      data: {
        transactionDate: date,
        accountType: AccountType.CASH,
        transactionType: TransactionType.OUT,
        category,
        amount,
        referenceType: "LOT_COST",
        referenceId: supplierId,
        note: note || null,
        createdBy: userId,
      },
    });

    return NextResponse.json({ ok: true, mode, id: created.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Lỗi lưu chi phí khác" }, { status: 500 });
  }
}
