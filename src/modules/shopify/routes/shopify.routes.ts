import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ShopifyController } from '../shopify.controller';

export function createShopifyRouter(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new ShopifyController(prisma);

  // Comprehensive sync (recommended)
  router.post('/sync', controller.syncAll);

  // Individual sync endpoints for granular control
  router.post('/sync/orders', controller.syncOrders);
  router.post('/sync/products', controller.syncProducts);
  router.post('/sync/collections', controller.syncCollections);

  // Other endpoints
  router.get('/test', controller.testConnection);
  router.get('/orders', controller.getOrders);
  router.get('/products', controller.getProducts);
  router.get('/collections', controller.getCollections);
  router.get('/variants', controller.getVariants);

  return router;
}