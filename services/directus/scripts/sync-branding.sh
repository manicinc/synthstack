#!/bin/bash

# sync-branding.sh
# Purpose: Automatically upload and sync branding assets (favicon, logos) to Directus
# This script runs on container startup to ensure branding is always up to date

set -e

echo "🎨 Syncing SynthStack branding..."

# Wait for Directus to be ready
until curl -sf http://localhost:8055/server/health > /dev/null 2>&1; do
  echo "⏳ Waiting for Directus to be ready..."
  sleep 2
done

echo "✅ Directus is ready"

# Use admin token from environment
TOKEN="${ADMIN_TOKEN:-synthstack-static-admin-token-2024}"
DIRECTUS_URL="http://localhost:8055"

# Function to upload file and get ID
upload_file() {
  local file_path=$1
  local title=$2

  if [ ! -f "$file_path" ]; then
    echo "⚠️  File not found: $file_path"
    return 1
  fi

  echo "📤 Uploading: $title"

  response=$(curl -s -X POST "$DIRECTUS_URL/files" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$file_path" \
    -F "title=$title")

  file_id=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [ -z "$file_id" ]; then
    echo "⚠️  Failed to upload $title"
    return 1
  fi

  echo "✅ Uploaded: $title (ID: $file_id)"
  echo "$file_id"
}

# Function to update settings
update_settings() {
  local data=$1

  echo "⚙️  Updating Directus settings..."

  curl -s -X PATCH "$DIRECTUS_URL/settings" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$data" > /dev/null

  echo "✅ Settings updated"
}

# Upload favicon
FAVICON_PATH="/directus/public/favicon.svg"
if [ -f "$FAVICON_PATH" ]; then
  FAVICON_ID=$(upload_file "$FAVICON_PATH" "SynthStack Favicon")

  if [ -n "$FAVICON_ID" ]; then
    # Update settings with favicon
    update_settings "{\"public_favicon\":\"$FAVICON_ID\"}"
  fi
fi

# Upload logo mark if it doesn't exist
LOGO_MARK_PATH="/directus/public/logo-mark.svg"
if [ -f "$LOGO_MARK_PATH" ]; then
  LOGO_MARK_ID=$(upload_file "$LOGO_MARK_PATH" "SynthStack Logo Mark")
  echo "✅ Logo mark uploaded: $LOGO_MARK_ID"
fi

# Upload dark logo if it doesn't exist
LOGO_DARK_PATH="/directus/public/logo-dark.svg"
if [ -f "$LOGO_DARK_PATH" ]; then
  LOGO_DARK_ID=$(upload_file "$LOGO_DARK_PATH" "SynthStack Logo Dark")
  echo "✅ Dark logo uploaded: $LOGO_DARK_ID"
fi

echo "🎉 Branding sync complete!"
