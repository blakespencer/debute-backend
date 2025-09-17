import { PrismaClient } from "@prisma/client";
import { DateRange } from "./analytics.types";

export class AnalyticsRepository {
  constructor(private prisma: PrismaClient) {}

  async fetchOrderTotals(dateRange?: DateRange) {
    const whereClause: any = {
      status: "completed",
    };

    if (dateRange) {
      whereClause.orderDate = {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end),
      };
    }

    return await this.prisma.order.findMany({
      where: whereClause,
      select: {
        orderId: true,
        totalAmount: true,
        orderDate: true,
      },
      orderBy: {
        orderDate: "desc",
      },
    });
  }

  async getTotalRevenue(dateRange?: DateRange) {
    const whereClause: any = {
      displayFinancialStatus: "PAID",
    };

    if (dateRange) {
      whereClause.createdAt = {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end),
      };
    }

    // Use Shopify orders if available, fallback to basic orders
    const shopifyResult = await this.prisma.shopifyOrder.aggregate({
      where: whereClause,
      _sum: {
        currentTotalPriceAmount: true,
      },
    });

    if (shopifyResult._sum.currentTotalPriceAmount) {
      return shopifyResult._sum.currentTotalPriceAmount;
    }

    // Fallback to basic orders
    const basicWhereClause: any = { status: "completed" };
    if (dateRange) {
      basicWhereClause.orderDate = {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end),
      };
    }

    const basicResult = await this.prisma.order.aggregate({
      where: basicWhereClause,
      _sum: {
        totalAmount: true,
      },
    });

    return basicResult._sum.totalAmount || 0;
  }

  async getOrderCount(dateRange?: DateRange) {
    const whereClause: any = {
      displayFinancialStatus: "PAID",
    };

    if (dateRange) {
      whereClause.createdAt = {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end),
      };
    }

    // Use Shopify orders if available, fallback to basic orders
    const shopifyCount = await this.prisma.shopifyOrder.count({
      where: whereClause,
    });

    if (shopifyCount > 0) {
      return shopifyCount;
    }

    // Fallback to basic orders
    const basicWhereClause: any = { status: "completed" };
    if (dateRange) {
      basicWhereClause.orderDate = {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end),
      };
    }

    return await this.prisma.order.count({
      where: basicWhereClause,
    });
  }

  async getAverageOrderValue(dateRange?: DateRange) {
    const whereClause: any = {
      displayFinancialStatus: "PAID",
    };

    if (dateRange) {
      whereClause.createdAt = {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end),
      };
    }

    // Use Shopify orders if available, fallback to basic orders
    const shopifyResult = await this.prisma.shopifyOrder.aggregate({
      where: whereClause,
      _avg: {
        currentTotalPriceAmount: true,
      },
    });

    if (shopifyResult._avg.currentTotalPriceAmount) {
      return shopifyResult._avg.currentTotalPriceAmount;
    }

    // Fallback to basic orders
    const basicWhereClause: any = { status: "completed" };
    if (dateRange) {
      basicWhereClause.orderDate = {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end),
      };
    }

    const basicResult = await this.prisma.order.aggregate({
      where: basicWhereClause,
      _avg: {
        totalAmount: true,
      },
    });

    return basicResult._avg.totalAmount || 0;
  }
}
