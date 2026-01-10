#!/bin/bash
# ============================================
# SynthStack Deployment Script with .env Upload
# ============================================
# This script:
# 1. Copies local .env files to remote server
# 2. Deploys code to server
# 3. Restarts Docker containers
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_HOST="${REMOTE_HOST_PRODUCTION:-50.116.40.126}"
REMOTE_DIR="/opt/synthstack"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}SynthStack Deployment with .env Upload${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Remote: ${YELLOW}${REMOTE_USER}@${REMOTE_HOST}${NC}"
echo -e "Directory: ${YELLOW}${REMOTE_DIR}${NC}"
echo ""

# Step 1: Check for required .env files
echo -e "${YELLOW}Step 1: Checking for .env files...${NC}"

ENV_FILES=(
  "apps/web/.env"
  "packages/api-gateway/.env"
  "services/directus/.env"
)

MISSING_FILES=()
for file in "${ENV_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    MISSING_FILES+=("$file")
  fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
  echo -e "${RED}Error: Missing .env files:${NC}"
  for file in "${MISSING_FILES[@]}"; do
    echo -e "  ${RED}- $file${NC}"
  done
  echo ""
  echo -e "${YELLOW}Copy .env.example to .env for each package and fill in values.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ All required .env files found${NC}"
echo ""

# Step 2: Upload .env files to server
echo -e "${YELLOW}Step 2: Uploading .env files to server...${NC}"

for file in "${ENV_FILES[@]}"; do
  REMOTE_PATH="${REMOTE_DIR}/${file}"
  REMOTE_PARENT=$(dirname "$REMOTE_PATH")

  # Create directory on remote if it doesn't exist
  ssh -i "$SSH_KEY" "${REMOTE_USER}@${REMOTE_HOST}" "mkdir -p ${REMOTE_PARENT}" 2>/dev/null || true

  # Upload .env file
  scp -i "$SSH_KEY" "$file" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}"
  echo -e "${GREEN}✓ Uploaded $file${NC}"
done

echo ""

# Step 3: Upload docker-compose and deployment scripts
echo -e "${YELLOW}Step 3: Uploading deployment files...${NC}"

# Create remote directory
ssh -i "$SSH_KEY" "${REMOTE_USER}@${REMOTE_HOST}" "mkdir -p ${REMOTE_DIR}"

# Upload docker-compose.yml
scp -i "$SSH_KEY" deploy/docker-compose.yml "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/docker-compose.yml"
echo -e "${GREEN}✓ Uploaded docker-compose.yml${NC}"

# Upload deployment script
scp -i "$SSH_KEY" deploy/scripts/deploy.sh "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/deploy.sh"
ssh -i "$SSH_KEY" "${REMOTE_USER}@${REMOTE_HOST}" "chmod +x ${REMOTE_DIR}/deploy.sh"
echo -e "${GREEN}✓ Uploaded deploy.sh${NC}"

echo ""

# Step 4: Deploy code (rsync)
echo -e "${YELLOW}Step 4: Deploying code to server...${NC}"

# Sync code (exclude .env files, node_modules, etc.)
rsync -avz --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='dist' \
  --exclude='build' \
  --exclude='.DS_Store' \
  --exclude='*.log' \
  -e "ssh -i $SSH_KEY" \
  ./ "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"

echo -e "${GREEN}✓ Code deployed${NC}"
echo ""

# Step 5: Install dependencies and restart services
echo -e "${YELLOW}Step 5: Installing dependencies and restarting services...${NC}"

ssh -i "$SSH_KEY" "${REMOTE_USER}@${REMOTE_HOST}" << 'ENDSSH'
cd /opt/synthstack

# Install Docker if not present
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  systemctl enable docker
  systemctl start docker
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
  echo "Installing Docker Compose..."
  curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi

# Pull images and restart
echo "Pulling latest images..."
docker-compose pull

echo "Restarting containers..."
docker-compose down
docker-compose up -d

echo "Waiting for services to start..."
sleep 10

# Show status
docker-compose ps
ENDSSH

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Services running at:"
echo -e "  ${YELLOW}Frontend:${NC} http://${REMOTE_HOST}"
echo -e "  ${YELLOW}API:${NC} http://${REMOTE_HOST}:3000"
echo -e "  ${YELLOW}Directus:${NC} http://${REMOTE_HOST}:8055"
echo ""
echo -e "To view logs:"
echo -e "  ${YELLOW}ssh ${REMOTE_USER}@${REMOTE_HOST} 'cd ${REMOTE_DIR} && docker-compose logs -f'${NC}"
echo ""
