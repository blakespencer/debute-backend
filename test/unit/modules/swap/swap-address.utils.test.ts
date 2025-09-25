// Standard unit test setup - prevents database connections
import '../../../helpers/unit-test-setup';

import {
  extractDenormalizedAddresses,
  createNormalizedAddresses,
  SwapApiAddress
} from '../../../../src/modules/swap/utils/swap-address.utils';

describe('SWAP Address Utilities', () => {
  const mockBillingAddress: SwapApiAddress = {
    name: 'John Doe',
    address1: '123 Main St',
    address2: 'Apt 4B',
    city: 'New York',
    state_province_code: 'NY',
    country_code: 'US',
    postcode: '10001'
  };

  const mockShippingAddress: SwapApiAddress = {
    name: 'Jane Smith',
    address1: '456 Oak Ave',
    address2: 'Suite 100',
    city: 'Los Angeles',
    state_province_code: 'CA',
    country_code: 'US',
    postcode: '90210'
  };

  describe('extractDenormalizedAddresses', () => {
    test('should extract billing address fields correctly', () => {
      const result = extractDenormalizedAddresses(mockBillingAddress, undefined);

      expect(result).toEqual({
        billingCity: 'New York',
        billingStateProvince: 'NY',
        billingCountryCode: 'US',
        billingPostcode: '10001'
      });
    });

    test('should extract shipping address fields correctly', () => {
      const result = extractDenormalizedAddresses(undefined, mockShippingAddress);

      expect(result).toEqual({
        shippingCity: 'Los Angeles',
        shippingStateProvince: 'CA',
        shippingCountryCode: 'US',
        shippingPostcode: '90210'
      });
    });

    test('should extract both billing and shipping addresses', () => {
      const result = extractDenormalizedAddresses(mockBillingAddress, mockShippingAddress);

      expect(result).toEqual({
        billingCity: 'New York',
        billingStateProvince: 'NY',
        billingCountryCode: 'US',
        billingPostcode: '10001',
        shippingCity: 'Los Angeles',
        shippingStateProvince: 'CA',
        shippingCountryCode: 'US',
        shippingPostcode: '90210'
      });
    });

    test('should return empty object when no addresses provided', () => {
      const result = extractDenormalizedAddresses(undefined, undefined);

      expect(result).toEqual({});
    });

    test('should handle addresses with missing optional fields', () => {
      const minimalBilling: SwapApiAddress = {
        address1: '123 Main St',
        city: 'Boston',
        country_code: 'US',
        postcode: '02101'
        // Missing name, address2, state_province_code
      };

      const result = extractDenormalizedAddresses(minimalBilling, undefined);

      expect(result).toEqual({
        billingCity: 'Boston',
        billingStateProvince: undefined,
        billingCountryCode: 'US',
        billingPostcode: '02101'
      });
    });

    test('should only extract relevant fields for denormalization', () => {
      // Verify that address1, address2, and name are not extracted
      const result = extractDenormalizedAddresses(mockBillingAddress, mockShippingAddress);

      expect(result).not.toHaveProperty('billingName');
      expect(result).not.toHaveProperty('billingAddress1');
      expect(result).not.toHaveProperty('billingAddress2');
      expect(result).not.toHaveProperty('shippingName');
      expect(result).not.toHaveProperty('shippingAddress1');
      expect(result).not.toHaveProperty('shippingAddress2');
    });
  });

  describe('createNormalizedAddresses', () => {
    test('should create billing address record correctly', () => {
      const result = createNormalizedAddresses(mockBillingAddress, undefined);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'billing',
        name: 'John Doe',
        address1: '123 Main St',
        address2: 'Apt 4B',
        city: 'New York',
        stateProvinceCode: 'NY',
        countryCode: 'US',
        postcode: '10001'
      });
    });

    test('should create shipping address record correctly', () => {
      const result = createNormalizedAddresses(undefined, mockShippingAddress);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'shipping',
        name: 'Jane Smith',
        address1: '456 Oak Ave',
        address2: 'Suite 100',
        city: 'Los Angeles',
        stateProvinceCode: 'CA',
        countryCode: 'US',
        postcode: '90210'
      });
    });

    test('should create both billing and shipping address records', () => {
      const result = createNormalizedAddresses(mockBillingAddress, mockShippingAddress);

      expect(result).toHaveLength(2);

      const billingRecord = result.find(addr => addr.type === 'billing');
      const shippingRecord = result.find(addr => addr.type === 'shipping');

      expect(billingRecord).toEqual({
        type: 'billing',
        name: 'John Doe',
        address1: '123 Main St',
        address2: 'Apt 4B',
        city: 'New York',
        stateProvinceCode: 'NY',
        countryCode: 'US',
        postcode: '10001'
      });

      expect(shippingRecord).toEqual({
        type: 'shipping',
        name: 'Jane Smith',
        address1: '456 Oak Ave',
        address2: 'Suite 100',
        city: 'Los Angeles',
        stateProvinceCode: 'CA',
        countryCode: 'US',
        postcode: '90210'
      });
    });

    test('should return empty array when no addresses provided', () => {
      const result = createNormalizedAddresses(undefined, undefined);

      expect(result).toEqual([]);
    });

    test('should handle addresses with missing optional fields', () => {
      const minimalShipping: SwapApiAddress = {
        address1: '789 Pine St',
        city: 'Seattle',
        country_code: 'US',
        postcode: '98101'
        // Missing name, address2, state_province_code
      };

      const result = createNormalizedAddresses(undefined, minimalShipping);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'shipping',
        name: undefined,
        address1: '789 Pine St',
        address2: undefined,
        city: 'Seattle',
        stateProvinceCode: undefined,
        countryCode: 'US',
        postcode: '98101'
      });
    });

    test('should preserve all address fields in normalized format', () => {
      const fullAddress: SwapApiAddress = {
        name: 'Test User',
        address1: '123 Test St',
        address2: 'Unit 456',
        city: 'Test City',
        state_province_code: 'TS',
        country_code: 'TC',
        postcode: '12345'
      };

      const result = createNormalizedAddresses(fullAddress, undefined);

      expect(result[0]).toEqual({
        type: 'billing',
        name: 'Test User',
        address1: '123 Test St',
        address2: 'Unit 456',
        city: 'Test City',
        stateProvinceCode: 'TS',
        countryCode: 'TC',
        postcode: '12345'
      });
    });

    test('should correctly map API field names to database field names', () => {
      const result = createNormalizedAddresses(mockBillingAddress, undefined);

      // Verify field name mapping from API to database
      expect(result[0]).toHaveProperty('stateProvinceCode'); // not state_province_code
      expect(result[0]).toHaveProperty('countryCode'); // not country_code
      expect(result[0]).not.toHaveProperty('state_province_code');
      expect(result[0]).not.toHaveProperty('country_code');
    });
  });

  describe('Integration between extractDenormalizedAddresses and createNormalizedAddresses', () => {
    test('should work together to process same input consistently', () => {
      const denormalized = extractDenormalizedAddresses(mockBillingAddress, mockShippingAddress);
      const normalized = createNormalizedAddresses(mockBillingAddress, mockShippingAddress);

      // Verify denormalized data matches normalized data
      const billingRecord = normalized.find(addr => addr.type === 'billing')!;
      const shippingRecord = normalized.find(addr => addr.type === 'shipping')!;

      expect(denormalized.billingCity).toBe(billingRecord.city);
      expect(denormalized.billingStateProvince).toBe(billingRecord.stateProvinceCode);
      expect(denormalized.billingCountryCode).toBe(billingRecord.countryCode);
      expect(denormalized.billingPostcode).toBe(billingRecord.postcode);

      expect(denormalized.shippingCity).toBe(shippingRecord.city);
      expect(denormalized.shippingStateProvince).toBe(shippingRecord.stateProvinceCode);
      expect(denormalized.shippingCountryCode).toBe(shippingRecord.countryCode);
      expect(denormalized.shippingPostcode).toBe(shippingRecord.postcode);
    });
  });
});