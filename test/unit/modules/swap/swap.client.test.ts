// Import directly to avoid database setup
import { SwapClient } from '../../../../src/modules/swap/swap.client';
import {
  SwapAuthError,
  SwapApiError,
  SwapRateLimitError,
  SwapTimeoutError,
  SwapMaxRetriesError
} from '../../../../src/modules/swap/swap.errors';

// Mock console to avoid logger database connections
jest.mock('../../../../src/common/logger', () => ({
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
  })
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Use real timers with short delays for testing

describe('SwapClient Retry Logic', () => {
  let client: SwapClient;

  beforeEach(() => {
    // Create client with minimal retry config for faster tests
    client = new SwapClient('test-api-key', {
      maxRetries: 2,
      retryDelayMs: 10, // Very short delay for testing
      timeoutMs: 100
    });
    mockFetch.mockClear();
  });

  describe('Non-retryable errors (should fail immediately)', () => {
    test('401 authentication error - no retries', async () => {
      const swapErrorResponse = {
        status: 401,
        reason: 'UNAUTHORIZED',
        error: { message: 'Error: Invalid API key', customMessage: '' }
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue(JSON.stringify(swapErrorResponse))
      });

      await expect(
        client.fetchReturns({
          store: 'test-store',
          fromDate: '2024-01-01T00:00:00Z'
        })
      ).rejects.toThrow(SwapAuthError);

      // Should only make 1 request (no retries)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('400 bad request - no retries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Missing required parameters')
      });

      await expect(
        client.fetchReturns({
          store: 'test-store',
          fromDate: '2024-01-01T00:00:00Z'
        })
      ).rejects.toThrow(SwapApiError);

      // Should only make 1 request (no retries)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('404 not found - no retries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue('Store not found')
      });

      await expect(
        client.fetchReturns({
          store: 'test-store',
          fromDate: '2024-01-01T00:00:00Z'
        })
      ).rejects.toThrow(SwapApiError);

      // Should only make 1 request (no retries)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Retryable errors (should retry up to maxRetries)', () => {
    test('500 server error - retries then fails', async () => {
      // Mock all attempts to fail with 500
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: jest.fn().mockResolvedValue('Internal server error')
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: jest.fn().mockResolvedValue('Internal server error')
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: jest.fn().mockResolvedValue('Internal server error')
        });

      await expect(
        client.fetchReturns({
          store: 'test-store',
          fromDate: '2024-01-01T00:00:00Z'
        })
      ).rejects.toThrow(SwapMaxRetriesError);

      // Should make 3 requests (1 initial + 2 retries)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    test('500 error then success - recovers on retry', async () => {
      const successResponse = {
        orders: [],
        pagination: { has_next_page: false, total_items: 0, current_page_size: 0 }
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: jest.fn().mockResolvedValue('Internal server error')
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(successResponse)
        });

      const result = await client.fetchReturns({
        store: 'test-store',
        fromDate: '2024-01-01T00:00:00Z'
      });

      expect(result).toEqual(successResponse);
      // Should make 2 requests (1 initial + 1 retry that succeeds)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('timeout error - retries with exponential backoff', async () => {
      // Mock fetch to simulate timeout - AbortError must have the correct name
      const createAbortError = () => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return error;
      };

      mockFetch
        .mockImplementationOnce(() => Promise.reject(createAbortError()))
        .mockImplementationOnce(() => Promise.reject(createAbortError()))
        .mockImplementationOnce(() => Promise.reject(createAbortError()));

      await expect(
        client.fetchReturns({
          store: 'test-store',
          fromDate: '2024-01-01T00:00:00Z'
        })
      ).rejects.toThrow(SwapMaxRetriesError);

      // Should make 3 requests (1 initial + 2 retries)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Rate limiting (429)', () => {
    test('429 rate limit - retries with Retry-After header', async () => {
      const successResponse = {
        orders: [],
        pagination: { has_next_page: false, total_items: 0, current_page_size: 0 }
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: {
            get: jest.fn().mockReturnValue('1') // 1 second retry-after
          },
          text: jest.fn().mockResolvedValue('Rate limited')
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(successResponse)
        });

      const result = await client.fetchReturns({
        store: 'test-store',
        fromDate: '2024-01-01T00:00:00Z'
      });

      expect(result).toEqual(successResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('429 rate limit - exceeds max retries', async () => {
      // Mock all attempts to return 429
      mockFetch
        .mockResolvedValue({
          ok: false,
          status: 429,
          headers: {
            get: jest.fn().mockReturnValue('1')
          },
          text: jest.fn().mockResolvedValue('Rate limited')
        });

      await expect(
        client.fetchReturns({
          store: 'test-store',
          fromDate: '2024-01-01T00:00:00Z'
        })
      ).rejects.toThrow(SwapMaxRetriesError);

      // Should make 3 requests (1 initial + 2 retries)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Successful requests', () => {
    test('successful request - no retries needed', async () => {
      const successResponse = {
        orders: [{ return_id: 'test-123' }],
        pagination: { has_next_page: false, total_items: 1, current_page_size: 1 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(successResponse)
      });

      const result = await client.fetchReturns({
        store: 'test-store',
        fromDate: '2024-01-01T00:00:00Z'
      });

      expect(result).toEqual(successResponse);
      // Should only make 1 request
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Test connection method', () => {
    test('testConnection returns false on auth error without duplicate logging', async () => {
      const swapErrorResponse = {
        status: 401,
        reason: 'UNAUTHORIZED',
        error: { message: 'Error: Invalid API key', customMessage: '' }
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue(JSON.stringify(swapErrorResponse))
      });

      const result = await client.testConnection('test-store');

      expect(result).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('testConnection returns true on success', async () => {
      const successResponse = {
        orders: [],
        pagination: { has_next_page: false, total_items: 0, current_page_size: 0 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(successResponse)
      });

      const result = await client.testConnection('test-store');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error message extraction', () => {
    test('extracts clean error message from SWAP JSON response', async () => {
      const swapErrorResponse = {
        status: 401,
        reason: 'UNAUTHORIZED',
        error: { message: 'Error: Invalid API key', customMessage: '' }
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue(JSON.stringify(swapErrorResponse))
      });

      try {
        await client.fetchReturns({
          store: 'test-store',
          fromDate: '2024-01-01T00:00:00Z'
        });
      } catch (error) {
        expect(error).toBeInstanceOf(SwapAuthError);
        expect((error as SwapAuthError).message).toBe('Invalid API key: Error: Invalid API key');
      }
    });

    test('handles malformed JSON response gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Invalid JSON {')
      });

      try {
        await client.fetchReturns({
          store: 'test-store',
          fromDate: '2024-01-01T00:00:00Z'
        });
      } catch (error) {
        expect(error).toBeInstanceOf(SwapAuthError);
        expect((error as SwapAuthError).message).toBe('Invalid or missing API key');
      }
    });
  });
});