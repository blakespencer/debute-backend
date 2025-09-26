import { PrismaClient, ShopifyStore } from "@prisma/client";
import { BaseShopifyRepository } from "../base-repository";

export class StoresRepository extends BaseShopifyRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findStoreById(id: string): Promise<ShopifyStore | null> {
    this.validateRequiredField(id, 'Store ID', 'ShopifyStore');

    return this.executeFindOperation(
      () => this.prisma.shopifyStore.findUnique({ where: { id } }),
      'ShopifyStore',
      id,
      'findStoreById'
    );
  }

  async findStoreByDomain(shopDomain: string): Promise<ShopifyStore | null> {
    this.validateRequiredField(shopDomain, 'Shop domain', 'ShopifyStore');

    return this.executeFindOperation(
      () => this.prisma.shopifyStore.findUnique({ where: { shopDomain } }),
      'ShopifyStore',
      shopDomain,
      'findStoreByDomain'
    );
  }

  async updateStoreLastSync(storeId: string): Promise<void> {
    this.validateRequiredField(storeId, 'Store ID', 'ShopifyStore');

    await this.executeUpdateOperation(
      () => this.prisma.shopifyStore.update({
        where: { id: storeId },
        data: { lastSyncAt: new Date() },
      }),
      'ShopifyStore',
      storeId,
      'updateStoreLastSync'
    );
  }

  async createStore(storeData: {
    shopDomain: string;
    accessToken: string;
  }): Promise<ShopifyStore> {
    this.validateRequiredField(storeData.shopDomain, 'Shop domain', 'ShopifyStore');
    this.validateRequiredField(storeData.accessToken, 'Access token', 'ShopifyStore');

    return this.executeCreateOperation(
      () => this.prisma.shopifyStore.create({ data: storeData }),
      'ShopifyStore',
      storeData.shopDomain,
      'createStore'
    );
  }
}