import { PrismaClient } from "@prisma/client";
import { AnalyticsRepository } from "./analytics.repository";
import { DateRange, OrderData, RevenueMetrics } from "./analytics.types";
import { ValidationError } from "../../common/errors";

export class AnalyticsService {
  private repository: AnalyticsRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new AnalyticsRepository(prisma);
  }

  async getTotalRevenue(dateRange?: DateRange): Promise<number> {
    if (dateRange) {
      this.validateDateRange(dateRange);
    }

    const revenue = await this.repository.getTotalRevenue(dateRange);
    return Number(revenue);
  }

  async getOrderCount(dateRange?: DateRange): Promise<number> {
    if (dateRange) {
      this.validateDateRange(dateRange);
    }

    return await this.repository.getOrderCount(dateRange);
  }

  async getAverageOrderValue(dateRange?: DateRange): Promise<number> {
    if (dateRange) {
      this.validateDateRange(dateRange);
    }

    const average = await this.repository.getAverageOrderValue(dateRange);
    return Number(average);
  }

  async getRevenueMetrics(dateRange: DateRange): Promise<RevenueMetrics> {
    this.validateDateRange(dateRange);

    const totalRevenue = await this.getTotalRevenue(dateRange);
    const orderCount = await this.getOrderCount(dateRange);
    const averageOrderValue = await this.getAverageOrderValue(dateRange);

    return {
      totalRevenue,
      orderCount,
      averageOrderValue,
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
