import { NextResponse } from "next/server";
import { ItemStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function splitModelLabel(modelLabel: string) {
  const t = modelLabel.trim();
  if (!t) return { brand: "Laptop", modelName: "Unknown" };
  const parts = t.split(" ").filter(Boolean);
  if (parts.length === 1) return { brand: "Laptop", modelName: parts[0] };
  return { brand: parts[0], modelName: parts.slice(1).join(" ") };
}

async function findOrCreateSupplier(name: string) {
  const trimmed = name.trim();
  let supplier = await prisma.supplier.findFirst({ where: { name: trimmed } });
  if (!supplier) supplier = await prisma.supplier.create({ data: { name: trimmed } });
  return supplier;
}

async function findOrCreateModel(brand: string, modelName: string, note?: string) {
  const b = brand.trim();
  const m = modelName.trim();
  let model = await prisma.productModel.findFirst({ where: { brand: b, modelName: m } });
  if (!model) {
    model = await prisma.productModel.create({
      data: { brand: b, modelName: m, note: note?.trim() || null },
    });
  }
  return model;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // New batch/grid mode
    if (Array.isArray(body?.lines)) {
      const supplierName = String(body?.supplierName || "").trim();
      const purchaseDate = String(body?.purchaseDate || "").trim();
      const batchNote = String(body?.batchNote || "").trim();
      const lines = body.lines as Array<{
        model: string;
        quantity: number | string;
        purchasePrice: number | string;
        hasSerial?: boolean;
        serialsText?: string;
        note?: string;
      }>;

      if (!supplierName || !purchaseDate || lines.length === 0) {
        return NextResponse.json({ error: "Thiếu thông tin lô nhập." }, { status: 400 });
      }

      const supplier = await findOrCreateSupplier(supplierName);
      const date = new Date(purchaseDate);
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: "Ngày nhập không hợp lệ." }, { status: 400 });
      }

      const createdIds: number[] = [];
      const lineSummaries: Array<{ model: string; count: number }> = [];

      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        const modelText = String(line?.model || "").trim();
        const qty = Number(line?.quantity);
        const price = Number(line?.purchasePrice);
        const hasSerial = Boolean(line?.hasSerial);
        const lineNote = String(line?.note || "").trim();

        if (!modelText || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) {
          return NextResponse.json({ error: `Dòng ${idx + 1} chưa hợp lệ (model/số lượng/giá nhập).` }, { status: 400 });
        }

        const serialList = hasSerial
          ? String(line?.serialsText || "")
              .split(/\r?\n|,|;/)
              .map((x) => x.trim())
              .filter(Boolean)
          : [];

        if (hasSerial && serialList.length !== qty) {
          return NextResponse.json(
            { error: `Dòng ${idx + 1}: số serial (${serialList.length}) phải khớp số lượng (${qty}).` },
            { status: 400 }
          );
        }

        const { brand, modelName } = splitModelLabel(modelText);
        const model = await findOrCreateModel(brand, modelName, lineNote || batchNote);

        for (let i = 0; i < qty; i++) {
          const serial = hasSerial ? serialList[i] : null;
          const internalCode = `MV-${slugify(modelName)}-${Date.now()}-${Math.floor(Math.random() * 10000)}-${i + 1}`;

          const item = await prisma.item.create({
            data: {
              internalCode,
              serialNumber: serial,
              manageBySerial: hasSerial,
              supplierId: supplier.id,
              modelId: model.id,
              purchaseDate: date,
              purchasePrice: price,
              allocatedCost: 0,
              currentStatus: ItemStatus.PENDING_CHECK,
              note: [batchNote, lineNote].filter(Boolean).join(" | ") || null,
            },
          });

          createdIds.push(item.id);
        }

        lineSummaries.push({ model: modelText, count: qty });
      }

      return NextResponse.json({
        ok: true,
        mode: "batch",
        supplierId: supplier.id,
        createdItemCount: createdIds.length,
        itemIds: createdIds,
        lines: lineSummaries,
        statusLabel: "Chưa cập nhật chi tiết",
      });
    }

    // Legacy quick-input mode (keep compatibility)
    const {
      supplierName,
      brand,
      modelName,
      quantity,
      purchasePrice,
      purchaseDate,
      note,
    } = body as {
      supplierName: string;
      brand: string;
      modelName: string;
      quantity: number | string;
      purchasePrice: number | string;
      purchaseDate: string;
      note?: string;
    };

    if (!supplierName || !brand || !modelName || !quantity || !purchasePrice || !purchaseDate) {
      return NextResponse.json({ error: "Thiếu dữ liệu bắt buộc." }, { status: 400 });
    }

    const qty = Number(quantity);
    const price = Number(purchasePrice);

    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ error: "Số lượng không hợp lệ." }, { status: 400 });
    }
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Giá nhập không hợp lệ." }, { status: 400 });
    }

    const supplier = await findOrCreateSupplier(supplierName);
    const model = await findOrCreateModel(brand, modelName, note);

    const createdItems: number[] = [];
    const date = new Date(purchaseDate);

    for (let i = 0; i < qty; i++) {
      const code = `MV-${slugify(modelName)}-${Date.now()}-${Math.floor(Math.random() * 10000)}-${i + 1}`;

      const item = await prisma.item.create({
        data: {
          internalCode: code,
          supplierId: supplier.id,
          modelId: model.id,
          purchaseDate: date,
          purchasePrice: price,
          allocatedCost: 0,
          currentStatus: ItemStatus.NEW_IMPORTED,
          note: note?.trim() || null,
        },
      });

      createdItems.push(item.id);
    }

    return NextResponse.json({
      ok: true,
      mode: "legacy",
      supplierId: supplier.id,
      modelId: model.id,
      createdItemCount: createdItems.length,
      itemIds: createdItems,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Lỗi server" }, { status: 500 });
  }
}
