import { createLogger } from "../../../common/logger";
import { AppError } from "../../../common/errors";
import { ShopifyDataError } from "../shopify.errors";

/**
 * Base service class providing DRY patterns for common operations
 * Used by ShopifyService and ShopifySyncService to reduce code duplication
 */
export abstract class BaseShopifyService {
  protected logger = createLogger(this.constructor.name);

  /**
   * Validates pagination options with consistent rules
   */
  protected validatePaginationOptions(options: { limit?: number; offset?: number }): void {
    const { limit, offset } = options;

    if (limit !== undefined && (limit < 1 || limit > 1000)) {
      throw new ShopifyDataError(
        'Limit must be between 1 and 1000',
        undefined,
        { operation: 'validatePagination', entity: 'PaginationOptions' }
      );
    }

    if (offset !== undefined && offset < 0) {
      throw new ShopifyDataError(
        'Offset must be non-negative',
        undefined,
        { operation: 'validatePagination', entity: 'PaginationOptions' }
      );
    }
  }

  /**
   * Validates sync options with consistent rules
   */
  protected validateSyncOptions(options: { fromDate?: Date; limit?: number }): void {
    const { fromDate, limit } = options;

    if (fromDate && fromDate > new Date()) {
      throw new ShopifyDataError(
        'fromDate cannot be in the future',
        undefined,
        { operation: 'validateSync', entity: 'SyncOptions' }
      );
    }

    if (limit !== undefined && (limit < 1 || limit > 10000)) {
      throw new ShopifyDataError(
        'Limit must be between 1 and 10,000',
        undefined,
        { operation: 'validateSync', entity: 'SyncOptions' }
      );
    }
  }

  /**
   * Transforms unknown errors to proper Error objects for consistent handling
   */
  protected transformError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }

  /**
   * Creates domain-specific errors with consistent context
   */
  protected createDomainError(
    message: string,
    cause?: Error,
    context?: {
      operation?: string;
      entity?: string;
      entityId?: string;
    }
  ): ShopifyDataError {
    return new ShopifyDataError(message, cause, context);
  }

  /**
   * Logs errors with consistent structure and context
   */
  protected logError(
    message: string,
    error: unknown,
    context?: Record<string, unknown>
  ): void {
    this.logger.error(message, {
      error: this.transformError(error),
      ...context
    });
  }

  /**
   * Logs operation completion with consistent structure
   */
  protected logOperationComplete(
    operation: string,
    context?: Record<string, unknown>
  ): void {
    this.logger.info(`${operation} completed successfully`, context);
  }

  /**
   * Logs operation start with consistent structure
   */
  protected logOperationStart(
    operation: string,
    context?: Record<string, unknown>
  ): void {
    this.logger.info(`Starting ${operation}`, context);
  }

  /**
   * Generic wrapper for service operations with consistent error handling
   * Provides standardized try-catch-log-throw pattern
   */
  protected async executeServiceOperation<T>(
    operation: () => Promise<T>,
    context: {
      operationName: string;
      entity?: string;
      entityId?: string;
      logContext?: Record<string, unknown>;
    }
  ): Promise<T> {
    const { operationName, entity, entityId, logContext } = context;

    try {
      this.logOperationStart(operationName, logContext);
      const result = await operation();
      this.logOperationComplete(operationName, logContext);
      return result;
    } catch (error) {
      this.logError(`${operationName} failed`, error, {
        entity,
        entityId,
        ...logContext
      });

      // Re-throw domain errors as-is
      if (error instanceof AppError) {
        throw error;
      }

      // Transform other errors to domain errors
      const actualError = this.transformError(error);
      throw this.createDomainError(
        `${operationName} failed: ${actualError.message}`,
        actualError,
        { operation: operationName, entity, entityId }
      );
    }
  }

  /**
   * Wrapper specifically for data retrieval operations
   */
  protected async executeDataOperation<T>(
    operation: () => Promise<T>,
    entityType: string,
    operationName?: string,
    context?: Record<string, unknown>
  ): Promise<T> {
    return this.executeServiceOperation(operation, {
      operationName: operationName || `retrieve${entityType}`,
      entity: entityType,
      logContext: context
    });
  }

  /**
   * Wrapper specifically for sync operations
   */
  protected async executeSyncOperation<T>(
    operation: () => Promise<T>,
    syncType: string,
    context?: Record<string, unknown>
  ): Promise<T> {
    return this.executeServiceOperation(operation, {
      operationName: `sync${syncType}`,
      entity: syncType,
      logContext: context
    });
  }

  /**
   * Creates consistent pagination result structure
   */
  protected createPaginationResult<T>(
    items: T[],
    total: number,
    limit: number,
    offset: number
  ) {
    return {
      [this.getPaginationItemsKey()]: items,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Abstract method to get the key name for paginated items
   * Each service can override to return appropriate key ('orders', 'products', etc.)
   */
  protected abstract getPaginationItemsKey(): string;

  /**
   * Validates required store ID parameter
   */
  protected validateStoreId(storeId: string): void {
    if (!storeId?.trim()) {
      throw new ShopifyDataError(
        'Store ID is required',
        undefined,
        { operation: 'validateStoreId', entity: 'Store' }
      );
    }
  }
}