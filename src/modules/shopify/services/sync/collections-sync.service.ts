import { PrismaClient } from "@prisma/client";
import { ShopifyClient } from "../../clients/shopify.client";
import {
  SyncOptions,
  SyncResult,
  ShopifyCollection as ApiCollection,
} from "../../shopify.types";
import {
  ShopifyStoreError,
} from "../../shopify.errors";
import { extractCollectionId } from "../../utils/shopify-gid.utils";
import { BaseSyncService } from "./base-sync.service";

export class CollectionsSyncService extends BaseSyncService {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async syncCollections(options: SyncOptions): Promise<SyncResult> {
    return this.executeSyncOperation(
      async () => {
        this.validateSyncOptionsWithStore(options);
        const { storeId, fromDate, limit = 50 } = options;

        const store = await this.repository.findStoreById(storeId);
        if (!store) {
          throw new ShopifyStoreError(`Store not found: ${storeId}`);
        }

        const client = new ShopifyClient(store.shopDomain, store.accessToken);
        const syncFromDate = fromDate || store.lastSyncAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        this.logger.debug("Collections sync date calculated", {
          providedFromDate: fromDate,
          storeLastSync: store.lastSyncAt,
          finalSyncFromDate: syncFromDate,
          syncFromDateISO: syncFromDate.toISOString(),
        });

        const result = this.createSyncResult();
        let hasNextPage = true;
        let cursor: string | undefined;

        while (hasNextPage) {
          const response = await client.fetchCollections({
            first: Math.min(limit, 50),
            after: cursor,
            fromDate: syncFromDate.toISOString(),
          });

          for (const collection of response.collections.nodes) {
            try {
              await this.processCollection(collection, storeId);
              result.collectionsProcessed = (result.collectionsProcessed ?? 0) + 1;

              const existing = await this.repository.findCollectionByShopifyId(extractCollectionId(collection.id));
              if (existing) {
                result.collectionsUpdated = (result.collectionsUpdated ?? 0) + 1;
              } else {
                result.collectionsCreated = (result.collectionsCreated ?? 0) + 1;
              }
            } catch (error) {
              const errorMessage = this.handleItemProcessingError(
                error,
                'Collection',
                collection.title,
                'process'
              );
              result.errors.push(errorMessage);
            }
          }

          hasNextPage = response.collections.pageInfo.hasNextPage;
          cursor = response.collections.pageInfo.endCursor;

          if ((result.collectionsProcessed ?? 0) >= limit) {
            break;
          }

          if (hasNextPage) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        await this.repository.updateStoreLastSync(storeId);
        return result;
      },
      'Collections',
      { options }
    );
  }

  private async processCollection(collection: ApiCollection, storeId: string): Promise<void> {
    const shopifyCollectionId = extractCollectionId(collection.id);
    const existingCollection = await this.repository.findCollectionByShopifyId(shopifyCollectionId);

    const collectionData = this.mapApiCollectionToDb(collection, storeId);

    if (existingCollection) {
      await this.updateExistingCollection(collection);
    } else {
      await this.createNewCollection(collectionData);
    }
  }

  private async createNewCollection(collectionData: any): Promise<any> {
    return await this.repository.createCollection(collectionData);
  }

  private async updateExistingCollection(collection: ApiCollection): Promise<any> {
    const updateData = {
      title: collection.title,
      handle: collection.handle,
      description: collection.description || undefined,
      updatedAt: new Date(collection.updatedAt),
    };

    const shopifyCollectionId = extractCollectionId(collection.id);
    return await this.repository.updateCollection(shopifyCollectionId, updateData);
  }

  private mapApiCollectionToDb(collection: ApiCollection, storeId: string) {
    return {
      shopifyCollectionId: extractCollectionId(collection.id),
      legacyResourceId: collection.legacyResourceId,
      title: collection.title,
      handle: collection.handle,
      description: collection.description || undefined,
      updatedAt: new Date(collection.updatedAt),
      storeId,
    };
  }
}