// Standard unit test setup - prevents database connections
import '../../../helpers/unit-test-setup';

import { SwapService } from '../../../../src/modules/swap/swap.service';
import { SwapRepository } from '../../../../src/modules/swap/swap.repository';
import { SwapSyncService } from '../../../../src/modules/swap/swap.sync.service';
import { createMockPrisma } from '../../../helpers/mocks/prisma.mock';
import { AppError } from '../../../../src/common/errors';
import { SwapStoreError } from '../../../../src/modules/swap/swap.errors';
import { Decimal } from '@prisma/client/runtime/library';

// Mock the dependencies
jest.mock('../../../../src/modules/swap/swap.repository');
jest.mock('../../../../src/modules/swap/swap.sync.service');

describe('SwapService', () => {
  let service: SwapService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockRepository: jest.Mocked<SwapRepository>;
  let mockSyncService: jest.Mocked<SwapSyncService>;

  const mockStore = {
    id: 'store-123',
    swapStoreId: 'swap-store-456',
    apiKey: 'test-api-key',
    storeName: 'Test Store',
    lastSyncAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    mockPrisma = createMockPrisma();

    // Create mocked instances
    mockRepository = {
      findStoreBySwapStoreId: jest.fn(),
      createStore: jest.fn(),
      getTotalRefunds: jest.fn(),
      getReturnsByProduct: jest.fn(),
      getReturnReasons: jest.fn(),
      getReturns: jest.fn()
    } as any;

    mockSyncService = {
      syncReturns: jest.fn(),
      testStoreConnection: jest.fn()
    } as any;

    // Mock the constructors to return our mocked instances
    (SwapRepository as jest.MockedClass<typeof SwapRepository>).mockImplementation(() => mockRepository);
    (SwapSyncService as jest.MockedClass<typeof SwapSyncService>).mockImplementation(() => mockSyncService);

    service = new SwapService(mockPrisma as any);

    // Reset environment variables
    delete process.env.SWAP_STORE_ID;
    delete process.env.SWAP_API_KEY;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize repository and sync service', () => {
      expect(SwapRepository).toHaveBeenCalledWith(mockPrisma);
      expect(SwapSyncService).toHaveBeenCalledWith(mockPrisma);
    });
  });

  describe('getStoreFromEnv', () => {
    test('should throw error when SWAP_STORE_ID is missing', async () => {
      process.env.SWAP_API_KEY = 'test-key';
      // SWAP_STORE_ID is missing

      await expect(service.syncReturns()).rejects.toThrow(AppError);
      await expect(service.syncReturns()).rejects.toThrow('SWAP credentials not configured');
    });

    test('should throw error when SWAP_API_KEY is missing', async () => {
      process.env.SWAP_STORE_ID = 'test-store';
      // SWAP_API_KEY is missing

      await expect(service.syncReturns()).rejects.toThrow(AppError);
      await expect(service.syncReturns()).rejects.toThrow('SWAP credentials not configured');
    });

    test('should return credentials when both are present', async () => {
      process.env.SWAP_STORE_ID = 'test-store';
      process.env.SWAP_API_KEY = 'test-key';

      mockRepository.findStoreBySwapStoreId.mockResolvedValue(mockStore);
      mockSyncService.syncReturns.mockResolvedValue({
        returnsProcessed: 0,
        returnsCreated: 0,
        returnsUpdated: 0,
        errors: []
      });

      await service.syncReturns();

      expect(mockRepository.findStoreBySwapStoreId).toHaveBeenCalledWith('test-store');
    });
  });

  describe('ensureStoreExists', () => {
    beforeEach(() => {
      process.env.SWAP_STORE_ID = 'test-store';
      process.env.SWAP_API_KEY = 'test-key';
    });

    test('should return existing store when found', async () => {
      mockRepository.findStoreBySwapStoreId.mockResolvedValue(mockStore);
      mockSyncService.syncReturns.mockResolvedValue({
        returnsProcessed: 0,
        returnsCreated: 0,
        returnsUpdated: 0,
        errors: []
      });

      await service.syncReturns();

      expect(mockRepository.findStoreBySwapStoreId).toHaveBeenCalledWith('test-store');
      expect(mockRepository.createStore).not.toHaveBeenCalled();
    });

    test('should create new store when not found', async () => {
      mockRepository.findStoreBySwapStoreId.mockResolvedValue(null);
      mockRepository.createStore.mockResolvedValue(mockStore);
      mockSyncService.syncReturns.mockResolvedValue({
        returnsProcessed: 0,
        returnsCreated: 0,
        returnsUpdated: 0,
        errors: []
      });

      await service.syncReturns();

      expect(mockRepository.createStore).toHaveBeenCalledWith({
        swapStoreId: 'test-store',
        apiKey: 'test-key',
        storeName: 'Default Store'
      });
    });
  });

  describe('syncReturns', () => {
    beforeEach(() => {
      process.env.SWAP_STORE_ID = 'test-store';
      process.env.SWAP_API_KEY = 'test-key';
      mockRepository.findStoreBySwapStoreId.mockResolvedValue(mockStore);
    });

    test('should sync returns with default options', async () => {
      const syncResult = {
        returnsProcessed: 10,
        returnsCreated: 5,
        returnsUpdated: 3,
        errors: []
      };

      mockSyncService.syncReturns.mockResolvedValue(syncResult);

      const result = await service.syncReturns();

      expect(mockSyncService.syncReturns).toHaveBeenCalledWith({
        storeId: 'store-123'
      });
      expect(result).toEqual(syncResult);
    });

    test('should sync returns with custom options', async () => {
      const options = {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-02-01'),
        limit: 50
      };

      const syncResult = {
        returnsProcessed: 50,
        returnsCreated: 25,
        returnsUpdated: 20,
        errors: ['Some error']
      };

      mockSyncService.syncReturns.mockResolvedValue(syncResult);

      const result = await service.syncReturns(options);

      expect(mockSyncService.syncReturns).toHaveBeenCalledWith({
        storeId: 'store-123',
        ...options
      });
      expect(result).toEqual(syncResult);
    });
  });

  describe('testConnection', () => {
    beforeEach(() => {
      process.env.SWAP_STORE_ID = 'test-store';
      process.env.SWAP_API_KEY = 'test-key';
      mockRepository.findStoreBySwapStoreId.mockResolvedValue(mockStore);
    });

    test('should return connection status', async () => {
      mockSyncService.testStoreConnection.mockResolvedValue(true);

      const result = await service.testConnection();

      expect(mockSyncService.testStoreConnection).toHaveBeenCalledWith('store-123');
      expect(result).toEqual({ connected: true });
    });

    test('should return false when connection fails', async () => {
      mockSyncService.testStoreConnection.mockResolvedValue(false);

      const result = await service.testConnection();

      expect(result).toEqual({ connected: false });
    });
  });

  describe('getReturns', () => {
    test('should get returns with default pagination', async () => {
      const mockReturns = {
        returns: [],
        pagination: {
          total: 100,
          limit: 50,
          offset: 0,
          hasMore: true
        }
      };

      mockRepository.getReturns.mockResolvedValue(mockReturns);

      const result = await service.getReturns();

      expect(mockRepository.getReturns).toHaveBeenCalledWith({
        limit: 50,
        offset: 0
      });
      expect(result).toEqual({
        returns: [],
        pagination: {
          total: 100,
          limit: 50,
          offset: 0,
          hasMore: true
        }
      });
    });

    test('should get returns with custom options', async () => {
      const options = {
        limit: 25,
        offset: 50,
        status: 'Closed',
        type: 'Refund'
      };

      const mockReturns = {
        returns: [],
        pagination: {
          total: 200,
          limit: 25,
          offset: 50,
          hasMore: true
        }
      };

      mockRepository.getReturns.mockResolvedValue(mockReturns);

      const result = await service.getReturns(options);

      expect(mockRepository.getReturns).toHaveBeenCalledWith(options);
      expect(result).toEqual({
        returns: [],
        pagination: {
          total: 200,
          limit: 25,
          offset: 50,
          hasMore: true
        }
      });
    });
  });

  describe('getReturnById', () => {
    test('should return specific return by id', async () => {
      const mockReturn = {
        id: 'return-123',
        swapReturnId: 'swap-456',
        products: [],
        store: mockStore
      };

      mockPrisma.swapReturn.findUnique.mockResolvedValue(mockReturn as any);

      const result = await service.getReturnById('return-123');

      expect(mockPrisma.swapReturn.findUnique).toHaveBeenCalledWith({
        where: { id: 'return-123' },
        include: {
          products: true,
          addresses: true,
          store: true
        }
      });
      expect(result).toEqual(mockReturn);
    });

    test('should throw error when return not found', async () => {
      mockPrisma.swapReturn.findUnique.mockResolvedValue(null);

      await expect(service.getReturnById('nonexistent')).rejects.toThrow(SwapStoreError);
      await expect(service.getReturnById('nonexistent')).rejects.toThrow('Return not found: nonexistent');
    });
  });

  describe('analytics methods', () => {
    beforeEach(() => {
      process.env.SWAP_STORE_ID = 'test-store';
      process.env.SWAP_API_KEY = 'test-key';
      mockRepository.findStoreBySwapStoreId.mockResolvedValue(mockStore);
    });

    describe('getTotalRefunds', () => {
      test('should get total refunds with store context', async () => {
        const mockRefundData = {
          totalRefundAmount: new Decimal(1000),
          refundCount: 10
        };

        mockRepository.getTotalRefunds.mockResolvedValue(mockRefundData);

        const result = await service.getTotalRefunds();

        expect(mockRepository.getTotalRefunds).toHaveBeenCalledWith({
          storeId: 'store-123'
        });
        expect(result).toEqual(mockRefundData);
      });

      test('should get total refunds with date range', async () => {
        const options = {
          fromDate: new Date('2024-01-01'),
          toDate: new Date('2024-02-01')
        };

        mockRepository.getTotalRefunds.mockResolvedValue({
          totalRefundAmount: new Decimal(500),
          refundCount: 5
        });

        await service.getTotalRefunds(options);

        expect(mockRepository.getTotalRefunds).toHaveBeenCalledWith({
          storeId: 'store-123',
          ...options
        });
      });
    });

    describe('getReturnsByProduct', () => {
      test('should get returns by product with store context', async () => {
        const mockProductData = [
          {
            productId: 'prod-1',
            sku: 'SKU-1',
            productName: 'Product 1',
            _count: { id: 5 },
            _sum: { itemCount: 10, cost: new Decimal(100) }
          },
          {
            productId: 'prod-2',
            sku: 'SKU-2',
            productName: 'Product 2',
            _count: { id: 3 },
            _sum: { itemCount: 6, cost: new Decimal(60) }
          }
        ];

        mockRepository.getReturnsByProduct.mockResolvedValue(mockProductData);

        const result = await service.getReturnsByProduct();

        expect(mockRepository.getReturnsByProduct).toHaveBeenCalledWith({
          storeId: 'store-123'
        });
        expect(result).toEqual(mockProductData);
      });
    });

    describe('getReturnReasons', () => {
      test('should get return reasons with store context', async () => {
        const mockReasonData = [
          {
            mainReasonText: 'Defective',
            _count: { id: 10 }
          },
          {
            mainReasonText: 'Wrong size',
            _count: { id: 8 }
          }
        ];

        mockRepository.getReturnReasons.mockResolvedValue(mockReasonData);

        const result = await service.getReturnReasons();

        expect(mockRepository.getReturnReasons).toHaveBeenCalledWith({
          storeId: 'store-123'
        });
        expect(result).toEqual(mockReasonData);
      });
    });

    describe('getReturnRates', () => {
      test('should calculate return rates correctly', async () => {
        mockRepository.getTotalRefunds.mockResolvedValue({
          totalRefundAmount: new Decimal(1000),
          refundCount: 20
        });

        mockPrisma.shopifyOrder.count.mockResolvedValue(100);
        mockPrisma.shopifyOrder.aggregate.mockResolvedValue({
          _sum: { currentTotalPriceAmount: 10000 }
        });

        const result = await service.getReturnRates();

        expect(result).toEqual({
          totalRevenue: 10000,
          totalRefunds: new Decimal(1000),
          netRevenue: 9000,
          refundCount: 20,
          orderCount: 100,
          returnRate: 20, // (20/100) * 100
          refundRate: 10  // (1000/10000) * 100
        });
      });

      test('should handle zero division in rate calculations', async () => {
        mockRepository.getTotalRefunds.mockResolvedValue({
          totalRefundAmount: new Decimal(0),
          refundCount: 0
        });

        mockPrisma.shopifyOrder.count.mockResolvedValue(0);
        mockPrisma.shopifyOrder.aggregate.mockResolvedValue({
          _sum: { currentTotalPriceAmount: 0 }
        });

        const result = await service.getReturnRates();

        expect(result.returnRate).toBe(0);
        expect(result.refundRate).toBe(0);
      });

      test('should apply date filters to Shopify queries', async () => {
        const options = {
          fromDate: new Date('2024-01-01'),
          toDate: new Date('2024-02-01')
        };

        mockRepository.getTotalRefunds.mockResolvedValue({
          totalRefundAmount: new Decimal(500),
          refundCount: 10
        });

        mockPrisma.shopifyOrder.count.mockResolvedValue(50);
        mockPrisma.shopifyOrder.aggregate.mockResolvedValue({
          _sum: { currentTotalPriceAmount: 5000 }
        });

        await service.getReturnRates(options);

        const expectedWhereClause = {
          displayFinancialStatus: 'PAID',
          createdAt: {
            gte: options.fromDate,
            lte: options.toDate
          }
        };

        expect(mockPrisma.shopifyOrder.count).toHaveBeenCalledWith({
          where: expectedWhereClause
        });
        expect(mockPrisma.shopifyOrder.aggregate).toHaveBeenCalledWith({
          where: expectedWhereClause,
          _sum: { currentTotalPriceAmount: true }
        });
      });
    });
  });
});