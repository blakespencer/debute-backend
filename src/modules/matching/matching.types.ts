export interface SwapShopifyMatchResult {
  totalReturnsProcessed: number;
  successfulMatches: number;
  shopifyOrdersNotFound: number;
  alreadyMatched: number;
  errors: string[];
}

export interface MatchingOptions {
  batchSize?: number;
  dryRun?: boolean;
  storeId?: string; // Limit to specific store
}

export interface MatchingStats {
  totalSwapReturns: number;
  returnsWithShopifyId: number;
  matchableReturns: number; // Have shopifyOrderId AND shopify order exists in DB
  unmatchableReturns: number; // Have shopifyOrderId but no shopify order in DB
}

export interface UnmatchedReturn {
  swapReturnId: string;
  shopifyOrderId: string;
  orderName: string;
  rma: string;
  reason: 'shopify_order_not_found' | 'invalid_shopify_id' | 'other';
}