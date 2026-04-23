import { NextResponse } from "next/server";
import { PayerType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";


function mapPayer(v: string): PayerType {
  if (v === "NCC") return PayerType.SUPPLIER;
  if (v === "CHIA") return PayerType.SHARED;
  return PayerType.SHOP;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const itemId = Number(body?.itemId);
    const createdDate = new Date(body?.warrantyDate);
    const issue = String(body?.issue || "");
    const cost = Number(body?.cost || 0);
    const payerRaw = String(body?.payer || "SHOP");
    const note = String(body?.note || "");

    if (!itemId || !issue.trim() || Number.isNaN(createdDate.getTime())) {
      return NextResponse.json({ error: "Thiếu item/ngày/lỗi bảo hành." }, { status: 400 });
    }

    const payerType = mapPayer(payerRaw);

    const created = await prisma.warrantyCase.create({
      data: {
        itemId,
        createdDate,
        issueDescription: issue,
        costAmount: cost,
        payerType,
        supplierShareAmount: payerType === PayerType.SUPPLIER ? cost : payerType === PayerType.SHARED ? Math.round(cost / 2) : 0,
        shopShareAmount: payerType === PayerType.SHOP ? cost : payerType === PayerType.SHARED ? cost - Math.round(cost / 2) : 0,
        customerShareAmount: 0,
        note: note || null,
      },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Lỗi lưu bảo hành" }, { status: 500 });
  }
}
