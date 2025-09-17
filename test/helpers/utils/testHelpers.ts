import { PrismaClient } from '@prisma/client';
import { analyticsFixtures } from '../fixtures/analytics.fixtures';
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
    // Delete in reverse dependency order to avoid foreign key constraints
    await prisma.shopifyLineItem.deleteMany();
    await prisma.shopifyOrder.deleteMany();
    await prisma.shopifyStore.deleteMany();
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

  // Seed all test data (basic orders + Shopify data)
  async seedAllTestData() {
    await this.cleanDatabase();
    await this.seedBasicOrders();
    return await this.seedShopifyData();
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