-- Migration: Rename order_id to shopify_order_id in swap_returns table
-- This preserves existing data by copying order_id values to shopify_order_id

BEGIN;

-- Step 1: Update shopify_order_id with values from order_id where shopify_order_id is null
UPDATE "swap_returns"
SET "shopify_order_id" = "order_id"
WHERE "shopify_order_id" IS NULL;

-- Step 2: Make shopify_order_id NOT NULL (since order_id was NOT NULL)
ALTER TABLE "swap_returns" ALTER COLUMN "shopify_order_id" SET NOT NULL;

-- Step 3: Drop the old order_id column
ALTER TABLE "swap_returns" DROP COLUMN "order_id";

-- Step 4: Update any indexes that referenced order_id (if they exist)
-- Note: Prisma will recreate indexes based on the new schema

COMMIT;