import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { SwapQueryOptions } from './swap.types';

export class SwapRepository {
  constructor(private prisma: PrismaClient) {}

  // Store management
  async findStoreById(id: string) {
    return this.prisma.swapStore.findUnique({
      where: { id },
    });
  }

  async findStoreBySwapStoreId(swapStoreId: string) {
    return this.prisma.swapStore.findUnique({
      where: { swapStoreId },
    });
  }

  async createStore(data: {
    swapStoreId: string;
    apiKey: string;
    storeName?: string;
  }) {
    return this.prisma.swapStore.create({
      data,
    });
  }

  async updateStoreLastSync(storeId: string) {
    return this.prisma.swapStore.update({
      where: { id: storeId },
      data: { lastSyncAt: new Date() },
    });
  }

  // Return management
  async findReturnBySwapId(swapReturnId: string) {
    return this.prisma.swapReturn.findUnique({
      where: { swapReturnId },
      include: {
        products: true,
        returnReasons: true,
        store: true,
      },
    });
  }

  async createReturn(data: {
    swapReturnId: string;
    orderName: string;
    orderId: string;
    rma: string;
    shopifyOrderId?: string;
    storeId: string;
    typeString: string;
    type: string;
    status: string;
    shippingStatus: string;
    total: Decimal;
    handlingFee: Decimal;
    shopNowRevenue: Decimal;
    shopLaterRevenue: Decimal;
    exchangeRevenue: Decimal;
    refundRevenue: Decimal;
    totalAdditionalPayment: Decimal;
    totalCreditExchangeValue: Decimal;
    totalRefundValueCustomerCurrency: Decimal;
    customerName?: string;
    customerCurrency?: string;
    totalTax?: Decimal;
    totalDuty?: Decimal;
    taxCurrency?: string;
    dateCreated: Date;
    dateUpdated: Date;
  }) {
    return this.prisma.swapReturn.create({
      data,
      include: {
        products: true,
        returnReasons: true,
        store: true,
      },
    });
  }

  async updateReturn(swapReturnId: string, data: {
    orderName?: string;
    orderId?: string;
    rma?: string;
    shopifyOrderId?: string;
    typeString?: string;
    type?: string;
    status?: string;
    shippingStatus?: string;
    total?: Decimal;
    handlingFee?: Decimal;
    shopNowRevenue?: Decimal;
    shopLaterRevenue?: Decimal;
    exchangeRevenue?: Decimal;
    refundRevenue?: Decimal;
    totalAdditionalPayment?: Decimal;
    totalCreditExchangeValue?: Decimal;
    totalRefundValueCustomerCurrency?: Decimal;
    customerName?: string;
    customerCurrency?: string;
    totalTax?: Decimal;
    totalDuty?: Decimal;
    taxCurrency?: string;
    dateCreated?: Date;
    dateUpdated?: Date;
  }) {
    return this.prisma.swapReturn.update({
      where: { swapReturnId },
      data,
      include: {
        products: true,
        returnReasons: true,
        store: true,
      },
    });
  }

  async getReturns(options: SwapQueryOptions = {}) {
    const { limit = 50, offset = 0, storeId, status, type, fromDate, toDate } = options;

    const whereClause: any = {};

    if (storeId) {
      whereClause.storeId = storeId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.type = type;
    }

    if (fromDate || toDate) {
      whereClause.dateCreated = {};
      if (fromDate) {
        whereClause.dateCreated.gte = fromDate;
      }
      if (toDate) {
        whereClause.dateCreated.lte = toDate;
      }
    }

    const [returns, total] = await Promise.all([
      this.prisma.swapReturn.findMany({
        where: whereClause,
        include: {
          products: true,
          returnReasons: true,
          store: true,
        },
        orderBy: { dateCreated: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.swapReturn.count({ where: whereClause }),
    ]);

    return {
      returns,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  // Product management (SWAP uses products instead of line items)
  async createProduct(data: {
    productId: string;
    shopifyProductId: string;
    productName: string;
    sku: string;
    itemCount: number;
    cost: Decimal;
    returnType: string;
    returnId: string;
  }) {
    return this.prisma.swapProduct.create({
      data,
    });
  }

  // Return reason management
  async createReturnReason(data: {
    reason: string;
    itemCount: number;
    returnId: string;
  }) {
    return this.prisma.swapReturnReason.create({
      data,
    });
  }

  // Analytics queries
  async getTotalRefunds(options: {
    storeId?: string;
    fromDate?: Date;
    toDate?: Date;
  } = {}) {
    const { storeId, fromDate, toDate } = options;

    const whereClause: any = {
      type: { contains: 'Refund' },
      status: 'Closed', // Only count completed refunds
    };

    if (storeId) {
      whereClause.storeId = storeId;
    }

    if (fromDate || toDate) {
      whereClause.dateCreated = {};
      if (fromDate) {
        whereClause.dateCreated.gte = fromDate;
      }
      if (toDate) {
        whereClause.dateCreated.lte = toDate;
      }
    }

    const result = await this.prisma.swapReturn.aggregate({
      where: whereClause,
      _sum: {
        totalRefundValueCustomerCurrency: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      totalRefundAmount: result._sum?.totalRefundValueCustomerCurrency || new Decimal(0),
      refundCount: result._count?.id || 0,
    };
  }

  async getReturnsByProduct(options: {
    storeId?: string;
    fromDate?: Date;
    toDate?: Date;
  } = {}) {
    const { storeId, fromDate, toDate } = options;

    const whereClause: any = {};

    if (storeId) {
      whereClause.return = { storeId };
    }

    if (fromDate || toDate) {
      whereClause.return = {
        ...whereClause.return,
        dateCreated: {},
      };
      if (fromDate) {
        whereClause.return.dateCreated.gte = fromDate;
      }
      if (toDate) {
        whereClause.return.dateCreated.lte = toDate;
      }
    }

    return this.prisma.swapProduct.groupBy({
      by: ['productId', 'sku', 'productName'],
      where: whereClause,
      _sum: {
        itemCount: true,
        cost: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          itemCount: 'desc',
        },
      },
    });
  }

  async getReturnReasons(options: {
    storeId?: string;
    fromDate?: Date;
    toDate?: Date;
  } = {}) {
    const { storeId, fromDate, toDate } = options;

    const whereClause: any = {};

    if (storeId) {
      whereClause.storeId = storeId;
    }

    if (fromDate || toDate) {
      whereClause.dateCreated = {};
      if (fromDate) {
        whereClause.dateCreated.gte = fromDate;
      }
      if (toDate) {
        whereClause.dateCreated.lte = toDate;
      }
    }

    return this.prisma.swapReturnReason.groupBy({
      by: ['reason'],
      where: whereClause,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });
  }
}