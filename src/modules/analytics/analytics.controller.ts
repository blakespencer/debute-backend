import { Request, Response, NextFunction } from "express";
import { AnalyticsService } from "./analytics.service";
import { DateRange } from "./analytics.types";
import { ValidationError } from "../../common/errors";

export class AnalyticsController {
  private service: AnalyticsService;

  constructor() {
    this.service = new AnalyticsService();
  }

  getRevenue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start, end } = req.query;

      if (!start || !end) {
        throw new ValidationError(
          "Both start and end date parameters are required"
        );
      }

      const dateRange: DateRange = {
        start: start as string,
        end: end as string,
      };

      const metrics = await this.service.getRevenueMetrics(dateRange);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  };
}
