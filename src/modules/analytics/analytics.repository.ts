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
      status: "completed",
    };

    if (dateRange) {
      whereClause.orderDate = {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end),
      };
    }

    const result = await this.prisma.order.aggregate({
      where: whereClause,
      _sum: {
        totalAmount: true,
      },
    });

    return result._sum.totalAmount || 0;
  }

  async getOrderCount(dateRange?: DateRange) {
    const whereClause: any = {
      status: "completed",
    };

    if (dateRange) {
      whereClause.orderDate = {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end),
      };
    }

    return await this.prisma.order.count({
      where: whereClause,
    });
  }

  async getAverageOrderValue(dateRange?: DateRange) {
    const whereClause: any = {
      status: "completed",
    };

    if (dateRange) {
      whereClause.orderDate = {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end),
      };
    }

    const result = await this.prisma.order.aggregate({
      where: whereClause,
      _avg: {
        totalAmount: true,
      },
    });

    return result._avg.totalAmount || 0;
  }
}
