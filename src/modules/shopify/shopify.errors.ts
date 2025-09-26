import { AppError } from '../../common/errors';

/**
 * Shopify API related errors
 */
export class ShopifyApiError extends AppError {
  public readonly responseStatus?: number;
  public readonly responseBody?: unknown;
  public readonly rateLimitRemaining?: number;
  public readonly rateLimitResetAt?: Date;

  constructor(
    message: string,
    statusCode: number = 500,
    options: {
      responseStatus?: number;
      responseBody?: unknown;
      rateLimitRemaining?: number;
      rateLimitResetAt?: Date;
    } = {}
  ) {
    super(message, statusCode);
    this.name = 'ShopifyApiError';
    this.responseStatus = options.responseStatus;
    this.responseBody = options.responseBody;
    this.rateLimitRemaining = options.rateLimitRemaining;
    this.rateLimitResetAt = options.rateLimitResetAt;
  }
}

/**
 * Shopify rate limit exceeded
 */
export class ShopifyRateLimitError extends ShopifyApiError {
  constructor(
    retryAfter: number,
    options: {
      rateLimitRemaining?: number;
      rateLimitResetAt?: Date;
    } = {}
  ) {
    super(
      `Shopify rate limit exceeded. Retry after ${retryAfter} seconds.`,
      429,
      {
        responseStatus: 429,
        ...options,
      }
    );
    this.name = 'ShopifyRateLimitError';
  }
}

/**
 * Shopify authentication errors
 */
export class ShopifyAuthError extends ShopifyApiError {
  constructor(message: string = 'Invalid Shopify credentials') {
    super(message, 401, { responseStatus: 401 });
    this.name = 'ShopifyAuthError';
  }
}

/**
 * Shopify GraphQL errors
 */
export class ShopifyGraphQLError extends ShopifyApiError {
  public readonly graphqlErrors: unknown[];

  constructor(graphqlErrors: unknown[], responseBody?: unknown) {
    const errorMessages = Array.isArray(graphqlErrors)
      ? graphqlErrors.map(err =>
          typeof err === 'object' && err !== null && 'message' in err
            ? (err as { message: string }).message
            : String(err)
        ).join('; ')
      : 'Unknown GraphQL error';

    super(`GraphQL errors: ${errorMessages}`, 400, { responseBody });
    this.name = 'ShopifyGraphQLError';
    this.graphqlErrors = graphqlErrors;
  }
}

/**
 * Shopify sync operation errors
 */
export class ShopifySyncError extends AppError {
  public readonly syncDetails?: {
    ordersProcessed: number;
    ordersCreated: number;
    ordersUpdated: number;
    errors: string[];
  };

  constructor(
    message: string,
    syncDetails?: {
      ordersProcessed: number;
      ordersCreated: number;
      ordersUpdated: number;
      errors: string[];
    }
  ) {
    super(message, 500);
    this.name = 'ShopifySyncError';
    this.syncDetails = syncDetails;
  }
}

/**
 * Shopify store configuration errors
 */
export class ShopifyStoreError extends AppError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'ShopifyStoreError';
  }
}

/**
 * Network timeout errors for Shopify requests
 */
export class ShopifyTimeoutError extends ShopifyApiError {
  constructor(timeoutMs: number) {
    super(`Shopify API request timed out after ${timeoutMs}ms`, 408);
    this.name = 'ShopifyTimeoutError';
  }
}

/**
 * Maximum retry attempts exceeded
 */
export class ShopifyMaxRetriesError extends ShopifyApiError {
  public readonly attempts: number;
  public readonly lastError: Error;

  constructor(attempts: number, lastError: Error) {
    super(`Maximum retry attempts (${attempts}) exceeded. Last error: ${lastError.message}`, 500);
    this.name = 'ShopifyMaxRetriesError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

/**
 * Shopify data/repository errors
 */
export class ShopifyDataError extends AppError {
  public readonly operation?: string;
  public readonly entity?: string;
  public readonly entityId?: string;

  constructor(
    message: string,
    cause?: Error,
    context?: {
      operation?: string;
      entity?: string;
      entityId?: string;
    }
  ) {
    super(message, 422);
    this.name = 'ShopifyDataError';
    this.operation = context?.operation;
    this.entity = context?.entity;
    this.entityId = context?.entityId;

    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}