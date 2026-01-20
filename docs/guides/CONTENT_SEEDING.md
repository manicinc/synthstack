# Content Seeding Guide

This guide explains how to populate your SynthStack instance with sample content for development, testing, or as a starting point for your own content.

## Quick Start

```bash
# Apply all migrations including blog seed data
docker compose up -d directus-migrate

# Or manually run the seed SQL
docker compose exec postgres psql -U synthstack -d synthstack \
  -f /var/lib/postgresql/migrations/010_blog_seed_data.sql
```

## What Gets Seeded

### Blog Content

The blog seed data (`services/directus/migrations/010_blog_seed_data.sql`) creates:

#### Categories
| Category | Slug | Description |
|----------|------|-------------|
| Engineering | `engineering` | Technical deep-dives and code patterns |
| Architecture | `architecture` | System design and platform decisions |
| DevOps | `devops` | Deployment, infrastructure, and operations |
| Product | `product` | Product development and agency insights |
| Updates | `updates` | Product announcements and releases |

#### Authors
- **SynthStack Team** (`synthstack-team`) - Default author for all seed posts

#### Blog Posts
| Title | Slug | Category |
|-------|------|----------|
| SynthStack Complete Architecture Guide 2026 | `synthstack-complete-architecture-2026` | Architecture |
| Building Your Agency in a Box | `agency-in-a-box` | Architecture |
| Complete Guide to Self-Hosting SynthStack | `self-hosting-complete-guide` | DevOps |
| Building an AI Copilot with RAG | `ai-copilot-rag-deep-dive` | Engineering |
| Mastering Vue 3 Composition API | `vue3-composition-patterns` | Engineering |
| Why We Chose Directus as Our CMS | `directus-headless-cms` | Architecture |
| Docker Compose to Production | `docker-compose-production` | DevOps |
| Implementing Stripe Subscriptions | `stripe-subscriptions-guide` | Engineering |
| Building Products for Digital Agencies | `building-for-agencies` | Product |
| Introducing SynthStack | `introducing-synthstack` | Updates |

### Sample Content

Additional sample content (`services/directus/seeds/001_sample_content.sql`) includes:

- **FAQ Items** - Common questions about SynthStack
- **Company Pages** - About, Contact pages
- **Career Openings** - Sample job postings

## Running Seeds

### During Initial Setup

Seeds run automatically as part of the migration process:

```bash
# Start all services (migrations run automatically)
docker compose up -d
```

### Manually Re-Running Seeds

To re-apply seed data (updates existing records):

```bash
# Connect to database and run migration
docker compose exec postgres psql -U synthstack -d synthstack

# Inside psql, run the seed migration
\i /var/lib/postgresql/migrations/010_blog_seed_data.sql
```

### Fresh Database Reset

To completely reset and re-seed:

```bash
# WARNING: This deletes all data!
docker compose down -v
docker compose up -d
```

## Customizing Seed Data

### Adding Your Own Blog Posts

Edit `services/directus/migrations/010_blog_seed_data.sql`:

```sql
-- Add inside the DO $$ block
INSERT INTO blog_posts (
  status, title, slug, summary, body, featured, category_id, author_id,
  published_at, read_time, seo_title, seo_description
) VALUES (
  'published',
  'Your Post Title',
  'your-post-slug',
  'A brief summary of your post.',
  E'# Your Post Title\n\nYour markdown content here...',
  false,
  cat_engineering,  -- Use category variable from the DO block
  author_id,        -- Use author variable from the DO block
  NOW(),
  5,
  'SEO Title | SynthStack',
  'SEO description for search engines.'
) ON CONFLICT (slug) DO UPDATE SET
  body = EXCLUDED.body,
  summary = EXCLUDED.summary;
```

### Creating Custom Categories

```sql
INSERT INTO blog_categories (name, slug, description, color, sort) VALUES
  ('Your Category', 'your-category', 'Description here', '#FF5733', 10)
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  color = EXCLUDED.color;
```

### Creating Custom Authors

```sql
INSERT INTO blog_authors (name, slug, bio, email, social_links) VALUES
  ('Author Name', 'author-slug', 'Author bio here.', 'author@example.com',
   '{"twitter": "https://twitter.com/author"}')
ON CONFLICT (slug) DO NOTHING;
```

## Production Considerations

### Seed vs Production Data

- **Development**: Run all seeds for testing
- **Production**: Consider which seeds are appropriate
  - Blog categories: Usually keep
  - Sample blog posts: Replace with real content
  - FAQ items: Customize for your product
  - Career pages: Remove or customize

### Protecting Seed Data

Seed migrations use `ON CONFLICT DO UPDATE` or `ON CONFLICT DO NOTHING`:
- Posts are updated if slug exists (keeps your edits to other fields)
- Authors/categories are skipped if they exist

### Disabling Seeds in Production

To skip blog seed data, you can:

1. Remove the migration file before deploying
2. Mark it as already applied in `synthstack_migrations` table
3. Create an empty override migration

## Managing Content via Directus

After seeding, manage content through Directus Admin:

1. Access: `http://localhost:8099/admin` (or your production URL)
2. Login with admin credentials
3. Navigate to **Blog Posts**, **Blog Categories**, etc.
4. Edit, add, or remove content as needed

## File Locations

| File | Purpose |
|------|---------|
| `services/directus/migrations/010_blog_seed_data.sql` | Blog categories, authors, posts |
| `services/directus/seeds/001_sample_content.sql` | FAQ, company pages, careers |
| `services/directus/migrations/003_content_collections.sql` | Schema for content tables |
| `scripts/seed-data.sql` | Legacy seed data (printers, filaments) |

## Troubleshooting

### Posts Not Appearing

1. Check post status is `'published'`
2. Verify `published_at` is in the past
3. Check category and author IDs exist

```sql
-- Debug query
SELECT title, slug, status, published_at, category_id, author_id
FROM blog_posts
ORDER BY published_at DESC;
```

### Migration Not Running

```bash
# Check migration status
docker compose logs directus-migrate

# Manually trigger migrations
docker compose up -d directus-migrate
```

### Duplicate Key Errors

Seeds use `ON CONFLICT` clauses. If you see duplicate errors:
- The migration is using `INSERT` without `ON CONFLICT`
- Fix by adding `ON CONFLICT (slug) DO NOTHING` or `DO UPDATE SET ...`

## Related Documentation

- [Self-Hosting Guide](../SELF_HOSTING.md)
- [Quick Start](../QUICK_START.md)
- [Database Management](../DATABASE_MANAGEMENT.md)
- [Admin CMS Guide](../ADMIN_CMS.md)
