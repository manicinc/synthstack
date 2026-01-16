# SynthStack API Gateway - Fastify + Node.js (Community Edition)
# Build from repo root: docker build -f packages/api-gateway/Dockerfile .
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json ./package.json

# Copy package.json files for all required workspaces
COPY packages/api-gateway/package.json ./packages/api-gateway/
COPY packages/types/package.json ./packages/types/

# Install production dependencies only
RUN pnpm install --prod --filter @synthstack/api-gateway...

# Copy pre-built dist folders
COPY packages/api-gateway/dist ./packages/api-gateway/dist
COPY packages/types/dist ./packages/types/dist

WORKDIR /app/packages/api-gateway

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3003/health || exit 1

# Start the server
CMD ["node", "dist/index.js"]
