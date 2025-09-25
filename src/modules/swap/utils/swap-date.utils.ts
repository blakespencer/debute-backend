/**
 * SWAP API Date Parsing Utilities
 * Handles the custom date format returned by SWAP API: "23 Sept 2025, 14:52:21"
 */

/**
 * Parse SWAP API date string to JavaScript Date
 * @param dateString - SWAP format: "23 Sept 2025, 14:52:21"
 * @returns Parsed Date object or null if invalid
 */
export function parseSwapDate(dateString: string | null | undefined): Date | undefined {
  if (!dateString || dateString === "N/A") {
    return undefined;
  }

  try {
    // SWAP format: "23 Sept 2025, 14:52:21"
    // Convert to standard format for Date parsing
    const standardFormat = dateString
      .replace(/(\d{1,2}) (\w{3,4}) (\d{4}), (\d{2}:\d{2}:\d{2})/,
               "$2 $1, $3 $4");

    const parsed = new Date(standardFormat);

    // Validate the parsed date
    if (isNaN(parsed.getTime())) {
      console.warn(`Failed to parse SWAP date: ${dateString}`);
      return undefined;
    }

    return parsed;
  } catch (error) {
    console.warn(`Error parsing SWAP date "${dateString}":`, error);
    return undefined;
  }
}

/**
 * Parse multiple SWAP date fields safely
 * @param dates - Object with date string fields
 * @returns Object with parsed Date fields
 */
export function parseSwapDates(dates: {
  date_created?: string;
  date_updated?: string;
  submitted_at?: string;
  date_closed?: string;
  shopify_order_date?: string;
}) {
  return {
    dateCreated: parseSwapDate(dates.date_created),
    dateUpdated: parseSwapDate(dates.date_updated),
    submittedAt: parseSwapDate(dates.submitted_at),
    dateClosed: parseSwapDate(dates.date_closed),
    shopifyOrderDate: parseSwapDate(dates.shopify_order_date),
  };
}