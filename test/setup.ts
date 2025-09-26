import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { getDatabaseUrl } from '../src/common/database';

// Use the same database configuration as the app
const testDatabaseUrl = getDatabaseUrl();

// Ensure we're in test mode
if (process.env.NODE_ENV !== 'test') {
  console.warn('⚠️  NODE_ENV is not set to "test". Database:', testDatabaseUrl);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: testDatabaseUrl
    }
  }
});

// Global test setup
beforeAll(async () => {
  // Only reset database for integration tests, skip for unit tests
  const testPath = expect.getState().testPath || '';
  const isUnitTest = testPath.includes('/unit/');

  if (isUnitTest) {
    // Skip database setup for unit tests
    return;
  }

  // Reset test database before integration tests
  try {
    await resetTestDatabase();
  } catch (error) {
    console.error('Failed to reset test database:', error);
    throw error;
  }
});

// Cleanup after all tests
afterAll(async () => {
  // Only disconnect for integration tests, skip for unit tests
  const testPath = expect.getState().testPath || '';
  const isUnitTest = testPath.includes('/unit/');

  if (!isUnitTest) {
    await prisma.$disconnect();
  }
});

async function resetTestDatabase() {
  // Reset test database and apply migrations
  // Uncomment for debugging: console.log('🧪 Resetting test database...');

  try {
    // Simple approach: just deploy migrations and clean data
    execSync('npx prisma migrate deploy', {
      stdio: 'pipe',
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl
      }
    });

    // Clean all test data manually (correct foreign key order)
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

  } catch (error) {
    console.log('⚠️ Database setup issue, continuing with clean-only approach');
    // If migration fails, just clean the data (correct foreign key order)
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
  }

  // Uncomment for debugging: console.log('✅ Test database reset complete');
}

// Export for use in tests
export { prisma };