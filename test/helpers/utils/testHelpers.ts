import { PrismaClient } from '@prisma/client';
import { analyticsFixtures } from '../fixtures/analytics.fixtures';
import { swapFixtures } from '../fixtures/swap.fixtures';
import { getDatabaseUrl } from '../../../src/common/database';

// Use the same database configuration as the app
const testDatabaseUrl = getDatabaseUrl();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: testDatabaseUrl
    }
  }
});

export const testHelpers = {
  // Clean database - removes all test data (correct order for foreign keys)
  async cleanDatabase() {
    // Delete in correct dependency order to avoid foreign key constraints
    // Shopify data cleanup (children first, then parents)
    await prisma.shopifyLineItem.deleteMany();
    await prisma.shopifyProductVariant.deleteMany();
    await prisma.shopifyProductCollection.deleteMany();
    await prisma.shopifyProduct.deleteMany();
    await prisma.shopifyCollection.deleteMany();
    await prisma.shopifyOrder.deleteMany();
    await prisma.shopifyStore.deleteMany();

    // SWAP data cleanup (children first, then parents)
    await prisma.swapReturnReason.deleteMany();
    await prisma.swapProduct.deleteMany();
    await prisma.swapReturn.deleteMany();
    await prisma.swapStore.deleteMany();

    // Basic orders cleanup (no foreign keys)
    await prisma.order.deleteMany();
  },

  // Seed basic orders only (for testing fallback analytics)
  async seedBasicOrders() {
    await prisma.order.createMany({
      data: analyticsFixtures.basicOrders,
    });
  },

  // Seed Shopify data (store + orders + line items)
  async seedShopifyData() {
    // Create store first
    const store = await prisma.shopifyStore.create({
      data: analyticsFixtures.testStore,
    });

    // Create Shopify orders with store relationship
    const order1 = await prisma.shopifyOrder.create({
      data: {
        ...analyticsFixtures.shopifyOrders[0],
        storeId: store.id,
      },
    });

    const order2 = await prisma.shopifyOrder.create({
      data: {
        ...analyticsFixtures.shopifyOrders[1],
        storeId: store.id,
      },
    });

    // Create line items
    await prisma.shopifyLineItem.create({
      data: {
        ...analyticsFixtures.shopifyLineItems[0],
        orderId: order1.id,
      },
    });

    await prisma.shopifyLineItem.create({
      data: {
        ...analyticsFixtures.shopifyLineItems[1],
        orderId: order2.id,
      },
    });

    return { store, orders: [order1, order2] };
  },

  // Seed SWAP data (store + returns + products + return reasons)
  async seedSwapData() {
    // Create SWAP store first
    const swapStore = await prisma.swapStore.create({
      data: swapFixtures.testSwapStore,
    });

    // Create SWAP returns with store relationship
    const return1 = await prisma.swapReturn.create({
      data: {
        ...swapFixtures.swapReturns[0],
        storeId: swapStore.id,
      },
    });

    const return2 = await prisma.swapReturn.create({
      data: {
        ...swapFixtures.swapReturns[1],
        storeId: swapStore.id,
      },
    });

    const return3 = await prisma.swapReturn.create({
      data: {
        ...swapFixtures.swapReturns[2],
        storeId: swapStore.id,
      },
    });

    // Create SWAP products for each return
    await prisma.swapProduct.create({
      data: {
        ...swapFixtures.swapProducts[0],
        returnId: return1.id,
      },
    });

    await prisma.swapProduct.create({
      data: {
        ...swapFixtures.swapProducts[1],
        returnId: return1.id,
      },
    });

    await prisma.swapProduct.create({
      data: {
        ...swapFixtures.swapProducts[2],
        returnId: return2.id,
      },
    });

    await prisma.swapProduct.create({
      data: {
        ...swapFixtures.swapProducts[3],
        returnId: return2.id,
      },
    });

    await prisma.swapProduct.create({
      data: {
        ...swapFixtures.swapProducts[4],
        returnId: return3.id,
      },
    });

    // Return reasons are now stored in products, no separate table needed

    return {
      swapStore,
      returns: [return1, return2, return3],
    };
  },

  // Seed all test data (basic orders + Shopify data + SWAP data)
  async seedAllTestData() {
    await this.cleanDatabase();
    await this.seedBasicOrders();
    const shopifyData = await this.seedShopifyData();
    const swapData = await this.seedSwapData();
    return { ...shopifyData, ...swapData };
  },

  // Wait for async operations (useful for testing)
  async wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Format currency for testing
  formatCurrency(amount: number): string {
    return `£${amount.toFixed(2)}`;
  },
};

export { prisma };