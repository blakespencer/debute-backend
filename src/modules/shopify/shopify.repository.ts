import {
  PrismaClient,
  ShopifyStore,
  ShopifyOrder,
  ShopifyLineItem,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export class ShopifyRepository {
  constructor(private prisma: PrismaClient) {}

  async findStoreById(id: string): Promise<ShopifyStore | null> {
    return this.prisma.shopifyStore.findUnique({
      where: { id },
    });
  }

  async findStoreByDomain(shopDomain: string): Promise<ShopifyStore | null> {
    return this.prisma.shopifyStore.findUnique({
      where: { shopDomain },
    });
  }

  async updateStoreLastSync(storeId: string): Promise<void> {
    await this.prisma.shopifyStore.update({
      where: { id: storeId },
      data: { lastSyncAt: new Date() },
    });
  }

  async findOrderByShopifyId(
    shopifyOrderId: string
  ): Promise<ShopifyOrder | null> {
    return this.prisma.shopifyOrder.findUnique({
      where: { shopifyOrderId },
    });
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
    return this.prisma.shopifyOrder.create({
      data: orderData,
    });
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
    return this.prisma.shopifyOrder.update({
      where: { shopifyOrderId },
      data: orderData,
    });
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
  }): Promise<ShopifyLineItem> {
    return this.prisma.shopifyLineItem.create({
      data: lineItemData,
    });
  }

  async findLineItemsByOrderId(orderId: string): Promise<ShopifyLineItem[]> {
    return this.prisma.shopifyLineItem.findMany({
      where: { orderId },
    });
  }

  async deleteLineItemsByOrderId(orderId: string): Promise<void> {
    await this.prisma.shopifyLineItem.deleteMany({
      where: { orderId },
    });
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
    }>
  ): Promise<void> {
    await this.prisma.shopifyLineItem.createMany({
      data: lineItems,
    });
  }
}
