import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { ShopifyClient } from "./shopify.client";
import { ShopifyRepository } from "./shopify.repository";
import {
  SyncOptions,
  SyncResult,
  ShopifyOrder as ApiOrder,
  ShopifyLineItem as ApiLineItem,
  ShopifyProduct as ApiProduct,
  ShopifyProductVariant as ApiVariant,
  ShopifyCollection as ApiCollection,
} from "./shopify.types";
import { AppError } from "../../common/errors";
import {
  ShopifyStoreError,
  ShopifySyncError,
  ShopifyApiError,
  ShopifyRateLimitError,
} from "./shopify.errors";
import { createLogger } from "../../common/logger";
import { extractOrderId, extractProductId, extractVariantId, extractCollectionId } from "./utils/shopify-gid.utils";

export class ShopifySyncService {
  private repository: ShopifyRepository;
  private logger = createLogger("ShopifySyncService");

  constructor(private prisma: PrismaClient) {
    this.repository = new ShopifyRepository(prisma);
  }

  async syncOrders(options: SyncOptions): Promise<SyncResult> {
    const { storeId, fromDate, limit = 50 } = options;

    return this.logger.time(
      "syncOrders",
      async () => {
        this.logger.info("Starting Shopify sync", { storeId, fromDate, limit });

        const store = await this.repository.findStoreById(storeId);
        if (!store) {
          throw new ShopifyStoreError(`Store not found: ${storeId}`);
        }

        const client = new ShopifyClient(store.shopDomain, store.accessToken);

        const syncFromDate =
          fromDate ||
          store.lastSyncAt ||
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        this.logger.debug("Sync date calculated", {
          providedFromDate: fromDate,
          storeLastSync: store.lastSyncAt,
          finalSyncFromDate: syncFromDate,
          syncFromDateISO: syncFromDate.toISOString(),
        });

        const result: SyncResult = {
          ordersProcessed: 0,
          ordersCreated: 0,
          ordersUpdated: 0,
          errors: [],
        };

        try {
          let hasNextPage = true;
          let cursor: string | undefined;

          while (hasNextPage) {
            this.logger.debug("Fetching orders from Shopify API", {
              first: Math.min(limit, 50),
              after: cursor,
              fromDate: syncFromDate.toISOString(),
              page: Math.floor(result.ordersProcessed / 50) + 1,
            });

            const response = await client.fetchOrders({
              first: Math.min(limit, 50),
              after: cursor,
              fromDate: syncFromDate.toISOString(),
            });

            this.logger.debug("API response received", {
              ordersCount: response.orders.nodes.length,
              hasNextPage: response.orders.pageInfo.hasNextPage,
              endCursor: response.orders.pageInfo.endCursor,
            });

            for (const order of response.orders.nodes) {
              try {
                await this.processOrder(order, storeId);
                result.ordersProcessed++;

                const existingOrder =
                  await this.repository.findOrderByShopifyId(extractOrderId(order.id));
                if (existingOrder) {
                  result.ordersUpdated++;
                } else {
                  result.ordersCreated++;
                }
              } catch (error) {
                const errorMessage =
                  error instanceof Error ? error.message : "Unknown error";
                result.errors.push(`Order ${order.name}: ${errorMessage}`);
              }
            }

            hasNextPage = response.orders.pageInfo.hasNextPage;
            cursor = response.orders.pageInfo.endCursor;

            this.logger.debug("Page completed", {
              ordersProcessedThisPage: response.orders.nodes.length,
              totalOrdersProcessed: result.ordersProcessed,
              limit: limit,
              hasNextPage: hasNextPage,
            });

            if (result.ordersProcessed >= limit) {
              this.logger.info("Limit reached, stopping sync", {
                limit,
                processed: result.ordersProcessed,
              });
              break;
            }

            // Rate limiting: Wait 1 second between API calls to avoid throttling
            if (hasNextPage) {
              this.logger.debug("Waiting to avoid rate limiting", {
                delayMs: 1000,
              });
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }

          this.logger.info("Sync completed successfully", { result });
          await this.repository.updateStoreLastSync(storeId);
        } catch (error) {
          this.logger.error("Sync operation failed", {
            error: error instanceof Error ? error : new Error(String(error)),
            storeId,
            partialResult: result,
          });

          // Handle specific Shopify errors
          if (error instanceof ShopifyRateLimitError) {
            throw new ShopifySyncError(
              `Sync failed due to rate limiting: ${error.message}`,
              result
            );
          }

          if (error instanceof ShopifyApiError) {
            throw new ShopifySyncError(
              `Sync failed due to API error: ${error.message}`,
              result
            );
          }

          // Generic sync error
          const errorMessage =
            error instanceof Error ? error.message : "Unknown sync error";
          throw new ShopifySyncError(
            `Sync operation failed: ${errorMessage}`,
            result
          );
        }

        return result;
      },
      { storeId, fromDate, limit }
    );
  }

  async syncProducts(options: SyncOptions): Promise<SyncResult> {
    const { storeId, fromDate, limit = 50 } = options;

    return this.logger.time(
      "syncProducts",
      async () => {
        this.logger.info("Starting Shopify product sync", { storeId, fromDate, limit });

        const store = await this.repository.findStoreById(storeId);
        if (!store) {
          throw new ShopifyStoreError(`Store not found: ${storeId}`);
        }

        const client = new ShopifyClient(store.shopDomain, store.accessToken);
        const syncFromDate = fromDate || store.lastSyncAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const result: SyncResult = {
          ordersProcessed: 0,
          ordersCreated: 0,
          ordersUpdated: 0,
          productsProcessed: 0,
          productsCreated: 0,
          productsUpdated: 0,
          variantsProcessed: 0,
          variantsCreated: 0,
          variantsUpdated: 0,
          errors: [],
        };

        try {
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
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                result.errors.push(`Product ${product.title}: ${errorMessage}`);
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

          this.logger.info("Product sync completed successfully", { result });
          await this.repository.updateStoreLastSync(storeId);
        } catch (error) {
          this.logger.error("Product sync operation failed", { error: error instanceof Error ? error : new Error(String(error)), storeId, partialResult: result });
          const errorMessage = error instanceof Error ? error.message : "Unknown sync error";
          throw new ShopifySyncError(`Product sync operation failed: ${errorMessage}`, result);
        }

        return result;
      },
      { storeId, fromDate, limit }
    );
  }

  async syncCollections(options: SyncOptions): Promise<SyncResult> {
    const { storeId, fromDate, limit = 50 } = options;

    return this.logger.time(
      "syncCollections",
      async () => {
        this.logger.info("Starting Shopify collection sync", { storeId, fromDate, limit });

        const store = await this.repository.findStoreById(storeId);
        if (!store) {
          throw new ShopifyStoreError(`Store not found: ${storeId}`);
        }

        const client = new ShopifyClient(store.shopDomain, store.accessToken);
        const syncFromDate = fromDate || store.lastSyncAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const result: SyncResult = {
          ordersProcessed: 0,
          ordersCreated: 0,
          ordersUpdated: 0,
          collectionsProcessed: 0,
          collectionsCreated: 0,
          collectionsUpdated: 0,
          errors: [],
        };

        try {
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
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                result.errors.push(`Collection ${collection.title}: ${errorMessage}`);
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

          this.logger.info("Collection sync completed successfully", { result });
          await this.repository.updateStoreLastSync(storeId);
        } catch (error) {
          this.logger.error("Collection sync operation failed", { error: error instanceof Error ? error : new Error(String(error)), storeId, partialResult: result });
          const errorMessage = error instanceof Error ? error.message : "Unknown sync error";
          throw new ShopifySyncError(`Collection sync operation failed: ${errorMessage}`, result);
        }

        return result;
      },
      { storeId, fromDate, limit }
    );
  }

  private async processOrder(
    apiOrder: ApiOrder,
    storeId: string
  ): Promise<void> {
    const existingOrder = await this.repository.findOrderByShopifyId(
      extractOrderId(apiOrder.id) // Use clean ID for lookup
    );

    const orderData = this.mapApiOrderToDb(apiOrder, storeId);

    if (existingOrder) {
      await this.updateExistingOrder(apiOrder, existingOrder.id);
    } else {
      await this.createNewOrder(apiOrder, orderData);
    }
  }

  private async createNewOrder(
    apiOrder: ApiOrder,
    orderData: any
  ): Promise<void> {
    const dbOrder = await this.repository.createOrder(orderData);

    const lineItemsData = await Promise.all(
      apiOrder.lineItems.nodes.map((lineItem) =>
        this.mapApiLineItemToDb(lineItem, dbOrder.id)
      )
    );

    if (lineItemsData.length > 0) {
      await this.repository.createLineItems(lineItemsData);
    }
  }

  private async updateExistingOrder(
    apiOrder: ApiOrder,
    orderId: string
  ): Promise<void> {
    const updateData = {
      displayFinancialStatus: apiOrder.displayFinancialStatus,
      displayFulfillmentStatus: apiOrder.displayFulfillmentStatus,
      confirmed: apiOrder.confirmed,
      closed: apiOrder.closed,
      cancelledAt: apiOrder.cancelledAt ? new Date(apiOrder.cancelledAt) : null,
      cancelReason: apiOrder.cancelReason || null,
      currentTotalPriceAmount: new Decimal(
        apiOrder.currentTotalPriceSet.shopMoney.amount
      ),
      currentTotalPricePresentmentAmount: apiOrder.currentTotalPriceSet
        .presentmentMoney.amount
        ? new Decimal(apiOrder.currentTotalPriceSet.presentmentMoney.amount)
        : null,
      currentSubtotalPriceAmount: new Decimal(
        apiOrder.currentSubtotalPriceSet.shopMoney.amount
      ),
      currentSubtotalPricePresentmentAmount: apiOrder.currentSubtotalPriceSet
        .presentmentMoney.amount
        ? new Decimal(apiOrder.currentSubtotalPriceSet.presentmentMoney.amount)
        : null,
      currentTotalTaxAmount: apiOrder.currentTotalTaxSet?.shopMoney.amount
        ? new Decimal(apiOrder.currentTotalTaxSet.shopMoney.amount)
        : null,
      currentTotalTaxPresentmentAmount: apiOrder.currentTotalTaxSet
        ?.presentmentMoney.amount
        ? new Decimal(apiOrder.currentTotalTaxSet.presentmentMoney.amount)
        : null,
    };

    await this.repository.updateOrder(extractOrderId(apiOrder.id), updateData);

    await this.repository.deleteLineItemsByOrderId(orderId);

    const lineItemsData = await Promise.all(
      apiOrder.lineItems.nodes.map((lineItem) =>
        this.mapApiLineItemToDb(lineItem, orderId)
      )
    );

    if (lineItemsData.length > 0) {
      await this.repository.createLineItems(lineItemsData);
    }
  }

  private mapApiOrderToDb(apiOrder: ApiOrder, storeId: string) {
    // Extract order number from name field (Shopify GraphQL limitation)
    // Examples: "#1234" → 1234, "SW-#1298" → 1298, "EN1001" → 1001
    const numberMatch = apiOrder.name.match(/\d+/);
    const orderNumber = numberMatch ? parseInt(numberMatch[0]) : 0;

    return {
      shopifyOrderId: extractOrderId(apiOrder.id), // Extract clean ID from GID format
      legacyResourceId: apiOrder.legacyResourceId,
      number: orderNumber, // Parsed from name due to GraphQL API limitation
      name: apiOrder.name,
      currencyCode: apiOrder.currencyCode,
      presentmentCurrencyCode: apiOrder.presentmentCurrencyCode,
      email: apiOrder.email,
      phone: apiOrder.phone,
      customerAcceptsMarketing: false,
      currentTotalPriceAmount: new Decimal(
        apiOrder.currentTotalPriceSet.shopMoney.amount
      ),
      currentTotalPricePresentmentAmount: apiOrder.currentTotalPriceSet
        .presentmentMoney.amount
        ? new Decimal(apiOrder.currentTotalPriceSet.presentmentMoney.amount)
        : undefined,
      currentSubtotalPriceAmount: new Decimal(
        apiOrder.currentSubtotalPriceSet.shopMoney.amount
      ),
      currentSubtotalPricePresentmentAmount: apiOrder.currentSubtotalPriceSet
        .presentmentMoney.amount
        ? new Decimal(apiOrder.currentSubtotalPriceSet.presentmentMoney.amount)
        : undefined,
      currentTotalTaxAmount: apiOrder.currentTotalTaxSet?.shopMoney.amount
        ? new Decimal(apiOrder.currentTotalTaxSet.shopMoney.amount)
        : undefined,
      currentTotalTaxPresentmentAmount: apiOrder.currentTotalTaxSet
        ?.presentmentMoney.amount
        ? new Decimal(apiOrder.currentTotalTaxSet.presentmentMoney.amount)
        : undefined,
      displayFinancialStatus: apiOrder.displayFinancialStatus,
      displayFulfillmentStatus: apiOrder.displayFulfillmentStatus,
      confirmed: apiOrder.confirmed,
      closed: apiOrder.closed,
      cancelledAt: apiOrder.cancelledAt
        ? new Date(apiOrder.cancelledAt)
        : undefined,
      cancelReason: apiOrder.cancelReason,
      taxesIncluded: apiOrder.taxesIncluded,
      test: apiOrder.test,
      createdAt: new Date(apiOrder.createdAt),
      processedAt: new Date(apiOrder.processedAt),
      storeId,
    };
  }

  private async mapApiLineItemToDb(apiLineItem: ApiLineItem, orderId: string) {
    // Look up internal product variant by Shopify variant ID
    let productVariantId: string | undefined;
    if (apiLineItem.variant?.id) {
      const shopifyVariantId = extractVariantId(apiLineItem.variant.id);
      const internalVariant = await this.repository.findVariantByShopifyId(shopifyVariantId);
      productVariantId = internalVariant?.id;
    }

    return {
      shopifyLineItemId: apiLineItem.id,
      name: apiLineItem.name,
      variantTitle: apiLineItem.variantTitle,
      productId: apiLineItem.product?.id,
      variantId: apiLineItem.variant?.id,
      sku: apiLineItem.sku,
      quantity: apiLineItem.quantity,
      currentQuantity: apiLineItem.currentQuantity,
      originalUnitPriceAmount: new Decimal(
        apiLineItem.originalUnitPriceSet.shopMoney.amount
      ),
      originalUnitPricePresentmentAmount: apiLineItem.originalUnitPriceSet
        .presentmentMoney.amount
        ? new Decimal(apiLineItem.originalUnitPriceSet.presentmentMoney.amount)
        : undefined,
      originalTotalPriceAmount: new Decimal(
        apiLineItem.originalTotalSet.shopMoney.amount
      ),
      originalTotalPricePresentmentAmount: apiLineItem.originalTotalSet
        .presentmentMoney.amount
        ? new Decimal(apiLineItem.originalTotalSet.presentmentMoney.amount)
        : undefined,
      requiresShipping: apiLineItem.requiresShipping,
      orderId,
      productVariantId, // ✅ Now linking to internal variant!
    };
  }

  async testStoreConnection(storeId: string): Promise<boolean> {
    return this.logger.time(
      "testStoreConnection",
      async () => {
        this.logger.debug("Testing store connection", { storeId });

        const store = await this.repository.findStoreById(storeId);
        if (!store) {
          this.logger.warn("Store not found for connection test", { storeId });
          return false;
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
      { storeId }
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
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Variant ${variant.title}: ${errorMessage}`);
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
        this.logger.warn('Failed to process product collection', {
          productId,
          collectionId: collection.id,
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    }
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
