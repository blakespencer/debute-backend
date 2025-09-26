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

  describe('POST /shopify/sync (comprehensive sync)', () => {
    it('should sync all data types when Shopify credentials are configured', async () => {
      // Act: Make request to sync all data with configured credentials
      const response = await request(app)
        .post('/shopify/sync')
        .send({})
        .expect(200);

      // Assert: Should return successful sync result for all data types
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // Verify orders sync
      expect(response.body.data.orders).toBeDefined();
      expect(typeof response.body.data.orders.ordersProcessed).toBe('number');
      expect(typeof response.body.data.orders.ordersCreated).toBe('number');
      expect(typeof response.body.data.orders.ordersUpdated).toBe('number');
      expect(Array.isArray(response.body.data.orders.errors)).toBe(true);

      // Verify products sync
      expect(response.body.data.products).toBeDefined();
      expect(typeof response.body.data.products.productsProcessed).toBe('number');
      expect(typeof response.body.data.products.productsCreated).toBe('number');
      expect(typeof response.body.data.products.productsUpdated).toBe('number');
      expect(Array.isArray(response.body.data.products.errors)).toBe(true);

      // Verify collections sync
      expect(response.body.data.collections).toBeDefined();
      expect(typeof response.body.data.collections.collectionsProcessed).toBe('number');
      expect(typeof response.body.data.collections.collectionsCreated).toBe('number');
      expect(typeof response.body.data.collections.collectionsUpdated).toBe('number');
      expect(Array.isArray(response.body.data.collections.errors)).toBe(true);
    });

    it('should accept sync parameters in request body', async () => {
      // Act: Make request with sync parameters
      const response = await request(app)
        .post('/shopify/sync')
        .send({
          fromDate: '2024-01-01T00:00:00.000Z',
          limit: 5,
        })
        .expect(200);

      // Assert: Should return successful sync result with parameters
      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toBeDefined();
      expect(response.body.data.products).toBeDefined();
      expect(response.body.data.collections).toBeDefined();
    });

    it('should handle invalid date parameter gracefully', async () => {
      // Act: Make request with invalid date
      const response = await request(app)
        .post('/shopify/sync')
        .send({
          fromDate: 'invalid-date',
          limit: 10,
        })
        .expect(422);

      // Assert: Should return validation error
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should handle negative limit parameter gracefully', async () => {
      // Act: Make request with negative limit
      const response = await request(app)
        .post('/shopify/sync')
        .send({
          limit: -5,
        })
        .expect(422);

      // Assert: Should return validation error
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('between 1 and 10,000');
    });
  });

  describe('POST /shopify/sync/orders (individual orders sync)', () => {
    it('should sync only orders when called', async () => {
      // Act: Make request to sync only orders
      const response = await request(app)
        .post('/shopify/sync/orders')
        .send({})
        .expect(200);

      // Assert: Should return orders sync result only
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data.ordersProcessed).toBe('number');
      expect(typeof response.body.data.ordersCreated).toBe('number');
      expect(typeof response.body.data.ordersUpdated).toBe('number');
      expect(Array.isArray(response.body.data.errors)).toBe(true);
    });

    it('should accept fromDate parameter for orders sync', async () => {
      // Act: Make request with date filter
      const response = await request(app)
        .post('/shopify/sync/orders')
        .send({
          fromDate: '2024-01-01T00:00:00.000Z',
          limit: 5,
        })
        .expect(200);

      // Assert: Should return filtered sync result
      expect(response.body.success).toBe(true);
      expect(response.body.data.ordersProcessed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('POST /shopify/sync/products (individual products sync)', () => {
    it('should sync only products when called', async () => {
      // Act: Make request to sync only products
      const response = await request(app)
        .post('/shopify/sync/products')
        .send({})
        .expect(200);

      // Assert: Should return products sync result only
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data.productsProcessed).toBe('number');
      expect(typeof response.body.data.productsCreated).toBe('number');
      expect(typeof response.body.data.productsUpdated).toBe('number');
      expect(Array.isArray(response.body.data.errors)).toBe(true);
    });
  });

  describe('POST /shopify/sync/collections (individual collections sync)', () => {
    it('should sync only collections when called', async () => {
      // Act: Make request to sync only collections
      const response = await request(app)
        .post('/shopify/sync/collections')
        .send({})
        .expect(200);

      // Assert: Should return collections sync result only
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data.collectionsProcessed).toBe('number');
      expect(typeof response.body.data.collectionsCreated).toBe('number');
      expect(typeof response.body.data.collectionsUpdated).toBe('number');
      expect(Array.isArray(response.body.data.errors)).toBe(true);
    });
  });

  describe('GET /shopify/products (data retrieval)', () => {
    beforeEach(async () => {
      // Ensure we have some products synced for data retrieval tests
      await request(app)
        .post('/shopify/sync/products')
        .send({})
        .expect(200);
    });

    it('should return empty products list when no synced data exists', async () => {
      // Arrange: Clean database to ensure no products
      await testHelpers.cleanDatabase();

      // Act: Make request to get products
      const response = await request(app)
        .get('/shopify/products')
        .expect(200);

      // Assert: Should return empty products list
      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toEqual([]);
      expect(response.body.data.pagination).toMatchObject({
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false,
      });
    });

    it('should return synced products with proper structure', async () => {
      // Act: Make request to get products
      const response = await request(app)
        .get('/shopify/products')
        .expect(200);

      // Assert: Should return products with correct structure
      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toBeDefined();
      expect(Array.isArray(response.body.data.products)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();

      // If products exist, verify structure
      if (response.body.data.products.length > 0) {
        const firstProduct = response.body.data.products[0];
        expect(firstProduct).toMatchObject({
          shopifyProductId: expect.stringContaining('gid://shopify/Product/'),
          title: expect.any(String),
          handle: expect.any(String),
          status: expect.any(String),
          createdAt: expect.any(String),
        });
      }
    });

    it('should support pagination parameters for products', async () => {
      // Act: Make request with pagination
      const response = await request(app)
        .get('/shopify/products')
        .query({ limit: 5, offset: 0 })
        .expect(200);

      // Assert: Should return paginated results
      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toMatchObject({
        limit: 5,
        offset: 0,
      });
      expect(response.body.data.products.length).toBeLessThanOrEqual(5);
    });

    it('should handle invalid pagination parameters', async () => {
      // Act: Make request with invalid parameters
      const response = await request(app)
        .get('/shopify/products')
        .query({ limit: -1, offset: -5 })
        .expect(422);

      // Assert: Should return validation error
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('must be');
    });
  });

  describe('GET /shopify/collections (data retrieval)', () => {
    beforeEach(async () => {
      // Ensure we have some collections synced for data retrieval tests
      await request(app)
        .post('/shopify/sync/collections')
        .send({})
        .expect(200);
    });

    it('should return empty collections list when no synced data exists', async () => {
      // Arrange: Clean database to ensure no collections
      await testHelpers.cleanDatabase();

      // Act: Make request to get collections
      const response = await request(app)
        .get('/shopify/collections')
        .expect(200);

      // Assert: Should return empty collections list
      expect(response.body.success).toBe(true);
      expect(response.body.data.collections).toEqual([]);
      expect(response.body.data.pagination).toMatchObject({
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false,
      });
    });

    it('should return synced collections with proper structure', async () => {
      // Act: Make request to get collections
      const response = await request(app)
        .get('/shopify/collections')
        .expect(200);


      // Assert: Should return collections with correct structure
      expect(response.body.success).toBe(true);
      expect(response.body.data.collections).toBeDefined();
      expect(Array.isArray(response.body.data.collections)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();

      // If collections exist, verify structure (more flexible)
      if (response.body.data.collections.length > 0) {
        const firstCollection = response.body.data.collections[0];
        expect(firstCollection).toMatchObject({
          shopifyCollectionId: expect.any(String),
          title: expect.any(String),
          handle: expect.any(String),
          updatedAt: expect.any(String),
        });
      }
    });

    it('should support pagination parameters for collections', async () => {
      // Act: Make request with pagination
      const response = await request(app)
        .get('/shopify/collections')
        .query({ limit: 3, offset: 0 })
        .expect(200);

      // Assert: Should return paginated results
      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toMatchObject({
        limit: 3,
        offset: 0,
      });
      expect(response.body.data.collections.length).toBeLessThanOrEqual(3);
    });
  });

  describe('GET /shopify/variants (data retrieval)', () => {
    beforeEach(async () => {
      // Ensure we have some products and variants synced
      await request(app)
        .post('/shopify/sync/products')
        .send({})
        .expect(200);
    });

    it('should return empty variants list when no synced data exists', async () => {
      // Arrange: Clean database to ensure no variants
      await testHelpers.cleanDatabase();

      // Act: Make request to get variants
      const response = await request(app)
        .get('/shopify/variants')
        .expect(200);

      // Assert: Should return empty variants list
      expect(response.body.success).toBe(true);
      expect(response.body.data.variants).toEqual([]);
      expect(response.body.data.pagination).toMatchObject({
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false,
      });
    });

    it('should return synced variants with proper structure', async () => {
      // Act: Make request to get variants
      const response = await request(app)
        .get('/shopify/variants')
        .expect(200);

      // Assert: Should return variants with correct structure
      expect(response.body.success).toBe(true);
      expect(response.body.data.variants).toBeDefined();
      expect(Array.isArray(response.body.data.variants)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();

      // If variants exist, verify structure
      if (response.body.data.variants.length > 0) {
        const firstVariant = response.body.data.variants[0];
        expect(firstVariant).toMatchObject({
          shopifyVariantId: expect.stringContaining('gid://shopify/ProductVariant/'),
          title: expect.any(String),
          price: expect.any(String),
          availableForSale: expect.any(Boolean),
          createdAt: expect.any(String),
        });
      }
    });

    it('should support pagination parameters for variants', async () => {
      // Act: Make request with pagination
      const response = await request(app)
        .get('/shopify/variants')
        .query({ limit: 10, offset: 0 })
        .expect(200);

      // Assert: Should return paginated results
      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toMatchObject({
        limit: 10,
        offset: 0,
      });
      expect(response.body.data.variants.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /shopify/test (connection testing)', () => {
    it('should test connection when Shopify credentials are configured', async () => {
      // Act: Make request to test connection
      const response = await request(app)
        .get('/shopify/test')
        .expect(200);

      // Assert: Should return successful connection test
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.connected).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent endpoints gracefully', async () => {
      // Act: Make request to non-existent endpoint
      const response = await request(app)
        .get('/shopify/non-existent')
        .expect(404);

      // Assert: Should return 404 error
      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON in request body', async () => {
      // Act: Make request with malformed JSON
      const response = await request(app)
        .post('/shopify/sync')
        .set('Content-Type', 'application/json')
        .send('{"malformed": json}')
        .expect(500);

      // Assert: Should return JSON parsing error
      expect(response.status).toBe(500);
    });

    it('should handle very large limit values gracefully', async () => {
      // Act: Make request with very large limit
      const response = await request(app)
        .get('/shopify/orders')
        .query({ limit: 999999 })
        .expect(422);

      // Assert: Should return validation error
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('between 1 and 1000');
    });
  });

  describe('GET /health (system health)', () => {
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