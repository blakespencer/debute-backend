# Debute Backend API

A comprehensive backend service for Debute with analytics and Shopify integration. Built with Node.js, Express, TypeScript, and Prisma.

## Features

- 📊 **Revenue Analytics**: Complete analytics endpoints with date filtering (total revenue, order count, average order value)
- 🛒 **Shopify Integration**: Full order synchronization with GraphQL API client and incremental sync support
- 🔄 **Dual Data Sources**: Analytics work with both Shopify data and fallback basic orders
- 🗄️ **Advanced Database**: PostgreSQL with Prisma ORM, performance indexes, and comprehensive schema
- 🛡️ **Type Safety**: Full TypeScript implementation with strict type checking
- 🧪 **Testing Infrastructure**: Integration tests with Docker support and comprehensive fixtures
- 📋 **API Documentation**: Complete Postman collection with all endpoints and examples
- ⚡ **Development Ready**: Hot reload, Docker containerization, and development tooling
- 🎯 **Production Architecture**: Modular design with proper separation of concerns

## Prerequisites

### For Native Development
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### For Docker Development (Recommended)
- Docker & Docker Compose
- Git

## Quick Start

### Option 1: Native Development

1. **Clone and install**
   ```bash
   git clone <your-repo>
   cd backend
   npm install
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database URL
   ```

3. **Setup database**
   ```bash
   npx prisma db push
   npx prisma generate
   npx prisma db seed
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

### Option 2: Docker Development (Recommended)

1. **Clone and start with Docker**
   ```bash
   git clone <your-repo>
   cd backend
   cp .env.example .env
   docker compose up
   ```

2. **Setup database (in separate terminal)**
   ```bash
   docker compose run app npm run prisma:migrate
   docker compose run app npm run prisma:seed
   ```

### Test the API
```bash
curl "http://localhost:3000/api/analytics/revenue?start=2024-01-01&end=2024-12-31"
curl "http://localhost:3000/health"
```

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
DATABASE_URL="postgresql://postgres:securepassword123@db:5432/backend_dev"
DATABASE_URL_TEST="postgresql://postgres:securepassword123@test-db:5432/backend_test"
NODE_ENV=development

# Shopify Integration (optional - required for sync functionality)
SHOPIFY_SHOP_DOMAIN="your-store.myshopify.com"
SHOPIFY_ACCESS_TOKEN="your-access-token"
```

## API Endpoints

### Health Check

```
GET /health
```

### Analytics Endpoints

All analytics endpoints support optional date range filtering:

```
GET /analytics/total-revenue?start=YYYY-MM-DD&end=YYYY-MM-DD
GET /analytics/order-count?start=YYYY-MM-DD&end=YYYY-MM-DD
GET /analytics/average-order-value?start=YYYY-MM-DD&end=YYYY-MM-DD
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "totalRevenue": 350.00
  }
}
```

### Shopify Integration Endpoints

```
GET /shopify/test                    # Test Shopify API connection
POST /shopify/sync                   # Sync orders from Shopify
GET /shopify/orders?limit=20&offset=0 # Get synced orders with pagination
```

**Sync Request Body:**
```json
{
  "since": "2024-01-01T00:00:00Z",  // Optional: sync since specific date
  "limit": 100                       // Optional: limit number of orders
}
```

**Sync Response:**
```json
{
  "success": true,
  "data": {
    "ordersProcessed": 25,
    "ordersCreated": 15,
    "ordersUpdated": 10,
    "errors": []
  }
}
```

## Database

This project uses PostgreSQL with Prisma ORM for type-safe database operations.

### Database Commands

#### Schema Management

```bash
# Push schema changes to database (for development)
npx prisma db push

# Generate Prisma client after schema changes
npx prisma generate

# Create and run migrations (for production)
npx prisma migrate dev --name your-migration-name
```

#### Data Management

```bash
# Seed the database with test data
npx prisma db seed

# Reset database (drops all data and re-runs migrations)
npx prisma migrate reset

# View and edit data in browser
npx prisma studio
```

#### Inspection

```bash
# View current database schema
npx prisma db pull

# Validate schema without changes
npx prisma validate

# Format schema file
npx prisma format
```

### Migration Workflow

#### Creating Your First Migration

```bash
# Start with your current schema
npx prisma migrate dev --name init

# This creates:
# - prisma/migrations/timestamp_init/migration.sql
# - Updates your database
# - Generates Prisma client
```

#### Making Schema Changes

```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name add_user_email_field

# 3. Prisma will:
#    - Generate SQL migration file
#    - Apply it to your database
#    - Update Prisma client
```

#### Team Collaboration

```bash
# When pulling changes from git that include new migrations:
npx prisma migrate dev  # Applies any pending migrations

# If conflicts occur:
npx prisma migrate reset  # ⚠️  Resets DB and applies all migrations
npx prisma db seed       # Restore test data
```

#### Production Deployment

```bash
# In your deployment script:
npx prisma migrate deploy  # Applies pending migrations only
npx prisma generate        # Ensures client is up to date
```

### Database Schema

The application uses a comprehensive schema supporting both basic orders and detailed Shopify integration:

**Core Models:**
- `Order` - Basic orders for fallback analytics
- `ShopifyStore` - Shopify store configurations
- `ShopifyOrder` - Detailed Shopify order data with flattened MoneyBag fields
- `ShopifyLineItem` - Order line items with pricing details

**Key Features:**
- Decimal precision for all monetary values
- Performance indexes on frequently queried fields
- Unique constraints ensuring data integrity
- Optimized for analytics queries with proper indexing

## Development Workflow

### Day-to-Day Development

1. **Start your development session**

   ```bash
   npm run dev  # Starts server with hot reload
   ```

2. **Make database changes**

   ```bash
   # Edit prisma/schema.prisma
   npx prisma db push      # Apply changes
   npx prisma generate     # Update TypeScript types
   ```

3. **Add test data when needed**

   ```bash
   npx prisma db seed      # Run seed script
   ```

4. **Explore data**
   ```bash
   npx prisma studio       # Opens database GUI
   ```

### Adding New Features

1. **Create the module structure**

   ```bash
   mkdir -p src/modules/your-feature
   touch src/modules/your-feature/your-feature.{controller,service,repository,types}.ts
   ```

2. **Update database schema if needed**

   ```prisma
   # Add new model to prisma/schema.prisma
   model YourModel {
     id String @id @default(cuid())
     # ... your fields
   }
   ```

3. **Apply database changes**

   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. **Add routes to app.ts**

   ```typescript
   import { YourFeatureController } from "./modules/your-feature/your-feature.controller";
   const yourFeatureController = new YourFeatureController();
   app.get("/api/your-feature", yourFeatureController.yourMethod);
   ```

5. **Test your feature**
   ```bash
   curl "http://localhost:3000/api/your-feature"
   ```

### Testing Changes

```bash
# Run health check
curl http://localhost:3000/health

# Test analytics endpoints
curl "http://localhost:3000/analytics/total-revenue?start=2024-01-01&end=2024-12-31"
curl "http://localhost:3000/analytics/order-count"
curl "http://localhost:3000/analytics/average-order-value"

# Test Shopify integration (requires environment variables)
curl http://localhost:3000/shopify/test
curl -X POST http://localhost:3000/shopify/sync -H "Content-Type: application/json" -d '{"limit": 10}'
curl "http://localhost:3000/shopify/orders?limit=5"

# Run comprehensive tests
npm test                           # Run all tests
npm run test:integration:docker    # Run integration tests in Docker (recommended)
npm run test:coverage              # Run tests with coverage
```

### Debugging

```bash
# View server logs
npm run dev  # Logs appear in terminal

# Check database content
npx prisma studio  # Visual database browser

# Reset everything if stuck
npx prisma migrate reset  # ⚠️  Destroys all data
npx prisma db seed        # Restore test data
```

## Architecture

This project follows a modular, domain-driven architecture with clear separation of concerns:

### Service Pattern
- **Repository**: Handles database operations via Prisma ORM
- **Service**: Contains business logic and orchestration
- **Controller**: Handles HTTP layer and request/response formatting
- **Types**: TypeScript interfaces and type definitions

Each layer is independently testable and follows dependency injection principles.

### Error Handling
- Custom error classes extending base `AppError`
- Consistent error format with proper HTTP status codes
- Error propagation through all application layers

## Project Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── analytics/          # Analytics feature module
│   │   │   ├── analytics.controller.ts
│   │   │   ├── analytics.service.ts
│   │   │   ├── analytics.repository.ts
│   │   │   └── analytics.types.ts
│   │   └── shopify/            # Shopify integration module
│   │       ├── shopify.client.ts
│   │       ├── shopify.controller.ts
│   │       ├── shopify.repository.ts
│   │       ├── shopify.service.ts
│   │       ├── shopify.sync.service.ts
│   │       └── shopify.types.ts
│   ├── common/                 # Shared utilities
│   │   ├── database.ts         # Prisma client
│   │   ├── config.ts           # Environment config
│   │   ├── errors.ts           # Custom error classes
│   │   └── money.ts            # Money/currency utilities
│   ├── app.ts                  # Express app setup
│   └── server.ts               # Server entry point
├── test/                       # All tests (separate from src)
│   ├── unit/                   # Unit tests mirroring src structure
│   ├── integration/            # Integration tests
│   ├── helpers/                # Test utilities, fixtures, mocks
│   └── setup.ts                # Test configuration
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Database migrations
│   └── seed.ts                 # Test data seeding
├── .env                        # Environment variables
├── CLAUDE.md                   # Claude Code development guide
├── TODO.md                     # Project task tracking
└── package.json
```

## Testing Philosophy

This project follows a comprehensive testing strategy:

- **NO test files in src/** - keeps source code clean and focused
- **All tests in separate test/ directory** with clear organization
- **Unit tests** mirror the src structure for easy navigation
- **Integration tests** validate end-to-end functionality
- **Fixtures and helpers** centralized for reusability
- **Mocks** isolated in dedicated directory
- **Fast feedback** during development with unit tests
- **Thorough validation** with integration tests before deployment

### Test Structure
- `test/unit/` - Fast, isolated unit tests with mocked dependencies
- `test/integration/` - Real database integration tests
- `test/helpers/fixtures/` - Test data fixtures
- `test/helpers/mocks/` - Mock implementations
- `test/helpers/utils/` - Test utility functions

## Scripts

### Development
```bash
npm run dev     # Start development server with hot reload
npm run build   # Build for production
npm run start   # Start production server
```

### Code Quality
```bash
npm run lint        # Check code style and quality
npm run lint:fix    # Auto-fix linting issues
```

### Testing
```bash
npm test                # Run all tests
npm run test:unit       # Run unit tests only
npm run test:integration # Run integration tests only
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report

# Docker Integration Testing
npm run test:integration:docker     # Run integration tests in Docker (recommended)
npm run test:coverage:integration   # Run integration tests with coverage in Docker
```

### Database
```bash
npm run prisma:generate # Generate Prisma client
npm run prisma:migrate  # Run database migrations
npm run prisma:studio   # Open Prisma Studio
npm run prisma:seed     # Seed database with test data
```

### Docker
```bash
# Development Environment
docker compose up               # Start dev environment (app + PostgreSQL + test DB)
docker compose up -d            # Start in detached mode
docker compose down             # Stop all services
docker compose logs app         # View application logs

# Production Environment
docker compose -f docker-compose.prod.yml up    # Start production environment
docker compose -f docker-compose.prod.yml up -d # Production detached mode

# Testing in Docker
docker compose run app npm test           # Run all tests
docker compose run app npm run test:unit  # Run unit tests only
docker compose run app npm run test:integration # Run integration tests

# Integration Testing (Recommended Workflow)
npm run test:integration:docker           # Run integration tests in Docker container
npm run test:coverage:integration         # Run integration tests with coverage in Docker

# Database Operations in Docker
docker compose run app npm run prisma:migrate   # Run migrations
docker compose run app npm run prisma:seed      # Seed database
docker compose exec db psql -U postgres -d backend_dev  # Connect to database
```

## Current Status & Next Steps

### ✅ Completed
- Complete Shopify integration with order synchronization
- Analytics endpoints with dual data source support (Shopify + fallback)
- Comprehensive database schema with performance optimization
- Integration testing infrastructure with Docker support
- Complete API documentation via Postman collection

### 🚧 In Progress
- Unit test implementation (scaffolding exists but tests are empty)
- Enhanced error handling and logging

### 📋 Planned
- Authentication system
- Redis caching layer for analytics
- Advanced analytics (month-over-month comparisons, KPI calculations)
- Additional integrations (Meta Ads, Google Analytics 4)
- Performance monitoring and optimization

## Troubleshooting

**Database connection issues:**

```bash
# Check PostgreSQL is running
pg_isready

# Verify your DATABASE_URL in .env
# Make sure database exists
```

**Prisma client issues:**

```bash
# Regenerate client
npx prisma generate

# Clear node_modules if needed
rm -rf node_modules package-lock.json
npm install
```

**Server won't start:**

```bash
# Check if port is already in use
lsof -i :3000

# Try a different port in .env
PORT=3001
```
