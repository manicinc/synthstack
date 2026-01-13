#!/usr/bin/env bash
# ============================================
# SynthStack Production Deployment (with env)
# ============================================
# This script:
# 1) Uploads deploy/.env to /opt/synthstack/deploy/.env
# 2) Syncs deploy/ config to /opt/synthstack/deploy/
# 3) Syncs built web files to /var/www/synthstack
# 4) Runs docker compose to pull + restart services
#
# Works with any VPS provider (Linode, DO, AWS, GCP, Hetzner, etc.)
# as long as the server has SSH access and Docker installed.
# ============================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Remote configuration
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_HOST="${REMOTE_HOST_PRODUCTION:-}"
REMOTE_DIR="${REMOTE_DIR:-/opt/synthstack}"
REMOTE_DEPLOY_DIR="${REMOTE_DEPLOY_DIR:-${REMOTE_DIR}/deploy}"
REMOTE_WEB_DIR="${REMOTE_WEB_DIR:-/var/www/synthstack}"

# SSH configuration
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"

# Local configuration
LOCAL_DEPLOY_DIR="${LOCAL_DEPLOY_DIR:-deploy}"
LOCAL_ENV_FILE="${LOCAL_ENV_FILE:-${LOCAL_DEPLOY_DIR}/.env}"
LOCAL_ENV_EXAMPLE="${LOCAL_ENV_EXAMPLE:-${LOCAL_DEPLOY_DIR}/.env.example}"
LOCAL_WEB_DIST="${LOCAL_WEB_DIST:-}"

fail() {
  echo -e "${RED}Error:${NC} $1" >&2
  exit 1
}

detect_web_dist() {
  if [ -n "${LOCAL_WEB_DIST}" ]; then
    if [ -f "${LOCAL_WEB_DIST}/index.html" ]; then
      echo "${LOCAL_WEB_DIST}"
      return 0
    fi
    return 1
  fi

  local candidates=("dist" "apps/web/dist/spa" "apps/web/dist")
  for dir in "${candidates[@]}"; do
    if [ -f "${dir}/index.html" ]; then
      echo "${dir}"
      return 0
    fi
  done

  return 1
}

if [ -z "${REMOTE_HOST}" ]; then
  fail "REMOTE_HOST_PRODUCTION is not set (export REMOTE_HOST_PRODUCTION=YOUR_SERVER_IP)"
fi

if [ ! -f "${SSH_KEY}" ]; then
  fail "SSH key not found at ${SSH_KEY} (set SSH_KEY=/path/to/key)"
fi

if [ ! -d "${LOCAL_DEPLOY_DIR}" ] || [ ! -f "${LOCAL_DEPLOY_DIR}/docker-compose.yml" ]; then
  fail "Missing ${LOCAL_DEPLOY_DIR}/docker-compose.yml (run from repo root)"
fi

if [ ! -f "${LOCAL_ENV_FILE}" ]; then
  echo -e "${RED}Error:${NC} Missing ${LOCAL_ENV_FILE}"
  echo -e "${YELLOW}Create it from the example:${NC}"
  echo -e "  cp ${LOCAL_ENV_EXAMPLE} ${LOCAL_ENV_FILE}"
  exit 1
fi

WEB_DIST_DIR=""
if WEB_DIST_DIR="$(detect_web_dist)"; then
  :
else
  echo -e "${YELLOW}Warning:${NC} No built web dist found."
  echo -e "Build the web app first, then rerun:"
  echo -e "  pnpm --filter @synthstack/web build"
  echo -e "Expected one of: ./dist or ./apps/web/dist/spa"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}SynthStack Production Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Remote: ${YELLOW}${REMOTE_USER}@${REMOTE_HOST}${NC}"
echo -e "App dir: ${YELLOW}${REMOTE_DIR}${NC}"
echo -e "Deploy dir: ${YELLOW}${REMOTE_DEPLOY_DIR}${NC}"
echo -e "Web dir: ${YELLOW}${REMOTE_WEB_DIR}${NC}"
if [ -n "${WEB_DIST_DIR}" ]; then
  echo -e "Web dist: ${YELLOW}${WEB_DIST_DIR}${NC}"
fi
echo ""

echo -e "${YELLOW}Step 1: Ensure remote directories exist...${NC}"
ssh -i "${SSH_KEY}" "${REMOTE_USER}@${REMOTE_HOST}" "mkdir -p ${REMOTE_DEPLOY_DIR} ${REMOTE_WEB_DIR}"
echo -e "${GREEN}✓ Remote directories ready${NC}"
echo ""

echo -e "${YELLOW}Step 2: Upload deploy/.env...${NC}"
scp -i "${SSH_KEY}" "${LOCAL_ENV_FILE}" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DEPLOY_DIR}/.env"
echo -e "${GREEN}✓ Uploaded ${LOCAL_ENV_FILE}${NC}"
echo ""

echo -e "${YELLOW}Step 3: Sync deploy/ configuration...${NC}"
rsync -avz --delete \
  --exclude='.env' \
  -e "ssh -i ${SSH_KEY}" \
  "${LOCAL_DEPLOY_DIR}/" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DEPLOY_DIR}/"
echo -e "${GREEN}✓ Synced ${LOCAL_DEPLOY_DIR}/${NC}"
echo ""

if [ -n "${WEB_DIST_DIR}" ]; then
  echo -e "${YELLOW}Step 4: Sync web build to ${REMOTE_WEB_DIR}...${NC}"
  rsync -avz --delete \
    -e "ssh -i ${SSH_KEY}" \
    "${WEB_DIST_DIR}/" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_WEB_DIR}/"
  echo -e "${GREEN}✓ Web deployed${NC}"
  echo ""
fi

echo -e "${YELLOW}Step 5: Pull + restart services (docker compose)...${NC}"
ssh -i "${SSH_KEY}" "${REMOTE_USER}@${REMOTE_HOST}" << 'ENDSSH'
set -euo pipefail

REMOTE_DIR="${REMOTE_DIR:-/opt/synthstack}"
REMOTE_DEPLOY_DIR="${REMOTE_DEPLOY_DIR:-${REMOTE_DIR}/deploy}"
GHCR_USERNAME="${GHCR_USERNAME:-manicinc}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed on the server."
  echo "Install it first (Ubuntu): curl -fsSL https://get.docker.com | sudo sh"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is not available (docker compose)."
  echo "Install Docker Compose v2 plugin, or install Docker via get.docker.com."
  exit 1
fi

if ! docker ps >/dev/null 2>&1; then
  echo "Docker permission denied for this SSH user."
  echo "Fix: add the user to the docker group and re-login: sudo usermod -aG docker $USER"
  exit 1
fi

cd "${REMOTE_DIR}"

# Login to GHCR if GH_PAT is present (needed for private images)
if [ -f "${REMOTE_DEPLOY_DIR}/.env" ]; then
  GH_PAT="$(grep -E '^GH_PAT=' "${REMOTE_DEPLOY_DIR}/.env" | head -n 1 | cut -d= -f2- || true)"
  if [ -n "${GH_PAT}" ] && [ "${GH_PAT}" != "ghp_xxx" ]; then
    echo "${GH_PAT}" | docker login ghcr.io -u "${GHCR_USERNAME}" --password-stdin >/dev/null 2>&1 || true
  fi
fi

docker compose -f deploy/docker-compose.yml pull
docker compose -f deploy/docker-compose.yml up -d --remove-orphans
docker compose -f deploy/docker-compose.yml ps

# Optional migrations (no-op if none)
docker compose -f deploy/docker-compose.yml exec -T api pnpm db:migrate || true
ENDSSH

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
