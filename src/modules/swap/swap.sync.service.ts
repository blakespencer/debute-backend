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
import { parseSwapDates, parseSwapDate } from "./utils/swap-date.utils";
import {
  extractDenormalizedAddresses,
  createNormalizedAddresses
} from "./utils/swap-address.utils";

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

    // Parse dates using utility function
    const dates = parseSwapDates({
      date_created: apiReturn.date_created,
      date_updated: apiReturn.date_updated,
      submitted_at: apiReturn.submitted_at,
      date_closed: apiReturn.date_closed,
      shopify_order_date: apiReturn.shopify_order_date,
    });

    // Parse deliveredDate separately using the same utility
    const deliveredDate = parseSwapDate(apiReturn.delivered_date);

    // Process addresses using utility functions
    const denormalizedAddresses = extractDenormalizedAddresses(
      apiReturn.billing_address,
      apiReturn.shipping_address
    );

    // Try to link to Shopify order if order_id is provided
    let shopifyOrderId: string | undefined;
    if (apiReturn.order_id) {
      const shopifyOrder = await this.prisma.shopifyOrder.findFirst({
        where: {
          OR: [
            { legacyResourceId: apiReturn.order_id },
            { name: apiReturn.order_id },
          ],
        },
      });
      shopifyOrderId = shopifyOrder?.shopifyOrderId;
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
      deliveryStatus: apiReturn.delivery_status,
      returnStatus: apiReturn.return_status,
      shippingStatus: apiReturn.delivery_status, // Keep legacy field for now

      // Financial Information
      total: this.toDecimal(apiReturn.total),
      handlingFee: this.toDecimal(apiReturn.handling_fee),
      shopNowRevenue: this.toDecimal(apiReturn.shop_now_revenue),
      shopLaterRevenue: this.toDecimal(apiReturn.shop_later_revenue),
      exchangeRevenue: this.toDecimal(apiReturn.exchange_revenue),
      refundRevenue: this.toDecimal(apiReturn.refund_revenue),
      totalAdditionalPayment: this.toDecimal(apiReturn.total_additional_payment),
      totalCreditExchangeValue: this.toDecimal(apiReturn.total_credit_exchange_value),
      totalRefundValueCustomerCurrency: this.toDecimal(apiReturn.total_refund_value_customer_currency),

      // Customer Information
      customerName: apiReturn.customer_name,
      customerCurrency: apiReturn.customer_currency,
      customerNationalId: apiReturn.customer_national_id,
      customerLocale: apiReturn.customer_locale,

      // Shipping Information
      shippingCarrier: apiReturn.shipping_carrier,
      trackingNumber: apiReturn.tracking_number,
      tags: apiReturn.tags,

      // Processing Information
      processed: apiReturn.processed,
      processedBy: apiReturn.processed_by,
      qualityControlStatus: apiReturn.quality_control_status,
      deliveredDate: deliveredDate,
      elapsedDaysPurchaseToReturn: apiReturn.elapsed_days_purchase_to_return,

      // Tax Information
      totalTax: apiReturn.tax_information?.total_tax
        ? this.toDecimal(apiReturn.tax_information.total_tax)
        : undefined,
      totalDuty: apiReturn.tax_information?.total_duty
        ? this.toDecimal(apiReturn.tax_information.total_duty)
        : undefined,
      taxCurrency: apiReturn.tax_information?.currency,

      // Denormalized address fields for fast queries
      ...denormalizedAddresses,

      // Parsed timestamps
      dateCreated: dates.dateCreated || new Date(),
      dateUpdated: dates.dateUpdated || new Date(),
      submittedAt: dates.submittedAt,
      dateClosed: dates.dateClosed,
      shopifyOrderDate: dates.shopifyOrderDate,
    };

    let savedReturn;
    if (existingReturn) {
      savedReturn = await this.repository.updateReturn(
        apiReturn.return_id,
        returnData
      );
    } else {
      savedReturn = await this.repository.createReturn(returnData);
    }

    // Address processing removed - SwapAddress model no longer exists
    // Address data is now denormalized and stored directly on SwapReturn
    // const normalizedAddresses = createNormalizedAddresses(
    //   apiReturn.billing_address,
    //   apiReturn.shipping_address
    // );

    // Process products (return reasons are now in products)
    if (apiReturn.products) {
      for (const product of apiReturn.products) {
        await this.processProduct(product, savedReturn.id);
      }
    }
  }

  private toDecimal(value: number | string | undefined): Decimal {
    if (value === undefined || value === null) return new Decimal(0);
    return new Decimal(value.toString());
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
      cost: this.toDecimal(apiProduct.cost),
      returnType: apiProduct.return_type,

      // Complete SWAP API Product Fields
      shopifyVariantId: apiProduct.shopify_variant_id || null,
      orderNumber: apiProduct.order_number || null,
      originalOrderName: apiProduct.original_order_name || null,
      variantName: apiProduct.variant_name || null,
      fullSkuDescription: apiProduct.full_sku_description || null,
      mainReasonId: apiProduct.main_reason_id || null,
      mainReasonText: apiProduct.main_reason_text || null,
      subReasonId: apiProduct.sub_reason_id || null,
      subReasonText: apiProduct.sub_reason_text || null,
      comments: apiProduct.comments || null,
      currency: apiProduct.currency || null,
      vendor: apiProduct.vendor || null,
      collections: apiProduct.collection ? JSON.stringify(apiProduct.collection) : null,
      productAltType: apiProduct.product_alt_type || null,
      grams: apiProduct.grams || null,
      intakeReason: apiProduct.intake_reason || null,
      tags: apiProduct.tags || null,
      isFaulty: apiProduct.is_faulty || false,
      returnId,
    };

    // Create new product (can optimize later with upsert)
    await this.prisma.swapProduct.create({
      data: productData,
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
