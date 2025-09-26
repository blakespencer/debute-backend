import { PrismaClient, ShopifyProduct, ShopifyProductVariant, ShopifyProductCollection } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { BaseShopifyRepository } from "../base-repository";

export class ProductsRepository extends BaseShopifyRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findProductsWithPagination(options: {
    limit: number;
    offset: number;
  }) {
    this.validateRequiredField(String(options.limit), 'Limit', 'ShopifyProduct');
    this.validateRequiredField(String(options.offset), 'Offset', 'ShopifyProduct');

    return this.executeFindOperation(
      () => this.prisma.shopifyProduct.findMany({
        take: options.limit,
        skip: options.offset,
        orderBy: { createdAt: "desc" },
        include: {
          variants: true,
          collections: {
            include: {
              collection: true,
            },
          },
        },
      }),
      'ShopifyProduct',
      `limit:${options.limit},offset:${options.offset}`,
      'findProductsWithPagination'
    );
  }

  async countProducts(): Promise<number> {
    return this.executeFindOperation(
      () => this.prisma.shopifyProduct.count(),
      'ShopifyProduct',
      'all',
      'countProducts'
    );
  }

  async findVariantsWithPagination(options: {
    limit: number;
    offset: number;
  }) {
    this.validateRequiredField(String(options.limit), 'Limit', 'ShopifyProductVariant');
    this.validateRequiredField(String(options.offset), 'Offset', 'ShopifyProductVariant');

    return this.executeFindOperation(
      () => this.prisma.shopifyProductVariant.findMany({
        take: options.limit,
        skip: options.offset,
        orderBy: { createdAt: "desc" },
        include: {
          product: true,
        },
      }),
      'ShopifyProductVariant',
      `limit:${options.limit},offset:${options.offset}`,
      'findVariantsWithPagination'
    );
  }

  async countVariants(): Promise<number> {
    return this.executeFindOperation(
      () => this.prisma.shopifyProductVariant.count(),
      'ShopifyProductVariant',
      'all',
      'countVariants'
    );
  }

  async findProductByShopifyId(shopifyProductId: string): Promise<ShopifyProduct | null> {
    this.validateRequiredField(shopifyProductId, 'Shopify Product ID', 'ShopifyProduct');

    return this.executeFindOperation(
      () => this.prisma.shopifyProduct.findUnique({
        where: { shopifyProductId },
      }),
      'ShopifyProduct',
      shopifyProductId,
      'findProductByShopifyId'
    );
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
    this.validateRequiredField(productData.shopifyProductId, 'Shopify Product ID', 'ShopifyProduct');
    this.validateRequiredField(productData.storeId, 'Store ID', 'ShopifyProduct');

    return this.executeCreateOperation(
      () => this.prisma.shopifyProduct.create({
        data: productData,
      }),
      'ShopifyProduct',
      productData.shopifyProductId,
      'createProduct'
    );
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
    this.validateRequiredField(shopifyProductId, 'Shopify Product ID', 'ShopifyProduct');

    return this.executeUpdateOperation(
      () => this.prisma.shopifyProduct.update({
        where: { shopifyProductId },
        data: productData,
      }),
      'ShopifyProduct',
      shopifyProductId,
      'updateProduct'
    );
  }

  // Product Variant methods
  async findVariantByShopifyId(shopifyVariantId: string): Promise<ShopifyProductVariant | null> {
    this.validateRequiredField(shopifyVariantId, 'Shopify Variant ID', 'ShopifyProductVariant');

    return this.executeFindOperation(
      () => this.prisma.shopifyProductVariant.findUnique({
        where: { shopifyVariantId },
      }),
      'ShopifyProductVariant',
      shopifyVariantId,
      'findVariantByShopifyId'
    );
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
    this.validateRequiredField(variantData.shopifyVariantId, 'Shopify Variant ID', 'ShopifyProductVariant');
    this.validateRequiredField(variantData.productId, 'Product ID', 'ShopifyProductVariant');

    return this.executeCreateOperation(
      () => this.prisma.shopifyProductVariant.create({
        data: variantData,
      }),
      'ShopifyProductVariant',
      variantData.shopifyVariantId,
      'createVariant'
    );
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
    this.validateRequiredField(shopifyVariantId, 'Shopify Variant ID', 'ShopifyProductVariant');

    return this.executeUpdateOperation(
      () => this.prisma.shopifyProductVariant.update({
        where: { shopifyVariantId },
        data: variantData,
      }),
      'ShopifyProductVariant',
      shopifyVariantId,
      'updateVariant'
    );
  }

  async deleteVariantsByProductId(productId: string): Promise<void> {
    this.validateRequiredField(productId, 'Product ID', 'ShopifyProductVariant');

    await this.executeDeleteOperation(
      () => this.prisma.shopifyProductVariant.deleteMany({
        where: { productId },
      }),
      'ShopifyProductVariant',
      productId,
      'deleteVariantsByProductId'
    );
  }

  // Product-Collection relationship methods
  async createProductCollection(productId: string, collectionId: string): Promise<ShopifyProductCollection> {
    this.validateRequiredField(productId, 'Product ID', 'ShopifyProductCollection');
    this.validateRequiredField(collectionId, 'Collection ID', 'ShopifyProductCollection');

    return this.executeCreateOperation(
      () => this.prisma.shopifyProductCollection.create({
        data: { productId, collectionId },
      }),
      'ShopifyProductCollection',
      `${productId}-${collectionId}`,
      'createProductCollection'
    );
  }

  async deleteProductCollectionsByProductId(productId: string): Promise<void> {
    this.validateRequiredField(productId, 'Product ID', 'ShopifyProductCollection');

    await this.executeDeleteOperation(
      () => this.prisma.shopifyProductCollection.deleteMany({
        where: { productId },
      }),
      'ShopifyProductCollection',
      productId,
      'deleteProductCollectionsByProductId'
    );
  }

  async findProductCollections(productId: string): Promise<ShopifyProductCollection[]> {
    this.validateRequiredField(productId, 'Product ID', 'ShopifyProductCollection');

    return this.executeFindOperation(
      () => this.prisma.shopifyProductCollection.findMany({
        where: { productId },
      }),
      'ShopifyProductCollection',
      productId,
      'findProductCollections'
    );
  }
}