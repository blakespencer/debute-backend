# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Application
```bash
npm run dev      # Start development server with hot reload (nodemon + ts-node)
npm run build    # Compile TypeScript to JavaScript
npm run start    # Start production server (requires build)
```

### Docker Development
```bash
# IMPORTANT: Always use "docker compose" (NOT "docker-compose")
docker compose up --build    # Start development environment with hot reload
docker compose up -d         # Start in background (detached mode)
docker compose down          # Stop all services
docker compose logs -f app   # View application logs
docker compose exec app sh   # Access container shell
```

### Code Quality
```bash
npm run lint     # Run ESLint to check code quality and style
npm run lint:fix # Auto-fix ESLint issues where possible
```

### Testing
```bash
npm test                # Run all tests
npm run test:unit       # Run unit tests only
npm run test:integration # Run integration tests only
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

### Database Management
```bash
# Schema changes (development)
npx prisma db push          # Apply schema changes without migration
npx prisma generate         # Regenerate Prisma client after schema changes

# Migrations (production workflow)
npx prisma migrate dev --name <name>    # Create and apply migration
npx prisma migrate deploy               # Apply pending migrations in production

# Data operations
npx prisma db seed          # Run seed script (prisma/seed.ts)
npx prisma studio           # Open database GUI browser

# Reset database
npx prisma migrate reset    # Drop all data and re-run migrations
```

## Architecture Overview

This is an Express.js backend API with TypeScript and Prisma ORM connecting to PostgreSQL. The codebase follows a modular architecture with clear separation of concerns.

### Module Structure
Each feature module follows this pattern:
- `*.controller.ts` - Express route handlers, request/response handling
- `*.service.ts` - Business logic and orchestration
- `*.repository.ts` - Database operations using Prisma
- `*.types.ts` - TypeScript interfaces and types
- `*.client.ts` - External API integrations (if needed)

### Database Schema
The project uses Prisma with PostgreSQL. Key models:
- `Order` - Basic orders for revenue analytics
- `ShopifyStore` - Shopify store configurations
- `ShopifyOrder` - Detailed Shopify order data with flattened MoneyBag fields
- `ShopifyLineItem` - Order line items with pricing

All monetary values use `Decimal` type with proper precision. Shopify models use flattened MoneyBag pattern for currency amounts.

### Architecture Patterns

#### Service Pattern (Repository-Service-Controller)
Each module follows this layered architecture:
- **Repository**: Database operations using Prisma ORM
- **Service**: Business logic, validation, and orchestration
- **Controller**: HTTP request/response handling
- **Types**: TypeScript interfaces and enums

Example dependency flow:
```
Controller → Service → Repository → Prisma → Database
```

#### Error Handling Strategy
- Custom error classes extending base `AppError`
- Consistent HTTP status codes and error format
- Error propagation through all layers
- Global Express error middleware catches all errors

#### Testing Philosophy
- **NO test files in src/** - keeps source code clean
- **All tests in test/ directory** with mirrored structure
- **Unit tests**: Fast, isolated with mocked dependencies
- **Integration tests**: Real database, end-to-end validation
- **Fixtures and mocks**: Centralized and reusable

### Current Modules
- **analytics**: Revenue analytics endpoints (totalRevenue, orderCount, averageOrderValue)
- **shopify**: Shopify integration for syncing orders and data (in development)

## Testing Structure

### Directory Organization
```
test/
├── unit/                          # Unit tests (mirror src structure)
│   ├── modules/
│   │   ├── analytics/
│   │   │   ├── analytics.controller.test.ts
│   │   │   ├── analytics.service.test.ts
│   │   │   └── analytics.repository.test.ts
│   │   └── shopify/
│   │       ├── shopify.service.test.ts
│   │       └── shopify.repository.test.ts
│   └── common/
│       ├── errors.test.ts
│       └── money.test.ts
├── integration/                   # End-to-end tests
│   ├── analytics.integration.test.ts
│   └── shopify.integration.test.ts
├── helpers/                       # Test utilities
│   ├── fixtures/                  # Test data
│   ├── mocks/                     # Mock implementations
│   └── utils/                     # Helper functions
└── setup.ts                       # Jest configuration
```

### Testing Guidelines
- **Unit tests**: Mock all dependencies, test business logic
- **Integration tests**: Use real database, test full flow
- **Fixtures**: Reusable test data in `test/helpers/fixtures/`
- **Mocks**: Shared mocks in `test/helpers/mocks/`
- **Clean tests**: Each test should be independent and clean up after itself

#### Unit Test Setup (STANDARDIZED APPROACH)
**ALWAYS start unit test files with this pattern to avoid database connection issues:**

```typescript
// Standard unit test setup - prevents database connections
import '../../../helpers/unit-test-setup';

import { YourService } from '../../../../src/modules/your-module/your-service';
import { createMockPrisma } from '../../../helpers/mocks/prisma.mock';

describe('YourService', () => {
  // Your tests here
});
```

**Key Points:**
- `unit-test-setup.ts` automatically mocks logger and database
- Use `createMockPrisma()` for Prisma-dependent services
- See `test/helpers/unit-test.template.ts` for complete template
- This prevents database connection errors during unit testing

## Adding New Features

1. Create module structure: `src/modules/[feature-name]/`
2. Update Prisma schema if needed, then run `npx prisma db push` and `npx prisma generate`
3. Import and register controller in `src/app.ts`
4. Create corresponding test files in `test/unit/modules/[feature-name]/`
5. Write unit tests for service and repository layers
6. Create integration test for full feature flow
7. Test endpoint with curl or similar tool

## Code Style Guidelines

### File and Function Length Limits
- **Files**: Maximum 250 lines (excluding test files `*.test.ts`, `*.spec.ts`)
- **Functions**: Maximum 70 lines (excluding test files)
- **ESLint Integration**: These rules are enforced as warnings (yellow squiggles) via ESLint
- When approaching these limits, refactor by:
  - Extracting helper functions
  - Splitting into multiple files/modules
  - Creating utility functions in `common/` directory

### ESLint Configuration
The project uses ESLint with TypeScript support and custom rules for:
- Line limit warnings (files >250 lines, functions >70 lines)
- Complexity warnings (complexity >10, nesting >4 levels, >4 parameters)
- Test files are excluded from line limit rules
- Run `npm run lint` to check all files or use your editor's ESLint integration

## Environment Configuration

Required environment variables in `.env`:
- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - Environment (development/production)