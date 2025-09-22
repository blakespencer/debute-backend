/**
 * UNIT TEST TEMPLATE
 *
 * Copy this template for new unit test files to ensure consistent setup
 * and avoid database connection issues.
 */

// Standard unit test setup - prevents database connections
import '../../../helpers/unit-test-setup';

// Your imports here
import { PrismaClient } from '@prisma/client';
import { YourService } from '../../../../src/modules/your-module/your-service';
import { createMockPrisma } from '../../../helpers/mocks/prisma.mock';

describe('YourService', () => {
  let yourService: YourService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    // For services that use Prisma
    mockPrisma = createMockPrisma();
    yourService = new YourService(mockPrisma);

    // For services that don't use Prisma, just:
    // yourService = new YourService();
  });

  describe('yourMethod', () => {
    it('should do something specific', async () => {
      // Arrange
      // Mock any dependencies here

      // Act
      // Call the method being tested

      // Assert
      // Verify the results
      expect(true).toBe(true); // Replace with real assertions
    });
  });
});

/**
 * USAGE NOTES:
 *
 * 1. ALWAYS start with: import '../../../helpers/unit-test-setup';
 * 2. This automatically mocks logger and database to prevent connections
 * 3. Use createMockPrisma() for Prisma-dependent services
 * 4. Mock global functions (like fetch) if needed: global.fetch = jest.fn();
 * 5. Write focused, single-responsibility tests
 * 6. Use descriptive test names that explain what is being tested
 */