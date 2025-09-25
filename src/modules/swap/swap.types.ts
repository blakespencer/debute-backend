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
  rma: string;
  date_created: string;
  date_updated: string;
  submitted_at?: string;
  type_string: string;
  type: string[];
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

  // Customer Information
  customer_name?: string;
  customer_currency?: string;
  customer_national_id?: string;
  customer_locale?: string;

  // Shipping Information
  shipping_carrier?: string;
  tracking_number?: string;
  tags?: string;

  // Processing Information
  processed?: string;
  processed_by?: string;
  quality_control_status?: string;
  delivered_date?: string;
  date_closed?: string;
  elapsed_days_purchase_to_return?: number;
  shopify_order_date?: string;

  // Product Information
  products?: SwapProduct[];

  // Address Information
  billing_address?: SwapBillingAddress;
  shipping_address?: SwapShippingAddress;

  // Tax Information
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

  // Return Reason Fields (now in products per API)
  main_reason_id?: string;
  main_reason_text?: string;
  sub_reason_id?: string;
  sub_reason_text?: string;
  comments?: string;

  // Rich Product Metadata
  shopify_variant_id?: string;
  order_number?: string;
  original_order_name?: string;
  variant_name?: string;
  full_sku_description?: string;
  currency?: string;
  vendor?: string;
  product_alt_type?: string;
  grams?: number;
  intake_reason?: string;
  tags?: string;
  is_faulty?: boolean;
  collection?: string[];
}

export interface SwapReturnReason {
  main_reason_id?: string;
  main_reason_text?: string;
  sub_reason_id?: string;
  sub_reason_text?: string;
  comments?: string;
}

export interface SwapBillingAddress {
  name?: string;
  address1: string;
  address2?: string;
  city: string;
  state_province_code?: string;
  country_code: string;
  postcode: string;
}

export interface SwapShippingAddress {
  name?: string;
  address1: string;
  address2?: string;
  city: string;
  state_province_code?: string;
  country_code: string;
  postcode: string;
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