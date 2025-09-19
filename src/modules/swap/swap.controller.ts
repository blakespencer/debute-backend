import { Request, Response } from "express";
import { SwapService } from "./swap.service";
import { AppError } from "../../common/errors";
import { logger } from "../../common/logger";

export class SwapController {
  constructor(private swapService: SwapService) {}

  async syncReturns(req: Request, res: Response): Promise<void> {
    try {
      const { fromDate, toDate, limit } = req.body;

      // Parse dates if provided
      const options: { fromDate?: Date; toDate?: Date; limit?: number } = {};

      if (fromDate) {
        options.fromDate = new Date(fromDate);
      }

      if (toDate) {
        options.toDate = new Date(toDate);
      }

      if (limit) {
        options.limit = parseInt(limit.toString(), 10);
      }

      const result = await this.swapService.syncReturns(options);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  }

  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      // For now, use environment credentials as fallback
      // TODO: In future, accept store credentials via request
      const result = await this.swapService.testConnection();

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.errorWithUnknown("SWAP test connection failed", error, {
        module: "swap",
        operation: "test-connection",
      });

      // Handle Prisma database errors with human-readable messages
      if (error instanceof Error) {
        if (
          error.message.includes("table `public.swap_stores` does not exist")
        ) {
          res.status(500).json({
            success: false,
            message:
              "Database setup incomplete: SWAP tables not created yet. Run database migrations.",
          });
          return;
        }

        if (error.message.includes("Can't reach database server")) {
          res.status(500).json({
            success: false,
            message:
              "Database connection failed: Please make sure the database is running.",
          });
          return;
        }
      }

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message:
            "SWAP API connection test failed. Check server logs for details.",
        });
      }
    }
  }

  async getReturns(req: Request, res: Response): Promise<void> {
    try {
      const { limit, offset, status, type, fromDate, toDate } = req.query;

      const options: any = {};

      if (limit) {
        options.limit = parseInt(limit.toString(), 10);
      }

      if (offset) {
        options.offset = parseInt(offset.toString(), 10);
      }

      if (status) {
        options.status = status.toString();
      }

      if (type) {
        options.type = type.toString();
      }

      if (fromDate) {
        options.fromDate = new Date(fromDate.toString());
      }

      if (toDate) {
        options.toDate = new Date(toDate.toString());
      }

      const result = await this.swapService.getReturns(options);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  }

  async getReturnById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.swapService.getReturnById(id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  }

  async getTotalRefunds(req: Request, res: Response): Promise<void> {
    try {
      const { fromDate, toDate } = req.query;
      const options: { fromDate?: Date; toDate?: Date } = {};

      if (fromDate) {
        options.fromDate = new Date(fromDate.toString());
      }
      if (toDate) {
        options.toDate = new Date(toDate.toString());
      }

      const result = await this.swapService.getTotalRefunds(options);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.errorWithUnknown("Failed to get total refunds", error, {
        module: "swap",
        operation: "total-refunds",
      });
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async getReturnsByProduct(req: Request, res: Response): Promise<void> {
    try {
      const { fromDate, toDate } = req.query;
      const options: { fromDate?: Date; toDate?: Date } = {};

      if (fromDate) {
        options.fromDate = new Date(fromDate.toString());
      }
      if (toDate) {
        options.toDate = new Date(toDate.toString());
      }

      const result = await this.swapService.getReturnsByProduct(options);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.errorWithUnknown("Failed to get returns by product", error, {
        module: "swap",
        operation: "returns-by-product",
      });
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async getReturnReasons(req: Request, res: Response): Promise<void> {
    try {
      const { fromDate, toDate } = req.query;
      const options: { fromDate?: Date; toDate?: Date } = {};

      if (fromDate) {
        options.fromDate = new Date(fromDate.toString());
      }
      if (toDate) {
        options.toDate = new Date(toDate.toString());
      }

      const result = await this.swapService.getReturnReasons(options);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.errorWithUnknown("Failed to get return reasons", error, {
        module: "swap",
        operation: "return-reasons",
      });
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async getReturnRates(req: Request, res: Response): Promise<void> {
    try {
      const { fromDate, toDate } = req.query;
      const options: { fromDate?: Date; toDate?: Date } = {};

      if (fromDate) {
        options.fromDate = new Date(fromDate.toString());
      }
      if (toDate) {
        options.toDate = new Date(toDate.toString());
      }

      const result = await this.swapService.getReturnRates(options);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.errorWithUnknown("Failed to get return rates", error, {
        module: "swap",
        operation: "return-rates",
      });
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async getReturnAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { fromDate, toDate } = req.query;

      const options: { fromDate?: Date; toDate?: Date } = {};

      if (fromDate) {
        options.fromDate = new Date(fromDate.toString());
      }

      if (toDate) {
        options.toDate = new Date(toDate.toString());
      }

      const [refunds, returnsByProduct, returnReasons, returnRates] =
        await Promise.all([
          this.swapService.getTotalRefunds(options),
          this.swapService.getReturnsByProduct(options),
          this.swapService.getReturnReasons(options),
          this.swapService.getReturnRates(options),
        ]);

      res.status(200).json({
        success: true,
        data: {
          refunds,
          returnsByProduct,
          returnReasons,
          returnRates,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  }
}
