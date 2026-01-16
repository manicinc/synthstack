#!/bin/bash
# Create demo user in Directus after startup
# This script should be run after Directus is fully initialized

DIRECTUS_URL="${DIRECTUS_URL:-http://localhost:8055}"
ADMIN_TOKEN="${DIRECTUS_ADMIN_TOKEN:-synthstack-static-admin-token-2024}"
DEMO_EMAIL="demo@synthstack.app"
DEMO_PASSWORD="DemoUser2024!"

echo "Waiting for Directus to be ready..."
until curl -s "${DIRECTUS_URL}/server/ping" > /dev/null 2>&1; do
  sleep 2
done
echo "Directus is ready!"

# Check if demo user already exists
EXISTING_USER=$(curl -s -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  "${DIRECTUS_URL}/users?filter[email][_eq]=${DEMO_EMAIL}" | grep -o '"id"')

if [ -n "$EXISTING_USER" ]; then
  echo "Demo user already exists, skipping creation."
  exit 0
fi

echo "Creating demo user..."

# Get the Administrator role ID
ADMIN_ROLE_ID=$(curl -s -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  "${DIRECTUS_URL}/roles?filter[name][_eq]=Administrator" | \
  grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$ADMIN_ROLE_ID" ]; then
  echo "Could not find Administrator role, using first available role"
  ADMIN_ROLE_ID=$(curl -s -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    "${DIRECTUS_URL}/roles" | \
    grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

echo "Using role ID: ${ADMIN_ROLE_ID}"

# Create the demo user
RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  "${DIRECTUS_URL}/users" \
  -d "{
    \"email\": \"${DEMO_EMAIL}\",
    \"password\": \"${DEMO_PASSWORD}\",
    \"first_name\": \"Demo\",
    \"last_name\": \"User\",
    \"role\": \"${ADMIN_ROLE_ID}\",
    \"status\": \"active\",
    \"token\": \"demo-readonly-token-2024\"
  }")

if echo "$RESPONSE" | grep -q '"id"'; then
  echo "Demo user created successfully!"
  echo "  Email: ${DEMO_EMAIL}"
  echo "  Password: ${DEMO_PASSWORD}"
else
  echo "Failed to create demo user:"
  echo "$RESPONSE"
  exit 1
fi
