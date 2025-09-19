import { SwapApiResponse, SwapClientConfig } from './swap.types';
import {
  SwapApiError,
  SwapAuthError,
  SwapRateLimitError,
  SwapTimeoutError,
  SwapMaxRetriesError
} from './swap.errors';
import { createLogger } from '../../common/logger';

export class SwapClient {
  private apiKey: string;
  private config: Required<SwapClientConfig>;
  private logger = createLogger('SwapClient');
  private baseUrl = 'https://api-mfdugldntq-nw.a.run.app/v1/external';

  constructor(
    apiKey: string,
    config: SwapClientConfig = {}
  ) {
    this.apiKey = apiKey;
    this.config = {
      timeoutMs: config.timeoutMs ?? 30000, // 30 second timeout
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000, // 1 second base delay
    };

    this.logger.info('SwapClient initialized', {
      config: this.config
    });
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
    };
  }

  /**
   * Create AbortController with timeout (DEPRECATED - now done inline in fetchWithRetry)
   */
  private createTimeoutController(): AbortController {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), this.config.timeoutMs);
    return controller;
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
    if (error instanceof SwapRateLimitError) return true;
    if (error instanceof SwapTimeoutError) return true;
    if (error instanceof SwapApiError) {
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
      // Create a NEW AbortController for each attempt (critical fix)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, this.config.timeoutMs);

      try {
        this.logger.debug(`API request attempt ${attempt + 1}`, {
          operation,
          url,
          attempt: attempt + 1,
          maxRetries: this.config.maxRetries
        });

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        // Clear the timeout since request completed
        clearTimeout(timeoutId);

        this.logger.debug('API response received', {
          operation,
          status: response.status,
          attempt: attempt + 1
        });

        // Don't retry 404 errors - they won't change with retries
        if (response.status === 404) {
          throw new SwapApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            404,
            {
              responseStatus: response.status,
              responseBody: 'Resource not found',
            }
          );
        }

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
          throw new SwapRateLimitError(retryAfter);
        }

        // Handle authentication errors
        if (response.status === 401) {
          const errorText = await response.text();
          throw new SwapAuthError(`Authentication failed: ${errorText}`);
        }

        // Handle other HTTP errors
        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'Unknown error');
          throw new SwapApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            500,
            {
              responseStatus: response.status,
              responseBody: errorBody,
            }
          );
        }

        const result = await response.json();

        this.logger.info('API request successful', {
          operation,
          attempt: attempt + 1
        });

        return result;

      } catch (error) {
        // Clear timeout on error
        clearTimeout(timeoutId);

        lastError = error as Error;

        // Handle timeout
        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new SwapTimeoutError(this.config.timeoutMs);
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
        if (lastError instanceof SwapRateLimitError) {
          const retryMatch = lastError.message.match(/Retry after (\\d+) seconds/);
          if (retryMatch) {
            delay = parseInt(retryMatch[1]) * 1000; // Convert to milliseconds
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
    throw new SwapMaxRetriesError(this.config.maxRetries, lastError!);
  }

  /**
   * Fetch returns from SWAP API
   */
  async fetchReturns(options: {
    store: string; // Required: Store ID
    fromDate: string; // Required: ISO date string
    toDate?: string; // Optional: ISO date string
    lastUpdatedDate?: string; // Optional: ISO date string
    page?: number; // Optional: Page number (default 1)
    itemsPerPage?: number; // Optional: Items per page (default 50, max 50)
    version?: number; // Optional: API version (default 1)
  }): Promise<SwapApiResponse> {
    const { store, fromDate, toDate, lastUpdatedDate, page = 1, itemsPerPage = 50, version = 1 } = options;

    return this.logger.time('fetchReturns', async () => {
      // Build query parameters manually to avoid URL encoding colons in dates
      // URLSearchParams encodes colons (:) as %3A, but SWAP API expects unencoded colons
      const params = [
        `store=${store}`,
        `from_date=${fromDate}`,
        `page=${page}`,
        `items_per_page=${itemsPerPage}`,
        `version=${version}`
      ];

      if (toDate) {
        params.push(`to_date=${toDate}`);
      }
      if (lastUpdatedDate) {
        params.push(`last_updated_date=${lastUpdatedDate}`);
      }

      const queryString = params.join('&');
      const url = `${this.baseUrl}/returns?${queryString}`;

      this.logger.debug('SWAP API request URL', {
        url,
        queryString
      });

      this.logger.debug('Executing SWAP API request', {
        operation: 'fetchReturns',
        store,
        fromDate,
        toDate,
        lastUpdatedDate,
        page,
        itemsPerPage
      });

      return await this.fetchWithRetry(
        url,
        {
          method: 'GET',
          headers: this.getHeaders(),
        },
        'fetchReturns'
      );
    }, { store, fromDate, toDate, page, itemsPerPage });
  }

  /**
   * Test SWAP API connection
   */
  async testConnection(store: string): Promise<boolean> {
    return this.logger.time('testConnection', async () => {
      try {
        this.logger.debug('Testing SWAP connection');

        // Try to fetch a minimal amount of data to test connection
        // Use a date range of last 30 days for testing
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        await this.fetchReturns({
          store,
          fromDate: thirtyDaysAgo.toISOString(),
          page: 1,
          itemsPerPage: 1
        });

        this.logger.info('SWAP connection test successful');
        return true;

      } catch (error) {
        this.logger.error('SWAP connection test failed', {
          error: error instanceof Error ? error : new Error(String(error))
        });
        return false;
      }
    });
  }
}