#!/bin/bash
# Run Directus migrations
# Usage: ./run-migration.sh [migration_number]

MIGRATION=${1:-040}
MIGRATION_FILE="services/directus/migrations/${MIGRATION}_*.sql"

echo "Running migration: ${MIGRATION}"
echo "File: ${MIGRATION_FILE}"

# Find the actual migration file
ACTUAL_FILE=$(ls ${MIGRATION_FILE} 2>/dev/null | head -1)

if [ -z "$ACTUAL_FILE" ]; then
  echo "Error: Migration file not found: ${MIGRATION_FILE}"
  exit 1
fi

echo "Found: ${ACTUAL_FILE}"
echo "Applying migration to database..."

# Run the migration through docker
docker-compose exec -T postgres psql -U \$POSTGRES_USER -d directus < "$ACTUAL_FILE"

if [ $? -eq 0 ]; then
  echo "Migration ${MIGRATION} completed successfully!"
else
  echo "Migration ${MIGRATION} failed!"
  exit 1
fi
