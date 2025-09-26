import { PrismaClient } from "@prisma/client";
import { UnifiedShopifyRepository } from "../../repositories/unified-shopify.repository";
import {
  SyncOptions,
  SyncResult,
} from "../../shopify.types";
import {
  ShopifySyncError,
} from "../../shopify.errors";
import { BaseShopifyService } from "../base-service";

/**
 * Base class for domain-specific sync services
 * Contains common validation and error handling logic
 */
export abstract class BaseSyncService extends BaseShopifyService {
  protected repository: UnifiedShopifyRepository;

  constructor(protected prisma: PrismaClient) {
    super();
    this.repository = new UnifiedShopifyRepository(prisma);
  }

  /**
   * Implementation of abstract method from BaseShopifyService
   */
  protected getPaginationItemsKey(): string {
    return 'items'; // Generic key for sync operations
  }

  /**
   * Validates sync options including storeId (sync service specific)
   */
  protected validateSyncOptionsWithStore(options: SyncOptions): void {
    const { storeId, fromDate, limit } = options;

    if (!storeId?.trim()) {
      throw new ShopifySyncError(
        'Store ID is required for sync operations',
        { ordersProcessed: 0, ordersCreated: 0, ordersUpdated: 0, errors: ['Invalid store ID'] }
      );
    }

    if (fromDate && fromDate > new Date()) {
      throw new ShopifySyncError(
        'fromDate cannot be in the future',
        { ordersProcessed: 0, ordersCreated: 0, ordersUpdated: 0, errors: ['Invalid fromDate'] }
      );
    }

    if (limit !== undefined && (limit < 1 || limit > 10000)) {
      throw new ShopifySyncError(
        'Limit must be between 1 and 10,000',
        { ordersProcessed: 0, ordersCreated: 0, ordersUpdated: 0, errors: ['Invalid limit'] }
      );
    }
  }

  /**
   * Enhanced error handling for individual item processing failures
   */
  protected handleItemProcessingError(
    error: unknown,
    itemType: string,
    itemIdentifier: string,
    operation: string
  ): string {
    const actualError = error instanceof Error ? error : new Error(String(error));

    this.logger.error(`Failed to process ${itemType}`, {
      error: actualError,
      itemType,
      itemIdentifier,
      operation
    });

    // Enhanced error context for debugging
    let errorContext = `${itemType} ${itemIdentifier}`;
    if (actualError.message.includes('duplicate')) {
      errorContext += ' (duplicate entry - likely already processed)';
    } else if (actualError.message.includes('not found')) {
      errorContext += ' (referenced entity not found)';
    } else if (actualError.message.includes('constraint')) {
      errorContext += ' (data constraint violation)';
    }

    return `${errorContext}: ${actualError.message}`;
  }

  /**
   * Creates a properly initialized sync result
   */
  protected createSyncResult(): SyncResult {
    return {
      ordersProcessed: 0,
      ordersCreated: 0,
      ordersUpdated: 0,
      productsProcessed: 0,
      productsCreated: 0,
      productsUpdated: 0,
      collectionsProcessed: 0,
      collectionsCreated: 0,
      collectionsUpdated: 0,
      variantsProcessed: 0,
      variantsCreated: 0,
      variantsUpdated: 0,
      errors: [],
    };
  }
}