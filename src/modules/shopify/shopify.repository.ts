import {
  PrismaClient,
  ShopifyStore,
  ShopifyOrder,
  ShopifyLineItem,
  ShopifyProduct,
  ShopifyProductVariant,
  ShopifyCollection,
  ShopifyProductCollection,
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

  // Product methods
  async findProductByShopifyId(shopifyProductId: string): Promise<ShopifyProduct | null> {
    return this.prisma.shopifyProduct.findUnique({
      where: { shopifyProductId },
    });
  }

  async createProduct(productData: {
    shopifyProductId: string;
    legacyResourceId: string;
    title: string;
    handle: string;
    productType?: string;
    vendor?: string;
    description?: string;
    descriptionHtml?: string;
    status: string;
    publishedAt?: Date;
    tags?: string;
    createdAt: Date;
    updatedAt: Date;
    storeId: string;
  }): Promise<ShopifyProduct> {
    return this.prisma.shopifyProduct.create({
      data: productData,
    });
  }

  async updateProduct(
    shopifyProductId: string,
    productData: Partial<{
      title: string;
      handle: string;
      productType: string;
      vendor: string;
      description: string;
      descriptionHtml: string;
      status: string;
      publishedAt: Date | null;
      tags: string;
      updatedAt: Date;
    }>
  ): Promise<ShopifyProduct> {
    return this.prisma.shopifyProduct.update({
      where: { shopifyProductId },
      data: productData,
    });
  }

  // Product Variant methods
  async findVariantByShopifyId(shopifyVariantId: string): Promise<ShopifyProductVariant | null> {
    return this.prisma.shopifyProductVariant.findUnique({
      where: { shopifyVariantId },
    });
  }

  async createVariant(variantData: {
    shopifyVariantId: string;
    legacyResourceId: string;
    title: string;
    sku?: string;
    barcode?: string;
    position: number;
    price: Decimal;
    compareAtPrice?: Decimal;
    inventoryQuantity?: number;
    availableForSale: boolean;
    inventoryPolicy: string;
    taxable: boolean;
    createdAt: Date;
    updatedAt: Date;
    productId: string;
  }): Promise<ShopifyProductVariant> {
    return this.prisma.shopifyProductVariant.create({
      data: variantData,
    });
  }

  async updateVariant(
    shopifyVariantId: string,
    variantData: Partial<{
      title: string;
      sku: string;
      barcode: string;
      position: number;
      price: Decimal;
      compareAtPrice: Decimal | null;
      inventoryQuantity: number | null;
      availableForSale: boolean;
      inventoryPolicy: string;
      taxable: boolean;
      updatedAt: Date;
    }>
  ): Promise<ShopifyProductVariant> {
    return this.prisma.shopifyProductVariant.update({
      where: { shopifyVariantId },
      data: variantData,
    });
  }

  async deleteVariantsByProductId(productId: string): Promise<void> {
    await this.prisma.shopifyProductVariant.deleteMany({
      where: { productId },
    });
  }

  // Collection methods
  async findCollectionByShopifyId(shopifyCollectionId: string): Promise<ShopifyCollection | null> {
    return this.prisma.shopifyCollection.findUnique({
      where: { shopifyCollectionId },
    });
  }

  async createCollection(collectionData: {
    shopifyCollectionId: string;
    legacyResourceId: string;
    title: string;
    handle: string;
    description?: string;
    updatedAt: Date;
    storeId: string;
  }): Promise<ShopifyCollection> {
    return this.prisma.shopifyCollection.create({
      data: collectionData,
    });
  }

  async updateCollection(
    shopifyCollectionId: string,
    collectionData: Partial<{
      title: string;
      handle: string;
      description: string;
      updatedAt: Date;
    }>
  ): Promise<ShopifyCollection> {
    return this.prisma.shopifyCollection.update({
      where: { shopifyCollectionId },
      data: collectionData,
    });
  }

  // Product-Collection relationship methods
  async createProductCollection(productId: string, collectionId: string): Promise<ShopifyProductCollection> {
    return this.prisma.shopifyProductCollection.create({
      data: { productId, collectionId },
    });
  }

  async deleteProductCollectionsByProductId(productId: string): Promise<void> {
    await this.prisma.shopifyProductCollection.deleteMany({
      where: { productId },
    });
  }

  async findProductCollections(productId: string): Promise<ShopifyProductCollection[]> {
    return this.prisma.shopifyProductCollection.findMany({
      where: { productId },
    });
  }
}
