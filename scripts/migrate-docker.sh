#!/bin/bash
# scripts/migrate-docker.sh

echo "🔄 Running Prisma migrations in Docker..."

# Run migrations inside container with correct URL
docker compose exec -T app sh -c '
  export DATABASE_URL="postgresql://postgres:securepassword123@db:5432/backend_dev"
  npx prisma migrate deploy
  npx prisma generate
'

echo "✅ Migrations complete"

# Verify schema
docker compose exec db psql -U postgres -d backend_dev -c "\d swap_returns" | grep -E "(delivery_status|return_status)"