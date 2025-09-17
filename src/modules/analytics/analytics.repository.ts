import { prisma } from "../../common/database";
import { DateRange } from "./analytics.types";

export class AnalyticsRepository {
  async fetchOrderTotals(dateRange: DateRange) {
    return await prisma.order.findMany({
      where: {
        orderDate: {
          gte: new Date(dateRange.start),
          lte: new Date(dateRange.end),
        },
        status: "completed",
      },
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
}
