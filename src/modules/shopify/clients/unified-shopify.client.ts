import { OrdersClient } from './orders.client';
import { ProductsClient } from './products.client';
import { CollectionsClient } from './collections.client';
import { ShopifyClientConfig } from './base.client';
import {
  ShopifyOrdersResponse,
  ShopifyProductsResponse,
  ShopifyCollectionsResponse,
  ShopifyProductVariantsResponse
} from '../shopify.types';

/**
 * Unified client that composes all domain-specific clients
 * Provides the same interface as the original ShopifyClient
 * but with better organization and maintainability
 */
export class UnifiedShopifyClient {
  private ordersClient: OrdersClient;
  private productsClient: ProductsClient;
  private collectionsClient: CollectionsClient;

  constructor(
    shopDomain: string,
    accessToken: string,
    config?: ShopifyClientConfig
  ) {
    this.ordersClient = new OrdersClient(shopDomain, accessToken, config);
    this.productsClient = new ProductsClient(shopDomain, accessToken, config);
    this.collectionsClient = new CollectionsClient(shopDomain, accessToken, config);
  }

  // Orders methods
  async fetchOrders(options: {
    first?: number;
    after?: string;
    fromDate?: string;
  } = {}): Promise<ShopifyOrdersResponse> {
    return this.ordersClient.fetchOrders(options);
  }

  // Products methods
  async fetchProducts(options: {
    first?: number;
    after?: string;
    fromDate?: string;
  } = {}): Promise<ShopifyProductsResponse> {
    return this.productsClient.fetchProducts(options);
  }

  // Collections methods
  async fetchCollections(options: {
    first?: number;
    after?: string;
    fromDate?: string;
  } = {}): Promise<ShopifyCollectionsResponse> {
    return this.collectionsClient.fetchCollections(options);
  }

  async fetchProductVariants(options: {
    first?: number;
    after?: string;
    fromDate?: string;
  } = {}): Promise<ShopifyProductVariantsResponse> {
    return this.collectionsClient.fetchProductVariants(options);
  }

  // Connection test (delegates to any client since they all have the same connection)
  async testConnection(): Promise<boolean> {
    return this.ordersClient.testConnection();
  }
}