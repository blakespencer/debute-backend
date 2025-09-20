import { SwapApiResponse, SwapClientConfig } from "./swap.types";
import {
  SwapApiError,
  SwapAuthError,
  SwapRateLimitError,
  SwapTimeoutError,
  SwapMaxRetriesError,
} from "./swap.errors";
import { createLogger } from "../../common/logger";

export class SwapClient {
  private apiKey: string;
  private config: Required<SwapClientConfig>;
  private logger = createLogger("SwapClient");
  private baseUrl = "https://api-mfdugldntq-nw.a.run.app/v1/external";

  constructor(apiKey: string, config: SwapClientConfig = {}) {
    this.apiKey = apiKey;
    this.config = {
      timeoutMs: config.timeoutMs ?? 30000, // 30 second timeout
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000, // 1 second base delay
    };
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
    };
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(
    attempt: number,
    baseDelay: number = this.config.retryDelayMs
  ): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Determine if error is retryable based on SWAP API error codes
   */
  private isRetryableError(error: unknown): boolean {
    // Rate limits are retryable
    if (error instanceof SwapRateLimitError) return true;

    // Timeouts are retryable
    if (error instanceof SwapTimeoutError) return true;

    // Authentication errors (401) are NOT retryable - API key issue
    if (error instanceof SwapAuthError) return false;

    if (error instanceof SwapApiError) {
      const status = error.responseStatus ?? 0;

      // According to SWAP API docs:
      // 400 - Bad Request (parameters) - NOT retryable
      // 401 - Unauthorized (API key) - NOT retryable
      // 404 - Not Found (store/data) - NOT retryable
      // 429 - Rate Limit - retryable (handled above)
      // 500 - Internal Error - retryable
      if (status >= 400 && status < 500) return false; // 4xx client errors not retryable
      if (status >= 500) return true; // 5xx server errors are retryable
    }

    // Network errors are retryable
    if (error instanceof Error && error.name === "AbortError") return true; // Retry timeouts
    if (error instanceof Error && error.message.includes("network"))
      return true;

    return false;
  }

  /**
   * Sleep for specified milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handle HTTP response and convert to appropriate error types
   */
  private async handleHttpError(
    response: Response,
    operation: string,
    url: string
  ): Promise<never> {
    const errorText = await response.text();

    // Handle specific error codes according to SWAP API docs
    switch (response.status) {
      case 400:
        throw new SwapApiError(
          `Bad Request: Missing or invalid parameters - ${errorText}`,
          400,
          { responseStatus: response.status, responseBody: errorText }
        );

      case 401:
        // Try to extract the actual error message from SWAP response
        let errorMessage = "Invalid or missing API key";
        try {
          const errorJson = JSON.parse(errorText);
          const swapMessage =
            errorJson.error?.message ||
            errorJson.message ||
            "Unknown authentication error";
          errorMessage = `Invalid API key: ${swapMessage}`;
        } catch {
          // JSON parsing failed - use fallback message
        }
        throw new SwapAuthError(errorMessage);

      case 404:
        throw new SwapApiError(
          `Not Found: Store or return data not found - ${errorText}`,
          404,
          { responseStatus: response.status, responseBody: errorText }
        );

      case 429:
        const retryAfter = parseInt(
          response.headers.get("Retry-After") || "60"
        );
        throw new SwapRateLimitError(retryAfter);

      default:
        if (response.status >= 400 && response.status < 500) {
          throw new SwapApiError(
            `Client Error ${response.status}: ${errorText}`,
            response.status,
            { responseStatus: response.status, responseBody: errorText }
          );
        }
        throw new SwapApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          500,
          { responseStatus: response.status, responseBody: errorText }
        );
    }
  }

  /**
   * Execute a single HTTP request with timeout
   */
  private async executeSingleRequest<T>(
    url: string,
    options: RequestInit,
    operation: string
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs
    );

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleHttpError(response, operation, url);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      // Convert AbortError to SwapTimeoutError
      if (error instanceof Error && error.name === "AbortError") {
        throw new SwapTimeoutError(this.config.timeoutMs);
      }

      throw error;
    }
  }

  /**
   * Enhanced fetch with retry logic and proper error handling
   */
  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    operation: string
  ): Promise<T> {
    let lastError: Error = new Error("No attempts made");

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.executeSingleRequest<T>(url, options, operation);
      } catch (error) {
        lastError = error as Error;

        // For non-retryable errors, throw immediately (no wrapping)
        if (!this.isRetryableError(lastError)) {
          throw lastError;
        }

        // Don't retry on final attempt
        if (attempt >= this.config.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        let delay = this.calculateBackoffDelay(attempt);

        // For rate limits, use the Retry-After header if available
        if (lastError instanceof SwapRateLimitError) {
          const retryMatch = lastError.message.match(
            /Retry after (\d+) seconds/
          );
          if (retryMatch) {
            delay = parseInt(retryMatch[1]) * 1000;
          }
        }

        await this.sleep(delay);
      }
    }

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
    const {
      store,
      fromDate,
      toDate,
      lastUpdatedDate,
      page = 1,
      itemsPerPage = 50,
      version = 1,
    } = options;

    return this.logger.time(
      "fetchReturns",
      async () => {
        // Build query parameters manually to avoid URL encoding colons in dates
        // URLSearchParams encodes colons (:) as %3A, but SWAP API expects unencoded colons
        const params = [
          `store=${store}`,
          `from_date=${fromDate}`,
          `page=${page}`,
          `items_per_page=${itemsPerPage}`,
          `version=${version}`,
        ];

        if (toDate) {
          params.push(`to_date=${toDate}`);
        }
        if (lastUpdatedDate) {
          params.push(`last_updated_date=${lastUpdatedDate}`);
        }

        const queryString = params.join("&");
        const url = `${this.baseUrl}/returns?${queryString}`;

        return await this.fetchWithRetry(
          url,
          {
            method: "GET",
            headers: this.getHeaders(),
          },
          "fetchReturns"
        );
      },
      { store, fromDate, toDate, page, itemsPerPage }
    );
  }

  /**
   * Test SWAP API connection
   */
  async testConnection(store: string): Promise<boolean> {
    return this.logger.time("testConnection", async () => {
      try {
        // Try to fetch a minimal amount of data to test connection
        // Use a date range of last 30 days for testing
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        await this.fetchReturns({
          store,
          fromDate: thirtyDaysAgo.toISOString(),
          page: 1,
          itemsPerPage: 1,
        });

        return true;
      } catch (error) {
        return false;
      }
    });
  }
}
