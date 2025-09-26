import { ShopifyOrdersResponse } from '../shopify.types';
import { BaseShopifyClient, ShopifyClientConfig } from './base.client';

export class OrdersClient extends BaseShopifyClient {
  constructor(shopDomain: string, accessToken: string, config?: ShopifyClientConfig) {
    super(shopDomain, accessToken, config);
  }

  async fetchOrders(options: {
    first?: number;
    after?: string;
    fromDate?: string;
  } = {}): Promise<ShopifyOrdersResponse> {
    const { first = 50, after, fromDate } = options;

    return this.logger.time('fetchOrders', async () => {
      let query = '';
      if (fromDate) {
        query = `created_at:>='${fromDate}'`;
      }

      const graphqlQuery = `
        query GetOrders($first: Int!, $after: String, $query: String) {
          orders(first: $first, after: $after, query: $query) {
            nodes {
              id
              legacyResourceId
              name
              email
              phone
              currencyCode
              presentmentCurrencyCode
              currentTotalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
                presentmentMoney {
                  amount
                  currencyCode
                }
              }
              currentSubtotalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
                presentmentMoney {
                  amount
                  currencyCode
                }
              }
              currentTotalTaxSet {
                shopMoney {
                  amount
                  currencyCode
                }
                presentmentMoney {
                  amount
                  currencyCode
                }
              }
              displayFinancialStatus
              displayFulfillmentStatus
              confirmed
              closed
              cancelledAt
              cancelReason
              taxesIncluded
              test
              createdAt
              processedAt
              updatedAt
              lineItems(first: 250) {
                nodes {
                  id
                  name
                  variantTitle
                  product {
                    id
                  }
                  variant {
                    id
                  }
                  sku
                  quantity
                  currentQuantity
                  originalUnitPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                    presentmentMoney {
                      amount
                      currencyCode
                    }
                  }
                  originalTotalSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                    presentmentMoney {
                      amount
                      currencyCode
                    }
                  }
                  requiresShipping
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
        operation: 'fetchOrders',
        variables: { first, after, query },
        fromDate
      });

      return this.fetchWithRetry<ShopifyOrdersResponse>(
        this.getApiUrl(),
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            query: graphqlQuery,
            variables: { first, after, query },
          }),
        },
        'fetchOrders'
      );
    }, { first, after, fromDate });
  }
}