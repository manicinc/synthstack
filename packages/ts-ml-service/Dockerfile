# ts-ml-service Dockerfile
# TypeScript ML Service using NestJS

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Expose port 8001
EXPOSE 8001

# Start the application
CMD ["node", "dist/main.js"]
