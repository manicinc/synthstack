# SynthStack SEO Optimization Guide

This guide covers the complete SEO optimization system in SynthStack, including SERP tracking with SerpAPI, automated ranking checks, and the SEO dashboard.

## Overview

SynthStack includes a comprehensive SEO toolkit:

- **SERP Tracking**: Monitor keyword rankings using SerpAPI
- **Competitor Analysis**: Track competitor positions for your keywords
- **SERP Features Detection**: Identify featured snippets, knowledge panels, etc.
- **Automated Monitoring**: Scheduled GitHub Actions for ranking checks
- **SEO Dashboard**: Visual analytics and ranking trends
- **Quota Management**: Smart scheduling to stay within API limits

## Architecture

```
packages/api-gateway/src/
├── services/
│   └── serpapi.ts           # SerpAPI client with quota management
├── routes/
│   └── serp.ts              # SERP API endpoints
└── config/
    └── index.ts             # Environment configuration

apps/web/src/
├── pages/app/
│   └── SEODashboardPage.vue # SEO analytics dashboard
└── composables/
    └── useSerpTracking.ts   # Frontend SERP data composable

services/directus/migrations/
└── 059_serp_tracking.sql    # Database schema

.github/workflows/
└── serp-check.yml           # Automated SERP checks
```

## Setup

### 1. Environment Variables

Add to your `.env` file:

```bash
# SerpAPI Configuration
SERPAPI_KEY=your_api_key_here
SERPAPI_MONTHLY_LIMIT=250  # Default free tier limit
```

### 2. Database Migration

Run the migration to create SERP tracking tables:

```bash
# Using Directus/PostgreSQL
psql -d synthstack -f services/directus/migrations/059_serp_tracking.sql
```

### 3. Configure Keywords

Add keywords to track via the API or Directus admin:

```bash
curl -X POST http://localhost:3003/api/v1/seo/keywords \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "saas boilerplate",
    "check_frequency": "weekly"
  }'
```

## API Endpoints

### Quota Management

```
GET /api/v1/serp/quota
```

Returns current API usage status:

```json
{
  "monthlyLimit": 250,
  "used": 45,
  "remaining": 205,
  "resetDate": "2024-02-01T00:00:00Z",
  "lastCheck": "2024-01-15T10:30:00Z"
}
```

### Check Keyword Ranking

```
POST /api/v1/serp/check/:keywordId
```

Triggers a manual SERP check for a specific keyword. Returns:

```json
{
  "keyword": "saas boilerplate",
  "position": 8,
  "url": "https://synthstack.app",
  "title": "SynthStack - AI-Native SaaS Boilerplate",
  "serpFeatures": ["organic", "sitelinks"],
  "checkedAt": "2024-01-15T10:30:00Z"
}
```

### Ranking History

```
GET /api/v1/serp/history/:keywordId?days=30
```

Returns historical ranking data:

```json
{
  "keyword": "saas boilerplate",
  "history": [
    { "date": "2024-01-15", "position": 8 },
    { "date": "2024-01-08", "position": 12 },
    { "date": "2024-01-01", "position": 15 }
  ],
  "averagePosition": 11.6,
  "bestPosition": 8,
  "trend": "improving"
}
```

### Competitor Management

```
GET    /api/v1/serp/competitors           # List competitors
POST   /api/v1/serp/competitors           # Add competitor
DELETE /api/v1/serp/competitors/:id       # Remove competitor
```

Add competitor example:

```bash
curl -X POST http://localhost:3003/api/v1/serp/competitors \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "competitor.com",
    "name": "Competitor Inc"
  }'
```

### Dashboard Metrics

```
GET /api/v1/serp/dashboard
```

Returns aggregated SEO metrics:

```json
{
  "totalKeywords": 25,
  "averagePosition": 18.5,
  "top10Count": 8,
  "top3Count": 2,
  "serpFeatures": {
    "featured_snippet": 1,
    "sitelinks": 3,
    "people_also_ask": 5
  },
  "recentChanges": [
    {
      "keyword": "vue saas template",
      "previousPosition": 15,
      "currentPosition": 9,
      "change": 6
    }
  ],
  "competitorComparison": [
    {
      "competitor": "competitor.com",
      "keywordOverlap": 18,
      "averagePositionDiff": -3.2
    }
  ]
}
```

## SERP Features Detection

The system detects and tracks these SERP features:

| Feature | Description |
|---------|-------------|
| `featured_snippet` | Answer box at top of results |
| `people_also_ask` | Related questions section |
| `knowledge_panel` | Information panel on right |
| `local_pack` | Local business results |
| `sitelinks` | Additional links under result |
| `video` | Video carousel or results |
| `images` | Image pack in results |
| `shopping` | Shopping/product results |
| `news` | News carousel |
| `top_stories` | Top stories section |

## Quota Management Strategy

With 250 searches/month limit, use this scheduling strategy:

### Priority Levels

| Priority | Check Frequency | Searches/Month | Use Case |
|----------|-----------------|----------------|----------|
| Critical | Weekly | ~20 | Primary brand keywords |
| High | Bi-weekly | ~20 | High-value keywords |
| Medium | Monthly | ~15 | Secondary keywords |
| Manual | On-demand | ~15 | Ad-hoc checks |

**Total**: ~70 searches/month (28% of quota) with 180 buffer

### Setting Keyword Priority

```bash
curl -X PUT http://localhost:3003/api/v1/seo/keywords/:id \
  -H "Content-Type: application/json" \
  -d '{
    "check_frequency": "weekly"
  }'
```

Valid frequencies: `weekly`, `biweekly`, `monthly`, `manual`

## Automated Checks (GitHub Actions)

The `serp-check.yml` workflow runs automatically:

- **Every Monday 6 AM UTC**: Critical keywords
- **1st & 15th of month 7 AM UTC**: High priority keywords

### Manual Trigger

Trigger manually from GitHub Actions:

```bash
gh workflow run serp-check.yml \
  --field priority=all \
  --field dry_run=false
```

### Workflow Configuration

```yaml
# .github/workflows/serp-check.yml
on:
  schedule:
    - cron: '0 6 * * 1'      # Weekly (Monday)
    - cron: '0 7 1,15 * *'   # Bi-weekly
  workflow_dispatch:
    inputs:
      priority:
        type: choice
        options: [critical, high, medium, all]
```

## SEO Dashboard

Access the dashboard at `/app/seo` (requires authentication).

### Features

1. **Quota Widget**: Visual API usage indicator
2. **Ranking Overview**: Total keywords, average position, top 10/3 counts
3. **Keyword Table**: Sortable list with position trends
4. **Ranking Chart**: Historical position visualization
5. **Competitor Comparison**: Side-by-side ranking analysis
6. **SERP Features**: Track feature appearances

### Using the Dashboard

```vue
<script setup lang="ts">
import { useSerpTracking } from '@/composables/useSerpTracking';

const {
  quota,
  dashboard,
  isLoading,
  fetchDashboard,
  checkKeywordRanking,
  fetchRankingHistory
} = useSerpTracking();

// Refresh dashboard data
await fetchDashboard();

// Manual keyword check
await checkKeywordRanking('keyword-uuid');

// Get history for a keyword
const history = await fetchRankingHistory('keyword-uuid', 90);
</script>
```

## Database Schema

### Tables

```sql
-- Ranking history for each keyword check
serp_ranking_history (
  id UUID PRIMARY KEY,
  keyword_id UUID REFERENCES seo_keywords(id),
  position INTEGER,
  url TEXT,
  title TEXT,
  description TEXT,
  serp_features JSONB,
  checked_at TIMESTAMP
)

-- SERP feature appearances
serp_features_history (
  id UUID PRIMARY KEY,
  keyword_id UUID REFERENCES seo_keywords(id),
  feature_type VARCHAR(50),
  position INTEGER,
  content JSONB,
  checked_at TIMESTAMP
)

-- Competitor tracking
serp_competitors (
  id UUID PRIMARY KEY,
  domain VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  is_active BOOLEAN
)

-- Competitor rankings per keyword
serp_competitor_rankings (
  id UUID PRIMARY KEY,
  keyword_id UUID REFERENCES seo_keywords(id),
  competitor_id UUID REFERENCES serp_competitors(id),
  position INTEGER,
  url TEXT,
  checked_at TIMESTAMP
)

-- API usage tracking
serp_api_usage (
  id UUID PRIMARY KEY,
  endpoint VARCHAR(100),
  keyword_id UUID,
  quota_cost INTEGER DEFAULT 1,
  created_at TIMESTAMP
)
```

## Best Practices

### 1. Keyword Selection

- Focus on 20-30 high-value keywords
- Mix branded and non-branded terms
- Include long-tail variations
- Track competitor brand names

### 2. Monitoring Strategy

```
Critical (weekly):
- Brand name + product
- Primary product category
- Top converting keywords

High (bi-weekly):
- Feature-specific keywords
- Comparison keywords
- Industry terms

Medium (monthly):
- Long-tail variations
- Location-specific terms
- Secondary features
```

### 3. Responding to Ranking Changes

When rankings drop:

1. Check for algorithm updates
2. Review recent content changes
3. Analyze competitor movements
4. Check for technical issues

When rankings improve:

1. Document what worked
2. Apply similar strategies to other keywords
3. Monitor for stability

### 4. Competitor Analysis

- Track 3-5 direct competitors
- Monitor their SERP feature appearances
- Identify content gaps
- Compare ranking trends

## Troubleshooting

### API Quota Exceeded

```
Error: Monthly SERP API quota exceeded
```

Solutions:
1. Wait for monthly reset
2. Upgrade SerpAPI plan
3. Reduce check frequency
4. Prioritize critical keywords

### No Ranking Found

```
{ "position": null, "status": "not_found" }
```

Possible causes:
1. Domain not indexed for this keyword
2. Position beyond page 10 (position 100)
3. Keyword/domain mismatch

### Rate Limiting

SerpAPI has rate limits. The client includes:
- Automatic retry with exponential backoff
- 2-second delay between requests in batch operations

## Integration with Other SEO Tools

### Sitemap Generation

```bash
pnpm generate:sitemap
```

Generates `sitemap.xml` with all public routes.

### Meta Tags

Use the `useSeo` composable for meta management:

```typescript
import { useSeo } from '@/composables/useSeo';

const { setMeta } = useSeo();

setMeta({
  title: 'Page Title | SynthStack',
  description: 'Page description for search results',
  keywords: ['keyword1', 'keyword2'],
  ogImage: '/images/og-page.png'
});
```

### Structured Data

The app automatically generates JSON-LD for:
- Organization
- Website
- Breadcrumbs
- Product (where applicable)

## Related Documentation

- [Directus Features](./DIRECTUS_FEATURES.md)
- [Feature Flags](./FEATURE_FLAGS.md)
- [SerpAPI Documentation](https://serpapi.com/documentation)
