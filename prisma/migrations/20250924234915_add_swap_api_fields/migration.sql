/*
  Warnings:

  - You are about to drop the column `collections` on the `swap_products` table. All the data in the column will be lost.
  - You are about to drop the column `comments` on the `swap_products` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `swap_products` table. All the data in the column will be lost.
  - You are about to drop the column `full_sku_description` on the `swap_products` table. All the data in the column will be lost.
  - You are about to drop the column `grams` on the `swap_products` table. All the data in the column will be lost.
  - You are about to drop the column `intake_reason` on the `swap_products` table. All the data in the column will be lost.
  - You are about to drop the column `is_faulty` on the `swap_products` table. All the data in the column will be lost.
  - You are about to drop the column `main_reason_id` on the `swap_products` table. All the data in the column will be lost.
  - You are about to drop the column `main_reason_text` on the `swap_products` table. All the data in the column will be lost.
  - You are about to drop the column `order_number` on the `swap_products` table. All the data in the column will be lost.
  - You are about to drop the column `original_order_name` on the `swap_products` table. All the data in the column will be lost.
  - You are about to drop the column `product_alt_type` on the `swap_products` table. All the data in the column will be lost.
  - You are about to drop the column `shopify_variant_id` on the `swap_products` table. All the data in the column will be lost.
  - You are about to drop the column `sub_reason_id` on the `swap_products` table. All the data in the column will be lost.
  - You are about to drop the column `sub_reason_text` on the `swap_products` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `swap_products` table. All the data in the column will be lost.
  - You are about to drop the column `variant_name` on the `swap_products` table. All the data in the column will be lost.
  - You are about to drop the column `vendor` on the `swap_products` table. All the data in the column will be lost.
  - You are about to drop the column `billing_city` on the `swap_returns` table. All the data in the column will be lost.
  - You are about to drop the column `billing_country_code` on the `swap_returns` table. All the data in the column will be lost.
  - You are about to drop the column `billing_postcode` on the `swap_returns` table. All the data in the column will be lost.
  - You are about to drop the column `billing_state_province` on the `swap_returns` table. All the data in the column will be lost.
  - You are about to drop the column `shipping_city` on the `swap_returns` table. All the data in the column will be lost.
  - You are about to drop the column `shipping_country_code` on the `swap_returns` table. All the data in the column will be lost.
  - You are about to drop the column `shipping_postcode` on the `swap_returns` table. All the data in the column will be lost.
  - You are about to drop the column `shipping_state_province` on the `swap_returns` table. All the data in the column will be lost.
  - The `delivered_date` column on the `swap_returns` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `swap_addresses` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."swap_addresses" DROP CONSTRAINT "swap_addresses_return_id_fkey";

-- DropIndex
DROP INDEX "public"."swap_products_main_reason_text_idx";

-- DropIndex
DROP INDEX "public"."swap_products_product_alt_type_idx";

-- DropIndex
DROP INDEX "public"."swap_products_return_id_main_reason_text_idx";

-- DropIndex
DROP INDEX "public"."swap_products_return_type_idx";

-- DropIndex
DROP INDEX "public"."swap_products_vendor_idx";

-- DropIndex
DROP INDEX "public"."swap_returns_billing_country_code_billing_city_idx";

-- DropIndex
DROP INDEX "public"."swap_returns_billing_country_code_idx";

-- DropIndex
DROP INDEX "public"."swap_returns_shipping_country_code_idx";

-- DropIndex
DROP INDEX "public"."swap_returns_shipping_country_code_shipping_city_idx";

-- AlterTable
ALTER TABLE "public"."swap_products" DROP COLUMN "collections",
DROP COLUMN "comments",
DROP COLUMN "currency",
DROP COLUMN "full_sku_description",
DROP COLUMN "grams",
DROP COLUMN "intake_reason",
DROP COLUMN "is_faulty",
DROP COLUMN "main_reason_id",
DROP COLUMN "main_reason_text",
DROP COLUMN "order_number",
DROP COLUMN "original_order_name",
DROP COLUMN "product_alt_type",
DROP COLUMN "shopify_variant_id",
DROP COLUMN "sub_reason_id",
DROP COLUMN "sub_reason_text",
DROP COLUMN "tags",
DROP COLUMN "variant_name",
DROP COLUMN "vendor";

-- AlterTable
ALTER TABLE "public"."swap_returns" DROP COLUMN "billing_city",
DROP COLUMN "billing_country_code",
DROP COLUMN "billing_postcode",
DROP COLUMN "billing_state_province",
DROP COLUMN "shipping_city",
DROP COLUMN "shipping_country_code",
DROP COLUMN "shipping_postcode",
DROP COLUMN "shipping_state_province",
ADD COLUMN     "delivery_status" TEXT,
ADD COLUMN     "order_alt_type" TEXT,
ADD COLUMN     "return_status" TEXT,
DROP COLUMN "delivered_date",
ADD COLUMN     "delivered_date" TIMESTAMP(3);

-- DropTable
DROP TABLE "public"."swap_addresses";

-- DropEnum
DROP TYPE "public"."swap_address_type";

-- CreateTable
CREATE TABLE "public"."swap_return_reasons" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "item_count" INTEGER NOT NULL,
    "return_id" TEXT NOT NULL,

    CONSTRAINT "swap_return_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "swap_returns_delivery_status_idx" ON "public"."swap_returns"("delivery_status");

-- CreateIndex
CREATE INDEX "swap_returns_return_status_idx" ON "public"."swap_returns"("return_status");

-- CreateIndex
CREATE INDEX "swap_returns_delivery_status_return_status_idx" ON "public"."swap_returns"("delivery_status", "return_status");

-- AddForeignKey
ALTER TABLE "public"."swap_return_reasons" ADD CONSTRAINT "swap_return_reasons_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."swap_returns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
