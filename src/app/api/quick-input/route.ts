import { NextResponse } from "next/server";
import { ItemStatus, Prisma } from "@prisma/client";
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

function normalizeSerial(serial: string) {
  return serial.trim();
}

function findDuplicateSerials(serials: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const serial of serials) {
    const key = serial.toLowerCase();
    if (seen.has(key)) duplicates.add(serial);
    seen.add(key);
  }

  return Array.from(duplicates);
}

function duplicateSerialMessage(duplicates: string[], source: "batch" | "database") {
  const shown = duplicates.slice(0, 12).join(", ");
  const more = duplicates.length > 12 ? ` và ${duplicates.length - 12} serial khác` : "";
  return source === "batch"
    ? `Serial bị trùng trong lô đang nhập: ${shown}${more}. Vui lòng kiểm tra lại trước khi lưu.`
    : `Serial đã tồn tại trong hệ thống: ${shown}${more}. Vui lòng kiểm tra lại, không nhập trùng máy.`;
}

async function findExistingSerials(serials: string[]) {
  const uniqueSerials = Array.from(new Set(serials.map(normalizeSerial).filter(Boolean)));
  if (!uniqueSerials.length) return [];

  const rows = await prisma.item.findMany({
    where: { serialNumber: { in: uniqueSerials } },
    select: { serialNumber: true },
  });

  return rows.map((row) => row.serialNumber).filter((serial): serial is string => Boolean(serial));
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

      const allSerials = lines.flatMap((line) => {
        if (!line?.hasSerial) return [];
        return String(line?.serialsText || "")
          .split(/\r?\n|,|;/)
          .map(normalizeSerial)
          .filter(Boolean);
      });
      const duplicateInBatch = findDuplicateSerials(allSerials);
      if (duplicateInBatch.length) {
        return NextResponse.json({ error: duplicateSerialMessage(duplicateInBatch, "batch") }, { status: 400 });
      }

      const duplicateInDb = await findExistingSerials(allSerials);
      if (duplicateInDb.length) {
        return NextResponse.json({ error: duplicateSerialMessage(duplicateInDb, "database") }, { status: 400 });
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
              .map(normalizeSerial)
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
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = Array.isArray(e.meta?.target) ? e.meta.target.join(", ") : String(e.meta?.target || "dữ liệu duy nhất");
      if (target.includes("serial_number")) {
        return NextResponse.json({ error: "Serial đã tồn tại trong hệ thống. Vui lòng kiểm tra lại, không nhập trùng máy." }, { status: 400 });
      }
      return NextResponse.json({ error: `Dữ liệu bị trùng (${target}). Vui lòng kiểm tra lại trước khi lưu.` }, { status: 400 });
    }

    const message = e instanceof Error ? e.message : "Lỗi server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
