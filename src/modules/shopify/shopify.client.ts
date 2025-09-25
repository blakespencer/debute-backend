import { ShopifyOrdersResponse } from './shopify.types';
import {
  ShopifyApiError,
  ShopifyRateLimitError,
  ShopifyAuthError,
  ShopifyGraphQLError,
  ShopifyTimeoutError,
  ShopifyMaxRetriesError
} from './shopify.errors';
import { createLogger } from '../../common/logger';

export interface ShopifyClientConfig {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  rateLimitBuffer?: number;
}

export class ShopifyClient {
  private shopDomain: string;
  private accessToken: string;
  private config: Required<ShopifyClientConfig>;
  private logger = createLogger('ShopifyClient');

  constructor(
    shopDomain: string,
    accessToken: string,
    config: ShopifyClientConfig = {}
  ) {
    this.shopDomain = shopDomain;
    this.accessToken = accessToken;
    this.config = {
      timeoutMs: config.timeoutMs ?? 30000, // 30 second timeout
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000, // 1 second base delay
      rateLimitBuffer: config.rateLimitBuffer ?? 5, // Stop retrying when <5 calls remain
    };

    this.logger.info('ShopifyClient initialized', {
      shopDomain: this.shopDomain,
      config: this.config
    });
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

  /**
   * Create AbortController with timeout
   */
  private createTimeoutController(): AbortController {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), this.config.timeoutMs);
    return controller;
  }

  /**
   * Parse rate limit information from response headers
   */
  private parseRateLimitInfo(response: Response): {
    remaining: number;
    resetAt: Date;
    retryAfter?: number;
  } {
    const remaining = parseInt(response.headers.get('X-Shopify-Shop-Api-Call-Limit-Remaining') || '0');
    const resetAt = new Date(response.headers.get('X-Shopify-Shop-Api-Call-Limit-Reset') || Date.now());
    const retryAfter = parseInt(response.headers.get('Retry-After') || '0');

    return { remaining, resetAt, retryAfter };
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number, baseDelay: number = this.config.retryDelayMs): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof ShopifyRateLimitError) return true;
    if (error instanceof ShopifyTimeoutError) return true;
    if (error instanceof ShopifyApiError) {
      // Retry on 5xx server errors, but not 4xx client errors (except rate limits)
      return (error.responseStatus ?? 0) >= 500;
    }
    // Network errors are retryable
    if (error instanceof Error && error.name === 'AbortError') return false; // Don't retry timeouts
    if (error instanceof Error && error.message.includes('network')) return true;
    return false;
  }

  /**
   * Sleep for specified milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enhanced fetch with retry logic and proper error handling
   */
  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    operation: string
  ): Promise<T> {
    let lastError: Error = new Error('No attempts made');

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      const controller = this.createTimeoutController();

      try {
        this.logger.debug(`API request attempt ${attempt + 1}`, {
          operation,
          attempt: attempt + 1,
          maxRetries: this.config.maxRetries
        });

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        // Parse rate limit info
        const rateLimitInfo = this.parseRateLimitInfo(response);

        this.logger.debug('API response received', {
          operation,
          status: response.status,
          rateLimitRemaining: rateLimitInfo.remaining,
          attempt: attempt + 1
        });

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = rateLimitInfo.retryAfter || 60;
          throw new ShopifyRateLimitError(retryAfter, {
            rateLimitRemaining: rateLimitInfo.remaining,
            rateLimitResetAt: rateLimitInfo.resetAt
          });
        }

        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          const errorText = await response.text();
          throw new ShopifyAuthError(`Authentication failed: ${errorText}`);
        }

        // Handle other HTTP errors
        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'Unknown error');
          throw new ShopifyApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            500,
            {
              responseStatus: response.status,
              responseBody: errorBody,
              rateLimitRemaining: rateLimitInfo.remaining,
              rateLimitResetAt: rateLimitInfo.resetAt
            }
          );
        }

        // Warn if approaching rate limit
        if (rateLimitInfo.remaining <= this.config.rateLimitBuffer) {
          this.logger.warn('Approaching rate limit', {
            operation,
            remaining: rateLimitInfo.remaining,
            resetAt: rateLimitInfo.resetAt
          });
        }

        const result = await response.json();

        // Handle GraphQL errors
        if (result.errors && result.errors.length > 0) {
          throw new ShopifyGraphQLError(result.errors, result);
        }

        this.logger.info('API request successful', {
          operation,
          attempt: attempt + 1,
          rateLimitRemaining: rateLimitInfo.remaining
        });

        return result.data;

      } catch (error) {
        lastError = error as Error;

        // Handle timeout
        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new ShopifyTimeoutError(this.config.timeoutMs);
        }

        this.logger.warn('API request failed', {
          operation,
          attempt: attempt + 1,
          error: lastError,
          willRetry: attempt < this.config.maxRetries && this.isRetryableError(lastError)
        });

        // Don't retry on final attempt or non-retryable errors
        if (attempt >= this.config.maxRetries || !this.isRetryableError(lastError)) {
          break;
        }

        // Calculate delay with exponential backoff
        let delay = this.calculateBackoffDelay(attempt);

        // For rate limits, use the Retry-After header if available
        if (lastError instanceof ShopifyRateLimitError) {
          const retryMatch = lastError.message.match(/Retry after (\d+) seconds/);
          if (retryMatch) {
            delay = parseInt(retryMatch[1]) * 1000;
          }
        }

        this.logger.info('Retrying API request', {
          operation,
          attempt: attempt + 1,
          delayMs: delay,
          nextAttempt: attempt + 2
        });

        await this.sleep(delay);
      }
    }

    // All retries exhausted
    throw new ShopifyMaxRetriesError(this.config.maxRetries, lastError!);
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

  async testConnection(): Promise<boolean> {
    return this.logger.time('testConnection', async () => {
      try {
        this.logger.debug('Testing Shopify connection');

        await this.fetchWithRetry<{ shop: { name: string } }>(
          this.getApiUrl(),
          {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
              query: 'query { shop { name } }',
            }),
          },
          'testConnection'
        );

        this.logger.info('Shopify connection test successful');
        return true;

      } catch (error) {
        this.logger.error('Shopify connection test failed', {
          error: error instanceof Error ? error : new Error(String(error))
        });
        return false;
      }
    });
  }
}