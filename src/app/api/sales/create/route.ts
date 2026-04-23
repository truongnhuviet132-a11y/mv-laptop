import { ItemStatus, PaymentMethod, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Body = {
  itemId: number;
  salePrice: number;
  paymentMethod: PaymentMethod;
  paymentType?: "CASH" | "BANK_TRANSFER" | "COD";
  amountCollected?: number;
  saleDate?: string;
  saleChannel?: string;
  warrantyMonths?: number;
  customerName?: string;
  customerPhone?: string;
  collaboratorName?: string;
  collaboratorCommissionAmount?: number;
  note?: string;
};

function createOrderNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `SO-${ymd}-${Date.now().toString().slice(-6)}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body.itemId || !body.salePrice || body.salePrice <= 0) {
      return NextResponse.json({ error: "Thiếu dữ liệu bán hàng hợp lệ." }, { status: 400 });
    }

    const paymentType = (body.paymentType || body.paymentMethod || "CASH") as "CASH" | "BANK_TRANSFER" | "COD";
    if (!["CASH", "BANK_TRANSFER", "COD"].includes(paymentType)) {
      return NextResponse.json({ error: "Phương thức thanh toán không hợp lệ." }, { status: 400 });
    }

    const allowedStatuses = new Set<ItemStatus>([
      ItemStatus.NEW_IMPORTED,
      ItemStatus.PROCESSING_DONE_WAIT_SALE,
      ItemStatus.READY_FOR_SALE,
    ]);

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({ where: { id: Number(body.itemId) } });
      if (!item) throw new Error("Không tìm thấy máy cần bán.");
      if (!allowedStatuses.has(item.currentStatus)) {
        throw new Error("Máy này không ở trạng thái có thể bán.");
      }

      const existedSale = await tx.salesOrderItem.findUnique({ where: { itemId: item.id } });
      if (existedSale) throw new Error("Máy này đã được bán trước đó.");

      let customerId: number | null = null;
      const customerName = body.customerName?.trim();
      const customerPhone = body.customerPhone?.trim();
      if (customerName) {
        const found = await tx.customer.findFirst({
          where: {
            OR: [
              ...(customerPhone ? [{ phone: customerPhone }] : []),
              { name: customerName },
            ],
          },
        });

        if (found) {
          customerId = found.id;
        } else {
          const created = await tx.customer.create({
            data: { name: customerName, phone: customerPhone || null },
          });
          customerId = created.id;
        }
      }

      let collaboratorId: number | null = null;
      const collaboratorName = body.collaboratorName?.trim();
      if (collaboratorName) {
        const found = await tx.collaborator.findFirst({ where: { name: collaboratorName } });
        if (found) {
          collaboratorId = found.id;
        } else {
          const created = await tx.collaborator.create({ data: { name: collaboratorName } });
          collaboratorId = created.id;
        }
      }

      let creator = await tx.user.findFirst({ where: { isActive: true } });
      if (!creator) {
        creator = await tx.user.create({
          data: {
            username: "system",
            passwordHash: "system-no-login",
            fullName: "System",
            role: "OWNER",
            isActive: true,
          },
        });
      }

      const commission = Math.max(0, Number(body.collaboratorCommissionAmount || 0));
      const finalAmount = Number(body.salePrice);
      const paidAmount = Math.max(0, Math.min(finalAmount, Number(body.amountCollected || 0)));
      const remaining = Math.max(0, finalAmount - paidAmount);
      const payStatus = remaining === 0 ? "HOAN_THANH" : paymentType === "COD" ? "CHO_DOI_SOAT" : "CON_NO";

      const saleDate = body.saleDate ? new Date(body.saleDate) : new Date();
      const warrantyMonths = Math.max(0, Number(body.warrantyMonths || 0));
      const channel = body.saleChannel?.trim();
      const noteTags = `[PAY_TYPE:${paymentType}] [PAY_STATUS:${payStatus}] [PAID:${paidAmount}] [REMAIN:${remaining}]`;
      const mappedPaymentMethod: PaymentMethod = paymentType === "CASH" ? PaymentMethod.CASH : paymentType === "BANK_TRANSFER" ? PaymentMethod.BANK_TRANSFER : PaymentMethod.DEBT;

      const salesOrder = await tx.salesOrder.create({
        data: {
          orderNo: createOrderNo(),
          saleDate: Number.isNaN(saleDate.getTime()) ? new Date() : saleDate,
          customerId,
          subtotalAmount: finalAmount,
          discountAmount: 0,
          finalAmount,
          paymentMethod: mappedPaymentMethod,
          cashAmount: paymentType === "CASH" ? paidAmount : 0,
          bankAmount: paymentType === "BANK_TRANSFER" ? paidAmount : 0,
          receivableAmount: remaining,
          collaboratorId,
          collaboratorCommissionAmount: commission,
          note: [noteTags, channel ? `Kênh: ${channel}` : "", body.note?.trim() || ""].filter(Boolean).join(" | ") || null,
          createdBy: creator.id,
        },
      });

      await tx.salesOrderItem.create({
        data: {
          salesOrderId: salesOrder.id,
          itemId: item.id,
          salePrice: finalAmount,
          warrantyMonths,
          note: [channel ? `Kênh: ${channel}` : "", body.note?.trim() || ""].filter(Boolean).join(" | ") || null,
        },
      });

      await tx.item.update({
        where: { id: item.id },
        data: { currentStatus: ItemStatus.SOLD, soldAt: Number.isNaN(saleDate.getTime()) ? new Date() : saleDate },
      });

      return { orderNo: salesOrder.orderNo, salesOrderId: salesOrder.id };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: "Lỗi dữ liệu: " + e.message }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Lỗi server khi tạo đơn bán.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
