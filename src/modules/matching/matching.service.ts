import { PrismaClient } from "@prisma/client";
import { createLogger } from "../../common/logger";
import {
  SwapShopifyMatchResult,
  MatchingOptions,
  MatchingStats,
  UnmatchedReturn
} from "./matching.types";

export class MatchingService {
  private logger = createLogger("MatchingService");

  constructor(private prisma: PrismaClient) {}

  /**
   * Match SWAP returns to Shopify orders based on shopifyOrderId
   */
  async matchSwapToShopify(options: MatchingOptions = {}): Promise<SwapShopifyMatchResult> {
    const { batchSize = 100, dryRun = false, storeId } = options;

    return this.logger.time("matchSwapToShopify", async () => {
      const result: SwapShopifyMatchResult = {
        totalReturnsProcessed: 0,
        successfulMatches: 0,
        shopifyOrdersNotFound: 0,
        alreadyMatched: 0,
        errors: [],
      };

      try {
        // Find SWAP returns that need matching
        const returnsToMatch = await this.findReturnsNeedingMatching(batchSize, storeId);
        result.totalReturnsProcessed = returnsToMatch.length;

        this.logger.info(`Found ${returnsToMatch.length} returns to process for matching`);

        // Process each return
        for (const swapReturn of returnsToMatch) {
          try {
            const matchResult = await this.matchSingleReturn(swapReturn, dryRun);

            if (matchResult.alreadyMatched) {
              result.alreadyMatched++;
            } else if (matchResult.matched) {
              result.successfulMatches++;
            } else {
              result.shopifyOrdersNotFound++;
            }
          } catch (error) {
            const errorMsg = `Failed to process return ${swapReturn.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            result.errors.push(errorMsg);
            this.logger.error(errorMsg, {
              swapReturnId: swapReturn.id,
              shopifyOrderId: swapReturn.shopifyOrderId
            });
          }
        }

        this.logger.info("SWAP-Shopify matching completed", {
          totalProcessed: result.totalReturnsProcessed,
          successful: result.successfulMatches,
          notFound: result.shopifyOrdersNotFound,
          errors: result.errors.length
        });
        return result;
      } catch (error) {
        const errorMsg = `Matching process failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        this.logger.error(errorMsg);
        return result;
      }
    });
  }

  /**
   * Get detailed statistics about current matching state - ENTERPRISE VERSION
   * Uses isMatched field for better performance
   */
  async getMatchingStats(storeId?: string): Promise<MatchingStats> {
    const whereClause = storeId ? { storeId } : {};

    const [
      totalSwapReturns,
      returnsWithShopifyId,
      matchedReturns,
      unmatchedReturnsWithShopifyId,
    ] = await Promise.all([
      this.prisma.swapReturn.count({ where: whereClause }),
      this.prisma.swapReturn.count({
        where: {
          ...whereClause,
          shopifyOrderId: { not: null },
        },
      }),
      this.prisma.swapReturn.count({
        where: {
          ...whereClause,
          isMatched: true,
        },
      }),
      this.prisma.swapReturn.count({
        where: {
          ...whereClause,
          shopifyOrderId: { not: null },
          isMatched: false,
        },
      }),
    ]);

    return {
      totalSwapReturns,
      returnsWithShopifyId,
      matchableReturns: matchedReturns,
      unmatchableReturns: unmatchedReturnsWithShopifyId,
    };
  }

  /**
   * Get list of returns that can't be matched (have shopifyOrderId but no corresponding Shopify order)
   */
  async getUnmatchedReturns(limit = 50, storeId?: string): Promise<UnmatchedReturn[]> {
    const whereClause = storeId ? { storeId } : {};

    // Get returns with shopifyOrderId
    const returnsWithShopifyId = await this.prisma.swapReturn.findMany({
      where: {
        ...whereClause,
        shopifyOrderId: { not: null },
      },
      select: {
        id: true,
        shopifyOrderId: true,
        orderName: true,
        rma: true,
      },
      take: limit,
    });

    const shopifyOrderIds = returnsWithShopifyId
      .map(r => r.shopifyOrderId)
      .filter(Boolean) as string[];

    // Find which Shopify orders exist
    const existingShopifyOrders = await this.prisma.shopifyOrder.findMany({
      where: {
        shopifyOrderId: { in: shopifyOrderIds },
      },
      select: {
        shopifyOrderId: true,
      },
    });

    const existingShopifyOrderIds = new Set(existingShopifyOrders.map(o => o.shopifyOrderId));

    // Return only the unmatched ones
    return returnsWithShopifyId
      .filter(r => r.shopifyOrderId && !existingShopifyOrderIds.has(r.shopifyOrderId))
      .map(r => ({
        swapReturnId: r.id,
        shopifyOrderId: r.shopifyOrderId!,
        orderName: r.orderName,
        rma: r.rma,
        reason: 'shopify_order_not_found' as const,
      }));
  }

  /**
   * Find SWAP returns that need matching - ENTERPRISE VERSION
   * Only gets unmatched returns with shopifyOrderId
   */
  private async findReturnsNeedingMatching(limit: number, storeId?: string) {
    const whereClause = storeId ? { storeId } : {};

    return this.prisma.swapReturn.findMany({
      where: {
        ...whereClause,
        shopifyOrderId: { not: null },
        isMatched: false,  // Only unmatched returns!
      },
      select: {
        id: true,
        shopifyOrderId: true,
        orderName: true,
        rma: true,
      },
      take: limit,
    });
  }

  /**
   * Process a single return for matching - ENTERPRISE VERSION
   * Actually updates the isMatched flag when not in dry run mode
   */
  private async matchSingleReturn(
    swapReturn: {
      id: string;
      shopifyOrderId: string | null;
      orderName: string;
      rma: string;
    },
    dryRun: boolean
  ): Promise<{ matched: boolean; alreadyMatched: boolean }> {
    if (!swapReturn.shopifyOrderId) {
      return { matched: false, alreadyMatched: false };
    }

    // Check if corresponding Shopify order exists in our database
    const shopifyOrder = await this.prisma.shopifyOrder.findUnique({
      where: {
        shopifyOrderId: swapReturn.shopifyOrderId,
      },
      select: {
        id: true,
        shopifyOrderId: true,
        name: true,
      },
    });

    if (!shopifyOrder) {
      this.logger.warn(`Shopify order not found in database`, {
        swapReturnId: swapReturn.id,
        shopifyOrderId: swapReturn.shopifyOrderId,
        orderName: swapReturn.orderName,
      });
      return { matched: false, alreadyMatched: false };
    }

    // Match found! Update the database if not dry run
    if (!dryRun) {
      await this.prisma.swapReturn.update({
        where: { id: swapReturn.id },
        data: { isMatched: true },
      });

      this.logger.info(`Successfully matched return to order`, {
        swapReturnId: swapReturn.id,
        shopifyOrderId: shopifyOrder.shopifyOrderId,
        shopifyOrderName: shopifyOrder.name,
        returnOrderName: swapReturn.orderName,
      });
    } else {
      this.logger.info(`[DRY RUN] Would match return to order`, {
        swapReturnId: swapReturn.id,
        shopifyOrderId: shopifyOrder.shopifyOrderId,
        shopifyOrderName: shopifyOrder.name,
      });
    }

    return { matched: true, alreadyMatched: false };
  }
}