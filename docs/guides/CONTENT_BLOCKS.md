# Content & CMS Setup - Complete

## What Was Added

### API Routes (packages/api-gateway/src/routes/)
- **blog.ts** - GET /api/v1/blog, GET /api/v1/blog/:slug
- **careers.ts** - GET /api/v1/careers, GET /api/v1/careers/:slug, POST /api/v1/careers/:id/apply
- **faq.ts** - GET /api/v1/faq, POST /api/v1/faq/:id/helpful
- **pages.ts** - GET /api/v1/pages/:slug (for about, contact pages)
- **newsletter.ts** - POST /api/v1/newsletter/subscribe (with MailerLite/Mailchimp integration)
- **contact.ts** - POST /api/v1/contact (with SMTP email notifications)

### Services (packages/api-gateway/src/services/)
- **newsletter.ts** - MailerLite and Mailchimp integration
- **email.ts** - SMTP service with nodemailer for contact form notifications

### Frontend Composables (apps/web/src/composables/)
- **useBlog.ts** - Blog post fetching and management
- **useNewsletter.ts** - Newsletter subscription handling
- **useContact.ts** - Contact form submission

### Components (apps/web/src/components/common/)
- **NewsletterCTA.vue** - Reusable newsletter signup component (use in footer, hero, blog)

### Directus Collections
Migration `003_content_collections.sql` creates:
- **blog_posts** - Blog content with categories, authors, SEO
- **blog_categories** - Post categorization
- **blog_authors** - Author profiles
- **career_openings** - Job postings
- **job_applications** - Application submissions with resume uploads
- **faq_items** - FAQ with helpful voting
- **company_pages** - About, contact, and other static pages
- **newsletter_signups** - Email list with provider sync tracking
- **contact_submissions** - Contact form messages

## Environment Variables Added

```bash
# Newsletter
NEWSLETTER_PROVIDER=mailerlite  # or 'mailchimp'
NEWSLETTER_API_KEY=your-key
NEWSLETTER_LIST_ID=your-list-id

# SMTP/Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=noreply@synthstack.app
CONTACT_TO_EMAIL=support@synthstack.app
```

## Next Steps

### 1. Run Migrations
```bash
# Connect to postgres and run migration
docker exec -i synthstack-postgres psql -U synthstack -d synthstack < services/directus/migrations/003_content_collections.sql

# Or via Directus UI: Settings > Data Model > Import Schema
```

### 2. Seed Sample Content
```bash
# Run seed file (when created)
docker exec -i synthstack-postgres psql -U synthstack -d synthstack < services/directus/seeds/001_sample_content.sql
```

### 3. Configure Newsletter Provider
- Sign up for MailerLite (recommended) or Mailchimp
- Get API key and list/audience ID
- Update .env with credentials

### 4. Configure SMTP
- Use SendGrid, Postmark, AWS SES, or any SMTP provider
- Update .env with SMTP credentials
- Test with contact form

### 5. Update Frontend Pages
Existing pages (BlogPage, ContactPage, CareersPage, FAQPage) need to be updated to:
- Use the new composables (useBlog, useContact, useNewsletter)
- Fetch from API instead of using mock data
- Add NewsletterCTA component

### 6. Directus Admin Setup
- Create roles: Editor, Recruiter, Moderator
- Set permissions for each collection
- Create dashboards for content pipeline, applications, newsletter growth
- Configure display templates for better UX

## Frontend Integration Example

```vue
<script setup>
import { onMounted } from 'vue';
import { useBlog } from '@/composables/useBlog';
import NewsletterCTA from '@/components/common/NewsletterCTA.vue';

const { posts, loading, fetchPosts } = useBlog();

onMounted(() => {
  fetchPosts();
});
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-for="post in posts" :key="post.id">
    {{ post.title }}
  </div>
  <NewsletterCTA source="blog-footer" />
</template>
```

## Testing

```bash
# Test newsletter signup
curl -X POST http://localhost:3003/api/v1/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","source":"test"}'

# Test contact form
curl -X POST http://localhost:3003/api/v1/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","subject":"Test","message":"Hello"}'

# Test blog API
curl http://localhost:3003/api/v1/blog

# Test FAQ API
curl http://localhost:3003/api/v1/faq
```
