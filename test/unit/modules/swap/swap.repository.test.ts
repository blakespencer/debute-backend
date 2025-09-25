// Standard unit test setup - prevents database connections
import '../../../helpers/unit-test-setup';

import { SwapRepository } from '../../../../src/modules/swap/swap.repository';
import { createMockPrisma } from '../../../helpers/mocks/prisma.mock';
import { Decimal } from '@prisma/client/runtime/library';

describe('SwapRepository', () => {
  let repository: SwapRepository;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    repository = new SwapRepository(mockPrisma as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Store management', () => {
    describe('findStoreById', () => {
      test('should find store by id', async () => {
        const mockStore = { id: 'store-123', swapStoreId: 'swap-456' };
        mockPrisma.swapStore.findUnique.mockResolvedValue(mockStore as any);

        const result = await repository.findStoreById('store-123');

        expect(mockPrisma.swapStore.findUnique).toHaveBeenCalledWith({
          where: { id: 'store-123' }
        });
        expect(result).toEqual(mockStore);
      });
    });

    describe('findStoreBySwapStoreId', () => {
      test('should find store by SWAP store id', async () => {
        const mockStore = { id: 'store-123', swapStoreId: 'swap-456' };
        mockPrisma.swapStore.findUnique.mockResolvedValue(mockStore as any);

        const result = await repository.findStoreBySwapStoreId('swap-456');

        expect(mockPrisma.swapStore.findUnique).toHaveBeenCalledWith({
          where: { swapStoreId: 'swap-456' }
        });
        expect(result).toEqual(mockStore);
      });
    });

    describe('createStore', () => {
      test('should create new store', async () => {
        const storeData = {
          swapStoreId: 'swap-789',
          apiKey: 'test-key',
          storeName: 'Test Store'
        };

        const mockCreatedStore = { id: 'store-456', ...storeData };
        mockPrisma.swapStore.create.mockResolvedValue(mockCreatedStore as any);

        const result = await repository.createStore(storeData);

        expect(mockPrisma.swapStore.create).toHaveBeenCalledWith({
          data: storeData
        });
        expect(result).toEqual(mockCreatedStore);
      });
    });

    describe('updateStoreLastSync', () => {
      test('should update store last sync timestamp', async () => {
        const mockUpdatedStore = { id: 'store-123', lastSyncAt: new Date() };
        mockPrisma.swapStore.update.mockResolvedValue(mockUpdatedStore as any);

        const result = await repository.updateStoreLastSync('store-123');

        expect(mockPrisma.swapStore.update).toHaveBeenCalledWith({
          where: { id: 'store-123' },
          data: { lastSyncAt: expect.any(Date) }
        });
        expect(result).toEqual(mockUpdatedStore);
      });
    });
  });

  describe('Return management', () => {
    describe('findReturnBySwapId', () => {
      test('should find return by SWAP return id with includes', async () => {
        const mockReturn = {
          id: 'return-123',
          swapReturnId: 'swap-return-456',
          products: [],
          store: {}
        };

        mockPrisma.swapReturn.findUnique.mockResolvedValue(mockReturn as any);

        const result = await repository.findReturnBySwapId('swap-return-456');

        expect(mockPrisma.swapReturn.findUnique).toHaveBeenCalledWith({
          where: { swapReturnId: 'swap-return-456' },
          include: {
            products: true,
            store: true
          }
        });
        expect(result).toEqual(mockReturn);
      });
    });

    describe('createReturn', () => {
      test('should create new return with all fields', async () => {
        const returnData = {
          swapReturnId: 'swap-789',
          orderName: 'ORD-123',
          orderId: 'order-456',
          rma: 'RMA-789',
          storeId: 'store-123',
          typeString: 'Refund',
          type: 'refund',
          status: 'Closed',
          shippingStatus: 'Delivered',
          total: new Decimal(100.50),
          handlingFee: new Decimal(5.00),
          shopNowRevenue: new Decimal(0),
          shopLaterRevenue: new Decimal(0),
          exchangeRevenue: new Decimal(0),
          refundRevenue: new Decimal(95.50),
          totalAdditionalPayment: new Decimal(0),
          totalCreditExchangeValue: new Decimal(0),
          totalRefundValueCustomerCurrency: new Decimal(95.50),
          customerName: 'John Doe',
          customerCurrency: 'USD',
          dateCreated: new Date('2024-01-01'),
          dateUpdated: new Date('2024-01-02')
        };

        const mockCreatedReturn = { id: 'return-123', ...returnData };
        mockPrisma.swapReturn.create.mockResolvedValue(mockCreatedReturn as any);

        const result = await repository.createReturn(returnData);

        expect(mockPrisma.swapReturn.create).toHaveBeenCalledWith({
          data: returnData,
          include: {
            products: true,
            store: true
          }
        });
        expect(result).toEqual(mockCreatedReturn);
      });
    });

    describe('updateReturn', () => {
      test('should update existing return', async () => {
        const updateData = {
          status: 'Processing',
          dateUpdated: new Date('2024-01-03')
        };

        const mockUpdatedReturn = { id: 'return-123', ...updateData };
        mockPrisma.swapReturn.update.mockResolvedValue(mockUpdatedReturn as any);

        const result = await repository.updateReturn('swap-return-456', updateData);

        expect(mockPrisma.swapReturn.update).toHaveBeenCalledWith({
          where: { swapReturnId: 'swap-return-456' },
          data: updateData,
          include: {
            products: true,
            store: true
          }
        });
        expect(result).toEqual(mockUpdatedReturn);
      });
    });

    describe('getReturns', () => {
      test('should get returns with default options', async () => {
        const mockReturns = [
          { id: 'return-1', swapReturnId: 'swap-1' },
          { id: 'return-2', swapReturnId: 'swap-2' }
        ];

        mockPrisma.swapReturn.findMany.mockResolvedValue(mockReturns as any);
        mockPrisma.swapReturn.count.mockResolvedValue(2);

        const result = await repository.getReturns();

        expect(mockPrisma.swapReturn.findMany).toHaveBeenCalledWith({
          where: {},
          include: {
            products: true,
            addresses: true,
            store: true
          },
          orderBy: { dateCreated: 'desc' },
          take: 50,
          skip: 0
        });

        expect(mockPrisma.swapReturn.count).toHaveBeenCalledWith({
          where: {}
        });

        expect(result).toEqual({
          returns: mockReturns,
          pagination: {
            total: 2,
            limit: 50,
            offset: 0,
            hasMore: false
          }
        });
      });

      test('should apply filters correctly', async () => {
        const options = {
          limit: 25,
          offset: 10,
          storeId: 'store-123',
          status: 'Closed',
          type: 'Refund',
          fromDate: new Date('2024-01-01'),
          toDate: new Date('2024-02-01')
        };

        mockPrisma.swapReturn.findMany.mockResolvedValue([]);
        mockPrisma.swapReturn.count.mockResolvedValue(100);

        await repository.getReturns(options);

        const expectedWhereClause = {
          storeId: 'store-123',
          status: 'Closed',
          type: 'Refund',
          dateCreated: {
            gte: options.fromDate,
            lte: options.toDate
          }
        };

        expect(mockPrisma.swapReturn.findMany).toHaveBeenCalledWith({
          where: expectedWhereClause,
          include: {
            products: true,
            addresses: true,
            store: true
          },
          orderBy: { dateCreated: 'desc' },
          take: 25,
          skip: 10
        });
      });

      test('should calculate hasMore correctly', async () => {
        mockPrisma.swapReturn.findMany.mockResolvedValue([]);
        mockPrisma.swapReturn.count.mockResolvedValue(100);

        const result = await repository.getReturns({ limit: 25, offset: 50 });

        expect(result.pagination.hasMore).toBe(true); // 50 + 25 < 100

        mockPrisma.swapReturn.count.mockResolvedValue(75);
        const result2 = await repository.getReturns({ limit: 25, offset: 50 });

        expect(result2.pagination.hasMore).toBe(false); // 50 + 25 = 75
      });
    });
  });

  describe('Product management', () => {
    describe('createProduct', () => {
      test('should create product with all fields', async () => {
        const productData = {
          productId: 'prod-123',
          shopifyProductId: 'shopify-456',
          productName: 'Test Product',
          sku: 'TEST-SKU',
          itemCount: 2,
          cost: new Decimal(25.99),
          returnType: 'Refund',
          mainReasonId: 'reason-123',
          mainReasonText: 'Defective',
          returnId: 'return-123'
        };

        const mockCreatedProduct = { id: 'product-456', ...productData };
        mockPrisma.swapProduct.create.mockResolvedValue(mockCreatedProduct as any);

        const result = await repository.createProduct(productData);

        expect(mockPrisma.swapProduct.create).toHaveBeenCalledWith({
          data: productData
        });
        expect(result).toEqual(mockCreatedProduct);
      });
    });
  });

  describe('Address management', () => {
    describe('createAddress', () => {
      test('should create address with billing type', async () => {
        const addressData = {
          type: 'billing' as const,
          name: 'John Doe',
          address1: '123 Main St',
          city: 'New York',
          countryCode: 'US',
          postcode: '10001',
          returnId: 'return-123'
        };

        const mockCreatedAddress = { id: 'address-456', ...addressData };
        mockPrisma.swapAddress.create.mockResolvedValue(mockCreatedAddress as any);

        const result = await repository.createAddress(addressData);

        expect(mockPrisma.swapAddress.create).toHaveBeenCalledWith({
          data: addressData
        });
        expect(result).toEqual(mockCreatedAddress);
      });

      test('should create address with shipping type', async () => {
        const addressData = {
          type: 'shipping' as const,
          address1: '456 Oak Ave',
          city: 'Los Angeles',
          countryCode: 'US',
          postcode: '90210',
          returnId: 'return-123'
        };

        await repository.createAddress(addressData);

        expect(mockPrisma.swapAddress.create).toHaveBeenCalledWith({
          data: addressData
        });
      });
    });
  });

  describe('Analytics queries', () => {
    describe('getTotalRefunds', () => {
      test('should get total refunds with basic filters', async () => {
        const mockAggregateResult = {
          _sum: { totalRefundValueCustomerCurrency: new Decimal(1000) },
          _count: { id: 10 }
        };

        mockPrisma.swapReturn.aggregate.mockResolvedValue(mockAggregateResult as any);

        const result = await repository.getTotalRefunds();

        expect(mockPrisma.swapReturn.aggregate).toHaveBeenCalledWith({
          where: {
            type: { contains: 'Refund' },
            status: 'Closed'
          },
          _sum: { totalRefundValueCustomerCurrency: true },
          _count: { id: true }
        });

        expect(result).toEqual({
          totalRefundAmount: new Decimal(1000),
          refundCount: 10
        });
      });

      test('should apply store and date filters', async () => {
        const options = {
          storeId: 'store-123',
          fromDate: new Date('2024-01-01'),
          toDate: new Date('2024-02-01')
        };

        const mockAggregateResult = {
          _sum: { totalRefundValueCustomerCurrency: null },
          _count: { id: 0 }
        };

        mockPrisma.swapReturn.aggregate.mockResolvedValue(mockAggregateResult as any);

        const result = await repository.getTotalRefunds(options);

        expect(mockPrisma.swapReturn.aggregate).toHaveBeenCalledWith({
          where: {
            type: { contains: 'Refund' },
            status: 'Closed',
            storeId: 'store-123',
            dateCreated: {
              gte: options.fromDate,
              lte: options.toDate
            }
          },
          _sum: { totalRefundValueCustomerCurrency: true },
          _count: { id: true }
        });

        expect(result).toEqual({
          totalRefundAmount: new Decimal(0),
          refundCount: 0
        });
      });
    });

    describe('getReturnsByProduct', () => {
      test('should group returns by product', async () => {
        const mockGroupByResult = [
          {
            productId: 'prod-1',
            sku: 'SKU-1',
            productName: 'Product 1',
            _sum: { itemCount: 5, cost: new Decimal(100) },
            _count: { id: 3 }
          }
        ];

        mockPrisma.swapProduct.groupBy.mockResolvedValue(mockGroupByResult as any);

        const result = await repository.getReturnsByProduct();

        expect(mockPrisma.swapProduct.groupBy).toHaveBeenCalledWith({
          by: ['productId', 'sku', 'productName'],
          where: {},
          _sum: { itemCount: true, cost: true },
          _count: { id: true },
          orderBy: { _sum: { itemCount: 'desc' } }
        });

        expect(result).toEqual(mockGroupByResult);
      });

      test('should apply store and date filters through return relation', async () => {
        const options = {
          storeId: 'store-123',
          fromDate: new Date('2024-01-01'),
          toDate: new Date('2024-02-01')
        };

        await repository.getReturnsByProduct(options);

        expect(mockPrisma.swapProduct.groupBy).toHaveBeenCalledWith({
          by: ['productId', 'sku', 'productName'],
          where: {
            return: {
              storeId: 'store-123',
              dateCreated: {
                gte: options.fromDate,
                lte: options.toDate
              }
            }
          },
          _sum: { itemCount: true, cost: true },
          _count: { id: true },
          orderBy: { _sum: { itemCount: 'desc' } }
        });
      });
    });

    describe('getReturnReasons', () => {
      test('should group returns by reason', async () => {
        const mockGroupByResult = [
          {
            mainReasonText: 'Defective',
            _count: { id: 15 }
          },
          {
            mainReasonText: 'Wrong size',
            _count: { id: 8 }
          }
        ];

        mockPrisma.swapProduct.groupBy.mockResolvedValue(mockGroupByResult as any);

        const result = await repository.getReturnReasons();

        expect(mockPrisma.swapProduct.groupBy).toHaveBeenCalledWith({
          by: ['mainReasonText'],
          where: {
            mainReasonText: { not: null }
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } }
        });

        expect(result).toEqual(mockGroupByResult);
      });

      test('should apply filters through return relation', async () => {
        const options = {
          storeId: 'store-123',
          fromDate: new Date('2024-01-01')
        };

        await repository.getReturnReasons(options);

        expect(mockPrisma.swapProduct.groupBy).toHaveBeenCalledWith({
          by: ['mainReasonText'],
          where: {
            mainReasonText: { not: null },
            return: {
              storeId: 'store-123',
              dateCreated: { gte: options.fromDate }
            }
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } }
        });
      });
    });
  });
});