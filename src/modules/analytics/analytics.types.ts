export interface DateRange {
  start: string; // ISO date string
  end: string; // ISO date string
}

export interface RevenueMetrics {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  period: DateRange;
}

// Prisma will generate types automatically, but you can still define this if needed
export interface OrderData {
  orderId: string;
  totalAmount: number;
  orderDate: Date;
}
