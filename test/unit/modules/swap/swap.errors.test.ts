// Standard unit test setup - prevents database connections
import '../../../helpers/unit-test-setup';

import {
  SwapApiError,
  SwapAuthError,
  SwapRateLimitError,
  SwapSyncError,
  SwapStoreError,
  SwapTimeoutError,
  SwapMaxRetriesError
} from '../../../../src/modules/swap/swap.errors';

describe('SWAP Error Classes', () => {
  describe('SwapApiError', () => {
    test('should create error with default values', () => {
      const error = new SwapApiError('Test API error');

      expect(error.name).toBe('SwapApiError');
      expect(error.message).toBe('Test API error');
      expect(error.statusCode).toBe(500);
      expect(error.responseStatus).toBeUndefined();
      expect(error.responseBody).toBeUndefined();
    });

    test('should create error with custom status code', () => {
      const error = new SwapApiError('Custom error', 400);

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Custom error');
    });

    test('should create error with response details', () => {
      const responseBody = { error: 'Bad request' };
      const error = new SwapApiError('API error', 400, {
        responseStatus: 400,
        responseBody
      });

      expect(error.responseStatus).toBe(400);
      expect(error.responseBody).toEqual(responseBody);
    });

    test('should extend Error and AppError', () => {
      const error = new SwapApiError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error.stack).toBeDefined();
    });
  });

  describe('SwapAuthError', () => {
    test('should create auth error with default message', () => {
      const error = new SwapAuthError();

      expect(error.name).toBe('SwapAuthError');
      expect(error.message).toBe('Invalid SWAP API credentials');
      expect(error.statusCode).toBe(401);
      expect(error.responseStatus).toBe(401);
    });

    test('should create auth error with custom message', () => {
      const error = new SwapAuthError('API key expired');

      expect(error.message).toBe('API key expired');
      expect(error.statusCode).toBe(401);
    });

    test('should be instance of SwapApiError', () => {
      const error = new SwapAuthError();

      expect(error).toBeInstanceOf(SwapApiError);
    });
  });

  describe('SwapRateLimitError', () => {
    test('should create rate limit error with default retry time', () => {
      const error = new SwapRateLimitError();

      expect(error.name).toBe('SwapRateLimitError');
      expect(error.message).toBe('SWAP rate limit exceeded. Retry after 60 seconds.');
      expect(error.statusCode).toBe(429);
      expect(error.responseStatus).toBe(429);
    });

    test('should create rate limit error with custom retry time', () => {
      const error = new SwapRateLimitError(120);

      expect(error.message).toBe('SWAP rate limit exceeded. Retry after 120 seconds.');
    });

    test('should be instance of SwapApiError', () => {
      const error = new SwapRateLimitError();

      expect(error).toBeInstanceOf(SwapApiError);
    });
  });

  describe('SwapSyncError', () => {
    test('should create sync error without details', () => {
      const error = new SwapSyncError('Sync failed');

      expect(error.name).toBe('SwapSyncError');
      expect(error.message).toBe('Sync failed');
      expect(error.statusCode).toBe(500);
      expect(error.syncDetails).toBeUndefined();
    });

    test('should create sync error with sync details', () => {
      const syncDetails = {
        returnsProcessed: 10,
        returnsCreated: 5,
        returnsUpdated: 3,
        errors: ['Error 1', 'Error 2']
      };

      const error = new SwapSyncError('Partial sync failure', syncDetails);

      expect(error.syncDetails).toEqual(syncDetails);
    });

    test('should preserve sync details for error reporting', () => {
      const syncDetails = {
        returnsProcessed: 100,
        returnsCreated: 50,
        returnsUpdated: 40,
        errors: ['Network timeout', 'Invalid data format']
      };

      const error = new SwapSyncError('Sync completed with errors', syncDetails);

      expect(error.syncDetails?.returnsProcessed).toBe(100);
      expect(error.syncDetails?.errors).toHaveLength(2);
    });
  });

  describe('SwapStoreError', () => {
    test('should create store error with 404 status', () => {
      const error = new SwapStoreError('Store not found');

      expect(error.name).toBe('SwapStoreError');
      expect(error.message).toBe('Store not found');
      expect(error.statusCode).toBe(404);
    });

    test('should be instance of AppError', () => {
      const error = new SwapStoreError('Store error');

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('SwapTimeoutError', () => {
    test('should create timeout error with timeout duration', () => {
      const error = new SwapTimeoutError(5000);

      expect(error.name).toBe('SwapTimeoutError');
      expect(error.message).toBe('SWAP API request timed out after 5000ms');
      expect(error.statusCode).toBe(408);
    });

    test('should be instance of SwapApiError', () => {
      const error = new SwapTimeoutError(1000);

      expect(error).toBeInstanceOf(SwapApiError);
    });
  });

  describe('SwapMaxRetriesError', () => {
    test('should create max retries error with attempt details', () => {
      const lastError = new Error('Network error');
      const error = new SwapMaxRetriesError(3, lastError);

      expect(error.name).toBe('SwapMaxRetriesError');
      expect(error.message).toBe('Maximum retry attempts (3) exceeded. Last error: Network error');
      expect(error.statusCode).toBe(500);
      expect(error.attempts).toBe(3);
      expect(error.lastError).toBe(lastError);
    });

    test('should preserve last error for debugging', () => {
      const lastError = new SwapTimeoutError(5000);
      const error = new SwapMaxRetriesError(5, lastError);

      expect(error.lastError).toBeInstanceOf(SwapTimeoutError);
      expect(error.attempts).toBe(5);
    });

    test('should be instance of SwapApiError', () => {
      const lastError = new Error('Test error');
      const error = new SwapMaxRetriesError(2, lastError);

      expect(error).toBeInstanceOf(SwapApiError);
    });
  });

  describe('Error inheritance chain', () => {
    test('all SWAP errors should be instances of Error', () => {
      const errors = [
        new SwapApiError('test'),
        new SwapAuthError(),
        new SwapRateLimitError(),
        new SwapSyncError('test'),
        new SwapStoreError('test'),
        new SwapTimeoutError(1000),
        new SwapMaxRetriesError(1, new Error('test'))
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(Error);
        expect(error.stack).toBeDefined();
      });
    });

    test('API-related errors should be instances of SwapApiError', () => {
      const apiErrors = [
        new SwapAuthError(),
        new SwapRateLimitError(),
        new SwapTimeoutError(1000),
        new SwapMaxRetriesError(1, new Error('test'))
      ];

      apiErrors.forEach(error => {
        expect(error).toBeInstanceOf(SwapApiError);
      });
    });

    test('non-API errors should not be instances of SwapApiError', () => {
      const nonApiErrors = [
        new SwapSyncError('test'),
        new SwapStoreError('test')
      ];

      nonApiErrors.forEach(error => {
        expect(error).not.toBeInstanceOf(SwapApiError);
      });
    });
  });
});