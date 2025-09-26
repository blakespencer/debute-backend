import { PrismaClient } from "@prisma/client";
import { ShopifyRepository } from "./shopify.repository";
import { ShopifySyncService } from "./shopify.sync.service";
import { SyncResult } from "./shopify.types";
import { AppError } from "../../common/errors";

export class ShopifyService {
  private repository: ShopifyRepository;
  private syncService: ShopifySyncService;

  constructor(private prisma: PrismaClient) {
    this.repository = new ShopifyRepository(prisma);
    this.syncService = new ShopifySyncService(prisma);
  }

  private getStoreFromEnv() {
    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    if (!shopDomain || !accessToken) {
      throw new AppError("Shopify credentials not configured", 500);
    }

    return { shopDomain, accessToken };
  }

  private async ensureStoreExists() {
    const { shopDomain, accessToken } = this.getStoreFromEnv();

    let store = await this.repository.findStoreByDomain(shopDomain);

    if (!store) {
      store = await this.prisma.shopifyStore.create({
        data: {
          shopDomain,
          accessToken,
        },
      });
    }

    return store;
  }

  async syncOrders(
    options: { fromDate?: Date; limit?: number } = {}
  ): Promise<SyncResult> {
    const store = await this.ensureStoreExists();

    return this.syncService.syncOrders({
      storeId: store.id,
      ...options,
    });
  }

  async syncProducts(
    options: { fromDate?: Date; limit?: number } = {}
  ): Promise<SyncResult> {
    const store = await this.ensureStoreExists();

    return this.syncService.syncProducts({
      storeId: store.id,
      ...options,
    });
  }

  async syncCollections(
    options: { fromDate?: Date; limit?: number } = {}
  ): Promise<SyncResult> {
    const store = await this.ensureStoreExists();

    return this.syncService.syncCollections({
      storeId: store.id,
      ...options,
    });
  }

  async syncAll(
    options: { fromDate?: Date; limit?: number } = {}
  ): Promise<{
    orders: SyncResult;
    products: SyncResult;
    collections: SyncResult;
  }> {
    const store = await this.ensureStoreExists();

    const syncOptions = {
      storeId: store.id,
      ...options,
    };

    // Run all syncs in parallel for better performance
    const [orders, products, collections] = await Promise.all([
      this.syncService.syncOrders(syncOptions),
      this.syncService.syncProducts(syncOptions),
      this.syncService.syncCollections(syncOptions),
    ]);

    return { orders, products, collections };
  }

  async testConnection(): Promise<{ connected: boolean }> {
    const store = await this.ensureStoreExists();
    const connected = await this.syncService.testStoreConnection(store.id);
    return { connected };
  }

  async getOrders(options: { limit?: number; offset?: number } = {}) {
    const { limit = 50, offset = 0 } = options;

    const orders = await this.prisma.shopifyOrder.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
      include: {
        lineItems: true,
      },
    });

    const total = await this.prisma.shopifyOrder.count();

    return {
      orders,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getProducts(options: { limit?: number; offset?: number } = {}) {
    const { limit = 50, offset = 0 } = options;

    const products = await this.prisma.shopifyProduct.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
      include: {
        variants: true,
        collections: {
          include: {
            collection: true,
          },
        },
      },
    });

    const total = await this.prisma.shopifyProduct.count();

    return {
      products,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getCollections(options: { limit?: number; offset?: number } = {}) {
    const { limit = 50, offset = 0 } = options;

    const collections = await this.prisma.shopifyCollection.findMany({
      take: limit,
      skip: offset,
      orderBy: { updatedAt: "desc" },
      include: {
        products: {
          include: {
            product: true,
          },
        },
      },
    });

    const total = await this.prisma.shopifyCollection.count();

    return {
      collections,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getVariants(options: { limit?: number; offset?: number } = {}) {
    const { limit = 50, offset = 0 } = options;

    const variants = await this.prisma.shopifyProductVariant.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
      },
    });

    const total = await this.prisma.shopifyProductVariant.count();

    return {
      variants,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }
}
