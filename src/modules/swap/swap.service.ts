import { PrismaClient } from "@prisma/client";
import { SwapRepository } from "./swap.repository";
import { SwapSyncService } from "./swap.sync.service";
import { SwapSyncResult, SwapQueryOptions } from "./swap.types";
import { AppError } from "../../common/errors";
import { SwapStoreError } from "./swap.errors";
import { createLogger } from "../../common/logger";

export class SwapService {
  private repository: SwapRepository;
  private syncService: SwapSyncService;
  private logger = createLogger("SwapService");

  constructor(private prisma: PrismaClient) {
    this.repository = new SwapRepository(prisma);
    this.syncService = new SwapSyncService(prisma);
  }

  private getStoreFromEnv() {
    const swapStoreId = process.env.SWAP_STORE_ID;
    const swapApiKey = process.env.SWAP_API_KEY;

    if (!swapStoreId || !swapApiKey) {
      throw new AppError("SWAP credentials not configured", 500);
    }

    return { swapStoreId, swapApiKey };
  }

  private async ensureStoreExists() {
    const { swapStoreId, swapApiKey } = this.getStoreFromEnv();

    let store = await this.repository.findStoreBySwapStoreId(swapStoreId);

    if (!store) {
      store = await this.repository.createStore({
        swapStoreId,
        apiKey: swapApiKey,
        storeName: "Default Store",
      });
    }

    return store;
  }

  async syncReturns(
    options: { fromDate?: Date; toDate?: Date; limit?: number } = {}
  ): Promise<SwapSyncResult> {
    const store = await this.ensureStoreExists();

    return this.syncService.syncReturns({
      storeId: store.id,
      ...options,
    });
  }

  async testConnection(): Promise<{ connected: boolean }> {
    const store = await this.ensureStoreExists();
    const connected = await this.syncService.testStoreConnection(store.id);
    return { connected };
  }

  async getReturns(options: SwapQueryOptions = {}) {
    const { limit = 50, offset = 0 } = options;

    const result = await this.repository.getReturns({
      ...options,
      limit,
      offset,
    });

    return {
      returns: result.returns,
      pagination: {
        total: result.pagination.total,
        limit,
        offset,
        hasMore: result.pagination.hasMore,
      },
    };
  }

  async getReturnById(id: string) {
    const returnRecord = await this.prisma.swapReturn.findUnique({
      where: { id },
      include: {
        products: true,
        store: true,
      },
    });

    if (!returnRecord) {
      throw new SwapStoreError(`Return not found: ${id}`);
    }

    return returnRecord;
  }

  // Analytics methods
  async getTotalRefunds(
    options: {
      fromDate?: Date;
      toDate?: Date;
    } = {}
  ) {
    const store = await this.ensureStoreExists();

    return this.repository.getTotalRefunds({
      storeId: store.id,
      ...options,
    });
  }

  async getReturnsByProduct(
    options: {
      fromDate?: Date;
      toDate?: Date;
    } = {}
  ) {
    const store = await this.ensureStoreExists();

    return this.repository.getReturnsByProduct({
      storeId: store.id,
      ...options,
    });
  }

  async getReturnReasons(
    options: {
      fromDate?: Date;
      toDate?: Date;
    } = {}
  ) {
    const store = await this.ensureStoreExists();

    return this.repository.getReturnReasons({
      storeId: store.id,
      ...options,
    });
  }

  async getReturnRates(
    options: {
      fromDate?: Date;
      toDate?: Date;
    } = {}
  ) {
    const store = await this.ensureStoreExists();

    // Get total refunds
    const refundData = await this.repository.getTotalRefunds({
      storeId: store.id,
      ...options,
    });

    // Get Shopify order count and revenue for the same period
    const whereClause: any = {
      displayFinancialStatus: "PAID",
    };

    if (options.fromDate || options.toDate) {
      whereClause.createdAt = {};
      if (options.fromDate) {
        whereClause.createdAt.gte = options.fromDate;
      }
      if (options.toDate) {
        whereClause.createdAt.lte = options.toDate;
      }
    }

    const [shopifyOrderCount, shopifyRevenue] = await Promise.all([
      this.prisma.shopifyOrder.count({ where: whereClause }),
      this.prisma.shopifyOrder.aggregate({
        where: whereClause,
        _sum: { currentTotalPriceAmount: true },
      }),
    ]);

    const totalRevenue = shopifyRevenue._sum.currentTotalPriceAmount || 0;
    const totalRefunds = refundData.totalRefundAmount || 0;
    const refundCount = refundData.refundCount || 0;
    const orderCount = shopifyOrderCount || 0;

    return {
      totalRevenue,
      totalRefunds,
      netRevenue: Number(totalRevenue) - Number(totalRefunds),
      refundCount,
      orderCount,
      returnRate: orderCount > 0 ? (refundCount / orderCount) * 100 : 0,
      refundRate:
        Number(totalRevenue) > 0
          ? (Number(totalRefunds) / Number(totalRevenue)) * 100
          : 0,
    };
  }
}
