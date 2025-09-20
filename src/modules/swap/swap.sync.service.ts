import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { SwapClient } from "./swap.client";
import { SwapRepository } from "./swap.repository";
import {
  SwapSyncOptions,
  SwapSyncResult,
  SwapReturn as ApiReturn,
} from "./swap.types";
import { AppError } from "../../common/errors";
import {
  SwapStoreError,
  SwapSyncError,
  SwapApiError,
  SwapRateLimitError,
} from "./swap.errors";
import { createLogger } from "../../common/logger";

export class SwapSyncService {
  private repository: SwapRepository;
  private logger = createLogger("SwapSyncService");

  constructor(private prisma: PrismaClient) {
    this.repository = new SwapRepository(prisma);
  }

  async syncReturns(options: SwapSyncOptions): Promise<SwapSyncResult> {
    const { storeId, fromDate, toDate, lastUpdatedDate, limit } = options;

    return this.logger.time(
      "syncReturns",
      async () => {
        this.logger.info("Starting SWAP sync", {
          storeId,
          fromDate,
          toDate,
          lastUpdatedDate,
          limit,
        });

        const store = await this.repository.findStoreById(storeId);
        if (!store) {
          throw new SwapStoreError(`Store not found: ${storeId}`);
        }

        const client = new SwapClient(store.apiKey);

        // Calculate sync date range
        // Use exact date that works in debug route
        const debugRouteFromDate = new Date("2024-01-01T00:00:00.000Z");
        const syncFromDate =
          fromDate || lastUpdatedDate || store.lastSyncAt || debugRouteFromDate;
        const syncToDate = toDate || new Date();


        const result: SwapSyncResult = {
          returnsProcessed: 0,
          returnsCreated: 0,
          returnsUpdated: 0,
          errors: [],
        };

        try {
          let hasNextPage = true;
          let currentPage = 1;

          while (hasNextPage) {

            const response = await client.fetchReturns({
              store: store.swapStoreId,
              fromDate: syncFromDate.toISOString().replace(".000Z", "Z"),
              toDate: syncToDate.toISOString().replace(".000Z", "Z"),
              page: currentPage,
              itemsPerPage: limit ? Math.min(limit, 50) : 50,
              version: 1,
            });


            for (const returnData of response.orders) {
              try {
                await this.processReturn(returnData, storeId);
                result.returnsProcessed++;

                const existingReturn = await this.repository.findReturnBySwapId(
                  returnData.return_id
                );
                if (existingReturn) {
                  result.returnsUpdated++;
                } else {
                  result.returnsCreated++;
                }
              } catch (error) {
                const errorMessage =
                  error instanceof Error ? error.message : "Unknown error";
                result.errors.push(`Return ${returnData.rma}: ${errorMessage}`);
              }
            }

            hasNextPage = response.pagination.has_next_page;
            currentPage++;


            if (limit && result.returnsProcessed >= limit) {
              this.logger.info("Limit reached, stopping sync", {
                limit,
                processed: result.returnsProcessed,
              });
              break;
            }

            // Rate limiting: Wait 1 second between API calls to avoid throttling
            if (hasNextPage) {
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

          // Handle specific SWAP errors
          if (error instanceof SwapRateLimitError) {
            throw new SwapSyncError(
              `Sync failed due to rate limiting: ${error.message}`,
              result
            );
          }

          if (error instanceof SwapApiError) {
            throw new SwapSyncError(
              `Sync failed due to API error: ${error.message}`,
              result
            );
          }

          // Generic sync error
          const errorMessage =
            error instanceof Error ? error.message : "Unknown sync error";
          throw new SwapSyncError(
            `Sync operation failed: ${errorMessage}`,
            result
          );
        }

        return result;
      },
      { storeId, fromDate, toDate, limit }
    );
  }

  private async processReturn(
    apiReturn: ApiReturn,
    storeId: string
  ): Promise<void> {
    const existingReturn = await this.repository.findReturnBySwapId(
      apiReturn.return_id
    );

    // Helper to safely convert strings to Decimal
    const toDecimal = (
      value: number | string | undefined
    ): Decimal | undefined => {
      if (value === undefined || value === null) return undefined;
      return new Decimal(value.toString());
    };

    // Helper to safely parse dates
    const parseDate = (dateString: string): Date => {
      return new Date(dateString);
    };

    // Try to link to Shopify order if order_id is provided
    let shopifyOrderId: string | undefined;
    if (apiReturn.order_id) {
      // Try to find matching Shopify order by original order ID
      const shopifyOrder = await this.prisma.shopifyOrder.findFirst({
        where: {
          OR: [
            { legacyResourceId: apiReturn.order_id },
            { name: apiReturn.order_id }, // Sometimes order_id might be the order name
          ],
        },
      });
      shopifyOrderId = shopifyOrder?.id;
    }

    const returnData = {
      swapReturnId: apiReturn.return_id,
      orderName: apiReturn.order_name,
      orderId: apiReturn.order_id,
      rma: apiReturn.rma,
      shopifyOrderId,
      storeId,

      // Return Classification
      typeString: apiReturn.type_string,
      type: Array.isArray(apiReturn.type)
        ? JSON.stringify(apiReturn.type)
        : apiReturn.type_string,
      status: apiReturn.return_status,
      shippingStatus: apiReturn.delivery_status,

      // Financial Information - all required in schema
      total: toDecimal(apiReturn.total) || new Decimal(0),
      handlingFee: toDecimal(apiReturn.handling_fee) || new Decimal(0),
      shopNowRevenue: toDecimal(apiReturn.shop_now_revenue) || new Decimal(0),
      shopLaterRevenue:
        toDecimal(apiReturn.shop_later_revenue) || new Decimal(0),
      exchangeRevenue: toDecimal(apiReturn.exchange_revenue) || new Decimal(0),
      refundRevenue: toDecimal(apiReturn.refund_revenue) || new Decimal(0),
      totalAdditionalPayment:
        toDecimal(apiReturn.total_additional_payment) || new Decimal(0),
      totalCreditExchangeValue:
        toDecimal(apiReturn.total_credit_exchange_value) || new Decimal(0),
      totalRefundValueCustomerCurrency:
        toDecimal(apiReturn.total_refund_value_customer_currency) ||
        new Decimal(0),

      // Customer Information
      customerName: apiReturn.customer_name,
      customerCurrency: apiReturn.customer_currency,

      // Tax Information
      totalTax: apiReturn.tax_information?.total_tax
        ? toDecimal(apiReturn.tax_information.total_tax)
        : undefined,
      totalDuty: apiReturn.tax_information?.total_duty
        ? toDecimal(apiReturn.tax_information.total_duty)
        : undefined,
      taxCurrency: apiReturn.tax_information?.currency,

      // Timestamps
      dateCreated: parseDate(apiReturn.date_created),
      dateUpdated: parseDate(apiReturn.date_updated),
    };

    let savedReturn;
    if (existingReturn) {
      // Update existing return
      savedReturn = await this.repository.updateReturn(
        apiReturn.return_id,
        returnData
      );
    } else {
      // Create new return
      savedReturn = await this.repository.createReturn(returnData);
    }

    // Process products (SWAP API uses products, not line_items)
    if (apiReturn.products) {
      for (const product of apiReturn.products) {
        await this.processProduct(product, savedReturn.id);
      }
    }

    // Process return reasons
    if (apiReturn.return_reasons) {
      for (const reason of apiReturn.return_reasons) {
        await this.processReturnReason(reason, savedReturn.id);
      }
    }
  }

  private async processProduct(
    apiProduct: any,
    returnId: string
  ): Promise<void> {
    const productData = {
      productId: apiProduct.product_id,
      shopifyProductId: apiProduct.shopify_product_id,
      productName: apiProduct.product_name,
      sku: apiProduct.sku,
      itemCount: apiProduct.item_count,
      cost: new Decimal(apiProduct.cost.toString()),
      returnType: apiProduct.return_type,
      returnId,
    };

    // For now, create new products each time (can optimize later with upsert)
    await this.prisma.swapProduct.create({
      data: productData,
    });
  }

  private async processReturnReason(
    apiReason: any,
    returnId: string
  ): Promise<void> {
    const reasonData = {
      reason: apiReason.reason,
      itemCount: apiReason.item_count,
      returnId,
    };

    // For now, create new reasons each time (can optimize later with upsert)
    await this.prisma.swapReturnReason.create({
      data: reasonData,
    });
  }

  async testStoreConnection(storeId: string): Promise<boolean> {
    return this.logger.time(
      "testStoreConnection",
      async () => {

        const store = await this.repository.findStoreById(storeId);
        if (!store) {
          this.logger.warn("Store not found for connection test", { storeId });
          return false;
        }

        const client = new SwapClient(store.apiKey);
        const isConnected = await client.testConnection(store.swapStoreId);

        this.logger.info("Store connection test completed", {
          storeId,
          swapStoreId: store.swapStoreId,
          connected: isConnected,
        });

        return isConnected;
      },
      { storeId }
    );
  }
}
