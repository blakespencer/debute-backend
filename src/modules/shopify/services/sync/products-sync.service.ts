import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { ShopifyClient } from "../../clients/shopify.client";
import {
  SyncOptions,
  SyncResult,
  ShopifyProduct as ApiProduct,
  ShopifyProductVariant as ApiVariant,
  ShopifyCollection as ApiCollection,
} from "../../shopify.types";
import {
  ShopifyStoreError,
} from "../../shopify.errors";
import { extractProductId, extractVariantId, extractCollectionId } from "../../utils/shopify-gid.utils";
import { BaseSyncService } from "./base-sync.service";

export class ProductsSyncService extends BaseSyncService {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async syncProducts(options: SyncOptions): Promise<SyncResult> {
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

        this.logger.debug("Product sync date calculated", {
          providedFromDate: fromDate,
          storeLastSync: store.lastSyncAt,
          finalSyncFromDate: syncFromDate,
          syncFromDateISO: syncFromDate.toISOString(),
        });

        const result = this.createSyncResult();
        let hasNextPage = true;
        let cursor: string | undefined;

        while (hasNextPage) {
          const response = await client.fetchProducts({
            first: Math.min(limit, 50),
            after: cursor,
            fromDate: syncFromDate.toISOString(),
          });

          for (const product of response.products.nodes) {
            try {
              await this.processProduct(product, storeId, result);
            } catch (error) {
              const errorMessage = this.handleItemProcessingError(
                error,
                'Product',
                product.title,
                'process'
              );
              result.errors.push(errorMessage);
            }
          }

          hasNextPage = response.products.pageInfo.hasNextPage;
          cursor = response.products.pageInfo.endCursor;

          if ((result.productsProcessed ?? 0) >= limit) {
            break;
          }

          if (hasNextPage) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        await this.repository.updateStoreLastSync(storeId);
        return result;
      },
      'Products',
      { options }
    );
  }

  private async processProduct(product: ApiProduct, storeId: string, result: SyncResult): Promise<void> {
    const shopifyProductId = extractProductId(product.id);
    const existingProduct = await this.repository.findProductByShopifyId(shopifyProductId);

    const productData = this.mapApiProductToDb(product, storeId);

    let dbProduct;
    if (existingProduct) {
      dbProduct = await this.updateExistingProduct(product, existingProduct.id);
      result.productsUpdated = (result.productsUpdated ?? 0) + 1;
    } else {
      dbProduct = await this.createNewProduct(product, productData);
      result.productsCreated = (result.productsCreated ?? 0) + 1;
    }

    result.productsProcessed = (result.productsProcessed ?? 0) + 1;

    // Process variants if they exist
    if (product.variants?.nodes && product.variants.nodes.length > 0) {
      await this.processProductVariants(product.variants.nodes, dbProduct.id, result);
    }

    // Process collections if they exist
    if (product.collections?.nodes && product.collections.nodes.length > 0) {
      await this.processProductCollections(product.collections.nodes, dbProduct.id, storeId);
    }
  }

  private async createNewProduct(product: ApiProduct, productData: any): Promise<any> {
    return await this.repository.createProduct(productData);
  }

  private async updateExistingProduct(product: ApiProduct, productId: string): Promise<any> {
    const updateData = {
      title: product.title,
      handle: product.handle,
      productType: product.productType || undefined,
      vendor: product.vendor || undefined,
      description: product.description || undefined,
      descriptionHtml: product.descriptionHtml || undefined,
      status: product.status,
      publishedAt: product.publishedAt ? new Date(product.publishedAt) : undefined,
      tags: product.tags ? JSON.stringify(product.tags) : undefined,
      updatedAt: new Date(product.updatedAt),
    };

    const shopifyProductId = extractProductId(product.id);
    return await this.repository.updateProduct(shopifyProductId, updateData);
  }

  private async processProductVariants(variants: ApiVariant[], productId: string, result: SyncResult): Promise<void> {
    // Delete existing variants to avoid conflicts
    await this.repository.deleteVariantsByProductId(productId);

    for (const variant of variants) {
      try {
        const variantData = this.mapApiVariantToDb(variant, productId);
        await this.repository.createVariant(variantData);
        result.variantsProcessed = (result.variantsProcessed ?? 0) + 1;
        result.variantsCreated = (result.variantsCreated ?? 0) + 1;
      } catch (error) {
        const errorMessage = this.handleItemProcessingError(
          error,
          'Variant',
          variant.title,
          'create'
        );
        result.errors.push(errorMessage);
      }
    }
  }

  private async processProductCollections(collections: ApiCollection[], productId: string, storeId: string): Promise<void> {
    // Delete existing product-collection relationships
    await this.repository.deleteProductCollectionsByProductId(productId);

    for (const collection of collections) {
      try {
        // Ensure collection exists
        const shopifyCollectionId = extractCollectionId(collection.id);
        let dbCollection = await this.repository.findCollectionByShopifyId(shopifyCollectionId);

        if (!dbCollection) {
          const collectionData = this.mapApiCollectionToDb(collection, storeId);
          dbCollection = await this.repository.createCollection(collectionData);
        }

        // Create product-collection relationship
        await this.repository.createProductCollection(productId, dbCollection.id);
      } catch (error) {
        // Log but don't throw - collection relationships are not critical
        this.logger.warn('Failed to process product collection relationship', {
          productId,
          collectionId: collection.id,
          collectionTitle: collection.title,
          error: error instanceof Error ? error : new Error(String(error)),
          operation: 'createProductCollection'
        });
      }
    }
  }

  private mapApiProductToDb(product: ApiProduct, storeId: string) {
    return {
      shopifyProductId: extractProductId(product.id),
      legacyResourceId: product.legacyResourceId,
      title: product.title,
      handle: product.handle,
      productType: product.productType || null,
      vendor: product.vendor || null,
      description: product.description || null,
      descriptionHtml: product.descriptionHtml || null,
      status: product.status,
      publishedAt: product.publishedAt ? new Date(product.publishedAt) : null,
      tags: product.tags ? JSON.stringify(product.tags) : null,
      createdAt: new Date(product.createdAt),
      updatedAt: new Date(product.updatedAt),
      storeId,
    };
  }

  private mapApiVariantToDb(variant: ApiVariant, productId: string) {
    return {
      shopifyVariantId: extractVariantId(variant.id),
      legacyResourceId: variant.legacyResourceId,
      title: variant.title,
      sku: variant.sku || undefined,
      barcode: variant.barcode || undefined,
      position: variant.position,
      price: new Decimal(variant.price),
      compareAtPrice: variant.compareAtPrice ? new Decimal(variant.compareAtPrice) : undefined,
      inventoryQuantity: variant.inventoryQuantity || undefined,
      availableForSale: variant.availableForSale,
      inventoryPolicy: variant.inventoryPolicy,
      taxable: variant.taxable,
      createdAt: new Date(variant.createdAt),
      updatedAt: new Date(variant.updatedAt),
      productId,
    };
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