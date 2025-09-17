-- CreateTable
CREATE TABLE "public"."orders" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShopifyStore" (
    "id" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopifyStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shopify_orders" (
    "id" TEXT NOT NULL,
    "shopify_order_id" TEXT NOT NULL,
    "legacy_resource_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "currency_code" TEXT NOT NULL,
    "presentment_currency_code" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "customer_accepts_marketing" BOOLEAN NOT NULL DEFAULT false,
    "current_total_price_amount" DECIMAL(65,30) NOT NULL,
    "current_total_price_presentment_amount" DECIMAL(65,30),
    "current_subtotal_price_amount" DECIMAL(65,30) NOT NULL,
    "current_subtotal_price_presentment_amount" DECIMAL(65,30),
    "current_total_tax_amount" DECIMAL(65,30),
    "current_total_tax_presentment_amount" DECIMAL(65,30),
    "display_financial_status" TEXT NOT NULL,
    "display_fulfillment_status" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "taxes_included" BOOLEAN NOT NULL DEFAULT false,
    "test" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "store_id" TEXT NOT NULL,

    CONSTRAINT "shopify_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shopify_line_items" (
    "id" TEXT NOT NULL,
    "shopify_line_item_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variant_title" TEXT,
    "product_id" TEXT,
    "variant_id" TEXT,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "current_quantity" INTEGER NOT NULL,
    "original_unit_price_amount" DECIMAL(65,30) NOT NULL,
    "original_unit_price_presentment_amount" DECIMAL(65,30),
    "original_total_price_amount" DECIMAL(65,30) NOT NULL,
    "original_total_price_presentment_amount" DECIMAL(65,30),
    "requires_shipping" BOOLEAN NOT NULL DEFAULT true,
    "order_id" TEXT NOT NULL,

    CONSTRAINT "shopify_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_id_key" ON "public"."orders"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyStore_shopDomain_key" ON "public"."ShopifyStore"("shopDomain");

-- CreateIndex
CREATE UNIQUE INDEX "shopify_orders_shopify_order_id_key" ON "public"."shopify_orders"("shopify_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "shopify_orders_store_id_name_key" ON "public"."shopify_orders"("store_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "shopify_line_items_shopify_line_item_id_key" ON "public"."shopify_line_items"("shopify_line_item_id");

-- AddForeignKey
ALTER TABLE "public"."shopify_orders" ADD CONSTRAINT "shopify_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."ShopifyStore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shopify_line_items" ADD CONSTRAINT "shopify_line_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."shopify_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
