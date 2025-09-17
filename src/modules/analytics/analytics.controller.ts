import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AnalyticsService } from "./analytics.service";
import { DateRange } from "./analytics.types";
import { ValidationError } from "../../common/errors";

export class AnalyticsController {
  private service: AnalyticsService;

  constructor(prisma: PrismaClient) {
    this.service = new AnalyticsService(prisma);
  }

  getTotalRevenue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start, end } = req.query;

      const dateRange: DateRange | undefined =
        start && end
          ? {
              start: start as string,
              end: end as string,
            }
          : undefined;

      const revenue = await this.service.getTotalRevenue(dateRange);

      res.json({
        success: true,
        data: { totalRevenue: revenue },
      });
    } catch (error) {
      next(error);
    }
  };

  getOrderCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start, end } = req.query;

      const dateRange: DateRange | undefined =
        start && end
          ? {
              start: start as string,
              end: end as string,
            }
          : undefined;

      const count = await this.service.getOrderCount(dateRange);

      res.json({
        success: true,
        data: { orderCount: count },
      });
    } catch (error) {
      next(error);
    }
  };

  getAverageOrderValue = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { start, end } = req.query;

      const dateRange: DateRange | undefined =
        start && end
          ? {
              start: start as string,
              end: end as string,
            }
          : undefined;

      const average = await this.service.getAverageOrderValue(dateRange);

      res.json({
        success: true,
        data: { averageOrderValue: average },
      });
    } catch (error) {
      next(error);
    }
  };
}
