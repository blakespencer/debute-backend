import { ShopifyCollectionsResponse, ShopifyProductVariantsResponse } from '../shopify.types';
import { BaseShopifyClient, ShopifyClientConfig } from './base.client';

export class CollectionsClient extends BaseShopifyClient {
  constructor(shopDomain: string, accessToken: string, config?: ShopifyClientConfig) {
    super(shopDomain, accessToken, config);
  }

  async fetchCollections(options: {
    first?: number;
    after?: string;
    fromDate?: string;
  } = {}): Promise<ShopifyCollectionsResponse> {
    const { first = 50, after, fromDate } = options;

    return this.logger.time('fetchCollections', async () => {
      let query = '';
      if (fromDate) {
        query = `updated_at:>='${fromDate}'`;
      }

      const graphqlQuery = `
        query GetCollections($first: Int!, $after: String, $query: String) {
          collections(first: $first, after: $after, query: $query) {
            nodes {
              id
              legacyResourceId
              title
              handle
              description
              updatedAt
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      this.logger.debug('Executing GraphQL query', {
        operation: 'fetchCollections',
        variables: { first, after, query },
        fromDate
      });

      return this.fetchWithRetry<ShopifyCollectionsResponse>(
        this.getApiUrl(),
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            query: graphqlQuery,
            variables: { first, after, query },
          }),
        },
        'fetchCollections'
      );
    }, { first, after, fromDate });
  }

  async fetchProductVariants(options: {
    first?: number;
    after?: string;
    fromDate?: string;
  } = {}): Promise<ShopifyProductVariantsResponse> {
    const { first = 50, after, fromDate } = options;

    return this.logger.time('fetchProductVariants', async () => {
      let query = '';
      if (fromDate) {
        query = `created_at:>='${fromDate}'`;
      }

      const graphqlQuery = `
        query GetProductVariants($first: Int!, $after: String, $query: String) {
          productVariants(first: $first, after: $after, query: $query) {
            nodes {
              id
              legacyResourceId
              title
              sku
              barcode
              position
              price
              compareAtPrice
              inventoryQuantity
              availableForSale
              inventoryPolicy
              taxable
              createdAt
              updatedAt
              product {
                id
                legacyResourceId
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      this.logger.debug('Executing GraphQL query', {
        operation: 'fetchProductVariants',
        variables: { first, after, query },
        fromDate
      });

      return this.fetchWithRetry<ShopifyProductVariantsResponse>(
        this.getApiUrl(),
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            query: graphqlQuery,
            variables: { first, after, query },
          }),
        },
        'fetchProductVariants'
      );
    }, { first, after, fromDate });
  }
}