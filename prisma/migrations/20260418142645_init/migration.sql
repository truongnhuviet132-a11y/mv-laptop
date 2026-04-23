-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'SALES', 'TECHNICIAN', 'ACCOUNTANT', 'VIEWER');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('NEW_IMPORTED', 'PENDING_CHECK', 'DEFECT_PENDING_DECISION', 'RETURNED_SUPPLIER', 'PROCESSING', 'PROCESSING_DONE_WAIT_SALE', 'READY_FOR_SALE', 'SOLD', 'UNDER_WARRANTY', 'WARRANTY_COMPLETED', 'PARTS_LIQUIDATION', 'CANCELED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'DOCUMENT', 'VIDEO');

-- CreateEnum
CREATE TYPE "PayerType" AS ENUM ('SHOP', 'SUPPLIER', 'SHARED', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "WarrantyStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELED');

-- CreateEnum
CREATE TYPE "DebtPartyType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'COLLABORATOR');

-- CreateEnum
CREATE TYPE "DebtType" AS ENUM ('RECEIVABLE', 'PAYABLE');

-- CreateEnum
CREATE TYPE "DebtStatus" AS ENUM ('OPEN', 'PARTIAL', 'PAID', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'MIXED', 'DEBT');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CASH', 'BANK');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('IN', 'OUT', 'TRANSFER');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaborators" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_models" (
    "id" SERIAL NOT NULL,
    "brand" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "cpu_default" TEXT,
    "ram_default" TEXT,
    "storage_default" TEXT,
    "gpu_default" TEXT,
    "screen_size" TEXT,
    "resolution" TEXT,
    "image_url" TEXT,
    "driver_url" TEXT,
    "doc_url" TEXT,
    "note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_batches" (
    "id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "model_id" INTEGER NOT NULL,
    "purchase_date" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "total_purchase_amount" INTEGER NOT NULL,
    "shipping_cost" INTEGER NOT NULL DEFAULT 0,
    "other_cost" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "status" TEXT,

    CONSTRAINT "purchase_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" SERIAL NOT NULL,
    "internal_code" TEXT NOT NULL,
    "serial_number" TEXT,
    "manage_by_serial" BOOLEAN NOT NULL DEFAULT false,
    "batch_id" INTEGER,
    "supplier_id" INTEGER NOT NULL,
    "model_id" INTEGER NOT NULL,
    "purchase_date" TIMESTAMP(3) NOT NULL,
    "actual_cpu" TEXT,
    "actual_ram" TEXT,
    "actual_storage" TEXT,
    "actual_gpu" TEXT,
    "battery_status" TEXT,
    "screen_status" TEXT,
    "drive_health" TEXT,
    "appearance_grade" TEXT,
    "keyboard_status" TEXT,
    "charger_included" BOOLEAN NOT NULL DEFAULT false,
    "initial_condition_note" TEXT,
    "current_status" "ItemStatus" NOT NULL DEFAULT 'NEW_IMPORTED',
    "purchase_price" INTEGER NOT NULL,
    "allocated_cost" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "sold_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_media" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER,
    "model_id" INTEGER,
    "media_type" "MediaType" NOT NULL,
    "file_path_or_url" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "item_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_repairs" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "repair_date" TIMESTAMP(3) NOT NULL,
    "repair_type" TEXT NOT NULL,
    "description" TEXT,
    "part_name" TEXT,
    "part_cost" INTEGER NOT NULL DEFAULT 0,
    "labor_cost" INTEGER NOT NULL DEFAULT 0,
    "external_cost" INTEGER NOT NULL DEFAULT 0,
    "total_cost" INTEGER NOT NULL DEFAULT 0,
    "include_in_cost" BOOLEAN NOT NULL DEFAULT true,
    "vendor_or_person" TEXT,
    "note" TEXT,

    CONSTRAINT "item_repairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_returns" (
    "id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "batch_id" INTEGER,
    "item_id" INTEGER,
    "return_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "refund_amount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "purchase_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" SERIAL NOT NULL,
    "order_no" TEXT NOT NULL,
    "sale_date" TIMESTAMP(3) NOT NULL,
    "customer_id" INTEGER,
    "subtotal_amount" INTEGER NOT NULL DEFAULT 0,
    "discount_amount" INTEGER NOT NULL DEFAULT 0,
    "final_amount" INTEGER NOT NULL DEFAULT 0,
    "payment_method" "PaymentMethod" NOT NULL,
    "cash_amount" INTEGER NOT NULL DEFAULT 0,
    "bank_amount" INTEGER NOT NULL DEFAULT 0,
    "receivable_amount" INTEGER NOT NULL DEFAULT 0,
    "collaborator_id" INTEGER,
    "collaborator_commission_amount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_items" (
    "id" SERIAL NOT NULL,
    "sales_order_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "sale_price" INTEGER NOT NULL,
    "warranty_months" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty_cases" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "sales_order_id" INTEGER,
    "created_date" TIMESTAMP(3) NOT NULL,
    "issue_description" TEXT NOT NULL,
    "resolution" TEXT,
    "cost_amount" INTEGER NOT NULL DEFAULT 0,
    "payer_type" "PayerType" NOT NULL,
    "supplier_share_amount" INTEGER NOT NULL DEFAULT 0,
    "shop_share_amount" INTEGER NOT NULL DEFAULT 0,
    "customer_share_amount" INTEGER NOT NULL DEFAULT 0,
    "status" "WarrantyStatus" NOT NULL DEFAULT 'OPEN',
    "note" TEXT,

    CONSTRAINT "warranty_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaborator_commissions" (
    "id" SERIAL NOT NULL,
    "collaborator_id" INTEGER NOT NULL,
    "sales_order_id" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "paid_amount" INTEGER NOT NULL DEFAULT 0,
    "due_amount" INTEGER NOT NULL DEFAULT 0,
    "status" "DebtStatus" NOT NULL DEFAULT 'OPEN',
    "note" TEXT,

    CONSTRAINT "collaborator_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_transactions" (
    "id" SERIAL NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "account_type" "AccountType" NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "category" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" INTEGER,
    "note" TEXT,
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debts" (
    "id" SERIAL NOT NULL,
    "party_type" "DebtPartyType" NOT NULL,
    "party_id" INTEGER NOT NULL,
    "debt_type" "DebtType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "paid_amount" INTEGER NOT NULL DEFAULT 0,
    "due_amount" INTEGER NOT NULL DEFAULT 0,
    "status" "DebtStatus" NOT NULL DEFAULT 'OPEN',
    "note" TEXT,

    CONSTRAINT "debts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_payments" (
    "id" SERIAL NOT NULL,
    "debt_id" INTEGER NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "note" TEXT,

    CONSTRAINT "debt_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "old_data" JSONB,
    "new_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "items_internal_code_key" ON "items"("internal_code");

-- CreateIndex
CREATE UNIQUE INDEX "items_serial_number_key" ON "items"("serial_number");

-- CreateIndex
CREATE INDEX "items_model_id_supplier_id_purchase_date_idx" ON "items"("model_id", "supplier_id", "purchase_date");

-- CreateIndex
CREATE INDEX "item_repairs_item_id_repair_date_idx" ON "item_repairs"("item_id", "repair_date");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_order_no_key" ON "sales_orders"("order_no");

-- CreateIndex
CREATE UNIQUE INDEX "sales_order_items_item_id_key" ON "sales_order_items"("item_id");

-- CreateIndex
CREATE INDEX "warranty_cases_item_id_created_date_idx" ON "warranty_cases"("item_id", "created_date");

-- AddForeignKey
ALTER TABLE "purchase_batches" ADD CONSTRAINT "purchase_batches_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_batches" ADD CONSTRAINT "purchase_batches_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "product_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "purchase_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "product_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_media" ADD CONSTRAINT "item_media_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_media" ADD CONSTRAINT "item_media_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "product_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_repairs" ADD CONSTRAINT "item_repairs_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "purchase_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_collaborator_id_fkey" FOREIGN KEY ("collaborator_id") REFERENCES "collaborators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_cases" ADD CONSTRAINT "warranty_cases_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_cases" ADD CONSTRAINT "warranty_cases_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborator_commissions" ADD CONSTRAINT "collaborator_commissions_collaborator_id_fkey" FOREIGN KEY ("collaborator_id") REFERENCES "collaborators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborator_commissions" ADD CONSTRAINT "collaborator_commissions_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
