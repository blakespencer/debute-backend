// Standard unit test setup - prevents database connections
import '../../../helpers/unit-test-setup';

import { parseSwapDate, parseSwapDates } from '../../../../src/modules/swap/utils/swap-date.utils';

describe('SWAP Date Utilities', () => {
  describe('parseSwapDate', () => {
    test('should parse valid SWAP date format correctly', () => {
      const swapDate = '23 Sept 2025, 14:52:21';
      const result = parseSwapDate(swapDate);

      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(8); // September is month 8 (0-indexed)
      expect(result?.getDate()).toBe(23);
      expect(result?.getHours()).toBe(14);
      expect(result?.getMinutes()).toBe(52);
      expect(result?.getSeconds()).toBe(21);
    });

    test('should parse valid date with different month abbreviations', () => {
      const testCases = [
        { input: '1 Jan 2024, 00:00:00', month: 0 },
        { input: '15 Feb 2024, 12:30:45', month: 1 },
        { input: '31 Mar 2024, 23:59:59', month: 2 },
        { input: '1 Apr 2024, 06:15:30', month: 3 },
        { input: '31 May 2024, 18:45:12', month: 4 },
        { input: '15 Jun 2024, 09:22:33', month: 5 },
        { input: '4 Jul 2024, 21:11:44', month: 6 },
        { input: '25 Aug 2024, 03:33:22', month: 7 },
        { input: '30 Sept 2024, 16:44:55', month: 8 },
        { input: '1 Oct 2024, 07:12:18', month: 9 },
        { input: '15 Nov 2024, 19:28:37', month: 10 },
        { input: '25 Dec 2024, 11:45:09', month: 11 }
      ];

      testCases.forEach(({ input, month }) => {
        const result = parseSwapDate(input);
        expect(result?.getMonth()).toBe(month);
      });
    });

    test('should handle single digit days and months', () => {
      const result = parseSwapDate('5 Jan 2024, 08:05:03');

      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(5);
      expect(result?.getMonth()).toBe(0);
    });

    test('should return undefined for null input', () => {
      expect(parseSwapDate(null)).toBeUndefined();
    });

    test('should return undefined for undefined input', () => {
      expect(parseSwapDate(undefined)).toBeUndefined();
    });

    test('should return undefined for "N/A" input', () => {
      expect(parseSwapDate('N/A')).toBeUndefined();
    });

    test('should return undefined for empty string', () => {
      expect(parseSwapDate('')).toBeUndefined();
    });

    test('should return undefined for invalid date format', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const invalidDates = [
        'completely-invalid-date',
        '23/09/2025 14:52:21', // Wrong format (should be "23 Sept 2025, 14:52:21")
        '32 Jan 2024, 14:52:21', // Invalid day
        '1 BadMonth 2024, 14:52:21', // Invalid month
        '1 Jan 2024, 25:00:00' // Invalid time
      ];

      invalidDates.forEach(invalidDate => {
        expect(parseSwapDate(invalidDate)).toBeUndefined();
      });

      consoleSpy.mockRestore();
    });

    test('should log warning for invalid dates', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      parseSwapDate('invalid-date-format');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse SWAP date: invalid-date-format')
      );

      consoleSpy.mockRestore();
    });

    test('should handle exceptions gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Force an exception by mocking Date constructor
      const originalDate = global.Date;
      global.Date = jest.fn(() => {
        throw new Error('Date constructor error');
      }) as any;

      const result = parseSwapDate('1 Jan 2024, 12:00:00');

      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error parsing SWAP date'),
        expect.any(Error)
      );

      global.Date = originalDate;
      consoleSpy.mockRestore();
    });
  });

  describe('parseSwapDates', () => {
    test('should parse all date fields when provided', () => {
      const dateInputs = {
        date_created: '1 Jan 2024, 10:00:00',
        date_updated: '2 Jan 2024, 11:00:00',
        submitted_at: '3 Jan 2024, 12:00:00',
        date_closed: '4 Jan 2024, 13:00:00',
        shopify_order_date: '5 Jan 2024, 14:00:00'
      };

      const result = parseSwapDates(dateInputs);

      expect(result.dateCreated).toBeInstanceOf(Date);
      expect(result.dateCreated?.getDate()).toBe(1);

      expect(result.dateUpdated).toBeInstanceOf(Date);
      expect(result.dateUpdated?.getDate()).toBe(2);

      expect(result.submittedAt).toBeInstanceOf(Date);
      expect(result.submittedAt?.getDate()).toBe(3);

      expect(result.dateClosed).toBeInstanceOf(Date);
      expect(result.dateClosed?.getDate()).toBe(4);

      expect(result.shopifyOrderDate).toBeInstanceOf(Date);
      expect(result.shopifyOrderDate?.getDate()).toBe(5);
    });

    test('should handle partial date inputs', () => {
      const result = parseSwapDates({
        date_created: '1 Jan 2024, 10:00:00',
        date_updated: '2 Jan 2024, 11:00:00'
        // Other fields omitted
      });

      expect(result.dateCreated).toBeInstanceOf(Date);
      expect(result.dateUpdated).toBeInstanceOf(Date);
      expect(result.submittedAt).toBeUndefined();
      expect(result.dateClosed).toBeUndefined();
      expect(result.shopifyOrderDate).toBeUndefined();
    });

    test('should handle empty input object', () => {
      const result = parseSwapDates({});

      expect(result.dateCreated).toBeUndefined();
      expect(result.dateUpdated).toBeUndefined();
      expect(result.submittedAt).toBeUndefined();
      expect(result.dateClosed).toBeUndefined();
      expect(result.shopifyOrderDate).toBeUndefined();
    });

    test('should handle invalid dates gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = parseSwapDates({
        date_created: 'invalid-date',
        date_updated: '2 Jan 2024, 11:00:00',
        submitted_at: 'N/A'
      });

      expect(result.dateCreated).toBeUndefined();
      expect(result.dateUpdated).toBeInstanceOf(Date);
      expect(result.submittedAt).toBeUndefined();

      consoleSpy.mockRestore();
    });

    test('should preserve field mapping correctly', () => {
      const result = parseSwapDates({
        date_created: '1 Jan 2024, 10:00:00'
      });

      // Ensure the function returns the correct field names
      expect(Object.keys(result)).toEqual([
        'dateCreated',
        'dateUpdated',
        'submittedAt',
        'dateClosed',
        'shopifyOrderDate'
      ]);
    });
  });
});