import { ItemStatus, PaymentMethod, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type SaleItemInput = {
  itemId: number;
  salePrice: number;
  warrantyMonths?: number;
};

type Body = {
  itemId?: number;
  salePrice?: number;
  items?: SaleItemInput[];
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

function normalizeSaleItems(body: Body): SaleItemInput[] {
  if (Array.isArray(body.items) && body.items.length > 0) {
    return body.items.map((item) => ({
      itemId: Number(item.itemId),
      salePrice: Number(item.salePrice),
      warrantyMonths: item.warrantyMonths,
    }));
  }

  if (body.itemId && body.salePrice) {
    return [{ itemId: Number(body.itemId), salePrice: Number(body.salePrice), warrantyMonths: body.warrantyMonths }];
  }

  return [];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const saleItems = normalizeSaleItems(body);

    if (saleItems.length === 0) {
      return NextResponse.json({ error: "Vui lòng chọn ít nhất 1 máy cần bán." }, { status: 400 });
    }

    const uniqueItemIds = new Set(saleItems.map((item) => item.itemId));
    if (uniqueItemIds.size !== saleItems.length) {
      return NextResponse.json({ error: "Danh sách máy bán bị trùng, vui lòng kiểm tra lại." }, { status: 400 });
    }

    const invalidSaleItem = saleItems.find((item) => !item.itemId || !item.salePrice || item.salePrice <= 0);
    if (invalidSaleItem) {
      return NextResponse.json({ error: "Giá bán của từng máy phải lớn hơn 0." }, { status: 400 });
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
      const itemIds = saleItems.map((item) => item.itemId);
      const items = await tx.item.findMany({ where: { id: { in: itemIds } } });
      const itemsById = new Map(items.map((item) => [item.id, item]));

      for (const saleItem of saleItems) {
        const item = itemsById.get(saleItem.itemId);
        if (!item) throw new Error(`Không tìm thấy máy ID ${saleItem.itemId}.`);
        if (!allowedStatuses.has(item.currentStatus)) {
          throw new Error(`Máy ${item.internalCode} không ở trạng thái có thể bán.`);
        }
      }

      const existedSales = await tx.salesOrderItem.findMany({
        where: { itemId: { in: itemIds } },
        include: { item: true },
      });
      if (existedSales.length > 0) {
        const soldCodes = existedSales.map((sale) => sale.item.internalCode).join(", ");
        throw new Error(`Máy đã được bán trước đó: ${soldCodes}.`);
      }

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
      const finalAmount = saleItems.reduce((sum, item) => sum + Number(item.salePrice), 0);
      const paidAmount = Math.max(0, Math.min(finalAmount, Number(body.amountCollected || 0)));
      const remaining = Math.max(0, finalAmount - paidAmount);
      const payStatus = remaining === 0 ? "HOAN_THANH" : paymentType === "COD" ? "CHO_DOI_SOAT" : "CON_NO";

      const saleDate = body.saleDate ? new Date(body.saleDate) : new Date();
      const soldAt = Number.isNaN(saleDate.getTime()) ? new Date() : saleDate;
      const channel = body.saleChannel?.trim();
      const noteTags = `[PAY_TYPE:${paymentType}] [PAY_STATUS:${payStatus}] [PAID:${paidAmount}] [REMAIN:${remaining}] [ITEM_COUNT:${saleItems.length}]`;
      const mappedPaymentMethod: PaymentMethod = paymentType === "CASH" ? PaymentMethod.CASH : paymentType === "BANK_TRANSFER" ? PaymentMethod.BANK_TRANSFER : PaymentMethod.DEBT;

      const salesOrder = await tx.salesOrder.create({
        data: {
          orderNo: createOrderNo(),
          saleDate: soldAt,
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

      await tx.salesOrderItem.createMany({
        data: saleItems.map((saleItem) => ({
          salesOrderId: salesOrder.id,
          itemId: saleItem.itemId,
          salePrice: Number(saleItem.salePrice),
          warrantyMonths: Math.max(0, Number(saleItem.warrantyMonths ?? body.warrantyMonths ?? 0)),
          note: [channel ? `Kênh: ${channel}` : "", body.note?.trim() || ""].filter(Boolean).join(" | ") || null,
        })),
      });

      await tx.item.updateMany({
        where: { id: { in: itemIds } },
        data: { currentStatus: ItemStatus.SOLD, soldAt },
      });

      return { orderNo: salesOrder.orderNo, salesOrderId: salesOrder.id, itemCount: saleItems.length };
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
