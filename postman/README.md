# Postman Collection for Backend API

This folder contains Postman collection and environment files for testing the Backend API.

## Files

- `Backend-API.postman_collection.json` - Main collection with all API endpoints
- `Local-Development.postman_environment.json` - Environment variables for local development

## Import Instructions

1. Open Postman
2. Click "Import" button
3. Select both JSON files from this folder
4. Set the "Local Development" environment as active

## Available Endpoints

### Health Check
- `GET /health` - Basic health check

### Analytics
- `GET /analytics/total-revenue` - Get total revenue from orders
- `GET /analytics/order-count` - Get total number of orders
- `GET /analytics/average-order-value` - Get average order value

### Shopify Integration
- `GET /shopify/test` - Test Shopify API connection
- `POST /shopify/sync` - Sync orders from Shopify (with optional parameters)
- `GET /shopify/orders` - Get synced orders with pagination

## Usage Examples

### Test Shopify Connection
```
GET http://localhost:3000/shopify/test
```

### Sync All Recent Orders
```
POST http://localhost:3000/shopify/sync
Content-Type: application/json

{
  "limit": 50
}
```

### Sync Orders Since Specific Date
```
POST http://localhost:3000/shopify/sync
Content-Type: application/json

{
  "since": "2024-01-01T00:00:00Z",
  "limit": 100
}
```

### Get Synced Orders with Pagination
```
GET http://localhost:3000/shopify/orders?limit=20&offset=0
```

## Environment Variables

The collection uses the `{{baseUrl}}` variable which is set to `http://localhost:3000` in the Local Development environment.

## Before Testing

1. Make sure Docker containers are running:
   ```bash
   docker-compose up -d
   ```

2. Apply database schema:
   ```bash
   npx prisma db push
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Ensure your `.env` file has valid Shopify credentials:
   ```
   SHOPIFY_SHOP_DOMAIN=your-shop.myshopify.com
   SHOPIFY_ACCESS_TOKEN=shpat_...
   ```