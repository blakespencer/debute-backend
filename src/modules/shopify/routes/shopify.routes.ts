import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ShopifyController } from '../shopify.controller';

export function createShopifyRouter(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new ShopifyController(prisma);

  router.post('/sync', controller.syncOrders);
  router.get('/test', controller.testConnection);
  router.get('/orders', controller.getOrders);

  return router;
}