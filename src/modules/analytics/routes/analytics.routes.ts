import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AnalyticsController } from '../analytics.controller';

export function createAnalyticsRouter(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new AnalyticsController(prisma);

  router.get('/total-revenue', controller.getTotalRevenue);
  router.get('/order-count', controller.getOrderCount);
  router.get('/average-order-value', controller.getAverageOrderValue);

  return router;
}