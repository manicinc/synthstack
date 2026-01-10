# 📧 Email Service Documentation

## Overview

Comprehensive transactional and marketing email system with:
- **Nodemailer** SMTP integration
- **EJS** template rendering
- **BullMQ** job queue with retry logic
- **Database persistence** for email queue and logs
- **Tracking** for opens and clicks
- **Bounce handling** with suppression list
- **Rate limiting** per domain
- **Priority queue** for urgent emails

## Architecture

```
┌─────────────────┐
│  Email Request  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Email Service  │  ← Validate, render template
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Email Queue    │  ← Database + BullMQ
│  (PostgreSQL +  │
│   Redis)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  BullMQ Worker  │  ← Process with retry
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SMTP Server    │  ← Deliver email
│  (Nodemailer)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Recipient      │
└─────────────────┘
```

## Features

### ✅ Core Features
- SMTP integration with connection pooling
- Template rendering with EJS
- Email queue with database persistence
- Automatic retry with exponential backoff (1min, 2min, 4min)
- Priority queue (0-10, higher = more urgent)
- Scheduled email delivery
- HTML + plain text support
- Attachment support
- CC/BCC support

### ✅ Tracking & Analytics
- Open tracking (1x1 pixel)
- Click tracking (redirect through tracking URL)
- Delivery confirmation
- Bounce detection
- Complaint/spam detection
- Email logs with full history
- Template performance metrics

### ✅ Reliability
- Bounce list with automatic suppression
- Hard bounce = permanent suppression
- Soft bounce = 30-day temporary suppression
- Rate limiting per domain
- Connection pooling
- Job persistence in Redis
- Failed job retry queue

### ✅ Management
- Admin dashboard with stats
- Template management
- Email logs viewer
- Bounce list management
- Queue monitoring
- Failed job retry
- Template preview

## Configuration

### Environment Variables

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@synthstack.app
SMTP_FROM_NAME=Printverse
SMTP_SECURE=false

# Redis (for queue)
REDIS_URL=redis://localhost:6399

# Frontend URLs (for links in emails)
FRONTEND_URL=http://localhost:3050
```

### SMTP Providers

**Gmail:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-specific-password
```

**SendGrid:**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

**AWS SES:**
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
```

**Postmark:**
```bash
SMTP_HOST=smtp.postmarkapp.com
SMTP_PORT=587
SMTP_USER=your-server-token
SMTP_PASSWORD=your-server-token
```

## Usage

### Sending Emails

```typescript
import { getEmailService } from './services/email';

const emailService = getEmailService();

// Send with template
await emailService.sendEmail({
  to: 'user@example.com',
  toName: 'John Doe',
  templateSlug: 'welcome',
  templateData: {
    userName: 'John',
    dashboardUrl: 'https://app.synthstack.app',
  },
  userId: 'user-123',
  priority: 8,
});

// Send with custom HTML
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Custom Email',
  html: '<h1>Hello!</h1>',
  text: 'Hello!',
  priority: 5,
});

// Schedule for later
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Scheduled',
  html: '<p>Future email</p>',
  scheduledAt: new Date('2024-12-25T09:00:00Z'),
});
```

### Using Helper Functions

```typescript
import { sendWelcomeEmail, sendSubscriptionConfirmedEmail } from './services/email/helpers';

// Welcome email
await sendWelcomeEmail(fastify, userId, email, userName);

// Subscription confirmation
await sendSubscriptionConfirmedEmail(
  fastify, userId, email, userName,
  'Pro', 24.99, false, 100
);
```

### Template Integration

```typescript
// From webhook handlers
import { handleStripeEmailNotifications } from './services/email/integrations';

// After processing Stripe event
await handleStripeEmailNotifications(fastify, 'subscription.created', {
  userId, email, userName, tier, amount, isYearly, creditsPerDay
});
```

## Available Templates

### Transactional
1. **welcome** - Welcome new users
2. **email-verification** - Verify email address
3. **password-reset** - Password reset link
4. **subscription-confirmed** - Subscription activation
5. **payment-receipt** - Payment confirmation
6. **credit-purchased** - Credit top-up confirmation

### Notifications
7. **payment-failed** - Payment failure alert
8. **trial-ending** - Trial expiration reminder
9. **subscription-canceled** - Cancellation confirmation
10. **credit-low** - Low credit warning
11. **moderation-warning** - Content moderation notice

### System
12. **admin-report** - Admin moderation alerts
13. **generation-complete** - Profile generation complete
14. **weekly-summary** - Weekly usage summary

## API Endpoints

### Public Endpoints

```
GET /api/v1/email/track/open/:messageId.png
  - Track email opens (1x1 pixel)
  - Parameters: messageId

GET /api/v1/email/track/click/:messageId?url=...
  - Track link clicks (redirect)
  - Parameters: messageId, url
```

### Admin Endpoints

```
GET /api/v1/admin/email/stats?days=7
  - Get email delivery statistics
  - Response: delivery stats, queue stats

GET /api/v1/admin/email/templates
  - List all email templates
  - Response: array of templates

GET /api/v1/admin/email/templates/:slug
  - Get specific template
  - Response: template details

POST /api/v1/admin/email/templates/:slug/preview
  - Preview template with sample data
  - Body: { sampleData: {...} }
  - Response: rendered HTML

POST /api/v1/admin/email/send-test
  - Send test email
  - Body: { to, templateSlug, templateData }
  - Response: send result

GET /api/v1/admin/email/logs?limit=100&status=sent&userId=...
  - Get email delivery logs
  - Response: paginated logs

GET /api/v1/admin/email/dashboard
  - Get email dashboard metrics
  - Response: KPIs, recent activity

GET /api/v1/admin/email/template-performance
  - Get template open/click rates
  - Response: performance metrics

GET /api/v1/admin/email/queue
  - Get queue status and failed jobs
  - Response: queue stats, failed jobs

POST /api/v1/admin/email/queue/retry/:jobId
  - Retry a failed email job
  - Response: success/error

GET /api/v1/admin/email/bounce-list
  - Get suppressed emails
  - Response: bounce list

DELETE /api/v1/admin/email/bounce-list/:email
  - Remove email from bounce list
  - Response: success
```

## Worker Jobs

### Process Email Queue

Run every minute or as needed:

```bash
curl -X POST http://localhost:3003/api/v1/workers/process-email-queue \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Add to `workers.ts`:
```typescript
fastify.post('/process-email-queue', {
  preHandler: [verifyWorkerAuth]
}, async (request, reply) => {
  const emailService = getEmailService();
  const processed = await emailService.processQueue(100);
  return { success: true, data: { processed } };
});
```

### Clean Old Emails

Run monthly:

```bash
curl -X POST http://localhost:3003/api/v1/workers/cleanup-email-logs \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Database Schema

### Tables Created

**email_templates**
- Template definitions with EJS
- Variables schema
- Performance tracking
- Version control

**email_queue**
- Email queue with status
- Priority field
- Retry logic
- Scheduling support
- Attachment storage

**email_logs**
- Delivery confirmation
- Open/click tracking
- Error logging
- Device/location data

**email_tracking_events**
- Individual tracking events
- Click link details
- IP/user agent
- Browser/OS detection

**email_rate_limits**
- Per-domain rate limiting
- Hourly/daily/monthly limits
- Automatic reset

**email_bounce_list**
- Suppressed emails
- Hard/soft bounce tracking
- Auto-expiration for soft bounces

### Views Created

**email_dashboard**
- Sent (24h), failed, pending, bounced
- Open/click rates
- Average delivery time

**email_template_performance**
- Per-template metrics
- Open rates, click rates
- Failed count

## Testing

### Test SMTP Connection

```bash
curl -X POST http://localhost:3003/api/v1/admin/email/send-test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "templateSlug": "welcome",
    "templateData": {"userName": "Test User"}
  }'
```

### Preview Template

```bash
curl -X POST http://localhost:3003/api/v1/admin/email/templates/welcome/preview \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sampleData": {"userName": "Preview User"}}'
```

### View Queue Status

```bash
curl http://localhost:3003/api/v1/admin/email/queue \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Troubleshooting

### Emails Not Sending

1. **Check SMTP configuration:**
   ```bash
   # In API container
   echo $SMTP_HOST
   echo $SMTP_USER
   ```

2. **Verify SMTP connection:**
   ```typescript
   const emailService = getEmailService();
   await emailService.verifyConnection();
   ```

3. **Check queue status:**
   ```bash
   curl http://localhost:3003/api/v1/admin/email/queue \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

4. **Check logs:**
   ```bash
   docker-compose logs -f api-gateway | grep email
   ```

### High Bounce Rate

1. Check bounce list:
   ```bash
  curl http://localhost:3003/api/v1/admin/email/bounce-list \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

2. Review email content for spam triggers
3. Verify SPF/DKIM/DMARC records
4. Check sender reputation

### Queue Backup

1. Check pending count:
   ```bash
  curl http://localhost:3003/api/v1/admin/email/stats \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

2. Increase worker concurrency in queue.ts
3. Add more worker processes
4. Check SMTP rate limits

## Security

### Email Validation
- Email format validation
- Bounce list check before sending
- Rate limiting per domain
- Attachment size limits

### Privacy
- Email logs retention (90 days)
- GDPR compliance ready
- Unsubscribe link in all marketing emails
- IP address hashing (optional)

### Anti-Spam
- Rate limiting
- Bounce tracking
- Complaint handling
- SPF/DKIM support (configure on SMTP provider)

## Performance

### Optimization
- Template caching (5 minutes)
- Connection pooling (max 5 connections)
- Batch processing (100 emails at a time)
- Rate limiting (5 emails/second)
- Lazy loading templates

### Monitoring
- Queue depth monitoring
- Delivery rate tracking
- Error rate alerts
- Performance metrics

## Production Checklist

- [ ] Configure production SMTP (SendGrid/SES/Postmark)
- [ ] Set up SPF/DKIM/DMARC records
- [ ] Configure Redis for queue
- [ ] Set up email tracking domain
- [ ] Test all email templates
- [ ] Configure bounce webhook (if provider supports)
- [ ] Set up monitoring/alerts
- [ ] Configure rate limits
- [ ] Test retry logic
- [ ] Set up cron for queue processing

## Advanced Features

### Custom Templates

Create new template in Directus:

```sql
INSERT INTO email_templates (slug, name, subject, html_template, text_template, category)
VALUES (
  'custom-template',
  'My Custom Email',
  'Subject with <%= variable %>',
  '<html>...</html>',
  'Plain text...',
  'transactional'
);
```

### Bulk Sending

```typescript
const users = await getUsers();

for (const user of users) {
  await emailService.sendEmail({
    to: user.email,
    templateSlug: 'weekly-summary',
    templateData: { ...user.data },
    priority: 1, // Low priority for bulk
  });
}
```

### A/B Testing

```typescript
const variant = userId % 2 === 0 ? 'variant-a' : 'variant-b';

await emailService.sendEmail({
  to: user.email,
  templateSlug: variant,
  templateData: data,
});
```

## Integration Examples

### Stripe Webhooks

```typescript
// In stripe-webhooks.ts
import { handleStripeEmailNotifications } from '../services/email/integrations';

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // ... existing code ...
  
  // Send email
  await handleStripeEmailNotifications(fastify, 'subscription.created', {
    userId, email, userName, tier, amount, isYearly, creditsPerDay
  });
}
```

### Auth Routes

```typescript
// In auth.ts
import { sendWelcomeEmail } from '../services/email/helpers';

fastify.post('/signup', async (request, reply) => {
  // ... create user ...
  
  await sendWelcomeEmail(fastify, userId, email, userName);
});
```

### Credit Deduction

```typescript
// In credits.ts
import { checkAndSendCreditWarning } from '../services/email/integrations';

async function deductCredits(userId: string, amount: number) {
  // ... deduct credits ...
  
  await checkAndSendCreditWarning(fastify, userId, newBalance, dailyLimit);
}
```

## Monitoring

### Queue Health

```bash
# Check queue stats
curl http://localhost:3003/api/v1/admin/email/stats

# Response:
{
  "delivery": {
    "totalSent": 1000,
    "delivered": 950,
    "failed": 50,
    "openRate": 45.2,
    "clickRate": 12.3
  },
  "queue": {
    "waiting": 5,
    "active": 2,
    "completed": 950,
    "failed": 10,
    "delayed": 20
  }
}
```

### Template Performance

```bash
curl http://localhost:3003/api/v1/admin/email/template-performance

# Response shows open/click rates per template
```

## Cron Schedule

```cron
# Process email queue (every minute)
* * * * * curl -X POST $API_URL/api/v1/workers/process-email-queue -H "Authorization: Bearer $CRON_SECRET"

# Clean old logs (daily at 3 AM)
0 3 * * * curl -X POST $API_URL/api/v1/workers/cleanup-email-logs -H "Authorization: Bearer $CRON_SECRET"

# Generate weekly summaries (Sunday 9 AM)
0 9 * * 0 curl -X POST $API_URL/api/v1/workers/send-weekly-summaries -H "Authorization: Bearer $CRON_SECRET"
```

## Best Practices

### Email Deliverability
1. Use reputable SMTP provider (SendGrid, AWS SES, Postmark)
2. Configure SPF, DKIM, DMARC records
3. Warm up IP address gradually
4. Monitor bounce rates (keep < 5%)
5. Process unsubscribes immediately
6. Use double opt-in for marketing emails

### Template Design
1. Mobile-first responsive design
2. Plain text fallback always
3. Clear CTA (call to action)
4. Include unsubscribe link
5. Test in multiple email clients
6. Keep under 100KB total size

### Queue Management
1. Set appropriate priorities
2. Monitor queue depth
3. Scale workers if needed
4. Clean old completed jobs
5. Review failed jobs regularly

### Security
1. Validate all email addresses
2. Sanitize template data
3. Rate limit per user/domain
4. Check bounce list
5. Log all email activity

## Metrics to Monitor

**Delivery Metrics:**
- Delivery rate (should be > 95%)
- Bounce rate (should be < 5%)
- Complaint rate (should be < 0.1%)
- Open rate (industry average: 20-30%)
- Click rate (industry average: 2-5%)

**Queue Metrics:**
- Queue depth (should be < 100)
- Processing time (should be < 1 minute)
- Failed jobs (should be < 1%)
- Retry success rate

**Performance Metrics:**
- Average delivery time
- Queue processing speed
- Template render time
- SMTP connection time

## Examples

See `packages/api-gateway/src/services/email/__tests__/mailer.test.ts` for comprehensive test examples.

## Support

For issues:
1. Check logs: `docker-compose logs api-gateway | grep email`
2. Verify SMTP: Test credentials with mail client
3. Check queue: `GET /api/v1/admin/email/queue`
4. Review docs: This file
5. Check templates: `GET /api/v1/admin/email/templates`

---

**Email Service Version:** 1.0.0  
**Last Updated:** December 2024  
**Maintained by:** Printverse Team
