/**
 * SWAP API Types and Interfaces
 * Based on SWAP Returns API v2 documentation
 */

export interface SwapApiResponse {
  orders: SwapReturn[];
  version: number;
  query_params: {
    store: string;
    from_date: string;
    to_date?: string;
    last_updated_date?: string;
    page?: number;
    items_per_page?: number;
  };
  pagination: {
    page: number;
    items_per_page: number;
    total_pages: number;
    total_items: number;
    has_next_page: boolean;
    has_previous_page?: boolean;
    current_page_size?: number;
    items_in_remaining_pages?: number;
  };
}

export interface SwapReturn {
  // Order Details
  order_name: string;
  order_id: string;
  rma: string; // RMA ID
  date_created: string;
  date_updated: string;
  type_string: string;
  type: string[]; // Array of types like ["Exchange", "Refund"]
  delivery_status: string;
  return_status: string;

  // Financial Information
  total: number;
  handling_fee: number;
  return_id: string;
  shop_now_revenue: number;
  shop_later_revenue: number;
  exchange_revenue: number;
  refund_revenue: number;
  store_id: string;
  total_additional_payment: number;
  total_credit_exchange_value: number;
  total_refund_value_customer_currency: number;

  // Customer Information (optional)
  customer_name?: string;
  customer_currency?: string;

  // Product Information (optional)
  products?: SwapProduct[];

  // Return Reasons (optional)
  return_reasons?: SwapReturnReason[];

  // Address Information (optional)
  billing_address?: SwapBillingAddress;

  // Tax Information (optional)
  tax_information?: SwapTaxDutyInfo;
}

export interface SwapProduct {
  product_id: string;
  shopify_product_id: string;
  product_name: string;
  sku: string;
  item_count: number;
  cost: number;
  return_type: string;
}

export interface SwapReturnReason {
  reason: string;
  item_count: number;
}

export interface SwapBillingAddress {
  first_name: string;
  last_name: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  zip: string;
  company?: string;
  phone?: string;
}

export interface SwapTaxDutyInfo {
  total_tax: number;
  total_duty: number;
  currency: string;
}

// Request/Response types for our API endpoints
export interface SwapSyncOptions {
  storeId: string;
  fromDate?: Date;
  toDate?: Date;
  lastUpdatedDate?: Date;
  limit?: number;
}

export interface SwapSyncResult {
  returnsProcessed: number;
  returnsCreated: number;
  returnsUpdated: number;
  errors: string[];
}

// Query options for getting returns
export interface SwapQueryOptions {
  limit?: number;
  offset?: number;
  storeId?: string;
  status?: string;
  type?: string;
  fromDate?: Date;
  toDate?: Date;
}

// API client configuration
export interface SwapClientConfig {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

// Database model interfaces (for TypeScript)
export interface SwapStore {
  id: string;
  swapStoreId: string;
  apiKey: string;
  storeName?: string;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SwapReturnRecord {
  id: string;
  swapReturnId: string;
  rmaId: string;
  orderId?: string;
  shopifyOrderId?: string; // Link to our Shopify orders
  storeId: string;

  type: string;
  status: string;
  shippingStatus: string;

  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;

  totalRefundAmount?: number;
  currency?: string;
  taxAmount?: number;
  dutyAmount?: number;
  shippingCost?: number;

  returnReason?: string;
  returnNotes?: string;

  trackingNumber?: string;
  carrier?: string;

  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  shippedAt?: Date;
  receivedAt?: Date;

  lineItems: SwapLineItemRecord[];
  store: SwapStore;
}

export interface SwapLineItemRecord {
  id: string;
  swapLineItemId: string;
  returnId: string;

  productId?: string;
  variantId?: string;
  sku?: string;
  productName: string;
  variantTitle?: string;

  quantity: number;
  unitPrice?: number;
  totalPrice?: number;

  returnReason?: string;
  condition?: string;
  disposition?: string;

  return: SwapReturnRecord;
}