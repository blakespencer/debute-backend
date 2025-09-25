-- AlterTable
ALTER TABLE "public"."swap_products" ADD COLUMN     "collections" TEXT,
ADD COLUMN     "comments" TEXT,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "full_sku_description" TEXT,
ADD COLUMN     "grams" INTEGER,
ADD COLUMN     "intake_reason" TEXT,
ADD COLUMN     "is_faulty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "main_reason_id" TEXT,
ADD COLUMN     "main_reason_text" TEXT,
ADD COLUMN     "order_number" TEXT,
ADD COLUMN     "original_order_name" TEXT,
ADD COLUMN     "product_alt_type" TEXT,
ADD COLUMN     "shopify_variant_id" TEXT,
ADD COLUMN     "sub_reason_id" TEXT,
ADD COLUMN     "sub_reason_text" TEXT,
ADD COLUMN     "tags" TEXT,
ADD COLUMN     "variant_name" TEXT,
ADD COLUMN     "vendor" TEXT;

-- AlterTable
ALTER TABLE "public"."swap_returns" ADD COLUMN     "billing_city" TEXT,
ADD COLUMN     "billing_country_code" TEXT,
ADD COLUMN     "billing_postcode" TEXT,
ADD COLUMN     "billing_state_province" TEXT,
ADD COLUMN     "shipping_city" TEXT,
ADD COLUMN     "shipping_country_code" TEXT,
ADD COLUMN     "shipping_postcode" TEXT,
ADD COLUMN     "shipping_state_province" TEXT;

-- CreateIndex
CREATE INDEX "swap_products_main_reason_text_idx" ON "public"."swap_products"("main_reason_text");

-- CreateIndex
CREATE INDEX "swap_products_product_alt_type_idx" ON "public"."swap_products"("product_alt_type");

-- CreateIndex
CREATE INDEX "swap_products_return_type_idx" ON "public"."swap_products"("return_type");

-- CreateIndex
CREATE INDEX "swap_products_vendor_idx" ON "public"."swap_products"("vendor");

-- CreateIndex
CREATE INDEX "swap_products_return_id_main_reason_text_idx" ON "public"."swap_products"("return_id", "main_reason_text");

-- CreateIndex
CREATE INDEX "swap_returns_billing_country_code_idx" ON "public"."swap_returns"("billing_country_code");

-- CreateIndex
CREATE INDEX "swap_returns_shipping_country_code_idx" ON "public"."swap_returns"("shipping_country_code");

-- CreateIndex
CREATE INDEX "swap_returns_billing_country_code_billing_city_idx" ON "public"."swap_returns"("billing_country_code", "billing_city");

-- CreateIndex
CREATE INDEX "swap_returns_shipping_country_code_shipping_city_idx" ON "public"."swap_returns"("shipping_country_code", "shipping_city");
