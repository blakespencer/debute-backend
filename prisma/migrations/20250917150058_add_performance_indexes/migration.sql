-- CreateIndex
CREATE INDEX "orders_order_date_idx" ON "public"."orders"("order_date");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "public"."orders"("status");

-- CreateIndex
CREATE INDEX "orders_status_order_date_idx" ON "public"."orders"("status", "order_date");

-- CreateIndex
CREATE INDEX "shopify_orders_created_at_idx" ON "public"."shopify_orders"("created_at");

-- CreateIndex
CREATE INDEX "shopify_orders_display_financial_status_idx" ON "public"."shopify_orders"("display_financial_status");

-- CreateIndex
CREATE INDEX "shopify_orders_store_id_created_at_idx" ON "public"."shopify_orders"("store_id", "created_at");

-- CreateIndex
CREATE INDEX "shopify_orders_display_financial_status_created_at_idx" ON "public"."shopify_orders"("display_financial_status", "created_at");
