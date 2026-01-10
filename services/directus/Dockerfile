FROM directus/directus:11.3.5

USER root

# Copy custom extensions (with pre-built dist/)
COPY extensions /directus/extensions

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
