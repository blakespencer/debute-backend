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
  fromDate?: Date;
  limit?: number;
}

export interface SyncResult {
  ordersProcessed: number;
  ordersCreated: number;
  ordersUpdated: number;
  productsProcessed?: number;
  productsCreated?: number;
  productsUpdated?: number;
  collectionsProcessed?: number;
  collectionsCreated?: number;
  collectionsUpdated?: number;
  variantsProcessed?: number;
  variantsCreated?: number;
  variantsUpdated?: number;
  errors: string[];
}

export interface ShopifyProduct {
  id: string;
  legacyResourceId: string;
  title: string;
  handle: string;
  productType?: string;
  vendor?: string;
  description?: string;
  descriptionHtml?: string;
  status: string;
  publishedAt?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  variants?: {
    nodes: ShopifyProductVariant[];
  };
  collections?: {
    nodes: ShopifyCollection[];
  };
}

export interface ShopifyProductVariant {
  id: string;
  legacyResourceId: string;
  title: string;
  sku?: string;
  barcode?: string;
  position: number;
  price: string;
  compareAtPrice?: string;
  inventoryQuantity?: number;
  availableForSale: boolean;
  inventoryPolicy: string;
  taxable: boolean;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    legacyResourceId: string;
  };
}

export interface ShopifyCollection {
  id: string;
  legacyResourceId: string;
  title: string;
  handle: string;
  description?: string;
  updatedAt: string;
}

export interface ShopifyProductsResponse {
  products: {
    nodes: ShopifyProduct[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string;
    };
  };
}

export interface ShopifyCollectionsResponse {
  collections: {
    nodes: ShopifyCollection[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string;
    };
  };
}

export interface ShopifyProductVariantsResponse {
  productVariants: {
    nodes: ShopifyProductVariant[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string;
    };
  };
}
