#!/bin/bash
# SynthStack Deployment Script
# Run this script on your VPS/cloud server to deploy/update SynthStack
# Compatible with: Linode, DigitalOcean, AWS EC2, Vultr, Hetzner, and any VPS provider

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 SynthStack Deployment Script${NC}"
echo "====================================="

# Configuration (can be overridden via environment variables)
DEPLOY_DIR="${DEPLOY_DIR:-/opt/synthstack}"
WEB_DIR="${WEB_DIR:-/var/www/synthstack}"
BACKUP_DIR="${BACKUP_DIR:-/opt/synthstack/backups}"
GITHUB_REPO="${GITHUB_REPO:-ghcr.io/manicinc/synthstack}"
DEPLOYMENT_PROVIDER="${DEPLOYMENT_PROVIDER:-generic}"
SSH_PORT="${SSH_PORT:-22}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root or with sudo${NC}"
  exit 1
fi

# Function to create backup
create_backup() {
  echo -e "${YELLOW}Creating backup...${NC}"
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  mkdir -p "$BACKUP_DIR"
  
  # Backup database
  docker compose exec -T postgres pg_dump -U synthstack synthstack > "$BACKUP_DIR/db_$TIMESTAMP.sql"
  
  # Backup web files
  if [ -d "$WEB_DIR" ]; then
    tar -czf "$BACKUP_DIR/web_$TIMESTAMP.tar.gz" -C "$WEB_DIR" .
  fi
  
  echo -e "${GREEN}Backup created: $BACKUP_DIR${NC}"
}

# Function to deploy web frontend
deploy_web() {
  echo -e "${YELLOW}Deploying web frontend...${NC}"
  
  # Create web directory if not exists
  mkdir -p "$WEB_DIR"
  
  # Copy new files (assumes dist is already uploaded via rsync in CI)
  if [ -d "/tmp/synthstack-web" ]; then
    rm -rf "$WEB_DIR/*"
    cp -r /tmp/synthstack-web/* "$WEB_DIR/"
    rm -rf /tmp/synthstack-web
  fi
  
  # Set permissions
  chown -R www-data:www-data "$WEB_DIR"
  chmod -R 755 "$WEB_DIR"
  
  echo -e "${GREEN}Web frontend deployed${NC}"
}

# Function to deploy services
deploy_services() {
  echo -e "${YELLOW}Deploying Docker services...${NC}"
  
  cd "$DEPLOY_DIR"
  
  # Pull latest images
  docker compose pull
  
  # Start/update services
  docker compose up -d --remove-orphans
  
  # Wait for services to be healthy
  echo "Waiting for services to be healthy..."
  sleep 10
  
  # Check health
  docker compose ps
  
  echo -e "${GREEN}Docker services deployed${NC}"
}

# Function to run database migrations
run_migrations() {
  echo -e "${YELLOW}Running database migrations...${NC}"
  
  cd "$DEPLOY_DIR"
  docker compose exec -T api pnpm db:migrate || true
  
  echo -e "${GREEN}Migrations complete${NC}"
}

# Function to purge CDN cache
purge_cdn() {
  if [ -n "$CLOUDFLARE_ZONE_ID" ] && [ -n "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${YELLOW}Purging Cloudflare cache...${NC}"
    
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}'
    
    echo -e "${GREEN}CDN cache purged${NC}"
  fi
}

# Function to verify deployment
verify_deployment() {
  echo -e "${YELLOW}Verifying deployment...${NC}"
  
  # Check web health
  if curl -sf http://localhost/health > /dev/null; then
    echo -e "${GREEN}✓ Web frontend is healthy${NC}"
  else
    echo -e "${RED}✗ Web frontend health check failed${NC}"
  fi
  
  # Check API health
  if curl -sf http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✓ API is healthy${NC}"
  else
    echo -e "${RED}✗ API health check failed${NC}"
  fi
  
  # Check ML service health
  if curl -sf http://localhost:8000/health > /dev/null; then
    echo -e "${GREEN}✓ ML service is healthy${NC}"
  else
    echo -e "${YELLOW}⚠ ML service health check failed (may still be starting)${NC}"
  fi
}

# Function to cleanup old images
cleanup() {
  echo -e "${YELLOW}Cleaning up old Docker images...${NC}"
  docker system prune -f
  echo -e "${GREEN}Cleanup complete${NC}"
}

# Main deployment flow
main() {
  echo "Starting deployment..."
  
  # Parse arguments
  SKIP_BACKUP=false
  SKIP_WEB=false
  SKIP_SERVICES=false
  
  while [[ $# -gt 0 ]]; do
    case $1 in
      --skip-backup)
        SKIP_BACKUP=true
        shift
        ;;
      --skip-web)
        SKIP_WEB=true
        shift
        ;;
      --skip-services)
        SKIP_SERVICES=true
        shift
        ;;
      *)
        shift
        ;;
    esac
  done
  
  # Execute deployment steps
  if [ "$SKIP_BACKUP" = false ]; then
    create_backup
  fi
  
  if [ "$SKIP_WEB" = false ]; then
    deploy_web
  fi
  
  if [ "$SKIP_SERVICES" = false ]; then
    deploy_services
    run_migrations
  fi
  
  purge_cdn
  verify_deployment
  cleanup
  
  echo ""
  echo -e "${GREEN}🎉 Deployment complete!${NC}"
  echo "=================================="
}

# Run main function
main "$@"





