# Deployment Provider Guide

SynthStack can be deployed to any VPS or cloud provider. This guide covers setup for popular providers with step-by-step instructions.

---

## Supported Providers

All providers that offer:
- Ubuntu 22.04 or 24.04 LTS
- 4GB+ RAM recommended (2GB minimum)
- 2+ vCPU cores
- 80GB+ SSD storage
- SSH access
- Public IP address

---

## Provider-Specific Setup

### Linode

**Cost:** $36/month (Dedicated 4GB) | $24/month (Shared 4GB)

**Performance:** ⭐⭐⭐⭐ Excellent reliability and network

**Setup Steps:**

1. **Create Account**
   - Sign up at https://cloud.linode.com
   - Verify email and add payment method

2. **Add SSH Key**
   - Go to Profile → SSH Keys
   - Click "Add SSH Key"
   - Paste your public key (`cat ~/.ssh/id_ed25519.pub`)

3. **Create Linode**
   - Click "Create" → "Linode"
   - **Distribution:** Ubuntu 24.04 LTS
   - **Region:** Choose closest to your users (e.g., Newark, London, Frankfurt)
   - **Plan:** Dedicated 4GB (recommended) or Shared 4GB (budget)
   - **SSH Keys:** Select your key
   - **Root Password:** Set strong password (backup access)
   - Click "Create Linode"

4. **Configure Firewall** (Optional but recommended)
   - Go to Firewalls → Create Firewall
   - **Inbound Rules:**
     - SSH (22) from your IP
     - HTTP (80) from anywhere
     - HTTPS (443) from anywhere
   - **Outbound Rules:** Allow all
   - Attach to your Linode

5. **Copy IP Address**
   - Note the Linode's public IP from dashboard
   - Save for GitHub secrets configuration

6. **Configure DNS** (see DNS section below)

**Recommended Options:**
- Enable automatic backups (+$7.20/month)
- Add private IP for database replication
- Enable Lish console access (free, useful for troubleshooting)

---

### DigitalOcean

**Cost:** $48/month (Basic Premium 4GB) | $24/month (Basic 4GB)

**Performance:** ⭐⭐⭐⭐ Great developer experience

**Setup Steps:**

1. **Create Account**
   - Sign up at https://digitalocean.com
   - Verify email and add payment method

2. **Add SSH Key**
   - Go to Settings → Security → SSH Keys
   - Click "Add SSH Key"
   - Paste your public key
   - Name it (e.g., "synthstack-production")

3. **Create Droplet**
   - Click "Create" → "Droplets"
   - **Choose Region:** Select datacenter closest to users
   - **Choose Image:** Ubuntu 24.04 (LTS) x64
   - **Choose Size:**
     - Basic Premium: $48/month (4GB RAM, 2 vCPUs, 120GB SSD)
     - Basic Regular: $24/month (4GB RAM, 2 vCPUs, 80GB SSD)
   - **Authentication:** SSH keys (select your key)
   - **Hostname:** synthstack-production
   - Click "Create Droplet"

4. **Configure Firewall**
   - Go to Networking → Firewalls → Create Firewall
   - **Inbound Rules:**
     - SSH (22) - Sources: Your IP
     - HTTP (80) - Sources: All IPv4, All IPv6
     - HTTPS (443) - Sources: All IPv4, All IPv6
   - **Outbound Rules:** All traffic
   - Apply to Droplet

5. **Copy IP Address**
   - Note droplet's public IPv4 address
   - Save for GitHub secrets

6. **Configure DNS** (see DNS section below)

**Recommended Options:**
- Enable automated backups (+20% of droplet cost)
- Add monitoring (free)
- Enable droplet agent for metrics

---

### AWS EC2

**Cost:** ~$30-40/month (t3.medium) | Can vary with usage

**Performance:** ⭐⭐⭐⭐⭐ Enterprise-grade, best for scaling

**Setup Steps:**

1. **Create AWS Account**
   - Sign up at https://aws.amazon.com
   - Complete verification and billing setup

2. **Launch EC2 Instance**
   - Go to EC2 Dashboard → Launch Instance
   - **Name:** synthstack-production
   - **AMI:** Ubuntu Server 24.04 LTS
   - **Instance Type:** t3.medium (2 vCPU, 4GB RAM)
   - **Key Pair:**
     - Create new key pair or import existing
     - Type: ED25519
     - Download .pem file or import public key
   - **Network Settings:**
     - VPC: Default (or create new)
     - Auto-assign public IP: Enable
     - Security Group: Create new
   - **Security Group Rules:**
     - SSH (22) - Source: My IP
     - HTTP (80) - Source: Anywhere
     - HTTPS (443) - Source: Anywhere
   - **Storage:** 80GB gp3 (better performance than gp2)
   - Click "Launch Instance"

3. **Allocate Elastic IP** (Optional but recommended)
   - Go to Elastic IPs → Allocate Elastic IP address
   - Associate with your instance
   - This prevents IP changes on instance restart

4. **Configure Security Group**
   - EC2 → Security Groups → Select your group
   - Verify inbound rules:
     - Type: SSH, Port: 22, Source: My IP
     - Type: HTTP, Port: 80, Source: 0.0.0.0/0, ::/0
     - Type: HTTPS, Port: 443, Source: 0.0.0.0/0, ::/0

5. **Copy IP Address**
   - Note instance's public IP (or Elastic IP if allocated)
   - Save for GitHub secrets

6. **Configure DNS** (see DNS section below)

**SSH Connection:**
```bash
# Use ubuntu user for Ubuntu AMIs
ssh -i ~/.ssh/synthstack-ec2.pem ubuntu@YOUR_EC2_IP
```

**Recommended Options:**
- Use Auto Scaling Groups for production
- Enable CloudWatch monitoring
- Set up CloudWatch alarms for CPU/disk
- Use EBS snapshots for backups

---

### Google Cloud Platform (GCP) Compute Engine

**Cost:** ~$24-49/month (e2-medium to e2-standard-2)

**Performance:** ⭐⭐⭐⭐ Excellent for Google ecosystem integration

**Best For:** Teams using Google Workspace, automatic scaling, enterprise compliance

**Setup Steps:**

1. **Create GCP Account**
   - Go to https://console.cloud.google.com
   - Sign in with Google account
   - New users get $300 free credits (90 days)
   - Complete billing setup

2. **Enable Compute Engine API**
   - Go to APIs & Services → Enable APIs and Services
   - Search for "Compute Engine API"
   - Click "Enable"

3. **Create VM Instance**

   **Via Console (Recommended for First Setup):**

   - Go to Compute Engine → VM Instances
   - Click "Create Instance"
   - **Instance Configuration:**
     - **Name:** synthstack-prod
     - **Region:** Choose closest to users (e.g., us-central1, europe-west1)
     - **Zone:** Any zone in your region (e.g., us-central1-a)
     - **Machine configuration:**
       - **Series:** E2
       - **Machine type:**
         - **Small/Medium:** e2-medium (2 vCPU, 4 GB RAM) - ~$24/month
         - **Production:** e2-standard-2 (2 vCPU, 8 GB RAM) - ~$49/month
     - **Boot disk:**
       - Click "Change"
       - **Operating system:** Ubuntu
       - **Version:** Ubuntu 22.04 LTS
       - **Boot disk type:** SSD persistent disk
       - **Size:** 30 GB (increase to 50GB+ for production)
     - **Firewall:**
       - ☑ Allow HTTP traffic
       - ☑ Allow HTTPS traffic
   - Click "Create"

   **Via gcloud CLI (Advanced):**
   ```bash
   # Install gcloud CLI first: https://cloud.google.com/sdk/docs/install

   # Authenticate
   gcloud auth login

   # Set your project
   gcloud config set project YOUR_PROJECT_ID

   # Create VM instance
   gcloud compute instances create synthstack-prod \
     --zone=us-central1-a \
     --machine-type=e2-standard-2 \
     --image-family=ubuntu-2204-lts \
     --image-project=ubuntu-os-cloud \
     --boot-disk-size=30GB \
     --boot-disk-type=pd-ssd \
     --tags=http-server,https-server \
     --metadata=startup-script='#!/bin/bash
       apt-get update
       apt-get install -y docker.io docker-compose git
       systemctl enable docker
       systemctl start docker
       usermod -aG docker $USER'
   ```

4. **Configure Firewall**

   GCP uses VPC firewall rules. The default network has HTTP/HTTPS rules if you checked the boxes during creation.

   **To verify/add firewall rules manually:**

   **Via Console:**
   - Go to VPC Network → Firewall
   - Verify rules exist for `http-server` and `https-server` tags
   - If missing, click "Create Firewall Rule":
     - **Name:** allow-http
     - **Targets:** Specified target tags
     - **Target tags:** http-server
     - **Source IPv4 ranges:** 0.0.0.0/0
     - **Protocols and ports:** tcp:80

   **Via gcloud CLI:**
   ```bash
   # Allow HTTP (port 80)
   gcloud compute firewall-rules create allow-http \
     --allow tcp:80 \
     --target-tags http-server \
     --description "Allow HTTP traffic"

   # Allow HTTPS (port 443)
   gcloud compute firewall-rules create allow-https \
     --allow tcp:443 \
     --target-tags https-server \
     --description "Allow HTTPS traffic"

   # Allow custom ports (optional)
   gcloud compute firewall-rules create allow-custom-ports \
     --allow tcp:3000,tcp:8055,tcp:6333 \
     --target-tags synthstack-server \
     --description "Allow SynthStack service ports"
   ```

5. **Reserve Static IP**

   **Via Console:**
   - Go to VPC Network → External IP addresses
   - Click "Reserve Static Address"
   - **Name:** synthstack-ip
   - **Region:** Match your VM region
   - Click "Reserve"
   - After creation, assign to your VM instance

   **Via gcloud CLI:**
   ```bash
   # Reserve external IP
   gcloud compute addresses create synthstack-ip --region=us-central1

   # Get the IP address
   gcloud compute addresses describe synthstack-ip --region=us-central1 --format="get(address)"

   # Assign to instance
   gcloud compute instances delete-access-config synthstack-prod --zone=us-central1-a
   gcloud compute instances add-access-config synthstack-prod \
     --zone=us-central1-a \
     --access-config-name="External NAT" \
     --address=$(gcloud compute addresses describe synthstack-ip --region=us-central1 --format="get(address)")
   ```

6. **SSH Connection**

   **Via Browser (Easiest):**
   - In VM Instances list, click "SSH" button next to your instance

   **Via gcloud CLI:**
   ```bash
   gcloud compute ssh synthstack-prod --zone=us-central1-a
   ```

   **Via Standard SSH:**
   ```bash
   # Add your SSH key to metadata first
   gcloud compute instances add-metadata synthstack-prod \
     --zone=us-central1-a \
     --metadata-from-file ssh-keys=~/.ssh/id_rsa.pub

   # SSH normally
   ssh YOUR_USERNAME@EXTERNAL_IP
   ```

   **Note:** GCP uses your Google account username as the SSH username by default.

7. **Deploy SynthStack**

   Follow the standard deployment steps from [SELF_HOSTING.md](./SELF_HOSTING.md):

   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Docker (if not using startup script)
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER

   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose

   # Clone repository
   git clone https://github.com/manicinc/synthstack.git
   cd synthstack

   # Copy and configure environment
   cp .env.example .env
   nano .env  # Update with your settings

   # Deploy
   docker-compose up -d
   ```

8. **Configure DNS**

   Point your domain to the reserved static IP:
   ```
   A     @              YOUR_STATIC_IP
   A     www            YOUR_STATIC_IP
   A     api            YOUR_STATIC_IP
   A     directus       YOUR_STATIC_IP
   ```

9. **Setup SSL**

   Traefik will automatically provision Let's Encrypt certificates once DNS is configured.

**GCP-Specific Tips:**

**Cost Optimization:**
- Use **Preemptible VMs** for staging (up to 80% cheaper, max 24hr runtime)
- Set up billing alerts
- Use **committed use discounts** for production (25-55% savings)
- Consider **Cloud SQL** for managed PostgreSQL if scaling

**Monitoring:**
- Enable **Cloud Monitoring** (formerly Stackdriver)
- Create uptime checks for your endpoints
- Set up alerting policies

**Backups:**
- Use **Persistent Disk Snapshots** for automated backups
- Schedule with `gcloud compute disks snapshot`
- Snapshots are incremental and cost-effective

**Security:**
- Use **Cloud Armor** for DDoS protection
- Enable **OS Login** for centralized SSH key management
- Use **VPC Service Controls** for sensitive data

**Scaling:**
- Use **Managed Instance Groups** for auto-scaling
- Consider **Cloud Run** for containerized API services
- Use **Cloud Load Balancing** for traffic distribution

**Price Comparison (Monthly):**

| Machine Type | vCPUs | RAM | Storage | Price/Month |
|--------------|-------|-----|---------|-------------|
| **e2-micro** | 0.25-2 | 1 GB | 10 GB | ~$6 (free tier eligible) |
| **e2-small** | 0.5-2 | 2 GB | 20 GB | ~$13 |
| **e2-medium** | 1-2 | 4 GB | 30 GB | ~$24 |
| **e2-standard-2** | 2 | 8 GB | 50 GB | ~$49 |
| **e2-standard-4** | 4 | 16 GB | 100 GB | ~$98 |

**Note:** Prices include compute + storage. Add ~$15-20/mo for static IP, snapshots, and egress traffic.

**When to Choose GCP:**

✅ **Choose GCP if:**
- Already using Google Workspace
- Need BigQuery, Cloud Functions, or AI/ML services
- Require compliance (HIPAA, SOC 2, ISO)
- Want automatic scaling capabilities
- Need global CDN with Cloud CDN

❌ **Choose other providers if:**
- Want simpler pricing (Linode/DigitalOcean)
- Need lowest cost for basic VPS (Hetzner/Vultr)
- Prefer AWS ecosystem

---

### Vultr

**Cost:** $24/month (High Performance 4GB) | $18/month (Regular 4GB)

**Performance:** ⭐⭐⭐⭐ Excellent value, fast network

**Setup Steps:**

1. **Create Account**
   - Sign up at https://vultr.com
   - Verify email and add payment method

2. **Add SSH Key**
   - Go to Account → SSH Keys
   - Click "Add SSH Key"
   - Paste your public key
   - Label it (e.g., "synthstack-prod")

3. **Deploy Server**
   - Click "Deploy" → "Deploy New Server"
   - **Choose Server:** Cloud Compute - High Performance
   - **Server Location:** Choose closest to users
   - **Server Type:** Ubuntu 24.04 LTS x64
   - **Server Size:** 4GB RAM / 2 vCPU / 80GB SSD ($24/month)
   - **SSH Keys:** Select your key
   - **Server Hostname:** synthstack-production
   - Click "Deploy Now"

4. **Configure Firewall**
   - Go to Network → Firewall → Add Firewall Group
   - **Inbound Rules:**
     - SSH (22) - Source: My IP
     - HTTP (80) - Source: Anywhere
     - HTTPS (443) - Source: Anywhere
   - Link to your server

5. **Copy IP Address**
   - Note server's main IP address
   - Save for GitHub secrets

6. **Configure DNS** (see DNS section below)

**Recommended Options:**
- Enable automatic backups
- Add DDoS protection (included)
- Enable monitoring (free)

---

### Hetzner Cloud

**Cost:** €8.19/month (~$9 USD) (CPX21) - **CHEAPEST OPTION!**

**Performance:** ⭐⭐⭐⭐⭐ Best price/performance ratio

**Setup Steps:**

1. **Create Account**
   - Sign up at https://hetzner.cloud (or https://console.hetzner.cloud)
   - Verify email and add payment method

2. **Create Project**
   - Click "New Project"
   - Name it "SynthStack Production"

3. **Add SSH Key**
   - Go to Security → SSH Keys
   - Click "Add SSH Key"
   - Paste your public key
   - Name it (e.g., "synthstack-production")

4. **Create Server**
   - Click "Add Server"
   - **Location:** Choose closest to users (Nuremberg, Helsinki, Ashburn)
   - **Image:** Ubuntu 24.04
   - **Type:** Shared vCPU → CPX21
     - 3 vCPU (AMD)
     - 4GB RAM
     - 80GB SSD
     - €8.19/month (~$9 USD)
   - **SSH Keys:** Select your key
   - **Name:** synthstack-production
   - Click "Create & Buy Now"

5. **Configure Firewall** (Optional)
   - Go to Firewalls → Create Firewall
   - **Inbound Rules:**
     - SSH (22) - Source: Your IP
     - HTTP (80) - Source: Any IPv4, Any IPv6
     - HTTPS (443) - Source: Any IPv4, Any IPv6
   - **Outbound Rules:** Any IPv4, Any IPv6
   - Apply to server

6. **Copy IP Address**
   - Note server's IPv4 address
   - Save for GitHub secrets

7. **Configure DNS** (see DNS section below)

**Recommended Options:**
- Enable backups (+20% = ~€1.64/month)
- Very cost-effective for European users
- Excellent network connectivity

**Why Hetzner is Cheapest:**
- European data centers with lower costs
- AMD processors (cost-effective)
- No bandwidth overage charges
- 20TB traffic included

---

## GitHub Secrets Configuration

After provisioning your server with any provider, add these secrets to your GitHub repository:

### Via GitHub CLI

```bash
# Install GitHub CLI: https://cli.github.com/

# Set deployment secrets (REQUIRED)
gh secret set REMOTE_SSH_KEY < ~/.ssh/id_ed25519_production
gh secret set REMOTE_USER -b "root"                    # or "ubuntu" for AWS
gh secret set REMOTE_HOST_PRODUCTION -b "YOUR_SERVER_IP"

# REQUIRED: GitHub PAT for Docker image pulls from ghcr.io
# Create at: https://github.com/settings/tokens (select read:packages scope)
gh secret set GH_PAT -b "ghp_your_token_here"

# Optional
gh secret set REMOTE_HOST_STAGING -b "YOUR_STAGING_IP"
gh secret set DEPLOYMENT_PROVIDER -b "linode"          # linode/digitalocean/aws/vultr/hetzner

# Set application secrets
gh secret set DATABASE_URL
gh secret set JWT_SECRET

# Authentication (choose one)
gh secret set SUPABASE_URL
gh secret set SUPABASE_ANON_KEY
gh secret set SUPABASE_SERVICE_ROLE_KEY

# Payments
gh secret set STRIPE_SECRET_KEY
gh secret set STRIPE_PUBLISHABLE_KEY
gh secret set STRIPE_WEBHOOK_SECRET

# Email
gh secret set RESEND_API_KEY

# AI Services
gh secret set OPENAI_API_KEY
gh secret set ANTHROPIC_API_KEY

# Storage (optional)
gh secret set CLOUDFLARE_R2_ACCESS_KEY
gh secret set CLOUDFLARE_R2_SECRET_KEY
gh secret set CLOUDFLARE_R2_BUCKET -b "synthstack-uploads"
```

### Via GitHub Web UI

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret from the list above

See [GitHub Secrets Guide](./deployment/GITHUB_SECRETS.md) for complete configuration guide.

---

## DNS Configuration

All providers require the same DNS setup. Configure these records at your DNS provider (Cloudflare, Route53, Namecheap, etc.):

### DNS Records

| Type | Name | Content | TTL | Proxy |
|------|------|---------|-----|-------|
| A | @ | YOUR_SERVER_IP | 300 | ☑️ (if Cloudflare) |
| A | www | YOUR_SERVER_IP | 300 | ☑️ (if Cloudflare) |
| A | api | YOUR_SERVER_IP | 300 | ☐ |
| A | admin | YOUR_SERVER_IP | 300 | ☐ |

### Cloudflare DNS Setup

1. Add your domain to Cloudflare
2. Update nameservers at your domain registrar
3. Add DNS records as shown above
4. Enable "Proxy status" (orange cloud) for @ and www
5. Disable proxy for api and admin (gray cloud)

### SSL Certificates

Traefik will automatically obtain Let's Encrypt SSL certificates for:
- synthstack.app
- www.synthstack.app
- api.synthstack.app
- admin.synthstack.app

**Note:** DNS must be configured and propagated before deployment for SSL to work.

---

## Provider Comparison

### Cost Comparison

| Provider | Monthly Cost | RAM | vCPU | Storage | Bandwidth | Notes |
|----------|--------------|-----|------|---------|-----------|-------|
| **Hetzner** | $9 | 4GB | 3 | 80GB SSD | 20TB | 🏆 Best value |
| **Vultr** | $24 | 4GB | 2 | 80GB SSD | 3TB | Balanced |
| **AWS EC2** | $30-40 | 4GB | 2 | 80GB gp3 | Pay-as-go | Enterprise, scaling |
| **Linode** | $36 | 4GB | 2 | 80GB SSD | 4TB | Reliable |
| **DigitalOcean** | $48 | 4GB | 2 | 120GB SSD | 4TB | Premium |

### Feature Comparison

| Feature | Linode | DigitalOcean | AWS EC2 | Vultr | Hetzner |
|---------|--------|--------------|---------|-------|---------|
| **Backups** | $7.20/mo | +20% | Snapshots | Extra | +20% |
| **Monitoring** | Free | Free | CloudWatch | Free | Free |
| **Firewall** | Free | Free | Security Groups | Free | Free |
| **Load Balancer** | $10/mo | $12/mo | $16/mo | $10/mo | €6/mo |
| **Block Storage** | $0.10/GB | $0.10/GB | $0.10/GB | $0.10/GB | €0.05/GB |
| **Support** | 24/7 | 24/7 | Paid tiers | Ticket | Ticket |

### Best Use Cases

**Choose Hetzner if:**
- Budget is primary concern (60% cheaper than DigitalOcean)
- Users primarily in Europe
- Don't need 24/7 phone support
- Want best price/performance ratio

**Choose Vultr if:**
- Need balanced cost and features
- Want global server locations
- High-frequency trading/gaming (low latency)

**Choose Linode if:**
- Want proven reliability (20+ years)
- Need excellent documentation
- Prefer Akamai network (acquired by Akamai)

**Choose DigitalOcean if:**
- Want simplest user interface
- Need extensive tutorials/community
- Prefer managed databases

**Choose AWS EC2 if:**
- Building enterprise application
- Need auto-scaling and high availability
- Require AWS ecosystem integration
- Have dedicated DevOps team

---

## Migration Between Providers

To migrate SynthStack from one provider to another:

### 1. Backup Current Server

```bash
# SSH into current server
ssh root@OLD_SERVER_IP

# Backup database
docker exec printverse-postgres pg_dump -U synthstack synthstack > /tmp/backup.sql

# Backup uploaded files (if using local storage)
tar -czf /tmp/uploads.tar.gz /opt/synthstack/uploads

# Download backups to local machine
scp root@OLD_SERVER_IP:/tmp/backup.sql ./
scp root@OLD_SERVER_IP:/tmp/uploads.tar.gz ./
```

### 2. Provision New Server

Follow setup steps for your new provider (see above).

### 3. Update GitHub Secrets

```bash
# Update server IP
gh secret set REMOTE_HOST_PRODUCTION -b "NEW_SERVER_IP"

# Optionally update provider name
gh secret set DEPLOYMENT_PROVIDER -b "hetzner"  # or new provider
```

### 4. Deploy to New Server

```bash
# Push to trigger GitHub Actions deployment
git push origin main

# Or manually deploy
ssh root@NEW_SERVER_IP
cd /opt/synthstack
git pull
docker-compose down
docker-compose up -d
```

### 5. Restore Database

```bash
# Copy backup to new server
scp backup.sql root@NEW_SERVER_IP:/tmp/

# SSH into new server
ssh root@NEW_SERVER_IP

# Restore database
cat /tmp/backup.sql | docker exec -i printverse-postgres psql -U synthstack synthstack

# Restore uploads (if applicable)
tar -xzf /tmp/uploads.tar.gz -C /opt/synthstack/
```

### 6. Update DNS

1. Go to your DNS provider (Cloudflare, etc.)
2. Update A records to point to NEW_SERVER_IP
3. Wait for DNS propagation (5-60 minutes)

```bash
# Monitor DNS propagation
dig synthstack.app +short
dig api.synthstack.app +short
```

### 7. Verify Services

```bash
# Check all containers running
docker ps

# Test endpoints
curl https://synthstack.app
curl https://api.synthstack.app/health

# Check logs
docker-compose logs -f
```

### 8. Decommission Old Server

After confirming everything works:
- Delete old server from provider dashboard
- Remove old SSH keys
- Update documentation with new IPs

**Downtime:** ~5-15 minutes (DNS propagation time)

---

## Troubleshooting

### Connection Issues

**Problem:** Can't SSH to server

```bash
# Test SSH connectivity
ssh -vvv root@YOUR_SERVER_IP

# Test port 22 accessibility
nc -zv YOUR_SERVER_IP 22

# Verify SSH key permissions
chmod 600 ~/.ssh/id_ed25519_production
chmod 644 ~/.ssh/id_ed25519_production.pub
```

**Solutions:**
- Verify correct user (root, ubuntu, admin)
- Check firewall rules allow SSH from your IP
- Ensure SSH key was added during provisioning
- Try password authentication as fallback (if enabled)

### Firewall Configuration

**AWS Security Groups:**
```bash
# Verify inbound rules allow:
- SSH (22) from your IP
- HTTP (80) from 0.0.0.0/0
- HTTPS (443) from 0.0.0.0/0
```

**DigitalOcean Cloud Firewall:**
```bash
# Ensure firewall applied to droplet
# Check inbound rules include HTTP/HTTPS from all sources
```

**Linode Cloud Firewall:**
```bash
# Verify firewall attached to Linode
# Check rules allow web traffic
```

### DNS Not Resolving

**Problem:** Domain doesn't point to server

```bash
# Check DNS records
dig synthstack.app +short
# Should return: YOUR_SERVER_IP

# Check nameservers
dig synthstack.app NS +short
```

**Solutions:**
- Wait for DNS propagation (up to 48 hours, usually < 1 hour)
- Verify A records point to correct IP
- Ensure nameservers updated at registrar
- Clear local DNS cache: `sudo dscacheutil -flushcache` (macOS)

### SSL Certificate Fails

**Problem:** Let's Encrypt certificate not issued

```bash
# Check Traefik logs
docker logs printverse-traefik

# Common errors:
# - DNS not pointing to server
# - Port 80/443 blocked by firewall
# - Rate limit hit (5 certs per domain per week)
```

**Solutions:**
- Ensure DNS resolves to correct IP
- Allow ports 80 and 443 in firewall
- Verify domain ownership
- Wait if rate limited (or use staging cert)

### Deployment Fails

**Problem:** GitHub Actions deployment fails

```bash
# Check workflow logs on GitHub
# Common issues:
- Wrong REMOTE_USER (root vs ubuntu vs admin)
- SSH key not added to secrets
- Server IP changed
- Firewall blocking GitHub IPs
```

**Solutions:**
- Verify all GitHub secrets set correctly
- Check server allows SSH from anywhere (or GitHub IP ranges)
- Ensure REMOTE_USER matches server user
- Test SSH manually with same credentials

### Out of Memory

**Problem:** Services crash or slow performance

```bash
# Check memory usage
free -h

# Check container memory
docker stats

# Common causes:
- ML service using too much RAM
- PostgreSQL cache misconfigured
- Redis memory not limited
```

**Solutions:**
- Upgrade to 8GB RAM plan
- Tune PostgreSQL shared_buffers
- Set Redis maxmemory limit
- Add swap space (not recommended long-term)

---

## Performance Optimization

### Enable Swap (For 4GB Servers)

```bash
# Add 4GB swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Tune PostgreSQL

Edit `docker-compose.yml`:

```yaml
postgres:
  environment:
    - POSTGRES_INITDB_ARGS=-c shared_buffers=1GB -c effective_cache_size=2GB
```

### Enable Redis Persistence

Edit `docker-compose.yml`:

```yaml
redis:
  command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
```

---

## Support Resources

### Provider Documentation

- **Linode:** https://www.linode.com/docs/
- **DigitalOcean:** https://docs.digitalocean.com/
- **AWS EC2:** https://docs.aws.amazon.com/ec2/
- **GCP Compute Engine:** https://cloud.google.com/compute/docs
- **Vultr:** https://www.vultr.com/docs/
- **Hetzner:** https://docs.hetzner.com/

### Provider Support

- **Linode:** 24/7 phone/ticket - https://www.linode.com/support/
- **DigitalOcean:** 24/7 ticket - https://www.digitalocean.com/support
- **AWS:** Paid support tiers - https://aws.amazon.com/premiumsupport/
- **GCP:** Tiered support plans - https://cloud.google.com/support
- **Vultr:** Ticket system - https://www.vultr.com/support/
- **Hetzner:** Ticket system - https://docs.hetzner.com/general/others/support/

### Community Resources

- **SynthStack Discord:** [Join our community](#)
- **GitHub Issues:** https://github.com/manicinc/synthstack/issues
- **Documentation:** https://docs.synthstack.app

---

## Cost Optimization Tips

### 1. Choose the Right Region

- **High-cost regions:** US West Coast, Japan
- **Low-cost regions:** Central US, Europe (Hetzner)
- **Tip:** Choose region closest to users, not cheapest

### 2. Reserved Instances (AWS)

- Save 30-60% with 1-year or 3-year commitment
- Best for stable, long-running production

### 3. Spot Instances (AWS)

- Save up to 90% for non-critical workloads
- Not recommended for production database

### 4. Use Object Storage

- Cloudflare R2: $0.015/GB (no egress fees)
- AWS S3: $0.023/GB (+ egress fees)
- Linode Object Storage: $5/mo for 250GB

### 5. Optimize Bandwidth

- Use CDN (Cloudflare) for static assets
- Enable compression in Traefik
- Optimize images before upload

### 6. Monitor and Downsize

- Use monitoring to track actual resource usage
- Downsize if consistently under 50% CPU/RAM
- Hetzner CPX11 (2GB RAM) may suffice for low traffic: €4.15/mo

---

## Summary

**Best Overall Value:** Hetzner Cloud CPX21 ($9/month)
**Best for Beginners:** DigitalOcean ($48/month)
**Best for Enterprise:** AWS EC2 ($30-40/month)
**Best for Google Ecosystem:** GCP Compute Engine ($24-49/month)
**Best for Reliability:** Linode ($36/month)
**Best for Gaming/HFT:** Vultr ($24/month)

All providers support SynthStack identically - choose based on your budget, region, and feature needs. The deployment process is the same across all providers thanks to provider-agnostic configuration.
