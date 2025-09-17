import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clean up existing data
  await prisma.order.deleteMany();

  // Create test orders
  await prisma.order.createMany({
    data: [
      {
        orderId: "ORD-001",
        totalAmount: 29.99,
        orderDate: new Date("2024-01-15"),
        status: "completed",
      },
      {
        orderId: "ORD-002",
        totalAmount: 45.5,
        orderDate: new Date("2024-01-20"),
        status: "completed",
      },
      {
        orderId: "ORD-003",
        totalAmount: 12.75,
        orderDate: new Date("2024-02-01"),
        status: "completed",
      },
      {
        orderId: "ORD-004",
        totalAmount: 78.25,
        orderDate: new Date("2024-02-15"),
        status: "completed",
      },
    ],
  });

  console.log("✅ Seed data created successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
