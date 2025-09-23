// Standard unit test setup - prevents database connections
import '../../../helpers/unit-test-setup';

import { PrismaClient } from '@prisma/client';
import { MatchingService } from '../../../../src/modules/matching/matching.service';
import { MatchingRepository } from '../../../../src/modules/matching/matching.repository';
import { createMockPrisma } from '../../../helpers/mocks/prisma.mock';

// Mock the repository
jest.mock('../../../../src/modules/matching/matching.repository');

describe('MatchingService', () => {
  let matchingService: MatchingService;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockRepository: jest.Mocked<MatchingRepository>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    matchingService = new MatchingService(mockPrisma);

    // Get the mocked repository instance
    mockRepository = (matchingService as any).repository as jest.Mocked<MatchingRepository>;
  });

  describe('getMatchingStats', () => {
    it('should return correct statistics when no store filter is provided', async () => {
      // Arrange
      const expectedStats = {
        totalSwapReturns: 10,
        returnsWithShopifyId: 7,
        matchableReturns: 5,
        unmatchableReturns: 2,
      };

      mockRepository.getMatchingStats = jest.fn().mockResolvedValue(expectedStats);

      // Act
      const result = await matchingService.getMatchingStats();

      // Assert
      expect(result).toEqual(expectedStats);
      expect(mockRepository.getMatchingStats).toHaveBeenCalledWith(undefined);
    });

    it('should return correct statistics when store filter is provided', async () => {
      // Arrange
      const storeId = 'test-store-123';
      const expectedStats = {
        totalSwapReturns: 5,
        returnsWithShopifyId: 3,
        matchableReturns: 2,
        unmatchableReturns: 1,
      };

      mockRepository.getMatchingStats = jest.fn().mockResolvedValue(expectedStats);

      // Act
      const result = await matchingService.getMatchingStats(storeId);

      // Assert
      expect(result).toEqual(expectedStats);
      expect(mockRepository.getMatchingStats).toHaveBeenCalledWith(storeId);
    });
  });

  describe('matchSwapToShopify', () => {
    it('should successfully match returns when corresponding Shopify orders exist', async () => {
      // Arrange
      const mockUnmatchedReturns = [
        {
          id: 'return-1',
          shopifyOrderId: 'shopify-order-123',
          orderName: '#1001',
          rma: 'RMA-001',
        },
        {
          id: 'return-2',
          shopifyOrderId: 'shopify-order-456',
          orderName: '#1002',
          rma: 'RMA-002',
        },
      ];

      const mockShopifyOrders = [
        {
          id: 'internal-shopify-1',
          shopifyOrderId: 'shopify-order-123',
          name: '#1001',
        },
        {
          id: 'internal-shopify-2',
          shopifyOrderId: 'shopify-order-456',
          name: '#1002',
        },
      ];

      // Mock repository methods
      mockRepository.findUnmatchedReturns = jest.fn().mockResolvedValue(mockUnmatchedReturns);
      mockRepository.findShopifyOrderById = jest.fn()
        .mockResolvedValueOnce(mockShopifyOrders[0])
        .mockResolvedValueOnce(mockShopifyOrders[1]);
      mockRepository.markReturnAsMatched = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await matchingService.matchSwapToShopify({ dryRun: false });

      // Assert
      expect(result).toEqual({
        totalReturnsProcessed: 2,
        successfulMatches: 2,
        shopifyOrdersNotFound: 0,
        alreadyMatched: 0,
        errors: [],
      });

      // Verify repository methods were called correctly
      expect(mockRepository.findUnmatchedReturns).toHaveBeenCalledWith(100, undefined);
      expect(mockRepository.findShopifyOrderById).toHaveBeenCalledTimes(2);
      expect(mockRepository.markReturnAsMatched).toHaveBeenCalledTimes(2);
      expect(mockRepository.markReturnAsMatched).toHaveBeenNthCalledWith(1, 'return-1');
      expect(mockRepository.markReturnAsMatched).toHaveBeenNthCalledWith(2, 'return-2');
    });
  });
});