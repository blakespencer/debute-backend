import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { createLogger } from "../logger";
import { AppError } from "../errors";

/**
 * Generic base repository class with universal error handling patterns
 * To be extended by module-specific base repositories
 */
export abstract class BaseRepository {
  protected prisma: PrismaClient;
  protected logger = createLogger(this.constructor.name);

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Generic wrapper for database operations with consistent error handling
   * Override createDomainError() in subclasses for module-specific errors
   */
  protected async executeOperation<T>(
    operation: () => Promise<T>,
    context: {
      operationType: 'find' | 'create' | 'update' | 'delete' | 'count';
      entityType: string;
      entityId?: string;
      operationName: string;
    }
  ): Promise<T> {
    const { operationType, entityType, entityId, operationName } = context;

    try {
      this.logger.debug(`Executing ${operationName}`, { entityType, entityId });

      const result = await operation();

      this.logger.debug(`${operationName} completed successfully`, {
        entityType,
        entityId,
        hasResult: !!result
      });

      return result;
    } catch (error) {
      return this.handleDatabaseError(error, context);
    }
  }

  /**
   * Wrapper specifically for find operations
   */
  protected async executeFindOperation<T>(
    operation: () => Promise<T>,
    entityType: string,
    entityId?: string,
    operationName?: string
  ): Promise<T> {
    return this.executeOperation(operation, {
      operationType: 'find',
      entityType,
      entityId,
      operationName: operationName || `find${entityType}`,
    });
  }

  /**
   * Wrapper specifically for create operations with duplicate handling
   */
  protected async executeCreateOperation<T>(
    operation: () => Promise<T>,
    entityType: string,
    entityId?: string,
    operationName?: string
  ): Promise<T> {
    return this.executeOperation(operation, {
      operationType: 'create',
      entityType,
      entityId,
      operationName: operationName || `create${entityType}`,
    });
  }

  /**
   * Wrapper specifically for update operations with not found handling
   */
  protected async executeUpdateOperation<T>(
    operation: () => Promise<T>,
    entityType: string,
    entityId: string,
    operationName?: string
  ): Promise<T> {
    return this.executeOperation(operation, {
      operationType: 'update',
      entityType,
      entityId,
      operationName: operationName || `update${entityType}`,
    });
  }

  /**
   * Wrapper specifically for delete operations
   */
  protected async executeDeleteOperation<T>(
    operation: () => Promise<T>,
    entityType: string,
    entityId?: string,
    operationName?: string
  ): Promise<T> {
    return this.executeOperation(operation, {
      operationType: 'delete',
      entityType,
      entityId,
      operationName: operationName || `delete${entityType}`,
    });
  }

  /**
   * Batch operation wrapper
   */
  protected async executeBatchOperation<T>(
    operation: () => Promise<T>,
    entityType: string,
    batchSize: number,
    operationName?: string
  ): Promise<T> {
    return this.executeOperation(operation, {
      operationType: 'create',
      entityType,
      entityId: `batch_${batchSize}`,
      operationName: operationName || `createMany${entityType}`,
    });
  }

  /**
   * Input validation helper
   */
  protected validateRequiredField(
    value: string | undefined | null,
    fieldName: string,
    entityType: string
  ): asserts value is string {
    if (!value?.trim()) {
      throw this.createDomainError(
        `${fieldName} is required for ${entityType}`,
        undefined,
        { operation: 'validation', entity: entityType }
      );
    }
  }

  /**
   * Abstract method - must be implemented by module-specific base classes
   * This creates the appropriate domain error for each module
   */
  protected abstract createDomainError(
    message: string,
    cause?: Error,
    context?: {
      operation?: string;
      entity?: string;
      entityId?: string;
    }
  ): AppError;

  /**
   * Enhanced error handling with Prisma-specific error transformation
   * Uses module-specific domain errors via createDomainError()
   */
  private handleDatabaseError(
    error: unknown,
    context: {
      operationType: string;
      entityType: string;
      entityId?: string;
      operationName: string;
    }
  ): never {
    const { operationType, entityType, entityId, operationName } = context;

    // If it's already a domain error, just re-throw
    if (error instanceof AppError) {
      throw error;
    }

    // Handle Prisma-specific errors
    if (error instanceof PrismaClientKnownRequestError) {
      const errorContext = { operation: operationName, entity: entityType, entityId };

      switch (error.code) {
        case 'P2002': // Unique constraint violation
          const duplicateField = error.meta?.target || 'record';
          throw this.createDomainError(
            `${entityType} already exists: duplicate ${duplicateField}${entityId ? ` (${entityId})` : ''}`,
            error,
            errorContext
          );

        case 'P2025': // Record not found
          if (operationType === 'update' || operationType === 'delete') {
            throw this.createDomainError(
              `${entityType} not found for ${operationType}${entityId ? `: ${entityId}` : ''}`,
              error,
              errorContext
            );
          }
          // For find operations, return null instead of throwing
          break;

        case 'P2003': // Foreign key constraint
          const relation = error.meta?.field_name || 'related record';
          throw this.createDomainError(
            `Cannot ${operationType} ${entityType}: ${relation} does not exist${entityId ? ` (${entityId})` : ''}`,
            error,
            errorContext
          );

        case 'P2014': // Required relation missing
          throw this.createDomainError(
            `Cannot ${operationType} ${entityType}: missing required relationship${entityId ? ` (${entityId})` : ''}`,
            error,
            errorContext
          );

        case 'P1008': // Operations timed out
          throw this.createDomainError(
            `Database operation timed out for ${entityType}${entityId ? ` (${entityId})` : ''}`,
            error,
            errorContext
          );

        default:
          this.logger.error(`Unhandled Prisma error: ${error.code}`, {
            error,
            context,
            code: error.code,
            meta: error.meta
          });
          throw this.createDomainError(
            `Database error during ${operationType} of ${entityType}${entityId ? ` (${entityId})` : ''}`,
            error,
            errorContext
          );
      }
    }

    // Handle other database errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const actualError = error instanceof Error ? error : new Error(String(error));

    this.logger.error(`Database operation failed: ${operationName}`, {
      errorMessage,
      stack: errorStack,
      context
    });

    throw this.createDomainError(
      `Database error during ${operationType} of ${entityType}${entityId ? ` (${entityId})` : ''}`,
      actualError,
      { operation: operationName, entity: entityType, entityId }
    );
  }
}