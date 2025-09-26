import { PrismaClient } from "@prisma/client";
import { UnifiedShopifyRepository } from "../repositories/unified-shopify.repository";
import { BaseShopifyService } from "./base-service";

/**
 * Service for retrieving Shopify data with pagination
 * Handles getOrders, getProducts, getCollections, getVariants operations
 */
export class ShopifyDataService extends BaseShopifyService {
  private repository: UnifiedShopifyRepository;

  constructor(private prisma: PrismaClient) {
    super();
    this.repository = new UnifiedShopifyRepository(prisma);
  }

  /**
   * Implementation of abstract method from BaseShopifyService
   */
  protected getPaginationItemsKey(): string {
    return 'items';
  }

  async getOrders(options: { limit?: number; offset?: number } = {}) {
    return this.executeDataOperation(
      async () => {
        this.validatePaginationOptions(options);
        const { limit = 50, offset = 0 } = options;

        const orders = await this.repository.findOrdersWithPagination({
          limit,
          offset,
        });

        const total = await this.repository.countOrders();

        return {
          orders,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
          },
        };
      },
      'ShopifyOrder',
      'getOrders',
      { options }
    );
  }

  async getProducts(options: { limit?: number; offset?: number } = {}) {
    return this.executeDataOperation(
      async () => {
        this.validatePaginationOptions(options);
        const { limit = 50, offset = 0 } = options;

        const products = await this.repository.findProductsWithPagination({
          limit,
          offset,
        });

        const total = await this.repository.countProducts();

        return {
          products,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
          },
        };
      },
      'ShopifyProduct',
      'getProducts',
      { options }
    );
  }

  async getCollections(options: { limit?: number; offset?: number } = {}) {
    return this.executeDataOperation(
      async () => {
        this.validatePaginationOptions(options);
        const { limit = 50, offset = 0 } = options;

        const collections = await this.repository.findCollectionsWithPagination({
          limit,
          offset,
        });

        const total = await this.repository.countCollections();

        return {
          collections,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
          },
        };
      },
      'ShopifyCollection',
      'getCollections',
      { options }
    );
  }

  async getVariants(options: { limit?: number; offset?: number } = {}) {
    return this.executeDataOperation(
      async () => {
        this.validatePaginationOptions(options);
        const { limit = 50, offset = 0 } = options;

        const variants = await this.repository.findVariantsWithPagination({
          limit,
          offset,
        });

        const total = await this.repository.countVariants();

        return {
          variants,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
          },
        };
      },
      'ShopifyProductVariant',
      'getVariants',
      { options }
    );
  }
}