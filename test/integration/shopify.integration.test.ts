import request from 'supertest';
import { Express } from 'express';
import { testHelpers } from '../helpers/utils/testHelpers';

// Import the app
let app: Express;

beforeAll(async () => {
  // Dynamically import the app to ensure proper initialization
  const { default: appModule } = await import('../../src/app');
  app = appModule;
});

describe('Shopify Integration Tests', () => {
  beforeEach(async () => {
    // Clean database before each test
    await testHelpers.cleanDatabase();
  });

  afterAll(async () => {
    // Clean up after all tests
    await testHelpers.cleanDatabase();
  });

  describe('GET /shopify/orders', () => {
    it('should return empty orders list when no data exists', async () => {
      // Act: Make request to get orders
      const response = await request(app)
        .get('/shopify/orders')
        .expect(200);

      // Assert: Should return empty orders list
      expect(response.body).toEqual({
        success: true,
        data: {
          orders: [],
          pagination: {
            total: 0,
            limit: 50,
            offset: 0,
            hasMore: false,
          },
        },
      });
    });

    it('should return seeded Shopify orders when data exists', async () => {
      // Arrange: Seed test data
      await testHelpers.seedShopifyData();

      // Act: Make request to get orders
      const response = await request(app)
        .get('/shopify/orders')
        .expect(200);

      // Assert: Should return seeded orders
      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);

      // Check first order structure
      const firstOrder = response.body.data.orders[0];
      expect(firstOrder).toMatchObject({
        shopifyOrderId: expect.stringContaining('gid://shopify/Order/'),
        name: expect.stringMatching(/^#\d+$/),
        currencyCode: 'GBP',
        displayFinancialStatus: 'PAID',
        lineItems: expect.any(Array),
      });

      // Check line items are included
      expect(firstOrder.lineItems).toHaveLength(1);
      expect(firstOrder.lineItems[0]).toMatchObject({
        shopifyLineItemId: expect.stringContaining('gid://shopify/LineItem/'),
        name: expect.any(String),
        sku: expect.any(String),
        quantity: expect.any(Number),
      });
    });

    it('should support pagination parameters', async () => {
      // Arrange: Seed test data
      await testHelpers.seedShopifyData();

      // Act: Make request with limit
      const response = await request(app)
        .get('/shopify/orders')
        .query({ limit: 1, offset: 0 })
        .expect(200);

      // Assert: Should return only 1 order
      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(1);
      expect(response.body.data.pagination).toMatchObject({
        total: 2,
        limit: 1,
        offset: 0,
        hasMore: true,
      });
    });
  });

  describe('POST /shopify/sync', () => {
    it('should return error when Shopify credentials are not configured', async () => {
      // Act: Make request to sync orders without credentials
      const response = await request(app)
        .post('/shopify/sync')
        .send({})
        .expect(500);

      // Assert: Should return error about missing credentials
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Shopify credentials not configured');
    });

    it('should accept sync parameters in request body', async () => {
      // Act: Make request with sync parameters
      const response = await request(app)
        .post('/shopify/sync')
        .send({
          since: '2024-01-01T00:00:00.000Z',
          limit: 10,
        })
        .expect(500); // Will fail due to missing credentials

      // Assert: Should fail at credentials level, not parameter validation
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Shopify credentials not configured');
    });
  });

  describe('GET /shopify/test', () => {
    it('should return error when Shopify credentials are not configured', async () => {
      // Act: Make request to test connection
      const response = await request(app)
        .get('/shopify/test')
        .expect(500);

      // Assert: Should return error about missing credentials
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Shopify credentials not configured');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      // Act: Make request to health endpoint
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Assert: Should return healthy status
      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
      });
    });
  });
});