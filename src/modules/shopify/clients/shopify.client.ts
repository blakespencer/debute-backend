import { UnifiedShopifyClient } from './unified-shopify.client';
import { ShopifyClientConfig } from './base.client';
import {
  ShopifyOrdersResponse,
  ShopifyProductsResponse,
  ShopifyCollectionsResponse,
  ShopifyProductVariantsResponse
} from '../shopify.types';

/**
 * Backward-compatible ShopifyClient that delegates to UnifiedShopifyClient
 * Maintains the same API as the original large client file
 */
export class ShopifyClient {
  private unifiedClient: UnifiedShopifyClient;

  constructor(
    shopDomain: string,
    accessToken: string,
    config?: ShopifyClientConfig
  ) {
    this.unifiedClient = new UnifiedShopifyClient(shopDomain, accessToken, config);
  }

  async fetchOrders(options: {
    first?: number;
    after?: string;
    fromDate?: string;
  } = {}): Promise<ShopifyOrdersResponse> {
    return this.unifiedClient.fetchOrders(options);
  }

  async fetchProducts(options: {
    first?: number;
    after?: string;
    fromDate?: string;
  } = {}): Promise<ShopifyProductsResponse> {
    return this.unifiedClient.fetchProducts(options);
  }

  async fetchCollections(options: {
    first?: number;
    after?: string;
    fromDate?: string;
  } = {}): Promise<ShopifyCollectionsResponse> {
    return this.unifiedClient.fetchCollections(options);
  }

  async fetchProductVariants(options: {
    first?: number;
    after?: string;
    fromDate?: string;
  } = {}): Promise<ShopifyProductVariantsResponse> {
    return this.unifiedClient.fetchProductVariants(options);
  }

  async testConnection(): Promise<boolean> {
    return this.unifiedClient.testConnection();
  }
}