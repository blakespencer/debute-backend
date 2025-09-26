import { Request, Response, NextFunction } from "express";
import { ShopifyService } from "./services/shopify.service";
import { PrismaClient } from "@prisma/client";

export class ShopifyController {
  private service: ShopifyService;

  constructor(prisma: PrismaClient) {
    this.service = new ShopifyService(prisma);
  }

  syncOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fromDate, limit } = req.body;

      const result = await this.service.syncOrders({
        fromDate: fromDate ? new Date(fromDate) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  syncProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fromDate, limit } = req.body;

      const result = await this.service.syncProducts({
        fromDate: fromDate ? new Date(fromDate) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  syncCollections = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fromDate, limit } = req.body;

      const result = await this.service.syncCollections({
        fromDate: fromDate ? new Date(fromDate) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  syncAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fromDate, limit } = req.body;

      const result = await this.service.syncAll({
        fromDate: fromDate ? new Date(fromDate) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  testConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.testConnection();

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit, offset } = req.query;

      const result = await this.service.getOrders({
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit, offset } = req.query;

      const result = await this.service.getProducts({
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getCollections = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit, offset } = req.query;

      const result = await this.service.getCollections({
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getVariants = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit, offset } = req.query;

      const result = await this.service.getVariants({
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
