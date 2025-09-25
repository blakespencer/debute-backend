#!/bin/bash
# scripts/prisma-exec.sh
# Detects environment and runs Prisma with correct DATABASE_URL

if [ -f /.dockerenv ]; then
    # Running inside Docker
    export DATABASE_URL="postgresql://postgres:securepassword123@db:5432/backend_dev"
    echo "🐳 Using Docker database URL"
else
    # Running on host (for MCP)
    export DATABASE_URL="postgresql://postgres:securepassword123@localhost:5434/backend_dev"
    echo "🖥️  Using host database URL"
fi

echo "Running: npx prisma $@"
npx prisma "$@"