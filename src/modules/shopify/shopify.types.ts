export interface ShopifyMoneyBag {
  shopMoney: {
    amount: string;
    currencyCode: string;
  };
  presentmentMoney: {
    amount: string;
    currencyCode: string;
  };
}

export interface ShopifyOrder {
  id: string;
  legacyResourceId: string;
  name: string;
  email?: string;
  phone?: string;
  currencyCode: string;
  presentmentCurrencyCode: string;
  currentTotalPriceSet: ShopifyMoneyBag;
  currentSubtotalPriceSet: ShopifyMoneyBag;
  currentTotalTaxSet?: ShopifyMoneyBag;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  confirmed: boolean;
  closed: boolean;
  cancelledAt?: string;
  cancelReason?: string;
  taxesIncluded: boolean;
  test: boolean;
  createdAt: string;
  processedAt: string;
  updatedAt: string;
  lineItems: {
    nodes: ShopifyLineItem[];
  };
}

export interface ShopifyLineItem {
  id: string;
  name: string;
  variantTitle?: string;
  product?: {
    id: string;
  };
  variant?: {
    id: string;
  };
  sku?: string;
  quantity: number;
  currentQuantity: number;
  originalUnitPriceSet: ShopifyMoneyBag;
  originalTotalSet: ShopifyMoneyBag;
  requiresShipping: boolean;
}

export interface ShopifyOrdersResponse {
  orders: {
    nodes: ShopifyOrder[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string;
    };
  };
}

export interface SyncOptions {
  storeId: string;
  since?: Date;
  limit?: number;
}

export interface SyncResult {
  ordersProcessed: number;
  ordersCreated: number;
  ordersUpdated: number;
  errors: string[];
}