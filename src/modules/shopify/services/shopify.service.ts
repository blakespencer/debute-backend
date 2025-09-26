import { PrismaClient } from "@prisma/client";
import { UnifiedShopifyRepository } from "../repositories/unified-shopify.repository";
import { ShopifySyncService } from "./sync/shopify-sync.service";
import { ShopifyDataService } from "./shopify-data.service";
import { SyncResult } from "../shopify.types";
import { ShopifyStoreError } from "../shopify.errors";
import { BaseShopifyService } from "./base-service";

export class ShopifyService extends BaseShopifyService {
  private repository: UnifiedShopifyRepository;
  private syncService: ShopifySyncService;
  private dataService: ShopifyDataService;

  constructor(private prisma: PrismaClient) {
    super();
    this.repository = new UnifiedShopifyRepository(prisma);
    this.syncService = new ShopifySyncService(prisma);
    this.dataService = new ShopifyDataService(prisma);
  }

  /**
   * Implementation of abstract method from BaseShopifyService
   */
  protected getPaginationItemsKey(): string {
    return 'items'; // Generic key, will be overridden in specific methods
  }


  private getStoreFromEnv() {
    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    if (!shopDomain || !accessToken) {
      this.logger.error('Shopify credentials not configured in environment variables');
      throw new ShopifyStoreError(
        'Shopify credentials not configured. Please set SHOPIFY_SHOP_DOMAIN and SHOPIFY_ACCESS_TOKEN environment variables.'
      );
    }

    if (!shopDomain.endsWith('.myshopify.com')) {
      throw new ShopifyStoreError(
        `Invalid shop domain format: ${shopDomain}. Must end with .myshopify.com`
      );
    }

    return { shopDomain, accessToken };
  }

  private async ensureStoreExists() {
    try {
      this.logger.debug('Ensuring Shopify store exists in database');
      const { shopDomain, accessToken } = this.getStoreFromEnv();

      let store = await this.repository.findStoreByDomain(shopDomain);

      if (!store) {
        this.logger.info('Creating new Shopify store record', { shopDomain });
        store = await this.repository.createStore({
          shopDomain,
          accessToken,
        });
        this.logger.info('Shopify store created successfully', { storeId: store.id, shopDomain });
      } else {
        this.logger.debug('Using existing Shopify store', { storeId: store.id, shopDomain });
      }

      return store;
    } catch (error) {
      this.logger.error('Failed to ensure Shopify store exists', {
        error: error instanceof Error ? error : new Error(String(error))
      });

      if (error instanceof ShopifyStoreError) {
        throw error;
      }

      const actualError = error instanceof Error ? error : new Error(String(error));
      throw new ShopifyStoreError(
        `Failed to initialize Shopify store: ${actualError.message}`
      );
    }
  }

  async syncOrders(
    options: { fromDate?: Date; limit?: number } = {}
  ): Promise<SyncResult> {
    return this.executeSyncOperation(
      async () => {
        this.validateSyncOptions(options);
        const store = await this.ensureStoreExists();

        const result = await this.syncService.syncOrders({
          storeId: store.id,
          ...options,
        });

        this.logger.info('Shopify orders sync completed', {
          storeId: store.id,
          result: {
            processed: result.ordersProcessed,
            created: result.ordersCreated,
            updated: result.ordersUpdated,
            errorCount: result.errors.length
          }
        });

        return result;
      },
      'Orders',
      { options }
    );
  }

  async syncProducts(
    options: { fromDate?: Date; limit?: number } = {}
  ): Promise<SyncResult> {
    return this.executeSyncOperation(
      async () => {
        this.validateSyncOptions(options);
        const store = await this.ensureStoreExists();

        const result = await this.syncService.syncProducts({
          storeId: store.id,
          ...options,
        });

        this.logger.info('Shopify products sync completed', {
          storeId: store.id,
          result: {
            processed: result.ordersProcessed,
            created: result.ordersCreated,
            updated: result.ordersUpdated,
            errorCount: result.errors.length
          }
        });

        return result;
      },
      'Products',
      { options }
    );
  }

  async syncCollections(
    options: { fromDate?: Date; limit?: number } = {}
  ): Promise<SyncResult> {
    return this.executeSyncOperation(
      async () => {
        this.validateSyncOptions(options);
        const store = await this.ensureStoreExists();

        const result = await this.syncService.syncCollections({
          storeId: store.id,
          ...options,
        });

        this.logger.info('Shopify collections sync completed', {
          storeId: store.id,
          result: {
            processed: result.ordersProcessed,
            created: result.ordersCreated,
            updated: result.ordersUpdated,
            errorCount: result.errors.length
          }
        });

        return result;
      },
      'Collections',
      { options }
    );
  }

  async syncAll(
    options: { fromDate?: Date; limit?: number } = {}
  ): Promise<{
    orders: SyncResult;
    products: SyncResult;
    collections: SyncResult;
  }> {
    try {
      this.logger.info('Starting comprehensive Shopify sync (all data types)', { options });
      this.validateSyncOptions(options);

      const store = await this.ensureStoreExists();

      const syncOptions = {
        storeId: store.id,
        ...options,
      };

      // Run all syncs in parallel for better performance
      const [orders, products, collections] = await Promise.all([
        this.syncService.syncOrders(syncOptions),
        this.syncService.syncProducts(syncOptions),
        this.syncService.syncCollections(syncOptions),
      ]);

      const totalProcessed = orders.ordersProcessed + products.ordersProcessed + collections.ordersProcessed;
      const totalErrors = orders.errors.length + products.errors.length + collections.errors.length;

      this.logger.info('Comprehensive Shopify sync completed', {
        storeId: store.id,
        summary: {
          totalProcessed,
          totalErrors,
          orders: { processed: orders.ordersProcessed, errors: orders.errors.length },
          products: { processed: products.ordersProcessed, errors: products.errors.length },
          collections: { processed: collections.ordersProcessed, errors: collections.errors.length }
        }
      });

      return { orders, products, collections };
    } catch (error) {
      this.logger.error('Comprehensive Shopify sync failed', {
        error: error instanceof Error ? error : new Error(String(error)),
        options
      });
      throw error;
    }
  }

  async testConnection(): Promise<{ connected: boolean }> {
    try {
      this.logger.info('Testing Shopify API connection');
      const store = await this.ensureStoreExists();

      const connected = await this.syncService.testStoreConnection(store.id);

      this.logger.info('Shopify connection test completed', {
        storeId: store.id,
        connected,
        shopDomain: store.shopDomain
      });

      return { connected };
    } catch (error) {
      this.logger.error('Shopify connection test failed', {
        error: error instanceof Error ? error : new Error(String(error))
      });
      throw error;
    }
  }

  // Data retrieval operations - delegated to ShopifyDataService
  async getOrders(options: { limit?: number; offset?: number } = {}) {
    return this.dataService.getOrders(options);
  }

  async getProducts(options: { limit?: number; offset?: number } = {}) {
    return this.dataService.getProducts(options);
  }

  async getCollections(options: { limit?: number; offset?: number } = {}) {
    return this.dataService.getCollections(options);
  }

  async getVariants(options: { limit?: number; offset?: number } = {}) {
    return this.dataService.getVariants(options);
  }
}
