#!/bin/sh
set -e
cd /app

echo "Validating environment..."
node scripts/validate-env.mjs

echo "Waiting for database..."
node scripts/wait-for-db.mjs

echo "Applying database migrations..."
node scripts/migrate.mjs

echo "Starting application..."
exec "$@"
