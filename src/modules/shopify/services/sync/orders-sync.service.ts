import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { ShopifyClient } from "../../clients/shopify.client";
import {
  SyncOptions,
  SyncResult,
  ShopifyOrder as ApiOrder,
  ShopifyLineItem as ApiLineItem,
} from "../../shopify.types";
import {
  ShopifyStoreError,
} from "../../shopify.errors";
import { extractOrderId, extractVariantId } from "../../utils/shopify-gid.utils";
import { BaseSyncService } from "./base-sync.service";

export class OrdersSyncService extends BaseSyncService {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async syncOrders(options: SyncOptions): Promise<SyncResult> {
    return this.executeSyncOperation(
      async () => {
        this.validateSyncOptionsWithStore(options);
        const { storeId, fromDate, limit = 50 } = options;

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

        const result = this.createSyncResult();
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
              const errorMessage = this.handleItemProcessingError(
                error,
                'Order',
                order.name,
                'process'
              );
              result.errors.push(errorMessage);
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

        await this.repository.updateStoreLastSync(storeId);
        return result;
      },
      'Orders',
      { options }
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
}