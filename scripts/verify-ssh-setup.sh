#!/bin/bash
# ============================================
# SSH Key Verification Script for SynthStack
# ============================================
# This script helps verify that your SSH keys are correctly
# configured for GitHub Actions deployment.
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}SynthStack SSH Key Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Configuration
REMOTE_HOST="${REMOTE_HOST_PRODUCTION:-50.116.40.126}"
REMOTE_USER="${REMOTE_USER:-root}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"

echo -e "Target server: ${YELLOW}${REMOTE_USER}@${REMOTE_HOST}${NC}"
echo -e "SSH key: ${YELLOW}${SSH_KEY}${NC}"
echo ""

# Step 1: Check if SSH key exists
echo -e "${BLUE}Step 1: Checking SSH key files...${NC}"
if [ -f "$SSH_KEY" ]; then
    echo -e "${GREEN}✓ Private key found: $SSH_KEY${NC}"
else
    echo -e "${RED}✗ Private key not found: $SSH_KEY${NC}"
    echo ""
    echo -e "${YELLOW}Generate a new SSH key:${NC}"
    echo "  ssh-keygen -t ed25519 -C 'synthstack-deploy' -f ~/.ssh/synthstack_deploy"
    exit 1
fi

if [ -f "${SSH_KEY}.pub" ]; then
    echo -e "${GREEN}✓ Public key found: ${SSH_KEY}.pub${NC}"
else
    echo -e "${YELLOW}⚠ Public key not found (may be okay if already added to server)${NC}"
fi
echo ""

# Step 2: Check key format
echo -e "${BLUE}Step 2: Checking key format...${NC}"
KEY_TYPE=$(head -1 "$SSH_KEY" | cut -d' ' -f2 2>/dev/null || echo "UNKNOWN")

if head -1 "$SSH_KEY" | grep -q "BEGIN OPENSSH PRIVATE KEY"; then
    echo -e "${GREEN}✓ Key format: OpenSSH (recommended)${NC}"
elif head -1 "$SSH_KEY" | grep -q "BEGIN RSA PRIVATE KEY"; then
    echo -e "${GREEN}✓ Key format: RSA PEM${NC}"
elif head -1 "$SSH_KEY" | grep -q "BEGIN EC PRIVATE KEY"; then
    echo -e "${GREEN}✓ Key format: EC PEM${NC}"
else
    echo -e "${RED}✗ Unknown key format${NC}"
    echo "  First line: $(head -1 "$SSH_KEY")"
    exit 1
fi

# Check for passphrase
if ssh-keygen -y -P "" -f "$SSH_KEY" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Key has no passphrase (required for CI/CD)${NC}"
else
    echo -e "${RED}✗ Key has a passphrase (won't work in CI/CD)${NC}"
    echo ""
    echo -e "${YELLOW}Remove passphrase with:${NC}"
    echo "  ssh-keygen -p -f $SSH_KEY"
    echo "  (Enter current passphrase, then press Enter twice for no passphrase)"
    exit 1
fi
echo ""

# Step 3: Check key permissions
echo -e "${BLUE}Step 3: Checking key permissions...${NC}"
PERMS=$(stat -f "%OLp" "$SSH_KEY" 2>/dev/null || stat -c "%a" "$SSH_KEY" 2>/dev/null)
if [ "$PERMS" = "600" ]; then
    echo -e "${GREEN}✓ Key permissions correct: 600${NC}"
else
    echo -e "${YELLOW}⚠ Fixing key permissions (currently $PERMS)${NC}"
    chmod 600 "$SSH_KEY"
    echo -e "${GREEN}✓ Fixed to 600${NC}"
fi
echo ""

# Step 4: Test SSH connection
echo -e "${BLUE}Step 4: Testing SSH connection...${NC}"
echo -e "Running: ssh -i $SSH_KEY -o ConnectTimeout=10 ${REMOTE_USER}@${REMOTE_HOST} 'echo test'"
echo ""

if ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes "${REMOTE_USER}@${REMOTE_HOST}" 'echo "SSH connection successful!"' 2>&1; then
    echo ""
    echo -e "${GREEN}✓ SSH connection successful!${NC}"
else
    echo ""
    echo -e "${RED}✗ SSH connection failed${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting steps:${NC}"
    echo ""
    echo "1. Add your public key to the server:"
    echo "   ${BLUE}ssh-copy-id -i ${SSH_KEY}.pub ${REMOTE_USER}@${REMOTE_HOST}${NC}"
    echo ""
    echo "   Or manually:"
    echo "   ${BLUE}cat ${SSH_KEY}.pub | ssh ${REMOTE_USER}@${REMOTE_HOST} 'mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys'${NC}"
    echo ""
    echo "2. Verify the server accepts SSH key auth:"
    echo "   ${BLUE}ssh ${REMOTE_USER}@${REMOTE_HOST} 'cat /etc/ssh/sshd_config | grep PubkeyAuthentication'${NC}"
    echo ""
    echo "3. Check server authorized_keys:"
    echo "   ${BLUE}ssh ${REMOTE_USER}@${REMOTE_HOST} 'cat ~/.ssh/authorized_keys'${NC}"
    exit 1
fi
echo ""

# Step 5: Display key for GitHub secrets
echo -e "${BLUE}Step 5: GitHub Secret Format${NC}"
echo ""
echo -e "${YELLOW}Add this private key to GitHub Secrets as REMOTE_SSH_KEY:${NC}"
echo -e "${YELLOW}(Copy EXACTLY as shown, including the BEGIN/END lines)${NC}"
echo ""
echo -e "${BLUE}============ BEGIN COPY ============${NC}"
cat "$SSH_KEY"
echo -e "${BLUE}============= END COPY =============${NC}"
echo ""
echo -e "${YELLOW}Also add these secrets:${NC}"
echo "  REMOTE_USER = ${REMOTE_USER}"
echo "  REMOTE_HOST_PRODUCTION = ${REMOTE_HOST}"
echo ""

# Step 6: Verify server setup
echo -e "${BLUE}Step 6: Verifying server setup...${NC}"
ssh -i "$SSH_KEY" "${REMOTE_USER}@${REMOTE_HOST}" '
echo "Checking Docker..."
if command -v docker &> /dev/null; then
    echo "✓ Docker installed: $(docker --version)"
else
    echo "✗ Docker not installed"
fi

echo "Checking Docker Compose..."
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    echo "✓ Docker Compose installed"
else
    echo "✗ Docker Compose not installed"
fi

echo "Checking SynthStack directory..."
if [ -d /opt/synthstack ]; then
    echo "✓ /opt/synthstack exists"
else
    echo "⚠ /opt/synthstack does not exist (will be created on first deploy)"
fi

echo "Checking web directory..."
if [ -d /var/www/synthstack ]; then
    echo "✓ /var/www/synthstack exists"
else
    echo "⚠ /var/www/synthstack does not exist (will be created on first deploy)"
fi
'

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Verification Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Next steps:"
echo "1. Copy the private key above to GitHub Secrets as REMOTE_SSH_KEY"
echo "2. Set REMOTE_USER and REMOTE_HOST_PRODUCTION in GitHub Secrets"
echo "3. Push to main branch to trigger deployment"
echo ""

