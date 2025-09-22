import { Request, Response } from "express";
import { MatchingService } from "./matching.service";
import { AppError } from "../../common/errors";
import { logger } from "../../common/logger";

export class MatchingController {
  constructor(private matchingService: MatchingService) {}

  async matchSwapToShopify(req: Request, res: Response): Promise<void> {
    try {
      const { batchSize, dryRun, storeId } = req.body;

      const options = {
        batchSize: batchSize ? parseInt(batchSize.toString(), 10) : undefined,
        dryRun: Boolean(dryRun),
        storeId: storeId?.toString(),
      };

      const result = await this.matchingService.matchSwapToShopify(options);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.errorWithUnknown("Failed to match SWAP returns to Shopify orders", error, {
        module: "matching",
        operation: "match-swap-shopify",
      });

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

  async getMatchingStats(req: Request, res: Response): Promise<void> {
    try {
      const { storeId } = req.query;

      const stats = await this.matchingService.getMatchingStats(
        storeId?.toString()
      );

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.errorWithUnknown("Failed to get matching statistics", error, {
        module: "matching",
        operation: "get-stats",
      });

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

  async getUnmatchedReturns(req: Request, res: Response): Promise<void> {
    try {
      const { limit, storeId } = req.query;

      const unmatchedReturns = await this.matchingService.getUnmatchedReturns(
        limit ? parseInt(limit.toString(), 10) : undefined,
        storeId?.toString()
      );

      res.status(200).json({
        success: true,
        data: {
          unmatchedReturns,
          count: unmatchedReturns.length,
        },
      });
    } catch (error) {
      logger.errorWithUnknown("Failed to get unmatched returns", error, {
        module: "matching",
        operation: "get-unmatched",
      });

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