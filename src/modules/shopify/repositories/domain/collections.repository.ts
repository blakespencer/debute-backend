import { PrismaClient, ShopifyCollection } from "@prisma/client";
import { BaseShopifyRepository } from "../base-repository";

export class CollectionsRepository extends BaseShopifyRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findCollectionsWithPagination(options: {
    limit: number;
    offset: number;
  }) {
    this.validateRequiredField(String(options.limit), 'Limit', 'ShopifyCollection');
    this.validateRequiredField(String(options.offset), 'Offset', 'ShopifyCollection');

    return this.executeFindOperation(
      () => this.prisma.shopifyCollection.findMany({
        take: options.limit,
        skip: options.offset,
        orderBy: { updatedAt: "desc" },
        include: {
          products: {
            include: {
              product: true,
            },
          },
        },
      }),
      'ShopifyCollection',
      `limit:${options.limit},offset:${options.offset}`,
      'findCollectionsWithPagination'
    );
  }

  async countCollections(): Promise<number> {
    return this.executeFindOperation(
      () => this.prisma.shopifyCollection.count(),
      'ShopifyCollection',
      'all',
      'countCollections'
    );
  }

  async findCollectionByShopifyId(shopifyCollectionId: string): Promise<ShopifyCollection | null> {
    this.validateRequiredField(shopifyCollectionId, 'Shopify Collection ID', 'ShopifyCollection');

    return this.executeFindOperation(
      () => this.prisma.shopifyCollection.findUnique({
        where: { shopifyCollectionId },
      }),
      'ShopifyCollection',
      shopifyCollectionId,
      'findCollectionByShopifyId'
    );
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
    this.validateRequiredField(collectionData.shopifyCollectionId, 'Shopify Collection ID', 'ShopifyCollection');
    this.validateRequiredField(collectionData.storeId, 'Store ID', 'ShopifyCollection');

    return this.executeCreateOperation(
      () => this.prisma.shopifyCollection.create({
        data: collectionData,
      }),
      'ShopifyCollection',
      collectionData.shopifyCollectionId,
      'createCollection'
    );
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
    this.validateRequiredField(shopifyCollectionId, 'Shopify Collection ID', 'ShopifyCollection');

    return this.executeUpdateOperation(
      () => this.prisma.shopifyCollection.update({
        where: { shopifyCollectionId },
        data: collectionData,
      }),
      'ShopifyCollection',
      shopifyCollectionId,
      'updateCollection'
    );
  }
}