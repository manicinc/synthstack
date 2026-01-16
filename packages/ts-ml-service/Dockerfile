# ts-ml-service Dockerfile
# TypeScript ML Service using NestJS

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install dependencies with npm
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port 8001
EXPOSE 8001

# Start the application
CMD ["node", "dist/main.js"]
