FROM node:20-alpine AS extensions-builder

WORKDIR /build

RUN apk update && apk add --no-cache python3 make g++ git

# Build all Directus extensions into dist/
COPY extensions ./extensions
RUN set -e; \
  find ./extensions -type d -name node_modules -prune -o -type f -name package.json -print > packages.txt; \
  cat packages.txt; \
  while read -r pkg; do \
    echo "PKG: $pkg"; \
    dir="$(dirname "$pkg")"; \
    echo "Building Directus extension: $dir"; \
    cd "$dir"; \
    if [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund; \
    else \
      npm install --no-audit --no-fund; \
    fi; \
    npm run build; \
    cd /build; \
  done < packages.txt; \
  rm packages.txt; \
  find ./extensions -type d -name node_modules -prune -exec rm -rf '{}' +;

FROM directus/directus:11.3.5

USER root

# Copy built extensions
COPY --from=extensions-builder /build/extensions /directus/extensions

# Copy public assets for branding (logo, favicon)
COPY public /directus/public

# Copy branding sync script
COPY scripts/sync-branding.sh /docker-entrypoint.d/99-sync-branding.sh

# Make scripts executable
RUN chmod +x /docker-entrypoint.d/99-sync-branding.sh

# Copy logo files to uploads for database reference
# Directus requires files to be in uploads folder when referenced in directus_files table
RUN mkdir -p /directus/uploads && \
    cp /directus/public/logo-mark.svg /directus/uploads/logo-mark.svg && \
    cp /directus/public/logo-dark.svg /directus/uploads/logo-dark.svg 2>/dev/null || true && \
    cp /directus/public/favicon.svg /directus/uploads/favicon.svg 2>/dev/null || true

# Fix permissions
RUN chown -R node:node /directus/extensions /directus/public /directus/uploads 2>/dev/null || true

# Return to default working directory
WORKDIR /directus

USER node

# The branding sync script will run automatically on container startup
# via /docker-entrypoint.d/ hook system
