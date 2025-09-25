// scripts/validate-schema.js
const { PrismaClient } = require('@prisma/client');

async function validateSchema() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:securepassword123@db:5432/backend_dev'
      }
    }
  });

  try {
    console.log('🔍 Validating database schema...');

    // Test query that uses the problematic fields that were causing sync errors
    const testQuery = await prisma.$queryRaw`
      SELECT
        column_name
      FROM
        information_schema.columns
      WHERE
        table_name = 'swap_returns'
        AND column_name IN ('delivery_status', 'return_status', 'tracking_number', 'submitted_at')
    `;

    const expectedColumns = ['delivery_status', 'return_status', 'tracking_number', 'submitted_at'];
    const foundColumns = testQuery.map(row => row.column_name);
    const missingColumns = expectedColumns.filter(col => !foundColumns.includes(col));

    if (missingColumns.length > 0) {
      console.error('❌ Missing columns:', missingColumns);
      process.exit(1);
    }

    console.log('✅ All required SWAP API columns found:', foundColumns);

    // Test that we can actually insert data with the new fields
    console.log('🧪 Testing data insertion...');

    // First ensure we have a store
    const store = await prisma.swapStore.upsert({
      where: { swapStoreId: 'test-store-validation' },
      update: {},
      create: {
        swapStoreId: 'test-store-validation',
        apiKey: 'test-key',
        storeName: 'Test Store'
      }
    });

    // Test insert with the previously problematic fields
    const testReturn = await prisma.swapReturn.create({
      data: {
        swapReturnId: 'test-validation-' + Date.now(),
        orderName: '#TEST-1651',
        orderId: '7546826916104',
        rma: '999',
        typeString: 'Additional Payment',
        type: JSON.stringify(['Additional Payment']),
        deliveryStatus: 'Label-Created',  // This was causing sync errors!
        returnStatus: 'needs-review',     // This was causing sync errors!
        status: 'Processing',
        shippingStatus: 'pending',
        total: 10.00,
        handlingFee: 0.00,
        shopNowRevenue: 0.00,
        shopLaterRevenue: 0.00,
        exchangeRevenue: 0.00,
        refundRevenue: 0.00,
        totalAdditionalPayment: 10.00,
        totalCreditExchangeValue: 0.00,
        totalRefundValueCustomerCurrency: 0.00,
        submittedAt: new Date(),
        trackingNumber: 'TEST123456789',
        dateCreated: new Date('2025-09-23T14:52:21Z'),
        dateUpdated: new Date('2025-09-23T17:01:50Z'),
        storeId: store.id
      }
    });

    console.log('✅ Test data insertion successful!');
    console.log('   Created return with delivery_status:', testReturn.deliveryStatus);
    console.log('   Created return with return_status:', testReturn.returnStatus);
    console.log('   Created return with tracking_number:', testReturn.trackingNumber);

    // Clean up test data
    await prisma.swapReturn.delete({
      where: { id: testReturn.id }
    });

    await prisma.swapStore.delete({
      where: { id: store.id }
    });

    console.log('🧹 Test data cleaned up');
    console.log('🎉 Schema validation completed successfully!');

  } catch (error) {
    console.error('❌ Schema validation failed:', error.message);
    if (error.code === 'P2002') {
      console.error('   This might be a unique constraint violation - check your test data');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

validateSchema();