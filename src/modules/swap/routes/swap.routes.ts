import { Router } from "express";
import { SwapController } from "../swap.controller";
import { SwapService } from "../swap.service";
import { prisma } from "../../../common/database";
import { logger } from "../../../common/logger";

const swapService = new SwapService(prisma);
const swapController = new SwapController(swapService);

const router = Router();


// Sync operations
router.post("/sync", (req, res) => swapController.syncReturns(req, res));
router.get("/test", (req, res) => swapController.testConnection(req, res));

// Returns data access
router.get("/returns", (req, res) => swapController.getReturns(req, res));
router.get("/returns/:id", (req, res) => swapController.getReturnById(req, res));

// Individual analytics endpoints to match Postman collection
router.get("/analytics/total-refunds", async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const options: { fromDate?: Date; toDate?: Date } = {};

    if (fromDate) {
      options.fromDate = new Date(fromDate.toString());
    }
    if (toDate) {
      options.toDate = new Date(toDate.toString());
    }

    const result = await swapService.getTotalRefunds(options);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.errorWithUnknown('Failed to get total refunds', error, { module: 'swap', operation: 'total-refunds' });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

router.get("/analytics/returns-by-product", async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const options: { fromDate?: Date; toDate?: Date } = {};

    if (fromDate) {
      options.fromDate = new Date(fromDate.toString());
    }
    if (toDate) {
      options.toDate = new Date(toDate.toString());
    }

    const result = await swapService.getReturnsByProduct(options);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.errorWithUnknown('Failed to get returns by product', error, { module: 'swap', operation: 'returns-by-product' });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

router.get("/analytics/return-reasons", async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const options: { fromDate?: Date; toDate?: Date } = {};

    if (fromDate) {
      options.fromDate = new Date(fromDate.toString());
    }
    if (toDate) {
      options.toDate = new Date(toDate.toString());
    }

    const result = await swapService.getReturnReasons(options);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.errorWithUnknown('Failed to get return reasons', error, { module: 'swap', operation: 'return-reasons' });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

router.get("/analytics/return-rates", async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const options: { fromDate?: Date; toDate?: Date } = {};

    if (fromDate) {
      options.fromDate = new Date(fromDate.toString());
    }
    if (toDate) {
      options.toDate = new Date(toDate.toString());
    }

    const result = await swapService.getReturnRates(options);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.errorWithUnknown('Failed to get return rates', error, { module: 'swap', operation: 'return-rates' });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Combined analytics (for backward compatibility)
router.get("/analytics", (req, res) => swapController.getReturnAnalytics(req, res));

export default router;