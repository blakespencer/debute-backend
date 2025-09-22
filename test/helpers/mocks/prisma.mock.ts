// Mock implementations for Prisma client
import { PrismaClient } from '@prisma/client';

export function createMockPrisma(): jest.Mocked<PrismaClient> {
  return {
    swapReturn: {
      count: jest.fn().mockImplementation(() => Promise.resolve(0)),
      findMany: jest.fn().mockImplementation(() => Promise.resolve([])),
      findUnique: jest.fn().mockImplementation(() => Promise.resolve(null)),
      update: jest.fn().mockImplementation(() => Promise.resolve({})),
    },
    shopifyOrder: {
      count: jest.fn().mockImplementation(() => Promise.resolve(0)),
      findMany: jest.fn().mockImplementation(() => Promise.resolve([])),
      findUnique: jest.fn().mockImplementation(() => Promise.resolve(null)),
    },
  } as any;
}