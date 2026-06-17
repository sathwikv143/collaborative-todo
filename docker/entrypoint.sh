#!/bin/sh
set -e

export NODE_PATH="${MIGRATE_NODE_PATH:-}"

echo "Validating environment..."
node scripts/validate-env.mjs

echo "Waiting for database..."
node scripts/wait-for-db.mjs

echo "Applying database migrations..."
node scripts/migrate.mjs

echo "Starting application..."
exec "$@"
