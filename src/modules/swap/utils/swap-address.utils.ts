/**
 * SWAP API Address Processing Utilities
 * Handles address extraction and normalization from SWAP API response
 */

export interface SwapApiAddress {
  name?: string;
  address1: string;
  address2?: string;
  city: string;
  state_province_code?: string;
  country_code: string;
  postcode: string;
}

export interface ProcessedAddressData {
  // Denormalized fields for SwapReturn (fast queries)
  billingCity?: string;
  billingStateProvince?: string;
  billingCountryCode?: string;
  billingPostcode?: string;
  shippingCity?: string;
  shippingStateProvince?: string;
  shippingCountryCode?: string;
  shippingPostcode?: string;
}

export interface NormalizedAddress {
  type: 'billing' | 'shipping';
  name?: string;
  address1: string;
  address2?: string;
  city: string;
  stateProvinceCode?: string;
  countryCode: string;
  postcode: string;
}

/**
 * Extract denormalized address fields for fast geographic queries
 */
export function extractDenormalizedAddresses(
  billingAddress?: SwapApiAddress,
  shippingAddress?: SwapApiAddress
): ProcessedAddressData {
  const result: ProcessedAddressData = {};

  if (billingAddress) {
    result.billingCity = billingAddress.city;
    result.billingStateProvince = billingAddress.state_province_code;
    result.billingCountryCode = billingAddress.country_code;
    result.billingPostcode = billingAddress.postcode;
  }

  if (shippingAddress) {
    result.shippingCity = shippingAddress.city;
    result.shippingStateProvince = shippingAddress.state_province_code;
    result.shippingCountryCode = shippingAddress.country_code;
    result.shippingPostcode = shippingAddress.postcode;
  }

  return result;
}

/**
 * Create normalized address records for detailed analysis
 */
export function createNormalizedAddresses(
  billingAddress?: SwapApiAddress,
  shippingAddress?: SwapApiAddress
): NormalizedAddress[] {
  const addresses: NormalizedAddress[] = [];

  if (billingAddress) {
    addresses.push({
      type: 'billing',
      name: billingAddress.name,
      address1: billingAddress.address1,
      address2: billingAddress.address2,
      city: billingAddress.city,
      stateProvinceCode: billingAddress.state_province_code,
      countryCode: billingAddress.country_code,
      postcode: billingAddress.postcode,
    });
  }

  if (shippingAddress) {
    addresses.push({
      type: 'shipping',
      name: shippingAddress.name,
      address1: shippingAddress.address1,
      address2: shippingAddress.address2,
      city: shippingAddress.city,
      stateProvinceCode: shippingAddress.state_province_code,
      countryCode: shippingAddress.country_code,
      postcode: shippingAddress.postcode,
    });
  }

  return addresses;
}