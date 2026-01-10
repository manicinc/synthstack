# Lifetime License - Getting Started Guide

Welcome to SynthStack! 🎉 This guide will walk you through every step of getting access to your lifetime license source code and getting your first SaaS application up and running.

---

## Table of Contents

1. [What's Included in Your License](#whats-included)
2. [Step 1: Get Repository Access](#step-1-get-repository-access)
3. [Step 2: Clone the Repository](#step-2-clone-the-repository)
4. [Step 3: Set Up Your Development Environment](#step-3-set-up-your-development-environment)
5. [Step 4: Start the Application](#step-4-start-the-application)
6. [Step 5: Explore the Platform](#step-5-explore-the-platform)
7. [Next Steps](#next-steps)
8. [Getting Updates](#getting-updates)
9. [Support & Community](#support--community)
10. [Troubleshooting](#troubleshooting)

---

## What's Included

Your SynthStack Lifetime License gives you:

- ✅ **Full Source Code Access** - Complete access to the entire SynthStack codebase via private GitHub repository
- ✅ **6 AI Co-Founder Agents** - Architect, Designer, Developer, PM, Marketer, and Business Strategist
- ✅ **Complete Documentation** - Comprehensive guides, API references, and tutorials
- ✅ **Lifetime Updates** - Bug fixes and security patches forever
- ✅ **Priority Support** - Exclusive Discord channel with direct access to our team
- ✅ **Commercial Usage Rights** - Build unlimited SaaS products with no revenue sharing

---

## Step 1: Get Repository Access

### 1.1 Check Your Email

After purchasing your lifetime license, you should have received an email with the subject:

**"🎉 Welcome to SynthStack - Get Your Source Code Access"**

If you haven't received it:
- Check your spam/junk folder
- Search for emails from `noreply@synthstack.app`
- Contact us at [team@manic.agency](mailto:team@manic.agency)

### 1.2 Submit Your GitHub Username

1. Click the "**Submit GitHub Username**" button in your welcome email
2. You'll be taken to the [License Access Portal](https://synthstack.app/license-access)
3. Enter your GitHub username in the form
   - Format: Just your username (e.g., `octocat`, not a full URL)
   - Must be a valid, existing GitHub account
4. Click "**Submit & Get Invitation**"

**Don't have a GitHub account?**
- Create one for free at [github.com/signup](https://github.com/signup)
- Choose a professional username (this will be visible to us)
- Verify your email address before submitting

### 1.3 Accept the GitHub Invitation

Within a few minutes, you'll receive two emails:

**Email 1 (from SynthStack):**
- Subject: "✉️ GitHub Invitation Sent - Accept to Get Access"
- Confirms invitation was sent successfully

**Email 2 (from GitHub):**
- From: `noreply@github.com`
- Subject: "You've been invited to join the manicinc organization"
- **Click the "Join @manicinc" button** to accept

**After accepting:**
- You'll be redirected to the SynthStack Pro repository
- You'll have **Read access** (view and clone the code)
- You can return to the License Access Portal and click "**I've Accepted the Invitation**" to verify

---

## Step 2: Clone the Repository

### 2.1 Verify Your Access

Before cloning, verify you can see the repository:
- Go to [github.com/manicinc/synthstack-pro](https://github.com/manicinc/synthstack-pro)
- You should see the repository contents (not a 404 error)

### 2.2 Clone via HTTPS

```bash
git clone https://github.com/manicinc/synthstack-pro.git
cd synthstack-pro
```

**If you get an error:**
- Make sure you're logged into the correct GitHub account
- Try using SSH instead (see below)

### 2.3 Clone via SSH (Alternative)

If you prefer SSH authentication:

```bash
git clone git@github.com:manicinc/synthstack-pro.git
cd synthstack-pro
```

**Need to set up SSH keys?**
- Follow GitHub's guide: [Generating SSH Keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)

---

## Step 3: Set Up Your Development Environment

### 3.1 Prerequisites

Make sure you have these installed:

| Tool | Version | Download Link |
|------|---------|---------------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| pnpm | 8+ | `npm install -g pnpm` |
| PostgreSQL | 14+ | [postgresql.org](https://www.postgresql.org/download/) |
| Docker | Latest | [docker.com](https://www.docker.com/) (optional but recommended) |

**Verify installations:**

```bash
node --version    # Should show v18.x or higher
pnpm --version    # Should show 8.x or higher
psql --version    # Should show 14.x or higher
docker --version  # Should show Docker version (if installed)
```

### 3.2 Install Dependencies

```bash
# From the synthstack-pro directory:
pnpm install
```

This will install all dependencies for all packages in the monorepo.

**Expected output:**
```
Packages: +1234
++++++++++++++++++++++++++++++
Done in 30s
```

### 3.3 Set Up Environment Variables

#### Option A: Using Docker (Recommended)

If you're using Docker, the environment is mostly preconfigured:

```bash
# Copy the Docker environment template
cp .env.example .env.docker

# Edit .env.docker with your specific values
# (Most defaults will work for local development)
```

#### Option B: Local Development (Without Docker)

```bash
# Copy the local development template
cp .env.example .env.local

# Edit .env.local with your database credentials
```

**Required Variables for Local Development:**

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/synthstack_dev

# API Gateway
API_PORT=8000
JWT_SECRET=your-super-secret-jwt-key-change-this

# Directus (CMS/Admin)
DIRECTUS_KEY=your-super-secret-directus-key-change-this
DIRECTUS_SECRET=your-super-secret-directus-secret-change-this

# Frontend
VITE_API_URL=http://localhost:8000
```

**Optional but Recommended:**

```bash
# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key

# Resend (for emails)
RESEND_API_KEY=re_your_resend_key

# OpenAI (for AI features)
OPENAI_API_KEY=sk-your-openai-key
```

**Don't have API keys yet?**
- Stripe: [dashboard.stripe.com](https://dashboard.stripe.com)
- Resend: [resend.com](https://resend.com)
- OpenAI: [platform.openai.com](https://platform.openai.com)

### 3.4 Set Up the Database

#### Using Docker:

```bash
# Start PostgreSQL with Docker
docker-compose up -d postgres

# Wait for database to be ready
sleep 5

# Run migrations
pnpm migrate
```

#### Without Docker:

```bash
# Create database
createdb synthstack_dev

# Run migrations
pnpm migrate
```

---

## Step 4: Start the Application

### 4.1 Start All Services (Docker)

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

**Services will be available at:**
- **Web App**: [http://localhost:3050](http://localhost:3050)
- **API Gateway**: [http://localhost:8000](http://localhost:8000)
- **Directus Admin**: [http://localhost:8055](http://localhost:8055)
- **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 4.2 Start All Services (Local Development)

```bash
# Start all services in development mode
pnpm dev
```

**This starts:**
- Web App (Quasar/Vue)
- API Gateway (Fastify)
- Directus (headless CMS)
- ML Service (Python)
- All background workers

**Wait for all services to start:**
```
✓ Web app started on http://localhost:3050
✓ API Gateway started on http://localhost:8000
✓ Directus started on http://localhost:8055
```

### 4.3 Create Your First Admin User

Navigate to the Directus admin panel:

1. Open [http://localhost:8055](http://localhost:8055)
2. Create admin account:
   - **Email**: Your email address
   - **Password**: Strong password (save it!)
3. Click "**Create Account**"

---

## Step 5: Explore the Platform

### 5.1 Access the Web App

1. Open [http://localhost:3050](http://localhost:3050) in your browser
2. You should see the SynthStack landing page
3. Click "**Get Started**" to create an account

### 5.2 Create a Test User Account

1. Click "**Sign Up**"
2. Enter your email and password
3. Verify your email (check terminal logs for verification link in dev mode)
4. Log in to your account

### 5.3 Explore Key Features

**Dashboard:**
- Overview of your projects and activity
- Quick access to all features

**AI Co-Founders:**
- Navigate to "AI Co-Founders" in the sidebar
- Try chatting with the Architect agent
- Ask it to help you plan a new feature

**CRM:**
- Go to "CRM" → "Contacts"
- Add a test contact
- Create a test deal

**Invoicing:**
- Go to "Invoicing" → "Create Invoice"
- Generate a sample invoice
- Preview and download PDF

---

## Next Steps

### 1. Follow the Quick Start Tutorial

Complete the 30-minute tutorial to build your first feature:
- [Quick Start Guide](../QUICK_START.md)

### 2. Understand the Architecture

Learn how SynthStack is structured:
- [Architecture Overview](../reference/ARCHITECTURE_OVERVIEW.md)
- [Technology Stack](../reference/TECH_STACK.md)

### 3. Customize Your App

Start making it your own:
- [Branding & Theming](../customization/BRANDING.md)
- [Configuration Guide](../customization/CONFIGURATION.md)

### 4. Deploy to Production

When you're ready to launch:
- [Deployment Guide](../DEPLOYMENT_GUIDE.md)
- [Production Checklist](../deployment/PRODUCTION_CHECKLIST.md)

### 5. Join the Community

Get help and share your progress:
- **Discord**: [discord.gg/synthstack](https://discord.gg/synthstack)
- **GitHub Discussions**: [github.com/manicinc/synthstack-pro/discussions](https://github.com/manicinc/synthstack-pro/discussions)

---

## Getting Updates

### Pull Latest Changes

SynthStack is continuously updated with bug fixes, security patches, and new features.

```bash
# From your synthstack-pro directory:
git pull origin main

# Reinstall dependencies (if package.json changed)
pnpm install

# Run new migrations (if any)
pnpm migrate

# Restart services
pnpm dev
```

**Recommended Update Schedule:**
- **Weekly**: Check for updates and security patches
- **Monthly**: Pull major feature updates
- **Before deployment**: Always update to latest stable version

### Stay Informed

Subscribe to updates:
- **GitHub Releases**: Watch the repository for releases
- **Discord Announcements**: Join #announcements channel
- **Email Newsletter**: Opt-in during onboarding

---

## Support & Community

### Priority Support (Lifetime License Holders)

As a lifetime license holder, you get priority support:

**Discord Support:**
- Join our Discord: [discord.gg/synthstack](https://discord.gg/synthstack)
- Access the **#lifetime-support** channel
- Average response time: < 4 hours during business hours

**Email Support:**
- Send questions to [team@manic.agency](mailto:team@manic.agency)
- Include "Lifetime License" in subject line
- Response within 24 hours

**GitHub Discussions:**
- Ask technical questions: [GitHub Discussions](https://github.com/manicinc/synthstack-pro/discussions)
- Search existing discussions first
- Tag your questions appropriately

### Office Hours

Join our weekly office hours:
- **When**: Every Wednesday at 2pm PST
- **Where**: Discord voice channel
- **What**: Live Q&A, feature demos, community showcase

### Documentation

**Comprehensive Guides:**
- [Complete Documentation Index](../README.md)
- [API Reference](../reference/API_REFERENCE.md)
- [Troubleshooting Guide](../TROUBLESHOOTING.md)
- [FAQ](../FAQ.md)

**Video Tutorials:**
- [YouTube Playlist](https://youtube.com/@synthstack)
- Getting Started Series
- Feature Deep Dives
- Deployment Walkthroughs

---

## Troubleshooting

### Common Issues

#### Issue: GitHub 404 Error

**Symptom:** Can't access repository, getting 404 error

**Solution:**
1. Verify you accepted the GitHub invitation
2. Check you're logged into the correct GitHub account
3. Clear browser cache and try again
4. Contact [team@manic.agency](mailto:team@manic.agency) if still blocked

#### Issue: pnpm install fails

**Symptom:** Installation errors or dependency conflicts

**Solution:**
```bash
# Clear pnpm cache
pnpm store prune

# Delete node_modules and lockfile
rm -rf node_modules pnpm-lock.yaml

# Reinstall
pnpm install
```

#### Issue: Database connection error

**Symptom:** "Could not connect to database"

**Solution:**
1. Verify PostgreSQL is running: `pg_isready`
2. Check DATABASE_URL is correct in .env
3. Create database if missing: `createdb synthstack_dev`
4. Run migrations: `pnpm migrate`

#### Issue: Services won't start

**Symptom:** Errors when running `pnpm dev`

**Solution:**
```bash
# Check if ports are already in use
lsof -i :3050  # Web app
lsof -i :8000  # API Gateway
lsof -i :8055  # Directus

# Kill processes using those ports
kill -9 <PID>

# Restart services
pnpm dev
```

#### Issue: GitHub invitation not received

**Symptom:** No email from GitHub after submitting username

**Solution:**
1. Check spam/junk folder
2. Verify GitHub email settings: [github.com/settings/emails](https://github.com/settings/emails)
3. Check pending invitations: [github.com/notifications](https://github.com/notifications)
4. Wait 5-10 minutes (invitation can be delayed)
5. Contact us if still not received after 30 minutes

### Need More Help?

If you're still stuck:

1. **Search Documentation**: Check if your issue is covered in our docs
2. **Search GitHub Discussions**: Someone may have had the same issue
3. **Ask on Discord**: #lifetime-support channel (fastest response)
4. **Email Support**: [team@manic.agency](mailto:team@manic.agency) with details:
   - What you were trying to do
   - Exact error message
   - Steps to reproduce
   - Your environment (OS, Node version, etc.)

---

## Commercial Usage

### What You Can Do

Your lifetime license allows you to:

✅ Build unlimited SaaS products
✅ Use in client projects
✅ White-label and resell
✅ Modify the code freely
✅ No revenue sharing required

### Restrictions

You cannot:

❌ Create competing boilerplate products
❌ Resell the source code as-is
❌ Share your GitHub access with others
❌ Publish the source code publicly

**Questions about commercial usage?**
- Read the full license: [LICENSE-FAQ.md](../LICENSE-FAQ.md)
- Contact us: [team@manic.agency](mailto:team@manic.agency)

---

## Useful Links

### Documentation
- [Complete Documentation](../README.md)
- [API Reference](../reference/API_REFERENCE.md)
- [Architecture Guide](../reference/ARCHITECTURE_OVERVIEW.md)
- [Deployment Guide](../DEPLOYMENT_GUIDE.md)

### Community
- [Discord Server](https://discord.gg/synthstack)
- [GitHub Discussions](https://github.com/manicinc/synthstack-pro/discussions)
- [Twitter](https://twitter.com/synthstack)

### Support
- [Email Support](mailto:team@manic.agency)
- [Troubleshooting Guide](../TROUBLESHOOTING.md)
- [FAQ](../FAQ.md)

### Resources
- [Code Examples](https://github.com/manicinc/synthstack-examples)
- [Video Tutorials](https://youtube.com/@synthstack)
- [Blog](https://synthstack.app/blog)

---

**Welcome to the SynthStack community!** 🚀

We can't wait to see what you build. Share your launch with us [@synthstack](https://twitter.com/synthstack) when you're ready!

---

**Last Updated:** January 10, 2026
**Questions?** [team@manic.agency](mailto:team@manic.agency)
