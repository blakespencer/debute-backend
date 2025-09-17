import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

async function main() {
  // Clean up existing data (in dependency order)
  await prisma.shopifyLineItem.deleteMany();
  await prisma.shopifyOrder.deleteMany();
  await prisma.shopifyStore.deleteMany();
  await prisma.order.deleteMany();

  // Create test store
  const store = await prisma.shopifyStore.create({
    data: {
      shopDomain: "test-store.myshopify.com",
      accessToken: "test-token",
      lastSyncAt: new Date(),
    },
  });

  // Create basic orders for analytics
  await prisma.order.createMany({
    data: [
      {
        orderId: "ORD-001",
        totalAmount: new Decimal(29.99),
        orderDate: new Date("2024-01-15"),
        status: "completed",
      },
      {
        orderId: "ORD-002",
        totalAmount: new Decimal(45.5),
        orderDate: new Date("2024-01-20"),
        status: "completed",
      },
      {
        orderId: "ORD-003",
        totalAmount: new Decimal(12.75),
        orderDate: new Date("2024-02-01"),
        status: "completed",
      },
      {
        orderId: "ORD-004",
        totalAmount: new Decimal(78.25),
        orderDate: new Date("2024-02-15"),
        status: "completed",
      },
    ],
  });

  console.log("✅ Seed data created successfully");
  console.log(`📦 Created store: ${store.shopDomain}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
