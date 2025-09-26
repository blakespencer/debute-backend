import { PrismaClient } from "@prisma/client";
import { ShopifyClient } from "../../clients/shopify.client";
import {
  SyncOptions,
  SyncResult,
} from "../../shopify.types";
import {
  ShopifyStoreError,
} from "../../shopify.errors";
import { BaseSyncService } from "./base-sync.service";
import { OrdersSyncService } from "./orders-sync.service";
import { ProductsSyncService } from "./products-sync.service";
import { CollectionsSyncService } from "./collections-sync.service";

/**
 * Main sync service that orchestrates domain-specific sync services
 * Provides unified interface for syncing all Shopify data types
 */
export class ShopifySyncService extends BaseSyncService {
  private ordersSyncService: OrdersSyncService;
  private productsSyncService: ProductsSyncService;
  private collectionsSyncService: CollectionsSyncService;

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.ordersSyncService = new OrdersSyncService(prisma);
    this.productsSyncService = new ProductsSyncService(prisma);
    this.collectionsSyncService = new CollectionsSyncService(prisma);
  }

  async syncOrders(options: SyncOptions): Promise<SyncResult> {
    return this.ordersSyncService.syncOrders(options);
  }

  async syncProducts(options: SyncOptions): Promise<SyncResult> {
    return this.productsSyncService.syncProducts(options);
  }

  async syncCollections(options: SyncOptions): Promise<SyncResult> {
    return this.collectionsSyncService.syncCollections(options);
  }

  async testStoreConnection(storeId: string): Promise<boolean> {
    return this.executeServiceOperation(
      async () => {
        this.validateStoreId(storeId);

        const store = await this.repository.findStoreById(storeId);
        if (!store) {
          throw new ShopifyStoreError(`Store not found: ${storeId}`);
        }

        const client = new ShopifyClient(store.shopDomain, store.accessToken);
        const isConnected = await client.testConnection();

        this.logger.info("Store connection test completed", {
          storeId,
          shopDomain: store.shopDomain,
          connected: isConnected,
        });

        return isConnected;
      },
      {
        operationName: 'testStoreConnection',
        entity: 'Store',
        entityId: storeId,
        logContext: { storeId }
      }
    ).catch(error => {
      // For connection tests, return false for non-validation errors
      if (error instanceof ShopifyStoreError) {
        throw error;
      }
      return false;
    });
  }

  /**
   * Helper method to validate store ID
   */
  protected validateStoreId(storeId: string): void {
    if (!storeId?.trim()) {
      throw new ShopifyStoreError('Store ID is required');
    }
  }
}