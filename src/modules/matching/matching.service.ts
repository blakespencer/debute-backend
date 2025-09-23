import { PrismaClient } from "@prisma/client";
import { createLogger } from "../../common/logger";
import { MatchingRepository } from "./matching.repository";
import {
  SwapShopifyMatchResult,
  MatchingOptions,
  MatchingStats,
  UnmatchedReturn
} from "./matching.types";

export class MatchingService {
  private repository: MatchingRepository;
  private logger = createLogger("MatchingService");

  constructor(private prisma: PrismaClient) {
    this.repository = new MatchingRepository(prisma);
  }

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
        const returnsToMatch = await this.repository.findUnmatchedReturns(batchSize, storeId);
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
   * Get detailed statistics about current matching state
   */
  async getMatchingStats(storeId?: string): Promise<MatchingStats> {
    return this.repository.getMatchingStats(storeId);
  }

  /**
   * Get list of returns that can't be matched (have shopifyOrderId but no corresponding Shopify order)
   */
  async getUnmatchedReturns(limit = 50, storeId?: string): Promise<UnmatchedReturn[]> {
    const unmatchedReturns = await this.repository.getUnmatchedReturns(limit, storeId);

    return unmatchedReturns.map(r => ({
      swapReturnId: r.id,
      shopifyOrderId: r.shopifyOrderId!,
      orderName: r.orderName,
      rma: r.rma,
      reason: 'shopify_order_not_found' as const,
    }));
  }

  /**
   * Process a single return for matching
   * Business logic for matching validation and updates
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
    const shopifyOrder = await this.repository.findShopifyOrderById(swapReturn.shopifyOrderId);

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
      await this.repository.markReturnAsMatched(swapReturn.id);

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