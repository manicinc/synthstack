# ts-ml-service Dockerfile
# TypeScript ML Service using NestJS
# Build from repo root: docker build -f packages/ts-ml-service/Dockerfile .

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files (from repo root context)
COPY packages/ts-ml-service/package.json ./
COPY packages/ts-ml-service/tsconfig*.json ./
COPY packages/ts-ml-service/nest-cli.json ./

# Install dependencies (legacy-peer-deps for NestJS compatibility)
RUN npm install --legacy-peer-deps

# Copy source code
COPY packages/ts-ml-service/src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package.json and install prod deps only
COPY packages/ts-ml-service/package.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port 8001
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8001/health || exit 1

# Start the application
CMD ["node", "dist/main.js"]
