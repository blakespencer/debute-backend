import '../../../helpers/unit-test-setup';

import {
  extractIdFromGid,
  extractOrderId,
  extractVariantId,
  extractProductId,
} from '../../../../src/modules/shopify/utils/shopify-gid.utils';

describe('Shopify GID Utils', () => {
  describe('extractIdFromGid', () => {
    it('should extract clean ID from order GID', () => {
      const gid = 'gid://shopify/Order/7546826916104';
      const result = extractIdFromGid(gid);
      expect(result).toBe('7546826916104');
    });

    it('should extract clean ID from product GID', () => {
      const gid = 'gid://shopify/Product/12345678901234';
      const result = extractIdFromGid(gid);
      expect(result).toBe('12345678901234');
    });

    it('should extract clean ID from variant GID', () => {
      const gid = 'gid://shopify/ProductVariant/51611854471432';
      const result = extractIdFromGid(gid);
      expect(result).toBe('51611854471432');
    });

    it('should return empty string for empty input', () => {
      const result = extractIdFromGid('');
      expect(result).toBe('');
    });

    it('should return original string if not in GID format', () => {
      const input = '7546826916104';
      const result = extractIdFromGid(input);
      expect(result).toBe('7546826916104');
    });

    it('should handle invalid GID format gracefully', () => {
      const input = 'not-a-gid';
      const result = extractIdFromGid(input);
      expect(result).toBe('not-a-gid');
    });
  });

  describe('extractOrderId', () => {
    it('should extract order ID from order GID', () => {
      const orderGid = 'gid://shopify/Order/7546826916104';
      const result = extractOrderId(orderGid);
      expect(result).toBe('7546826916104');
    });
  });

  describe('extractVariantId', () => {
    it('should extract variant ID from variant GID', () => {
      const variantGid = 'gid://shopify/ProductVariant/51611854471432';
      const result = extractVariantId(variantGid);
      expect(result).toBe('51611854471432');
    });
  });

  describe('extractProductId', () => {
    it('should extract product ID from product GID', () => {
      const productGid = 'gid://shopify/Product/10282814963976';
      const result = extractProductId(productGid);
      expect(result).toBe('10282814963976');
    });
  });
});