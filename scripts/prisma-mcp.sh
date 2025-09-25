#!/bin/bash

# Wrapper script for Prisma MCP to ensure proper environment loading
# Usage: ./scripts/prisma-mcp.sh [prisma-command]

# Load environment variables from .env file
export $(grep -v '^#' .env | xargs)

# Execute the prisma command with proper environment
exec npx prisma "$@"