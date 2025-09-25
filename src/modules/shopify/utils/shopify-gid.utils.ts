/**
 * Shopify GID (Global ID) Utilities
 * Handles extraction of clean IDs from Shopify's GID format
 */

/**
 * Extract clean ID from Shopify GID format
 * @param gid - Shopify GID format: "gid://shopify/Order/7546826916104"
 * @returns Clean ID: "7546826916104"
 */
export function extractIdFromGid(gid: string): string {
  if (!gid) return '';

  // Handle GID format: "gid://shopify/Order/7546826916104"
  const match = gid.match(/gid:\/\/shopify\/\w+\/(\d+)$/);
  if (match && match[1]) {
    return match[1];
  }

  // If not in GID format, return as-is (fallback)
  return gid;
}

/**
 * Extract clean order ID from Shopify order GID
 * @param orderGid - Shopify order GID: "gid://shopify/Order/7546826916104"
 * @returns Clean order ID: "7546826916104"
 */
export function extractOrderId(orderGid: string): string {
  return extractIdFromGid(orderGid);
}

/**
 * Extract clean variant ID from Shopify variant GID
 * @param variantGid - Shopify variant GID: "gid://shopify/ProductVariant/12345"
 * @returns Clean variant ID: "12345"
 */
export function extractVariantId(variantGid: string): string {
  return extractIdFromGid(variantGid);
}

/**
 * Extract clean product ID from Shopify product GID
 * @param productGid - Shopify product GID: "gid://shopify/Product/12345"
 * @returns Clean product ID: "12345"
 */
export function extractProductId(productGid: string): string {
  return extractIdFromGid(productGid);
}