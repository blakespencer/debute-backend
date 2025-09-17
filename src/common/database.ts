/**
 * Centralized database configuration
 * Handles environment-based URL selection and Prisma client management
 */

import { PrismaClient } from "@prisma/client";

export function getDatabaseUrl(): string {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'test':
      return process.env.DATABASE_URL_TEST || 'postgresql://postgres:securepassword123@test-db:5432/backend_test';

    case 'production':
      return process.env.DATABASE_URL_PRODUCTION || process.env.DATABASE_URL || 'postgresql://postgres:securepassword123@db:5432/backend_prod';

    case 'development':
    default:
      return process.env.DATABASE_URL || 'postgresql://postgres:securepassword123@db:5432/backend_dev';
  }
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

// Global Prisma client singleton (prevents multiple instances)
declare global {
  var __prisma: PrismaClient | undefined;
}

export function createPrismaClient(): PrismaClient {
  const databaseUrl = getDatabaseUrl();

  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });

  // Log database connection info in non-production
  if (!isProduction()) {
    console.log(`🗄️  Database: ${databaseUrl.replace(/:[^:@]*@/, ':***@')}`);
  }

  return client;
}

// Export singleton instance
export const prisma = globalThis.__prisma || createPrismaClient();

if (!isProduction()) {
  globalThis.__prisma = prisma;
}