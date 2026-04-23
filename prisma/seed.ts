import { PrismaClient, ItemStatus, PaymentMethod, PayerType, WarrantyStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const isProduction = process.env.NODE_ENV === "production";
  const allowProdSeed = process.env.ALLOW_PROD_SEED === "true";

  if (isProduction && !allowProdSeed) {
    throw new Error("Refuse to run seed in production without ALLOW_PROD_SEED=true");
  }

  if (isProduction) {
    const [itemCount, orderCount] = await Promise.all([
      prisma.item.count(),
      prisma.salesOrder.count(),
    ]);

    if (itemCount > 0 || orderCount > 0) {
      throw new Error(
        "Production seed blocked: database is not empty. Use an empty DB for demo seed or seed manually."
      );
    }
  } else {
    await prisma.auditLog.deleteMany();
    await prisma.debtPayment.deleteMany();
    await prisma.debt.deleteMany();
    await prisma.cashTransaction.deleteMany();
    await prisma.collaboratorCommission.deleteMany();
    await prisma.warrantyCase.deleteMany();
    await prisma.salesOrderItem.deleteMany();
    await prisma.salesOrder.deleteMany();
    await prisma.purchaseReturn.deleteMany();
    await prisma.itemRepair.deleteMany();
    await prisma.itemMedia.deleteMany();
    await prisma.item.deleteMany();
    await prisma.purchaseBatch.deleteMany();
    await prisma.productModel.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.collaborator.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.user.deleteMany();
  }

  const owner = await prisma.user.create({
    data: {
      username: "owner",
      passwordHash: await bcrypt.hash("123456", 10),
      fullName: "MV Owner",
      role: UserRole.OWNER,
    },
  });

  const supplierA = await prisma.supplier.create({ data: { name: "NCC A", phone: "0900000001" } });
  const supplierB = await prisma.supplier.create({ data: { name: "NCC B", phone: "0900000002" } });

  const model5300 = await prisma.productModel.create({
    data: {
      brand: "Dell",
      modelName: "Latitude 5300",
      cpuDefault: "Core i5-8365U",
      ramDefault: "8GB",
      storageDefault: "256GB SSD",
      screenSize: "13.3",
      resolution: "1920x1080",
      driverUrl: "https://www.dell.com/support",
    },
  });

  const batchA = await prisma.purchaseBatch.create({
    data: {
      supplierId: supplierA.id,
      modelId: model5300.id,
      purchaseDate: new Date("2026-03-01"),
      quantity: 3,
      totalPurchaseAmount: 18000000,
      shippingCost: 600000,
      otherCost: 300000,
      status: "RECEIVED",
    },
  });

  const batchB = await prisma.purchaseBatch.create({
    data: {
      supplierId: supplierB.id,
      modelId: model5300.id,
      purchaseDate: new Date("2026-03-02"),
      quantity: 3,
      totalPurchaseAmount: 19500000,
      shippingCost: 450000,
      otherCost: 150000,
      status: "RECEIVED",
    },
  });

  const itemsA = await Promise.all([
    prisma.item.create({
      data: {
        internalCode: "MV-5300-A-001",
        serialNumber: "A5300001",
        manageBySerial: true,
        batchId: batchA.id,
        supplierId: supplierA.id,
        modelId: model5300.id,
        purchaseDate: new Date("2026-03-01"),
        currentStatus: ItemStatus.SOLD,
        purchasePrice: 6000000,
        allocatedCost: 100000,
        batteryStatus: "80%",
        screenStatus: "No bright spot",
        driveHealth: "Good",
        chargerIncluded: true,
        soldAt: new Date("2026-03-20"),
      },
    }),
    prisma.item.create({
      data: {
        internalCode: "MV-5300-A-002",
        serialNumber: "A5300002",
        manageBySerial: true,
        batchId: batchA.id,
        supplierId: supplierA.id,
        modelId: model5300.id,
        purchaseDate: new Date("2026-03-01"),
        currentStatus: ItemStatus.SOLD,
        purchasePrice: 6000000,
        allocatedCost: 100000,
        soldAt: new Date("2026-03-22"),
      },
    }),
    prisma.item.create({
      data: {
        internalCode: "MV-5300-A-003",
        serialNumber: "A5300003",
        manageBySerial: true,
        batchId: batchA.id,
        supplierId: supplierA.id,
        modelId: model5300.id,
        purchaseDate: new Date("2026-03-01"),
        currentStatus: ItemStatus.READY_FOR_SALE,
        purchasePrice: 6000000,
        allocatedCost: 100000,
      },
    }),
  ]);

  const itemsB = await Promise.all([
    prisma.item.create({
      data: {
        internalCode: "MV-5300-B-001",
        serialNumber: "B5300001",
        manageBySerial: true,
        batchId: batchB.id,
        supplierId: supplierB.id,
        modelId: model5300.id,
        purchaseDate: new Date("2026-03-02"),
        currentStatus: ItemStatus.SOLD,
        purchasePrice: 6500000,
        allocatedCost: 100000,
        soldAt: new Date("2026-03-18"),
      },
    }),
    prisma.item.create({
      data: {
        internalCode: "MV-5300-B-002",
        serialNumber: "B5300002",
        manageBySerial: true,
        batchId: batchB.id,
        supplierId: supplierB.id,
        modelId: model5300.id,
        purchaseDate: new Date("2026-03-02"),
        currentStatus: ItemStatus.SOLD,
        purchasePrice: 6500000,
        allocatedCost: 100000,
        soldAt: new Date("2026-03-25"),
      },
    }),
    prisma.item.create({
      data: {
        internalCode: "MV-5300-B-003",
        serialNumber: "B5300003",
        manageBySerial: true,
        batchId: batchB.id,
        supplierId: supplierB.id,
        modelId: model5300.id,
        purchaseDate: new Date("2026-03-02"),
        currentStatus: ItemStatus.READY_FOR_SALE,
        purchasePrice: 6500000,
        allocatedCost: 100000,
      },
    }),
  ]);

  await prisma.itemRepair.createMany({
    data: [
      { itemId: itemsA[0].id, repairDate: new Date("2026-03-03"), repairType: "REPLACE_BATTERY", totalCost: 500000, includeInCost: true },
      { itemId: itemsA[1].id, repairDate: new Date("2026-03-04"), repairType: "SCREEN_FIX", totalCost: 500000, includeInCost: true },
      { itemId: itemsA[2].id, repairDate: new Date("2026-03-05"), repairType: "CLEANING", totalCost: 500000, includeInCost: true },
      { itemId: itemsB[0].id, repairDate: new Date("2026-03-03"), repairType: "CLEANING", totalCost: 100000, includeInCost: true },
      { itemId: itemsB[1].id, repairDate: new Date("2026-03-04"), repairType: "CLEANING", totalCost: 100000, includeInCost: true },
    ],
  });

  const collaborator = await prisma.collaborator.create({ data: { name: "CTV Minh" } });
  const customer = await prisma.customer.create({ data: { name: "Khách lẻ 1", phone: "0909123456" } });

  const saleA1 = await prisma.salesOrder.create({
    data: {
      orderNo: "SO-A-001",
      saleDate: new Date("2026-03-20"),
      customerId: customer.id,
      subtotalAmount: 8900000,
      finalAmount: 8900000,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      bankAmount: 8900000,
      collaboratorId: collaborator.id,
      collaboratorCommissionAmount: 200000,
      createdBy: owner.id,
      items: {
        create: {
          itemId: itemsA[0].id,
          salePrice: 8900000,
          warrantyMonths: 3,
        },
      },
    },
  });

  const saleA2 = await prisma.salesOrder.create({
    data: {
      orderNo: "SO-A-002",
      saleDate: new Date("2026-03-22"),
      subtotalAmount: 9000000,
      finalAmount: 9000000,
      paymentMethod: PaymentMethod.CASH,
      cashAmount: 9000000,
      collaboratorCommissionAmount: 200000,
      createdBy: owner.id,
      items: {
        create: {
          itemId: itemsA[1].id,
          salePrice: 9000000,
          warrantyMonths: 3,
        },
      },
    },
  });

  const saleB1 = await prisma.salesOrder.create({
    data: {
      orderNo: "SO-B-001",
      saleDate: new Date("2026-03-18"),
      subtotalAmount: 9500000,
      finalAmount: 9500000,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      bankAmount: 9500000,
      collaboratorCommissionAmount: 150000,
      createdBy: owner.id,
      items: {
        create: {
          itemId: itemsB[0].id,
          salePrice: 9500000,
          warrantyMonths: 3,
        },
      },
    },
  });

  const saleB2 = await prisma.salesOrder.create({
    data: {
      orderNo: "SO-B-002",
      saleDate: new Date("2026-03-25"),
      subtotalAmount: 9600000,
      finalAmount: 9600000,
      paymentMethod: PaymentMethod.CASH,
      cashAmount: 9600000,
      collaboratorCommissionAmount: 150000,
      createdBy: owner.id,
      items: {
        create: {
          itemId: itemsB[1].id,
          salePrice: 9600000,
          warrantyMonths: 3,
        },
      },
    },
  });

  await prisma.collaboratorCommission.createMany({
    data: [
      { collaboratorId: collaborator.id, salesOrderId: saleA1.id, amount: 200000, paidAmount: 100000, dueAmount: 100000 },
      { collaboratorId: collaborator.id, salesOrderId: saleA2.id, amount: 200000, paidAmount: 200000, dueAmount: 0, status: "PAID" as any },
      { collaboratorId: collaborator.id, salesOrderId: saleB1.id, amount: 150000, paidAmount: 0, dueAmount: 150000 },
      { collaboratorId: collaborator.id, salesOrderId: saleB2.id, amount: 150000, paidAmount: 0, dueAmount: 150000 },
    ],
  });

  await prisma.warrantyCase.createMany({
    data: [
      {
        itemId: itemsA[0].id,
        salesOrderId: saleA1.id,
        createdDate: new Date("2026-04-05"),
        issueDescription: "Pin tụt nhanh",
        costAmount: 300000,
        payerType: PayerType.SHOP,
        shopShareAmount: 300000,
        status: WarrantyStatus.RESOLVED,
      },
      {
        itemId: itemsB[0].id,
        salesOrderId: saleB1.id,
        createdDate: new Date("2026-04-06"),
        issueDescription: "Vệ sinh quạt",
        costAmount: 100000,
        payerType: PayerType.SHOP,
        shopShareAmount: 100000,
        status: WarrantyStatus.RESOLVED,
      },
    ],
  });

  console.log("Seeded: users, suppliers A/B, Dell 5300, items, repairs, sales, warranty.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
