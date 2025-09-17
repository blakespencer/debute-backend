import { Decimal } from '@prisma/client/runtime/library';

export const analyticsFixtures = {
  // Basic orders for testing fallback analytics
  basicOrders: [
    {
      orderId: "TEST-001",
      totalAmount: new Decimal(29.99),
      orderDate: new Date("2024-01-15"),
      status: "completed",
    },
    {
      orderId: "TEST-002",
      totalAmount: new Decimal(45.50),
      orderDate: new Date("2024-01-20"),
      status: "completed",
    },
    {
      orderId: "TEST-003",
      totalAmount: new Decimal(12.75),
      orderDate: new Date("2024-02-01"),
      status: "pending", // This one should be excluded from analytics
    },
  ],

  // Shopify store for testing
  testStore: {
    shopDomain: "test-integration.myshopify.com",
    accessToken: "test-token-123",
    lastSyncAt: new Date("2024-01-01"),
  },

  // Shopify orders for testing
  shopifyOrders: [
    {
      shopifyOrderId: "gid://shopify/Order/1001",
      legacyResourceId: "1001",
      number: 1001,
      name: "#1001",
      currencyCode: "GBP",
      presentmentCurrencyCode: "GBP",
      email: "test1@example.com",
      customerAcceptsMarketing: false,
      currentTotalPriceAmount: new Decimal(150.00),
      currentTotalPricePresentmentAmount: new Decimal(150.00),
      currentSubtotalPriceAmount: new Decimal(125.00),
      currentSubtotalPricePresentmentAmount: new Decimal(125.00),
      currentTotalTaxAmount: new Decimal(25.00),
      currentTotalTaxPresentmentAmount: new Decimal(25.00),
      displayFinancialStatus: "PAID",
      displayFulfillmentStatus: "FULFILLED",
      confirmed: true,
      closed: true,
      taxesIncluded: true,
      test: false,
      createdAt: new Date("2024-02-15"),
      processedAt: new Date("2024-02-15"),
    },
    {
      shopifyOrderId: "gid://shopify/Order/1002",
      legacyResourceId: "1002",
      number: 1002,
      name: "#1002",
      currencyCode: "GBP",
      presentmentCurrencyCode: "GBP",
      email: "test2@example.com",
      customerAcceptsMarketing: false,
      currentTotalPriceAmount: new Decimal(200.00),
      currentTotalPricePresentmentAmount: new Decimal(200.00),
      currentSubtotalPriceAmount: new Decimal(180.00),
      currentSubtotalPricePresentmentAmount: new Decimal(180.00),
      currentTotalTaxAmount: new Decimal(20.00),
      currentTotalTaxPresentmentAmount: new Decimal(20.00),
      displayFinancialStatus: "PAID",
      displayFulfillmentStatus: "FULFILLED",
      confirmed: true,
      closed: true,
      taxesIncluded: true,
      test: false,
      createdAt: new Date("2024-02-16"),
      processedAt: new Date("2024-02-16"),
    },
  ],

  // Line items for Shopify orders
  shopifyLineItems: [
    {
      shopifyLineItemId: "gid://shopify/LineItem/1001",
      name: "Test Product 1",
      variantTitle: "Black / M",
      productId: "gid://shopify/Product/1001",
      variantId: "gid://shopify/ProductVariant/1001",
      sku: "TEST-PRODUCT-1-BLACK-M",
      quantity: 1,
      currentQuantity: 1,
      originalUnitPriceAmount: new Decimal(125.00),
      originalUnitPricePresentmentAmount: new Decimal(125.00),
      originalTotalPriceAmount: new Decimal(125.00),
      originalTotalPricePresentmentAmount: new Decimal(125.00),
      requiresShipping: true,
    },
    {
      shopifyLineItemId: "gid://shopify/LineItem/1002",
      name: "Test Product 2",
      variantTitle: "White / S",
      productId: "gid://shopify/Product/1002",
      variantId: "gid://shopify/ProductVariant/1002",
      sku: "TEST-PRODUCT-2-WHITE-S",
      quantity: 1,
      currentQuantity: 1,
      originalUnitPriceAmount: new Decimal(180.00),
      originalUnitPricePresentmentAmount: new Decimal(180.00),
      originalTotalPriceAmount: new Decimal(180.00),
      originalTotalPricePresentmentAmount: new Decimal(180.00),
      requiresShipping: true,
    },
  ],

  // Expected analytics results
  expectedResults: {
    totalRevenue: 350.00, // 150 + 200 from Shopify orders
    orderCount: 2,
    averageOrderValue: 175.00, // 350 / 2
  },
};