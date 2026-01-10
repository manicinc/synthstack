#!/bin/bash
# Seed the database with sample data
# Usage: ./scripts/seed-db.sh [local|docker|remote]

set -e

MODE=${1:-docker}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEED_FILE="$SCRIPT_DIR/seed-data.sql"

echo "🌱 Seeding Printverse database..."
echo "Mode: $MODE"

case $MODE in
  local)
    # Direct psql connection (requires psql installed)
    psql -U postgres -d printverse -f "$SEED_FILE"
    ;;
  docker)
    # Via docker container
    docker exec -i printverse-postgres psql -U postgres -d printverse < "$SEED_FILE"
    ;;
  compose)
    # Via docker compose
    docker compose exec -T postgres psql -U postgres -d printverse < "$SEED_FILE"
    ;;
  remote)
    # Remote connection (requires DATABASE_URL env var)
    if [ -z "$DATABASE_URL" ]; then
      echo "❌ DATABASE_URL environment variable not set"
      exit 1
    fi
    psql "$DATABASE_URL" -f "$SEED_FILE"
    ;;
  *)
    echo "Usage: $0 [local|docker|compose|remote]"
    echo "  local   - Connect via local psql"
    echo "  docker  - Connect via docker exec (default)"
    echo "  compose - Connect via docker compose exec"
    echo "  remote  - Connect via DATABASE_URL env var"
    exit 1
    ;;
esac

echo "✅ Database seeded successfully!"




