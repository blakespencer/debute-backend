import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "../../../common/repositories/base-repository";
import { AppError } from "../../../common/errors";
import { ShopifyDataError } from "../shopify.errors";

/**
 * Shopify-specific base repository that extends the generic base
 * Provides Shopify domain errors and any Shopify-specific patterns
 */
export abstract class BaseShopifyRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Creates Shopify-specific domain errors
   * Implementation of abstract method from BaseRepository
   */
  protected createDomainError(
    message: string,
    cause?: Error,
    context?: {
      operation?: string;
      entity?: string;
      entityId?: string;
    }
  ): AppError {
    return new ShopifyDataError(message, cause, context);
  }
}