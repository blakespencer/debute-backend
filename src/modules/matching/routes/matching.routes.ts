import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { MatchingController } from "../matching.controller";
import { MatchingService } from "../matching.service";

export function createMatchingRouter(prisma: PrismaClient): Router {
  const matchingService = new MatchingService(prisma);
  const matchingController = new MatchingController(matchingService);

  const router = Router();

  // Matching operations
  router.post("/swap-shopify", (req, res) =>
    matchingController.matchSwapToShopify(req, res)
  );

  // Statistics and monitoring
  router.get("/stats", (req, res) =>
    matchingController.getMatchingStats(req, res)
  );

  router.get("/unmatched", (req, res) =>
    matchingController.getUnmatchedReturns(req, res)
  );

  return router;
}