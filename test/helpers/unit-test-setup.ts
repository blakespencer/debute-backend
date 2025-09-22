/**
 * Standard setup for unit tests to avoid database dependencies
 * Use this at the top of every unit test file to ensure consistent behavior
 */

// Mock the logger to prevent database connections during unit tests
jest.mock('../../src/common/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    time: jest.fn().mockImplementation(async (operation, fn) => {
      try {
        return await fn();
      } catch (error) {
        throw error;
      }
    })
  }),
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    errorWithUnknown: jest.fn(),
    warn: jest.fn(),
  }
}));

// Prevent any accidental database connections during unit tests
jest.mock('../../src/common/database', () => ({
  prisma: {},
  createPrismaClient: jest.fn()
}));