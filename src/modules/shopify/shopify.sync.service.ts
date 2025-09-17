import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ShopifyClient } from './shopify.client';
import { ShopifyRepository } from './shopify.repository';
import { SyncOptions, SyncResult, ShopifyOrder as ApiOrder, ShopifyLineItem as ApiLineItem } from './shopify.types';
import { AppError } from '../../common/errors';

export class ShopifySyncService {
  private repository: ShopifyRepository;

  constructor(private prisma: PrismaClient) {
    this.repository = new ShopifyRepository(prisma);
  }

  async syncOrders(options: SyncOptions): Promise<SyncResult> {
    const { storeId, since, limit = 50 } = options;

    const store = await this.repository.findStoreById(storeId);
    if (!store) {
      throw new AppError('Store not found', 404);
    }

    const client = new ShopifyClient(store.shopDomain, store.accessToken);

    const syncSince = since || store.lastSyncAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

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
        const response = await client.fetchOrders({
          first: Math.min(limit, 50),
          after: cursor,
          since: syncSince.toISOString(),
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

        if (result.ordersProcessed >= limit) {
          break;
        }
      }

      await this.repository.updateStoreLastSync(storeId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      result.errors.push(`Sync failed: ${errorMessage}`);
    }

    return result;
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
    return {
      shopifyOrderId: apiOrder.id,
      legacyResourceId: apiOrder.legacyResourceId,
      number: parseInt(apiOrder.name.replace('#', '')),
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
    const store = await this.repository.findStoreById(storeId);
    if (!store) {
      return false;
    }

    const client = new ShopifyClient(store.shopDomain, store.accessToken);
    return client.testConnection();
  }
}