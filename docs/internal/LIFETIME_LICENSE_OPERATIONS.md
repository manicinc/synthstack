
**Audience:** SynthStack engineering team
**Purpose:** Complete reference for deploying and managing lifetime license GitHub repository access provisioning
**Last Updated:** 2026-01-10

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Initial Setup & Deployment](#initial-setup--deployment)
3. [Manual Steps Required](#manual-steps-required)
4. [Environment Configuration](#environment-configuration)
5. [Testing the Complete Flow](#testing-the-complete-flow)
6. [Customer Support Workflows](#customer-support-workflows)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
9. [Database Queries](#database-queries)
10. [Security Considerations](#security-considerations)

---

## System Overview

### Architecture

```
Customer Purchase (Stripe)
  → Webhook Handler (creates license record)
  → Welcome Email (with license access link)
  → Customer Submits GitHub Username (validates via GitHub API)
  → GitHub Org Invitation Sent (adds to team)
  → Customer Accepts Invite
  → Manual Check OR Webhook (updates status to active)
  → Access Granted Email (with repo clone instructions)
```

### Key Components

- **Database:** `lifetime_licenses` table in Directus PostgreSQL
- **API Routes:** `/api/v1/license-access/*` endpoints
- **GitHub Service:** `GitHubOrgService` using Octokit
- **Email Service:** Resend integration with 3 email templates
- **Frontend Portal:** `/license-access` page in web app
- **Stripe Integration:** Webhook handler for `checkout.session.completed`

### Repositories

- **synthstack-pro** (this repo): Full product, lifetime buyers get Read access
- **synthstack-community**: Lite/free version without premium features (separate repo)

---

## Initial Setup & Deployment

### Prerequisites

- GitHub Organization Admin access to `manicinc`
- Stripe dashboard access (for webhook configuration)
- Directus admin access (for database migrations)
- Production environment variables configured
- Resend API key for email sending

### Deployment Checklist

- [ ] 1. Create GitHub organization and team
- [ ] 2. Generate GitHub PAT with required scopes
- [ ] 3. Create production repository
- [ ] 4. Run database migration
- [ ] 5. Configure environment variables
- [ ] 6. Test Stripe webhook in test mode
- [ ] 7. Configure Resend email domain
- [ ] 8. Test email delivery
- [ ] 9. Deploy API Gateway changes
- [ ] 10. Deploy web app changes
- [ ] 11. Verify end-to-end flow in production

---

## Manual Steps Required

### 1. GitHub Organization Setup

**Create Organization (if not exists):**
```bash
# Navigate to https://github.com/organizations/plan
# Or use existing organization: manicinc
```

**Create Team for Lifetime Buyers:**
```bash
# Navigate to: https://github.com/orgs/manicinc/teams
# Click "New team"
# Name: synthstack-pro
# Description: SynthStack Pro lifetime license holders
# Visibility: Secret (only visible to org members)
# Parent team: None
```

**Create Production Repository:**
```bash
# Option 1: Rename current repo
# Settings → Repository name → Change to "synthstack-pro"

# Option 2: Create new repo
# Navigate to: https://github.com/organizations/manicinc/repositories/new
# Name: synthstack-pro
# Visibility: Private
# Initialize: No (push existing code)

# Push code
git remote set-url origin git@github.com:manicinc/synthstack-pro.git
git push -u origin main
```

**Grant Team Access to Repository:**
```bash
# Navigate to: https://github.com/manicinc/synthstack-pro/settings/access
# Click "Add teams"
# Select "synthstack-pro"
# Role: Read (can view and clone)
# Click "Add synthstack-pro to this repository"
```

### 2. GitHub Personal Access Token

**Create PAT:**
```bash
# Navigate to: https://github.com/settings/tokens/new
# Note: SynthStack Lifetime License Access
# Expiration: No expiration (or 1 year with calendar reminder)
# Scopes:
#   - admin:org (full control of organizations and teams)
#   - repo (full control of private repositories)
# Click "Generate token"
# COPY TOKEN IMMEDIATELY (shown only once)
```

**Save Token Securely:**
```bash
# Production: Add to environment variables
# Development: Add to .env.local (NEVER commit)
# Backup: Store in 1Password/secrets manager

# Format:
GH_PAT=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Test Token:**
```bash
# Test API access
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/user

# Should return your user info
```

### 3. Database Migration

**Run Migration:**
```bash
# Connect to production database
psql -h your-db-host -U your-db-user -d your-db-name

# Run migration file
\i services/directus/migrations/122_lifetime_license_github_access.sql

# Verify table created
\dt lifetime_licenses

# Verify Directus collections
SELECT * FROM directus_collections WHERE collection = 'lifetime_licenses';
```

**Verify in Directus Admin:**
```bash
# Navigate to: https://your-directus.app/admin
# Login with admin credentials
# Check sidebar: "Lifetime Licenses" collection should appear
# Verify all fields are visible and properly configured
```

### 4. Stripe Webhook Configuration

**Add Webhook Endpoint:**
```bash
# Navigate to: https://dashboard.stripe.com/webhooks
# Click "Add endpoint"
# Endpoint URL: https://api.synthstack.app/api/v1/webhooks/stripe
# Description: SynthStack Lifetime License Webhook
# Events to send:
#   - checkout.session.completed
# Click "Add endpoint"
```

**Get Webhook Signing Secret:**
```bash
# Click on the webhook you just created
# Copy "Signing secret" (starts with whsec_)
# Add to environment variables:
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Test Webhook:**
```bash
# In Stripe Dashboard, go to webhook details
# Click "Send test webhook"
# Select "checkout.session.completed"
# Verify webhook received successfully (200 response)
```

### 5. Resend Email Configuration

**Verify Domain:**
```bash
# Navigate to: https://resend.com/domains
# Ensure your domain is verified (green checkmark)
# If not, add DNS records as instructed
```

**Test Email Delivery:**
```bash
# Use Resend API test endpoint
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer YOUR_RESEND_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "SynthStack <noreply@synthstack.app>",
    "to": "your-email@example.com",
    "subject": "Test Email",
    "html": "<p>Test</p>"
  }'

# Verify email received
```

### 6. Prepare Documentation

**Create Comprehensive Onboarding Docs:**
```bash
# Files to create in synthstack-pro repo:
docs/ONBOARDING.md             # Complete getting started guide
docs/QUICK_START.md            # 30-minute setup tutorial
docs/ARCHITECTURE.md           # System architecture overview
docs/DEPLOYMENT_GUIDE.md       # Production deployment guide
docs/API_REFERENCE.md          # API documentation
docs/TROUBLESHOOTING.md        # Common issues and solutions
```

**Example ONBOARDING.md Structure:**
```markdown
# SynthStack Pro - Getting Started

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- pnpm 8+
- Docker (optional)

## Quick Start (5 minutes)
1. Clone repository
2. Install dependencies
3. Configure environment
4. Start services
5. Access application

## Detailed Setup (30 minutes)
[Step-by-step instructions with screenshots]

## Architecture Overview
[System diagrams and component descriptions]

## Common Tasks
- Adding new features
- Running tests
- Deploying to production
- Troubleshooting

## Support
- Email: team@manic.agency
- Discord: https://discord.gg/synthstack
```

---

## Environment Configuration

### Required Environment Variables

**GitHub Org Management:**
```bash
GITHUB_ORG_NAME=manicinc
GH_PAT=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_TEAM_SLUG=synthstack-pro
GITHUB_PRO_REPO=manicinc/synthstack-pro
```

**Stripe:**
```bash
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_LIFETIME=price_xxxxxxxxxxxxxxxxxxxxxx  # Lifetime license price ID
```

**Email Service (Resend):**
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=SynthStack <noreply@synthstack.app>
```

**Frontend:**
```bash
VITE_API_URL=https://api.synthstack.app
FRONTEND_URL=https://synthstack.app
```

**Database:**
```bash
# Already configured for Directus/PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Environment File Templates

**Production (.env.production):**
```bash
# Copy this template for production deployment
NODE_ENV=production
FRONTEND_URL=https://synthstack.app
VITE_API_URL=https://api.synthstack.app

# GitHub (REPLACE WITH ACTUAL VALUES)
GITHUB_ORG_NAME=manicinc
GH_PAT=ghp_REPLACE_WITH_PRODUCTION_PAT
GITHUB_TEAM_SLUG=synthstack-pro
GITHUB_PRO_REPO=manicinc/synthstack-pro

# Stripe (REPLACE WITH LIVE KEYS)
STRIPE_SECRET_KEY=sk_test_REPLACE
STRIPE_WEBHOOK_SECRET=whsec_REPLACE
STRIPE_PRICE_LIFETIME=price_REPLACE

# Resend
RESEND_API_KEY=re_REPLACE
EMAIL_FROM=SynthStack <noreply@synthstack.app>
```

**Development (.env.local):**
```bash
# Copy this template for local development
NODE_ENV=development
FRONTEND_URL=http://localhost:3050
VITE_API_URL=http://localhost:8000

# GitHub (use test org or personal account)
GITHUB_ORG_NAME=your-test-org
GH_PAT=ghp_YOUR_DEV_PAT
GITHUB_TEAM_SLUG=test-team
GITHUB_PRO_REPO=your-test-org/test-repo

# Stripe (use test mode keys)
STRIPE_SECRET_KEY=sk_test_REPLACE
STRIPE_WEBHOOK_SECRET=whsec_REPLACE
STRIPE_PRICE_LIFETIME=price_REPLACE

# Resend (use test API key)
RESEND_API_KEY=re_REPLACE
EMAIL_FROM=Test <noreply@test.synthstack.app>
```

---

## Testing the Complete Flow

### End-to-End Test Procedure

**1. Setup Test Environment:**
```bash
# Start all services
pnpm dev

# Ensure database migration applied
psql -h localhost -U postgres -d synthstack_test \
  -c "SELECT * FROM lifetime_licenses LIMIT 1;"
```

**2. Test Stripe Checkout:**
```bash
# Navigate to landing page
open http://localhost:3050

# Click "Get Early Bird Access" button
# Fill in Stripe test card: 4242 4242 4242 4242
# Email: test-buyer@example.com
# Complete checkout
```

**3. Verify Webhook Processing:**
```bash
# Check logs for webhook received
tail -f packages/api-gateway/logs/app.log | grep "lifetime_license"

# Query database for new record
psql -h localhost -U postgres -d synthstack_dev -c \
  "SELECT * FROM lifetime_licenses WHERE email = 'test-buyer@example.com';"

# Expected: Record with status = 'pending'
```

**4. Check Welcome Email:**
```bash
# If using local email testing (MailHog/Mailpit):
open http://localhost:8025

# Verify email contains:
# - Subject: "🎉 Welcome to SynthStack - Get Your Source Code Access"
# - Link to /license-access?session=xxx
# - GitHub account creation link
```

**5. Test GitHub Username Submission:**
```bash
# Click link in email or navigate directly
open "http://localhost:3050/license-access?session=SESSION_ID"

# Enter test GitHub username
# Click "Submit & Get Invitation"
```

**6. Verify GitHub Invitation:**
```bash
# Check GitHub API call succeeded
curl -H "Authorization: token YOUR_PAT" \
  https://api.github.com/orgs/manicinc/invitations

# Check database status updated
psql -h localhost -U postgres -d synthstack_dev -c \
  "SELECT github_username, github_access_status FROM lifetime_licenses WHERE email = 'test-buyer@example.com';"

# Expected: github_access_status = 'invited'
```

**7. Accept GitHub Invitation:**
```bash
# Login to GitHub as test user
# Navigate to: https://github.com/orgs/manicinc
# Click "View invitation"
# Accept invitation
```

**8. Verify Access Granted:**
```bash
# Click "I've Accepted the Invitation" button in portal
# Verify status changes to 'active'
# Check access granted email sent
# Try cloning repository as test user:
git clone https://github.com/manicinc/synthstack-pro.git
```

### Automated Test Commands

```bash
# Unit tests
pnpm test packages/api-gateway/src/services/__tests__/github-org.test.ts
pnpm test packages/api-gateway/src/routes/__tests__/license-access.test.ts

# Integration tests
pnpm test:integration packages/api-gateway/src/__tests__/integration/lifetime-license-webhook.test.ts

# E2E tests
pnpm test:e2e apps/web/e2e/lifetime-license-checkout.spec.ts

# All tests
pnpm test && pnpm test:e2e
```

---

## Customer Support Workflows

### Common Support Scenarios

#### 1. Customer Never Received Welcome Email

**Diagnosis:**
```sql
-- Check if license exists
SELECT * FROM lifetime_licenses
WHERE email = 'customer@example.com';

-- Check email sent timestamp
SELECT email, welcome_email_sent_at, stripe_session_id
FROM lifetime_licenses
WHERE email = 'customer@example.com';
```

**Resolution:**
```bash
# Option A: Resend welcome email manually
# Use Directus admin panel or run email service directly

# Option B: Provide direct license access link
echo "https://synthstack.app/license-access?session=SESSION_ID"
```

#### 2. GitHub Invitation Not Received

**Diagnosis:**
```sql
-- Check invitation status
SELECT github_username, github_access_status, github_invitation_sent_at
FROM lifetime_licenses
WHERE email = 'customer@example.com';
```

**Check GitHub API:**
```bash
# List pending invitations
curl -H "Authorization: token YOUR_PAT" \
  https://api.github.com/orgs/manicinc/invitations | \
  jq '.[] | select(.login == "GITHUB_USERNAME")'
```

**Resolution:**
```bash
# Option A: Resend invitation via API
curl -X POST http://localhost:8000/api/v1/license-access/submit-username \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "SESSION_ID", "githubUsername": "USERNAME"}'

# Option B: Manually invite via GitHub UI
# Navigate to: https://github.com/orgs/manicinc/people
# Click "Invite member"
# Enter GitHub username
# Select "synthstack-pro" team
# Send invitation
```

#### 3. Customer Changed GitHub Username

**Update Process:**
```sql
-- Update username in database
UPDATE lifetime_licenses
SET github_username = 'new-username',
    github_access_status = 'pending',
    updated_at = NOW()
WHERE email = 'customer@example.com';
```

**Revoke Old Access & Grant New:**
```bash
# Revoke old username access
curl -X DELETE \
  https://api.github.com/orgs/manicinc/memberships/old-username \
  -H "Authorization: token YOUR_PAT"

# Send new invitation
curl -X POST http://localhost:8000/api/v1/license-access/submit-username \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "SESSION_ID", "githubUsername": "new-username"}'
```

#### 4. Customer Can't Clone Repository

**Diagnosis Checklist:**
- [ ] Customer accepted GitHub invitation?
- [ ] Customer is logged into correct GitHub account?
- [ ] Customer has Read permission in team?
- [ ] Repository is accessible (not deleted/renamed)?

**Verification:**
```bash
# Check membership status
curl -H "Authorization: token YOUR_PAT" \
  https://api.github.com/orgs/manicinc/members/GITHUB_USERNAME

# Check team membership
curl -H "Authorization: token YOUR_PAT" \
  https://api.github.com/orgs/manicinc/teams/synthstack-pro/memberships/GITHUB_USERNAME

# Expected response: {"state": "active", "role": "member"}
```

**Resolution:**
```bash
# If not a member, re-invite
# If member but no access, check team repository permissions
# Navigate to: https://github.com/orgs/manicinc/teams/synthstack-pro/repositories
# Ensure synthstack-pro is listed with Read access
```

#### 5. Refund Request (Revoke Access)

**Process:**
```sql
-- Update license status
UPDATE lifetime_licenses
SET github_access_status = 'revoked',
    notes = 'Refunded on YYYY-MM-DD - Reason: [REASON]',
    updated_at = NOW()
WHERE email = 'customer@example.com';
```

**Revoke GitHub Access:**
```bash
# Remove from organization
curl -X DELETE \
  https://api.github.com/orgs/manicinc/memberships/GITHUB_USERNAME \
  -H "Authorization: token YOUR_PAT"

# Verify removal
curl -H "Authorization: token YOUR_PAT" \
  https://api.github.com/orgs/manicinc/members/GITHUB_USERNAME

# Expected: 404 Not Found
```

---

## Monitoring & Alerts

### Key Metrics to Track

**Dashboard Metrics:**
```sql
-- Total lifetime licenses sold
SELECT COUNT(*) FROM lifetime_licenses;

-- Licenses by status
SELECT github_access_status, COUNT(*)
FROM lifetime_licenses
GROUP BY github_access_status;

-- Conversion rate (invited → active)
SELECT
  COUNT(*) FILTER (WHERE github_access_status = 'active') * 100.0 /
  COUNT(*) FILTER (WHERE github_access_status IN ('invited', 'active'))
  AS acceptance_rate
FROM lifetime_licenses;

-- Average time to accept invitation
SELECT AVG(
  EXTRACT(EPOCH FROM (github_invitation_accepted_at - github_invitation_sent_at)) / 3600
) AS avg_hours_to_accept
FROM lifetime_licenses
WHERE github_invitation_accepted_at IS NOT NULL;

-- Recent purchases (last 7 days)
SELECT email, purchased_at, github_access_status
FROM lifetime_licenses
WHERE purchased_at > NOW() - INTERVAL '7 days'
ORDER BY purchased_at DESC;
```

### Alerts to Configure

**Critical Alerts:**
- GitHub PAT expiration (30 days before)
- Webhook failure rate > 5%
- Email delivery failure rate > 2%
- Invitation acceptance rate < 80%

**Warning Alerts:**
- License stuck in 'pending' for > 24 hours
- License stuck in 'invited' for > 7 days
- GitHub API rate limit approaching

**Monitoring Tools:**
- Sentry: Error tracking and performance monitoring
- Datadog/NewRelic: Application metrics and logs
- PagerDuty: On-call alerts for critical failures
- GitHub Actions: Automated health checks

---

## Common Issues & Troubleshooting

### Issue 1: GitHub API Rate Limiting

**Symptoms:**
- Error: "API rate limit exceeded"
- 403 Forbidden responses from GitHub API

**Diagnosis:**
```bash
# Check rate limit status
curl -H "Authorization: token YOUR_PAT" \
  https://api.github.com/rate_limit

# Response shows remaining requests and reset time
```

**Resolution:**
- Use authenticated requests (include PAT in all requests)
- Implement exponential backoff for retries
- Cache GitHub API responses where possible
- Consider upgrading to GitHub Enterprise for higher limits

### Issue 2: Webhook Not Triggering

**Symptoms:**
- Stripe checkout completes but no license record created
- No welcome email sent

**Diagnosis:**
```bash
# Check Stripe webhook logs
# Dashboard → Webhooks → [Your webhook] → Recent deliveries

# Check API Gateway logs
tail -f packages/api-gateway/logs/app.log | grep webhook

# Verify webhook secret matches
echo $STRIPE_WEBHOOK_SECRET
```

**Resolution:**
```bash
# Re-verify webhook endpoint URL
# Ensure HTTPS and publicly accessible
# Check webhook secret is correct
# Manually trigger test webhook from Stripe Dashboard
```

### Issue 3: Email Not Sending

**Symptoms:**
- Customers not receiving emails
- Email service errors in logs

**Diagnosis:**
```bash
# Check Resend dashboard
# Navigate to: https://resend.com/emails

# Test email delivery manually
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer YOUR_RESEND_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "SynthStack <noreply@synthstack.app>",
    "to": "test@example.com",
    "subject": "Test",
    "html": "<p>Test</p>"
  }'
```

**Resolution:**
- Verify Resend API key is valid
- Check domain DNS records are configured
- Ensure sending domain is verified
- Check email rate limits not exceeded

### Issue 4: Database Migration Failures

**Symptoms:**
- Table `lifetime_licenses` doesn't exist
- Directus collection not showing up

**Diagnosis:**
```bash
# Check if migration ran
psql -h localhost -U postgres -d synthstack_dev -c \
  "\dt lifetime_licenses"

# Check Directus collections
psql -h localhost -U postgres -d synthstack_dev -c \
  "SELECT * FROM directus_collections WHERE collection = 'lifetime_licenses';"
```

**Resolution:**
```bash
# Run migration manually
psql -h localhost -U postgres -d synthstack_dev \
  -f services/directus/migrations/122_lifetime_license_github_access.sql

# Restart Directus
docker-compose restart directus
```

---

## Database Queries

### Useful Admin Queries

**List All Licenses:**
```sql
SELECT
  id,
  email,
  github_username,
  github_access_status,
  purchased_at,
  amount_paid_cents / 100.0 AS amount_paid_dollars
FROM lifetime_licenses
ORDER BY purchased_at DESC;
```

**Find Stuck Licenses:**
```sql
-- Pending for > 24 hours
SELECT * FROM lifetime_licenses
WHERE github_access_status = 'pending'
  AND purchased_at < NOW() - INTERVAL '24 hours';

-- Invited but not accepted for > 7 days
SELECT * FROM lifetime_licenses
WHERE github_access_status = 'invited'
  AND github_invitation_sent_at < NOW() - INTERVAL '7 days';
```

**Revenue Reporting:**
```sql
-- Total revenue from lifetime licenses
SELECT SUM(amount_paid_cents) / 100.0 AS total_revenue
FROM lifetime_licenses;

-- Revenue by month
SELECT
  DATE_TRUNC('month', purchased_at) AS month,
  COUNT(*) AS licenses_sold,
  SUM(amount_paid_cents) / 100.0 AS revenue
FROM lifetime_licenses
GROUP BY month
ORDER BY month DESC;
```

**Customer Lookup:**
```sql
-- By email
SELECT * FROM lifetime_licenses WHERE email = 'customer@example.com';

-- By GitHub username
SELECT * FROM lifetime_licenses WHERE github_username = 'username';

-- By Stripe session
SELECT * FROM lifetime_licenses WHERE stripe_session_id = 'cs_test_xxx';
```

**Bulk Operations:**
```sql
-- Resend invitations for stuck licenses
UPDATE lifetime_licenses
SET github_access_status = 'pending',
    notes = CONCAT(notes, ' | Invitation reset on ', NOW())
WHERE github_access_status = 'invited'
  AND github_invitation_sent_at < NOW() - INTERVAL '7 days';

-- Mark inactive licenses
UPDATE lifetime_licenses
SET notes = CONCAT(notes, ' | Marked inactive on ', NOW())
WHERE github_access_status = 'invited'
  AND github_invitation_sent_at < NOW() - INTERVAL '30 days';
```

---

## Security Considerations

### Access Control

**GitHub PAT Security:**
- Store in environment variables, never commit to repo
- Use minimum required scopes (admin:org, repo)
- Rotate PAT every 6-12 months
- Monitor PAT usage in GitHub audit log
- Revoke immediately if compromised

**Database Security:**
- Encrypt `github_username` column (PII)
- Limit database access to API Gateway only
- Use read-only replicas for analytics
- Regular backups (daily minimum)
- Audit trail for all license modifications

**API Security:**
- Rate limiting on license access endpoints
- Require session ID for all operations
- Validate GitHub usernames before invitation
- Log all access attempts
- CAPTCHA on username submission (prevent bots)

### GDPR Compliance

**Data Processing:**
- Email address (required for purchase)
- GitHub username (optional, provided by customer)
- Stripe customer ID (required for refunds)
- No other PII collected

**Customer Rights:**
- Right to access: Provide all license data
- Right to erasure: Delete license record, revoke GitHub access
- Right to portability: Export license data as JSON
- Right to rectification: Update email/GitHub username

**Data Retention:**
- Active licenses: Indefinite retention
- Revoked licenses: Retain for 7 years (tax/legal)
- Anonymize email after retention period

### Incident Response

**GitHub PAT Compromised:**
1. Immediately revoke PAT in GitHub settings
2. Generate new PAT with same scopes
3. Update environment variables in all environments
4. Restart API Gateway services
5. Monitor GitHub audit log for unauthorized actions
6. Notify affected customers if data breach occurred

**Database Breach:**
1. Immediately isolate database (block external access)
2. Identify compromised records
3. Notify affected customers within 72 hours (GDPR)
4. Revoke all GitHub access for affected licenses
5. Reset environment variables and credentials
6. Restore from backup if data corruption detected

**Email Service Compromise:**
1. Rotate Resend API key immediately
2. Check email logs for unauthorized sends
3. Notify customers of potential phishing risk
4. Implement additional email validation

---

## Appendix

### Useful Commands

**Quick License Lookup:**
```bash
# Create alias in ~/.bashrc or ~/.zshrc
alias license-lookup='psql -h localhost -U postgres -d synthstack_dev -c "SELECT * FROM lifetime_licenses WHERE email = '

# Usage:
license-lookup 'customer@example.com';"
```

**Bulk Email Resend:**
```bash
# Create script: scripts/resend-welcome-emails.sh
#!/bin/bash
psql -h localhost -U postgres -d synthstack_dev -t -c \
  "SELECT email, stripe_session_id FROM lifetime_licenses WHERE welcome_email_sent_at IS NULL" | \
while IFS='|' read -r email session_id; do
  curl -X POST http://localhost:8000/api/v1/email/send-welcome \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$email\", \"sessionId\": \"$session_id\"}"
  sleep 1  # Rate limiting
done
```

**GitHub Team Member Export:**
```bash
# Export all lifetime buyers
curl -H "Authorization: token YOUR_PAT" \
  https://api.github.com/orgs/manicinc/teams/synthstack-pro/members | \
  jq -r '.[] | .login' > synthstack-pro.txt
```

### External Resources

- [GitHub REST API Docs](https://docs.github.com/en/rest)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Resend Documentation](https://resend.com/docs)
- [Directus Collections API](https://docs.directus.io/reference/system/collections.html)
- [GDPR Compliance Checklist](https://gdpr.eu/checklist/)

---

**Document Version:** 1.0
**Last Reviewed:** 2026-01-10
**Owner:** SynthStack Engineering Team
**Contact:** engineering@manic.agency
