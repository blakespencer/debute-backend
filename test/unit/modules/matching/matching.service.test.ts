// Standard unit test setup - prevents database connections
import '../../../helpers/unit-test-setup';

import { PrismaClient } from '@prisma/client';
import { MatchingService } from '../../../../src/modules/matching/matching.service';
import { createMockPrisma } from '../../../helpers/mocks/prisma.mock';

describe('MatchingService', () => {
  let matchingService: MatchingService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    matchingService = new MatchingService(mockPrisma);
  });

  describe('getMatchingStats', () => {
    it('should return correct statistics when no store filter is provided', async () => {
      // Arrange
      (mockPrisma.swapReturn.count as jest.Mock)
        .mockResolvedValueOnce(10) // totalSwapReturns
        .mockResolvedValueOnce(7)  // returnsWithShopifyId
        .mockResolvedValueOnce(5)  // matchedReturns (isMatched: true)
        .mockResolvedValueOnce(2); // unmatchedReturnsWithShopifyId

      // Act
      const result = await matchingService.getMatchingStats();

      // Assert
      expect(result).toEqual({
        totalSwapReturns: 10,
        returnsWithShopifyId: 7,
        matchableReturns: 5,
        unmatchableReturns: 2,
      });

      // Verify the correct queries were made
      expect(mockPrisma.swapReturn.count).toHaveBeenCalledTimes(4);
      expect(mockPrisma.swapReturn.count).toHaveBeenNthCalledWith(1, { where: {} });
      expect(mockPrisma.swapReturn.count).toHaveBeenNthCalledWith(2, {
        where: {
          shopifyOrderId: { not: null },
        },
      });
      expect(mockPrisma.swapReturn.count).toHaveBeenNthCalledWith(3, {
        where: {
          isMatched: true,
        },
      });
      expect(mockPrisma.swapReturn.count).toHaveBeenNthCalledWith(4, {
        where: {
          shopifyOrderId: { not: null },
          isMatched: false,
        },
      });
    });

    it('should return correct statistics when store filter is provided', async () => {
      // Arrange
      const storeId = 'test-store-123';

      (mockPrisma.swapReturn.count as jest.Mock)
        .mockResolvedValueOnce(5)  // totalSwapReturns for this store
        .mockResolvedValueOnce(3)  // returnsWithShopifyId for this store
        .mockResolvedValueOnce(2)  // matchedReturns for this store
        .mockResolvedValueOnce(1); // unmatchedReturnsWithShopifyId for this store

      // Act
      const result = await matchingService.getMatchingStats(storeId);

      // Assert
      expect(result).toEqual({
        totalSwapReturns: 5,
        returnsWithShopifyId: 3,
        matchableReturns: 2,
        unmatchableReturns: 1,
      });

      // Verify the correct queries were made with store filter
      expect(mockPrisma.swapReturn.count).toHaveBeenCalledTimes(4);
      expect(mockPrisma.swapReturn.count).toHaveBeenNthCalledWith(1, {
        where: { storeId }
      });
      expect(mockPrisma.swapReturn.count).toHaveBeenNthCalledWith(2, {
        where: {
          storeId,
          shopifyOrderId: { not: null },
        },
      });
      expect(mockPrisma.swapReturn.count).toHaveBeenNthCalledWith(3, {
        where: {
          storeId,
          isMatched: true,
        },
      });
      expect(mockPrisma.swapReturn.count).toHaveBeenNthCalledWith(4, {
        where: {
          storeId,
          shopifyOrderId: { not: null },
          isMatched: false,
        },
      });
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

      // Mock the findMany call for unmatched returns
      (mockPrisma.swapReturn.findMany as jest.Mock).mockResolvedValue(mockUnmatchedReturns);

      // Mock the findUnique calls for Shopify orders
      (mockPrisma.shopifyOrder.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockShopifyOrders[0])
        .mockResolvedValueOnce(mockShopifyOrders[1]);

      // Mock the update calls
      (mockPrisma.swapReturn.update as jest.Mock).mockResolvedValue({});

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

      // Verify the returns were actually updated
      expect(mockPrisma.swapReturn.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.swapReturn.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'return-1' },
        data: { isMatched: true },
      });
      expect(mockPrisma.swapReturn.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'return-2' },
        data: { isMatched: true },
      });
    });
  });
});