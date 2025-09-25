/*
  Warnings:

  - You are about to drop the `swap_return_reasons` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."swap_address_type" AS ENUM ('billing', 'shipping');

-- DropForeignKey
ALTER TABLE "public"."swap_return_reasons" DROP CONSTRAINT "swap_return_reasons_return_id_fkey";

-- AlterTable
ALTER TABLE "public"."swap_products" ADD COLUMN     "collections" JSONB,
ADD COLUMN     "comments" TEXT,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "full_sku_description" TEXT,
ADD COLUMN     "grams" INTEGER,
ADD COLUMN     "intake_reason" TEXT,
ADD COLUMN     "is_faulty" BOOLEAN,
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
ADD COLUMN     "customer_locale" TEXT,
ADD COLUMN     "customer_national_id" TEXT,
ADD COLUMN     "date_closed" TIMESTAMP(3),
ADD COLUMN     "delivered_date" TEXT,
ADD COLUMN     "elapsed_days_purchase_to_return" INTEGER,
ADD COLUMN     "processed" TEXT,
ADD COLUMN     "processed_by" TEXT,
ADD COLUMN     "quality_control_status" TEXT,
ADD COLUMN     "shipping_carrier" TEXT,
ADD COLUMN     "shipping_city" TEXT,
ADD COLUMN     "shipping_country_code" TEXT,
ADD COLUMN     "shipping_postcode" TEXT,
ADD COLUMN     "shipping_state_province" TEXT,
ADD COLUMN     "shopify_order_date" TIMESTAMP(3),
ADD COLUMN     "submitted_at" TIMESTAMP(3),
ADD COLUMN     "tags" TEXT,
ADD COLUMN     "tracking_number" TEXT;

-- DropTable
DROP TABLE "public"."swap_return_reasons";

-- CreateTable
CREATE TABLE "public"."swap_addresses" (
    "id" TEXT NOT NULL,
    "type" "public"."swap_address_type" NOT NULL,
    "name" TEXT,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "city" TEXT NOT NULL,
    "state_province_code" TEXT,
    "country_code" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "return_id" TEXT NOT NULL,

    CONSTRAINT "swap_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "swap_addresses_type_idx" ON "public"."swap_addresses"("type");

-- CreateIndex
CREATE INDEX "swap_addresses_country_code_idx" ON "public"."swap_addresses"("country_code");

-- CreateIndex
CREATE INDEX "swap_addresses_country_code_city_idx" ON "public"."swap_addresses"("country_code", "city");

-- CreateIndex
CREATE INDEX "swap_addresses_return_id_type_idx" ON "public"."swap_addresses"("return_id", "type");

-- CreateIndex
CREATE INDEX "swap_products_main_reason_text_idx" ON "public"."swap_products"("main_reason_text");

-- CreateIndex
CREATE INDEX "swap_products_product_alt_type_idx" ON "public"."swap_products"("product_alt_type");

-- CreateIndex
CREATE INDEX "swap_products_vendor_idx" ON "public"."swap_products"("vendor");

-- CreateIndex
CREATE INDEX "swap_products_return_type_idx" ON "public"."swap_products"("return_type");

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

-- AddForeignKey
ALTER TABLE "public"."swap_addresses" ADD CONSTRAINT "swap_addresses_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."swap_returns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
