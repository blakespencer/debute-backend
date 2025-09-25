-- CreateTable
CREATE TABLE "public"."swap_stores" (
    "id" TEXT NOT NULL,
    "swap_store_id" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "store_name" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "swap_stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."swap_returns" (
    "id" TEXT NOT NULL,
    "swap_return_id" TEXT NOT NULL,
    "order_name" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "rma" TEXT NOT NULL,
    "shopify_order_id" TEXT,
    "is_matched" BOOLEAN NOT NULL DEFAULT false,
    "type_string" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "shipping_status" TEXT NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "handling_fee" DECIMAL(65,30) NOT NULL,
    "shop_now_revenue" DECIMAL(65,30) NOT NULL,
    "shop_later_revenue" DECIMAL(65,30) NOT NULL,
    "exchange_revenue" DECIMAL(65,30) NOT NULL,
    "refund_revenue" DECIMAL(65,30) NOT NULL,
    "total_additional_payment" DECIMAL(65,30) NOT NULL,
    "total_credit_exchange_value" DECIMAL(65,30) NOT NULL,
    "total_refund_value_customer_currency" DECIMAL(65,30) NOT NULL,
    "customer_name" TEXT,
    "customer_currency" TEXT,
    "total_tax" DECIMAL(65,30),
    "total_duty" DECIMAL(65,30),
    "tax_currency" TEXT,
    "date_created" TIMESTAMP(3) NOT NULL,
    "date_updated" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "store_id" TEXT NOT NULL,

    CONSTRAINT "swap_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."swap_products" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "shopify_product_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "item_count" INTEGER NOT NULL,
    "cost" DECIMAL(65,30) NOT NULL,
    "return_type" TEXT NOT NULL,
    "return_id" TEXT NOT NULL,

    CONSTRAINT "swap_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."swap_return_reasons" (
    "id" TEXT NOT NULL,
    "main_reason_id" TEXT,
    "main_reason_text" TEXT,
    "sub_reason_id" TEXT,
    "sub_reason_text" TEXT,
    "comments" TEXT,
    "return_id" TEXT NOT NULL,

    CONSTRAINT "swap_return_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "swap_stores_swap_store_id_key" ON "public"."swap_stores"("swap_store_id");

-- CreateIndex
CREATE UNIQUE INDEX "swap_returns_swap_return_id_key" ON "public"."swap_returns"("swap_return_id");

-- CreateIndex
CREATE INDEX "swap_returns_date_created_idx" ON "public"."swap_returns"("date_created");

-- CreateIndex
CREATE INDEX "swap_returns_status_idx" ON "public"."swap_returns"("status");

-- CreateIndex
CREATE INDEX "swap_returns_type_string_idx" ON "public"."swap_returns"("type_string");

-- CreateIndex
CREATE INDEX "swap_returns_shopify_order_id_idx" ON "public"."swap_returns"("shopify_order_id");

-- CreateIndex
CREATE INDEX "swap_returns_is_matched_idx" ON "public"."swap_returns"("is_matched");

-- CreateIndex
CREATE INDEX "swap_returns_is_matched_shopify_order_id_idx" ON "public"."swap_returns"("is_matched", "shopify_order_id");

-- CreateIndex
CREATE INDEX "swap_returns_store_id_date_created_idx" ON "public"."swap_returns"("store_id", "date_created");

-- CreateIndex
CREATE INDEX "swap_returns_status_date_created_idx" ON "public"."swap_returns"("status", "date_created");

-- AddForeignKey
ALTER TABLE "public"."swap_returns" ADD CONSTRAINT "swap_returns_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."swap_stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."swap_products" ADD CONSTRAINT "swap_products_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."swap_returns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."swap_return_reasons" ADD CONSTRAINT "swap_return_reasons_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."swap_returns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
