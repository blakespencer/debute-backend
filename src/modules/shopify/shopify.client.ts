import { ShopifyOrdersResponse } from './shopify.types';

export class ShopifyClient {
  private shopDomain: string;
  private accessToken: string;

  constructor(shopDomain: string, accessToken: string) {
    this.shopDomain = shopDomain;
    this.accessToken = accessToken;
  }

  private getApiUrl(): string {
    return `https://${this.shopDomain}/admin/api/2024-10/graphql.json`;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': this.accessToken,
    };
  }

  async fetchOrders(options: {
    first?: number;
    after?: string;
    since?: string;
  } = {}): Promise<ShopifyOrdersResponse> {
    const { first = 50, after, since } = options;

    let query = '';
    if (since) {
      query = `created_at:>='${since}'`;
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

    const response = await fetch(this.getApiUrl(), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: graphqlQuery,
        variables: {
          first,
          after,
          query,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          query: 'query { shop { name } }',
        }),
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return !result.errors && result.data?.shop?.name;
    } catch {
      return false;
    }
  }
}