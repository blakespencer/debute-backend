import { AnalyticsRepository } from "./analytics.repository";
import { DateRange, OrderData, RevenueMetrics } from "./analytics.types";
import { ValidationError } from "../../common/errors";
import { Money } from "../../common/money";

export class AnalyticsService {
  private repository: AnalyticsRepository;

  constructor() {
    this.repository = new AnalyticsRepository();
  }

  async getRevenueMetrics(dateRange: DateRange): Promise<RevenueMetrics> {
    this.validateDateRange(dateRange);

    const orders = await this.repository.fetchOrderTotals(dateRange);

    // Use Money class for safe calculations
    const totalRevenue = orders
      .map((order) => new Money(order.totalAmount))
      .reduce((sum, money) => sum.add(money), new Money(0));

    const orderCount = orders.length;
    const averageOrderValue =
      orderCount > 0
        ? new Money(totalRevenue.toDollars() / orderCount)
        : new Money(0);

    return {
      totalRevenue: totalRevenue.toDollars(),
      orderCount,
      averageOrderValue: averageOrderValue.toDollars(),
      period: dateRange,
    };
  }

  private validateDateRange(dateRange: DateRange): void {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError("Invalid date format. Use YYYY-MM-DD");
    }

    if (start > end) {
      throw new ValidationError("Start date must be before end date");
    }

    // Don't allow ranges longer than 1 year
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > oneYear) {
      throw new ValidationError("Date range cannot exceed 1 year");
    }
  }
}
