import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { SwapController } from "../swap.controller";
import { SwapService } from "../swap.service";
import { logger } from "../../../common/logger";

export function createSwapRouter(prisma: PrismaClient): Router {
  const swapService = new SwapService(prisma);
  const swapController = new SwapController(swapService);

  const router = Router();

  router.post("/sync", (req, res) => swapController.syncReturns(req, res));
  router.get("/test", (req, res) => swapController.testConnection(req, res));
  router.get("/returns", (req, res) => swapController.getReturns(req, res));
  router.get("/returns/:id", (req, res) =>
    swapController.getReturnById(req, res)
  );

  // Individual analytics endpoints
  router.get("/total-refunds", (req, res) =>
    swapController.getTotalRefunds(req, res)
  );
  router.get("/returns-by-product", (req, res) =>
    swapController.getReturnsByProduct(req, res)
  );
  router.get("/return-reasons", (req, res) =>
    swapController.getReturnReasons(req, res)
  );
  router.get("/return-rates", (req, res) =>
    swapController.getReturnRates(req, res)
  );

  // Combined analytics (for backward compatibility)
  router.get("/analytics", (req, res) =>
    swapController.getReturnAnalytics(req, res)
  );

  return router;
}
