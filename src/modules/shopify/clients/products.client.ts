import { ShopifyProductsResponse } from '../shopify.types';
import { BaseShopifyClient, ShopifyClientConfig } from './base.client';

export class ProductsClient extends BaseShopifyClient {
  constructor(shopDomain: string, accessToken: string, config?: ShopifyClientConfig) {
    super(shopDomain, accessToken, config);
  }

  async fetchProducts(options: {
    first?: number;
    after?: string;
    fromDate?: string;
  } = {}): Promise<ShopifyProductsResponse> {
    const { first = 50, after, fromDate } = options;

    return this.logger.time('fetchProducts', async () => {
      let query = '';
      if (fromDate) {
        query = `created_at:>='${fromDate}'`;
      }

      const graphqlQuery = `
        query GetProducts($first: Int!, $after: String, $query: String) {
          products(first: $first, after: $after, query: $query) {
            nodes {
              id
              legacyResourceId
              title
              handle
              productType
              vendor
              description
              descriptionHtml
              status
              publishedAt
              tags
              createdAt
              updatedAt
              variants(first: 250) {
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
                }
              }
              collections(first: 250) {
                nodes {
                  id
                  legacyResourceId
                  title
                  handle
                  description
                  updatedAt
                }
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
        operation: 'fetchProducts',
        variables: { first, after, query },
        fromDate
      });

      return this.fetchWithRetry<ShopifyProductsResponse>(
        this.getApiUrl(),
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            query: graphqlQuery,
            variables: { first, after, query },
          }),
        },
        'fetchProducts'
      );
    }, { first, after, fromDate });
  }
}