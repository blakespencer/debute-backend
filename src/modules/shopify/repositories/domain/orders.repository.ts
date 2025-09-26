import { PrismaClient, ShopifyOrder, ShopifyLineItem } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { BaseShopifyRepository } from "../base-repository";
import { ShopifyDataError } from "../../shopify.errors";

export class OrdersRepository extends BaseShopifyRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findOrdersWithPagination(options: {
    limit: number;
    offset: number;
  }) {
    this.validateRequiredField(String(options.limit), 'Limit', 'ShopifyOrder');
    this.validateRequiredField(String(options.offset), 'Offset', 'ShopifyOrder');

    return this.executeFindOperation(
      () => this.prisma.shopifyOrder.findMany({
        take: options.limit,
        skip: options.offset,
        orderBy: { createdAt: "desc" },
        include: {
          lineItems: true,
        },
      }),
      'ShopifyOrder',
      `limit:${options.limit},offset:${options.offset}`,
      'findOrdersWithPagination'
    );
  }

  async countOrders(): Promise<number> {
    return this.executeFindOperation(
      () => this.prisma.shopifyOrder.count(),
      'ShopifyOrder',
      'all',
      'countOrders'
    );
  }

  async findOrderByShopifyId(shopifyOrderId: string): Promise<ShopifyOrder | null> {
    this.validateRequiredField(shopifyOrderId, 'Shopify Order ID', 'ShopifyOrder');

    return this.executeFindOperation(
      () => this.prisma.shopifyOrder.findUnique({ where: { shopifyOrderId } }),
      'ShopifyOrder',
      shopifyOrderId,
      'findOrderByShopifyId'
    );
  }

  async createOrder(orderData: {
    shopifyOrderId: string;
    legacyResourceId: string;
    number: number;
    name: string;
    currencyCode: string;
    presentmentCurrencyCode: string;
    email?: string;
    phone?: string;
    customerAcceptsMarketing: boolean;
    currentTotalPriceAmount: Decimal;
    currentTotalPricePresentmentAmount?: Decimal;
    currentSubtotalPriceAmount: Decimal;
    currentSubtotalPricePresentmentAmount?: Decimal;
    currentTotalTaxAmount?: Decimal;
    currentTotalTaxPresentmentAmount?: Decimal;
    displayFinancialStatus: string;
    displayFulfillmentStatus: string;
    confirmed: boolean;
    closed: boolean;
    cancelledAt?: Date;
    cancelReason?: string;
    taxesIncluded: boolean;
    test: boolean;
    createdAt: Date;
    processedAt: Date;
    storeId: string;
  }): Promise<ShopifyOrder> {
    this.validateRequiredField(orderData.shopifyOrderId, 'Shopify Order ID', 'ShopifyOrder');
    this.validateRequiredField(orderData.storeId, 'Store ID', 'ShopifyOrder');

    return this.executeCreateOperation(
      () => this.prisma.shopifyOrder.create({ data: orderData }),
      'ShopifyOrder',
      orderData.shopifyOrderId,
      'createOrder'
    );
  }

  async updateOrder(
    shopifyOrderId: string,
    orderData: Partial<{
      displayFinancialStatus: string;
      displayFulfillmentStatus: string;
      confirmed: boolean;
      closed: boolean;
      cancelledAt: Date | null;
      cancelReason: string | null;
      currentTotalPriceAmount: Decimal;
      currentTotalPricePresentmentAmount: Decimal | null;
      currentSubtotalPriceAmount: Decimal;
      currentSubtotalPricePresentmentAmount: Decimal | null;
      currentTotalTaxAmount: Decimal | null;
      currentTotalTaxPresentmentAmount: Decimal | null;
    }>
  ): Promise<ShopifyOrder> {
    this.validateRequiredField(shopifyOrderId, 'Shopify Order ID', 'ShopifyOrder');

    return this.executeUpdateOperation(
      () => this.prisma.shopifyOrder.update({
        where: { shopifyOrderId },
        data: orderData,
      }),
      'ShopifyOrder',
      shopifyOrderId,
      'updateOrder'
    );
  }

  async createLineItem(lineItemData: {
    shopifyLineItemId: string;
    name: string;
    variantTitle?: string;
    productId?: string;
    variantId?: string;
    sku?: string;
    quantity: number;
    currentQuantity: number;
    originalUnitPriceAmount: Decimal;
    originalUnitPricePresentmentAmount?: Decimal;
    originalTotalPriceAmount: Decimal;
    originalTotalPricePresentmentAmount?: Decimal;
    requiresShipping: boolean;
    orderId: string;
    productVariantId?: string;
  }): Promise<ShopifyLineItem> {
    this.validateRequiredField(lineItemData.shopifyLineItemId, 'Shopify Line Item ID', 'ShopifyLineItem');
    this.validateRequiredField(lineItemData.orderId, 'Order ID', 'ShopifyLineItem');

    return this.executeCreateOperation(
      () => this.prisma.shopifyLineItem.create({
        data: lineItemData,
      }),
      'ShopifyLineItem',
      lineItemData.shopifyLineItemId,
      'createLineItem'
    );
  }

  async findLineItemsByOrderId(orderId: string): Promise<ShopifyLineItem[]> {
    this.validateRequiredField(orderId, 'Order ID', 'ShopifyLineItem');

    return this.executeFindOperation(
      () => this.prisma.shopifyLineItem.findMany({
        where: { orderId },
      }),
      'ShopifyLineItem',
      orderId,
      'findLineItemsByOrderId'
    );
  }

  async deleteLineItemsByOrderId(orderId: string): Promise<void> {
    this.validateRequiredField(orderId, 'Order ID', 'ShopifyLineItem');

    await this.executeDeleteOperation(
      () => this.prisma.shopifyLineItem.deleteMany({
        where: { orderId },
      }),
      'ShopifyLineItem',
      orderId,
      'deleteLineItemsByOrderId'
    );
  }

  async createLineItems(
    lineItems: Array<{
      shopifyLineItemId: string;
      name: string;
      variantTitle?: string;
      productId?: string;
      variantId?: string;
      sku?: string;
      quantity: number;
      currentQuantity: number;
      originalUnitPriceAmount: Decimal;
      originalUnitPricePresentmentAmount?: Decimal;
      originalTotalPriceAmount: Decimal;
      originalTotalPricePresentmentAmount?: Decimal;
      requiresShipping: boolean;
      orderId: string;
      productVariantId?: string;
    }>
  ): Promise<void> {
    if (!lineItems?.length) {
      throw new ShopifyDataError(
        'Line items array cannot be empty',
        undefined,
        { operation: 'createLineItems', entity: 'ShopifyLineItem' }
      );
    }

    // Validate all line items have required fields
    lineItems.forEach((item, index) => {
      this.validateRequiredField(item.shopifyLineItemId, `Line item ID (index ${index})`, 'ShopifyLineItem');
      this.validateRequiredField(item.orderId, `Order ID (index ${index})`, 'ShopifyLineItem');
    });

    await this.executeBatchOperation(
      () => this.prisma.shopifyLineItem.createMany({ data: lineItems }),
      'ShopifyLineItem',
      lineItems.length,
      'createLineItems'
    );
  }
}