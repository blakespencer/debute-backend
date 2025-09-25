import { PrismaClient } from "@prisma/client";
import { MatchingStats } from "./matching.types";

export class MatchingRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get matching statistics for returns
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
   * Find SWAP returns that need matching
   */
  async findUnmatchedReturns(limit: number, storeId?: string) {
    const whereClause = storeId ? { storeId } : {};

    return this.prisma.swapReturn.findMany({
      where: {
        ...whereClause,
        isMatched: false,
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
   * Find Shopify order by shopifyOrderId
   */
  async findShopifyOrderById(shopifyOrderId: string) {
    return this.prisma.shopifyOrder.findUnique({
      where: {
        shopifyOrderId,
      },
      select: {
        id: true,
        shopifyOrderId: true,
        name: true,
      },
    });
  }

  /**
   * Mark a SWAP return as matched
   */
  async markReturnAsMatched(returnId: string): Promise<void> {
    await this.prisma.swapReturn.update({
      where: { id: returnId },
      data: { isMatched: true },
    });
  }

  /**
   * Get list of returns that can't be matched
   */
  async getUnmatchedReturns(limit: number, storeId?: string) {
    const whereClause = storeId ? { storeId } : {};

    // Get returns with shopifyOrderId but not matched
    const returnsWithShopifyId = await this.prisma.swapReturn.findMany({
      where: {
        ...whereClause,
        isMatched: false,
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

    if (shopifyOrderIds.length === 0) {
      return [];
    }

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

    // Return only the unmatched ones (have shopifyOrderId but no corresponding Shopify order)
    return returnsWithShopifyId.filter(r =>
      r.shopifyOrderId && !existingShopifyOrderIds.has(r.shopifyOrderId)
    );
  }
}