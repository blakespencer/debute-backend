import { AppError } from '../../common/errors';

/**
 * SWAP API related errors
 */
export class SwapApiError extends AppError {
  public readonly responseStatus?: number;
  public readonly responseBody?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    options: {
      responseStatus?: number;
      responseBody?: unknown;
    } = {}
  ) {
    super(message, statusCode);
    this.name = 'SwapApiError';
    this.responseStatus = options.responseStatus;
    this.responseBody = options.responseBody;
  }
}

/**
 * SWAP authentication errors
 */
export class SwapAuthError extends SwapApiError {
  constructor(message: string = 'Invalid SWAP API credentials') {
    super(message, 401, { responseStatus: 401 });
    this.name = 'SwapAuthError';
  }
}

/**
 * SWAP rate limit exceeded
 */
export class SwapRateLimitError extends SwapApiError {
  constructor(retryAfter: number = 60) {
    super(`SWAP rate limit exceeded. Retry after ${retryAfter} seconds.`, 429, {
      responseStatus: 429,
    });
    this.name = 'SwapRateLimitError';
  }
}

/**
 * SWAP sync operation errors
 */
export class SwapSyncError extends AppError {
  public readonly syncDetails?: {
    returnsProcessed: number;
    returnsCreated: number;
    returnsUpdated: number;
    errors: string[];
  };

  constructor(
    message: string,
    syncDetails?: {
      returnsProcessed: number;
      returnsCreated: number;
      returnsUpdated: number;
      errors: string[];
    }
  ) {
    super(message, 500);
    this.name = 'SwapSyncError';
    this.syncDetails = syncDetails;
  }
}

/**
 * SWAP store configuration errors
 */
export class SwapStoreError extends AppError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'SwapStoreError';
  }
}

/**
 * Network timeout errors for SWAP requests
 */
export class SwapTimeoutError extends SwapApiError {
  constructor(timeoutMs: number) {
    super(`SWAP API request timed out after ${timeoutMs}ms`, 408);
    this.name = 'SwapTimeoutError';
  }
}

/**
 * Maximum retry attempts exceeded
 */
export class SwapMaxRetriesError extends SwapApiError {
  public readonly attempts: number;
  public readonly lastError: Error;

  constructor(attempts: number, lastError: Error) {
    super(`Maximum retry attempts (${attempts}) exceeded. Last error: ${lastError.message}`, 500);
    this.name = 'SwapMaxRetriesError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}