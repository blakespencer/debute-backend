import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ShopifyClient } from './shopify.client';
import { ShopifyRepository } from './shopify.repository';
import { SyncOptions, SyncResult, ShopifyOrder as ApiOrder, ShopifyLineItem as ApiLineItem } from './shopify.types';
import { AppError } from '../../common/errors';
import {
  ShopifyStoreError,
  ShopifySyncError,
  ShopifyApiError,
  ShopifyRateLimitError
} from './shopify.errors';
import { createLogger } from '../../common/logger';

export class ShopifySyncService {
  private repository: ShopifyRepository;
  private logger = createLogger('ShopifySyncService');

  constructor(private prisma: PrismaClient) {
    this.repository = new ShopifyRepository(prisma);
  }

  async syncOrders(options: SyncOptions): Promise<SyncResult> {
    const { storeId, since, limit = 50 } = options;

    return this.logger.time('syncOrders', async () => {
      this.logger.info('Starting Shopify sync', { storeId, since, limit });

      const store = await this.repository.findStoreById(storeId);
      if (!store) {
        throw new ShopifyStoreError(`Store not found: ${storeId}`);
      }

      const client = new ShopifyClient(store.shopDomain, store.accessToken);

      const syncSince = since || store.lastSyncAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      this.logger.debug('Sync date calculated', {
        providedSince: since,
        storeLastSync: store.lastSyncAt,
        finalSyncSince: syncSince,
        syncSinceISO: syncSince.toISOString()
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
          this.logger.debug('Fetching orders from Shopify API', {
            first: Math.min(limit, 50),
            after: cursor,
            since: syncSince.toISOString(),
            page: Math.floor(result.ordersProcessed / 50) + 1
          });

          const response = await client.fetchOrders({
            first: Math.min(limit, 50),
            after: cursor,
            since: syncSince.toISOString(),
          });

          this.logger.debug('API response received', {
            ordersCount: response.orders.nodes.length,
            hasNextPage: response.orders.pageInfo.hasNextPage,
            endCursor: response.orders.pageInfo.endCursor
          });

        for (const order of response.orders.nodes) {
          try {
            await this.processOrder(order, storeId);
            result.ordersProcessed++;

            const existingOrder = await this.repository.findOrderByShopifyId(order.id);
            if (existingOrder) {
              result.ordersUpdated++;
            } else {
              result.ordersCreated++;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.errors.push(`Order ${order.name}: ${errorMessage}`);
          }
        }

          hasNextPage = response.orders.pageInfo.hasNextPage;
          cursor = response.orders.pageInfo.endCursor;

          this.logger.debug('Page completed', {
            ordersProcessedThisPage: response.orders.nodes.length,
            totalOrdersProcessed: result.ordersProcessed,
            limit: limit,
            hasNextPage: hasNextPage
          });

          if (result.ordersProcessed >= limit) {
            this.logger.info('Limit reached, stopping sync', { limit, processed: result.ordersProcessed });
            break;
          }

          // Rate limiting: Wait 1 second between API calls to avoid throttling
          if (hasNextPage) {
            this.logger.debug('Waiting to avoid rate limiting', { delayMs: 1000 });
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        this.logger.info('Sync completed successfully', { result });
        await this.repository.updateStoreLastSync(storeId);

      } catch (error) {
        this.logger.error('Sync operation failed', {
          error: error instanceof Error ? error : new Error(String(error)),
          storeId,
          partialResult: result
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
        throw new ShopifySyncError(`Sync operation failed: ${errorMessage}`, result);
      }

      return result;
    }, { storeId, since, limit });
  }

  private async processOrder(apiOrder: ApiOrder, storeId: string): Promise<void> {
    const existingOrder = await this.repository.findOrderByShopifyId(apiOrder.id);

    const orderData = this.mapApiOrderToDb(apiOrder, storeId);

    if (existingOrder) {
      await this.updateExistingOrder(apiOrder, existingOrder.id);
    } else {
      await this.createNewOrder(apiOrder, orderData);
    }
  }

  private async createNewOrder(apiOrder: ApiOrder, orderData: any): Promise<void> {
    const dbOrder = await this.repository.createOrder(orderData);

    const lineItemsData = apiOrder.lineItems.nodes.map(lineItem =>
      this.mapApiLineItemToDb(lineItem, dbOrder.id)
    );

    if (lineItemsData.length > 0) {
      await this.repository.createLineItems(lineItemsData);
    }
  }

  private async updateExistingOrder(apiOrder: ApiOrder, orderId: string): Promise<void> {
    const updateData = {
      displayFinancialStatus: apiOrder.displayFinancialStatus,
      displayFulfillmentStatus: apiOrder.displayFulfillmentStatus,
      confirmed: apiOrder.confirmed,
      closed: apiOrder.closed,
      cancelledAt: apiOrder.cancelledAt ? new Date(apiOrder.cancelledAt) : null,
      cancelReason: apiOrder.cancelReason || null,
      currentTotalPriceAmount: new Decimal(apiOrder.currentTotalPriceSet.shopMoney.amount),
      currentTotalPricePresentmentAmount: apiOrder.currentTotalPriceSet.presentmentMoney.amount
        ? new Decimal(apiOrder.currentTotalPriceSet.presentmentMoney.amount)
        : null,
      currentSubtotalPriceAmount: new Decimal(apiOrder.currentSubtotalPriceSet.shopMoney.amount),
      currentSubtotalPricePresentmentAmount: apiOrder.currentSubtotalPriceSet.presentmentMoney.amount
        ? new Decimal(apiOrder.currentSubtotalPriceSet.presentmentMoney.amount)
        : null,
      currentTotalTaxAmount: apiOrder.currentTotalTaxSet?.shopMoney.amount
        ? new Decimal(apiOrder.currentTotalTaxSet.shopMoney.amount)
        : null,
      currentTotalTaxPresentmentAmount: apiOrder.currentTotalTaxSet?.presentmentMoney.amount
        ? new Decimal(apiOrder.currentTotalTaxSet.presentmentMoney.amount)
        : null,
    };

    await this.repository.updateOrder(apiOrder.id, updateData);

    await this.repository.deleteLineItemsByOrderId(orderId);

    const lineItemsData = apiOrder.lineItems.nodes.map(lineItem =>
      this.mapApiLineItemToDb(lineItem, orderId)
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
      shopifyOrderId: apiOrder.id,
      legacyResourceId: apiOrder.legacyResourceId,
      number: orderNumber, // Parsed from name due to GraphQL API limitation
      name: apiOrder.name,
      currencyCode: apiOrder.currencyCode,
      presentmentCurrencyCode: apiOrder.presentmentCurrencyCode,
      email: apiOrder.email,
      phone: apiOrder.phone,
      customerAcceptsMarketing: false,
      currentTotalPriceAmount: new Decimal(apiOrder.currentTotalPriceSet.shopMoney.amount),
      currentTotalPricePresentmentAmount: apiOrder.currentTotalPriceSet.presentmentMoney.amount
        ? new Decimal(apiOrder.currentTotalPriceSet.presentmentMoney.amount)
        : undefined,
      currentSubtotalPriceAmount: new Decimal(apiOrder.currentSubtotalPriceSet.shopMoney.amount),
      currentSubtotalPricePresentmentAmount: apiOrder.currentSubtotalPriceSet.presentmentMoney.amount
        ? new Decimal(apiOrder.currentSubtotalPriceSet.presentmentMoney.amount)
        : undefined,
      currentTotalTaxAmount: apiOrder.currentTotalTaxSet?.shopMoney.amount
        ? new Decimal(apiOrder.currentTotalTaxSet.shopMoney.amount)
        : undefined,
      currentTotalTaxPresentmentAmount: apiOrder.currentTotalTaxSet?.presentmentMoney.amount
        ? new Decimal(apiOrder.currentTotalTaxSet.presentmentMoney.amount)
        : undefined,
      displayFinancialStatus: apiOrder.displayFinancialStatus,
      displayFulfillmentStatus: apiOrder.displayFulfillmentStatus,
      confirmed: apiOrder.confirmed,
      closed: apiOrder.closed,
      cancelledAt: apiOrder.cancelledAt ? new Date(apiOrder.cancelledAt) : undefined,
      cancelReason: apiOrder.cancelReason,
      taxesIncluded: apiOrder.taxesIncluded,
      test: apiOrder.test,
      createdAt: new Date(apiOrder.createdAt),
      processedAt: new Date(apiOrder.processedAt),
      storeId,
    };
  }

  private mapApiLineItemToDb(apiLineItem: ApiLineItem, orderId: string) {
    return {
      shopifyLineItemId: apiLineItem.id,
      name: apiLineItem.name,
      variantTitle: apiLineItem.variantTitle,
      productId: apiLineItem.product?.id,
      variantId: apiLineItem.variant?.id,
      sku: apiLineItem.sku,
      quantity: apiLineItem.quantity,
      currentQuantity: apiLineItem.currentQuantity,
      originalUnitPriceAmount: new Decimal(apiLineItem.originalUnitPriceSet.shopMoney.amount),
      originalUnitPricePresentmentAmount: apiLineItem.originalUnitPriceSet.presentmentMoney.amount
        ? new Decimal(apiLineItem.originalUnitPriceSet.presentmentMoney.amount)
        : undefined,
      originalTotalPriceAmount: new Decimal(apiLineItem.originalTotalSet.shopMoney.amount),
      originalTotalPricePresentmentAmount: apiLineItem.originalTotalSet.presentmentMoney.amount
        ? new Decimal(apiLineItem.originalTotalSet.presentmentMoney.amount)
        : undefined,
      requiresShipping: apiLineItem.requiresShipping,
      orderId,
    };
  }

  async testStoreConnection(storeId: string): Promise<boolean> {
    return this.logger.time('testStoreConnection', async () => {
      this.logger.debug('Testing store connection', { storeId });

      const store = await this.repository.findStoreById(storeId);
      if (!store) {
        this.logger.warn('Store not found for connection test', { storeId });
        return false;
      }

      const client = new ShopifyClient(store.shopDomain, store.accessToken);
      const isConnected = await client.testConnection();

      this.logger.info('Store connection test completed', {
        storeId,
        shopDomain: store.shopDomain,
        connected: isConnected
      });

      return isConnected;
    }, { storeId });
  }
}