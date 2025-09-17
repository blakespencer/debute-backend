import request from 'supertest';
import { Express } from 'express';
import { testHelpers } from '../helpers/utils/testHelpers';
import { analyticsFixtures } from '../helpers/fixtures/analytics.fixtures';

// Import the app
let app: Express;

beforeAll(async () => {
  // Dynamically import the app to ensure proper initialization
  const { default: appModule } = await import('../../src/app');
  app = appModule;
});

describe('Analytics Integration Tests', () => {
  beforeEach(async () => {
    // Clean database before each test
    await testHelpers.cleanDatabase();
  });

  afterAll(async () => {
    // Clean up after all tests
    await testHelpers.cleanDatabase();
  });

  describe('GET /analytics/total-revenue', () => {
    it('should return total revenue from Shopify orders when available', async () => {
      // Arrange: Seed test data
      await testHelpers.seedAllTestData();

      // Act: Make request
      const response = await request(app)
        .get('/analytics/total-revenue')
        .expect(200);

      // Assert: Check response structure and value
      expect(response.body).toEqual({
        success: true,
        data: {
          totalRevenue: analyticsFixtures.expectedResults.totalRevenue,
        },
      });
    });

    it('should fallback to basic orders when no Shopify data exists', async () => {
      // Arrange: Only seed basic orders (no Shopify data)
      await testHelpers.seedBasicOrders();

      // Act: Make request
      const response = await request(app)
        .get('/analytics/total-revenue')
        .expect(200);

      // Assert: Should use basic orders total (29.99 + 45.50 = 75.49)
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalRevenue).toBe(75.49);
    });

    it('should return 0 when no orders exist', async () => {
      // Arrange: Empty database (already cleaned in beforeEach)

      // Act: Make request
      const response = await request(app)
        .get('/analytics/total-revenue')
        .expect(200);

      // Assert: Should return 0
      expect(response.body).toEqual({
        success: true,
        data: {
          totalRevenue: 0,
        },
      });
    });

    it('should exclude pending orders from basic order calculations', async () => {
      // Arrange: Seed only basic orders (includes one pending order)
      await testHelpers.seedBasicOrders();

      // Act: Make request
      const response = await request(app)
        .get('/analytics/total-revenue')
        .expect(200);

      // Assert: Should exclude pending order (12.75), only completed ones
      expect(response.body.data.totalRevenue).toBe(75.49); // 29.99 + 45.50
    });
  });

  describe('GET /analytics/order-count', () => {
    it('should return correct order count from Shopify orders', async () => {
      // Arrange: Seed test data
      await testHelpers.seedAllTestData();

      // Act: Make request
      const response = await request(app)
        .get('/analytics/order-count')
        .expect(200);

      // Assert: Should return 2 Shopify orders
      expect(response.body).toEqual({
        success: true,
        data: {
          orderCount: analyticsFixtures.expectedResults.orderCount,
        },
      });
    });

    it('should fallback to basic orders count when no Shopify data exists', async () => {
      // Arrange: Only seed basic orders
      await testHelpers.seedBasicOrders();

      // Act: Make request
      const response = await request(app)
        .get('/analytics/order-count')
        .expect(200);

      // Assert: Should return 2 completed basic orders (excludes pending)
      expect(response.body.data.orderCount).toBe(2);
    });
  });

  describe('GET /analytics/average-order-value', () => {
    it('should return correct AOV from Shopify orders', async () => {
      // Arrange: Seed test data
      await testHelpers.seedAllTestData();

      // Act: Make request
      const response = await request(app)
        .get('/analytics/average-order-value')
        .expect(200);

      // Assert: Should return average of Shopify orders
      expect(response.body.success).toBe(true);
      expect(response.body.data.averageOrderValue).toBe(analyticsFixtures.expectedResults.averageOrderValue);
    });

    it('should return 0 when no orders exist', async () => {
      // Arrange: Empty database

      // Act: Make request
      const response = await request(app)
        .get('/analytics/average-order-value')
        .expect(200);

      // Assert: Should return 0
      expect(response.body.data.averageOrderValue).toBe(0);
    });
  });

  describe('Date Range Filtering', () => {
    it('should filter analytics by date range', async () => {
      // Arrange: Seed test data
      await testHelpers.seedAllTestData();

      // Act: Request with date range that includes only first order
      const response = await request(app)
        .get('/analytics/total-revenue')
        .query({
          start: '2024-02-15',
          end: '2024-02-15',
        })
        .expect(200);

      // Assert: Should return only first order's revenue (150.00)
      expect(response.body.data.totalRevenue).toBe(150.00);
    });

    it('should return validation error for invalid date format', async () => {
      // Act: Request with invalid date format
      const response = await request(app)
        .get('/analytics/total-revenue')
        .query({
          start: 'invalid-date',
          end: '2024-02-15',
        })
        .expect(400);

      // Assert: Should return validation error
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid date format');
    });

    it('should return validation error when start date is after end date', async () => {
      // Act: Request with start date after end date
      const response = await request(app)
        .get('/analytics/total-revenue')
        .query({
          start: '2024-02-16',
          end: '2024-02-15',
        })
        .expect(400);

      // Assert: Should return validation error
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Start date must be before end date');
    });
  });
});