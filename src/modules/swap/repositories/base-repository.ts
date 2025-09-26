import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "../../../common/repositories/base-repository";
import { AppError } from "../../../common/errors";

/**
 * SWAP-specific data error for repository operations
 */
export class SwapDataError extends AppError {
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
    this.name = 'SwapDataError';
    this.operation = context?.operation;
    this.entity = context?.entity;
    this.entityId = context?.entityId;

    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * SWAP-specific base repository that extends the generic base
 * Provides SWAP domain errors and any SWAP-specific patterns
 */
export abstract class BaseSwapRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Creates SWAP-specific domain errors
   * Implementation of abstract method from BaseRepository
   */
  protected createDomainError(
    message: string,
    cause?: Error,
    context?: {
      operation?: string;
      entity?: string;
      entityId?: string;
    }
  ): AppError {
    return new SwapDataError(message, cause, context);
  }

  /**
   * SWAP-specific validation for return data
   * Example of module-specific helper methods
   */
  protected validateSwapReturnData(returnData: any, operation: string) {
    if (!returnData?.swapReturnId) {
      throw this.createDomainError(
        `SWAP Return ID is required for ${operation}`,
        undefined,
        { operation, entity: 'SwapReturn' }
      );
    }

    if (!returnData?.orderName) {
      throw this.createDomainError(
        `Order name is required for ${operation}`,
        undefined,
        { operation, entity: 'SwapReturn' }
      );
    }
  }
}