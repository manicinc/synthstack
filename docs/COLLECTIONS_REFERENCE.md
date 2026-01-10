# SynthStack Directus Collections Reference

**Last Updated**: 2026-01-06

This document provides a complete reference of all Directus collections organized into logical groups in the SynthStack admin CMS.

## Collection Groups Overview

SynthStack Directus is organized into **14 collection groups**:

1. **CRM & Sales** - Customer relationship management
2. **Client Projects** - Client service project management
3. **Billing & Invoicing** - Financial operations
4. **Proposals & Quotes** - Sales proposals
5. **Help & Support** - Knowledge base and support
6. **Content Blocks** - Reusable content components
7. **Settings** - System configuration
8. **Client Portal** - Client communications
9. **Project Management & Development** - Internal dev projects
10. **Gamification & Points** - User engagement system
11. **AI & Agent Orchestration** - AI automation
12. **Content & CMS** - Marketing content
13. **Users & Features** - User management
14. **Analytics & Tracking** - Metrics and monitoring

---

## 1. CRM & Sales (`synthstack_crm`)

Customer relationship management and sales pipeline.

### Collections (5)

#### `organizations`
Client companies and organizations.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | STRING | Organization name |
| website | STRING | Company website |
| logo | FILE | Company logo |
| brand_color | STRING | Brand hex color |
| payment_terms | UUID | Default payment terms (FK: os_payment_terms) |
| branding | JSONB | Brand guidelines |
| billing | JSONB | Billing configuration |
| stripe_customer_id | STRING | Stripe customer ID |

#### `contacts`
Individual contacts at client organizations.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| first_name | STRING | First name |
| last_name | STRING | Last name |
| email | STRING | Email address |
| phone | STRING | Phone number |
| title | STRING | Job title |
| contact_notes | TEXT | Internal notes |
| status | ENUM | active/inactive |

**Related**: `organizations_contacts` (M2M junction)

#### `os_deal_stages`
Sales pipeline stages.

| Field | Type | Description |
|-------|------|-------------|
| name | STRING | Stage name (New, Qualified, Proposal, etc.) |
| color | STRING | Display color |
| probability | INTEGER | Win probability (0-100) |
| sort | INTEGER | Display order |

Default stages: New (10%), Qualified (25%), Proposal (50%), Negotiation (75%), Won (100%), Lost (0%)

#### `os_deals`
Sales opportunities and deals.

| Field | Type | Description |
|-------|------|-------------|
| name | STRING | Deal name |
| value | DECIMAL | Deal value |
| stage | UUID | Current stage (FK: os_deal_stages) |
| organization | UUID | Client organization (FK: organizations) |
| expected_close_date | DATE | Expected close date |
| status | ENUM | active/won/lost/cancelled |

**Display Template**: `{{name}} - {{organization.name}}`

#### `os_activities`
CRM activity tracking (calls, meetings, emails, tasks).

| Field | Type | Description |
|-------|------|-------------|
| name | STRING | Activity title |
| activity_type | ENUM | call/meeting/email/task/note |
| due_date | DATETIME | Due date/time |
| completed | BOOLEAN | Completion status |
| notes | TEXT | Activity notes |

**Display Template**: `{{name}} - {{activity_type}}`

---

## 2. Client Projects (`synthstack_client_projects`)

Client service project management (separate from internal dev projects).

### Collections (3)

#### `os_projects`
Client service projects.

| Field | Type | Description |
|-------|------|-------------|
| name | STRING | Project name |
| organization | UUID | Client (FK: organizations) |
| status | ENUM | planning/active/on_hold/completed/cancelled |
| start_date | DATE | Project start |
| due_date | DATE | Project deadline |
| billing | JSONB | Billing config (hourly/fixed/retainer) |
| is_visible_to_client | BOOLEAN | Client portal visibility |

**Display Template**: `{{name}} ({{status}})`

#### `os_tasks`
Project tasks and to-dos.

| Field | Type | Description |
|-------|------|-------------|
| name | STRING | Task name |
| project | UUID | Parent project (FK: os_projects) |
| status | ENUM | todo/in_progress/review/completed |
| priority | ENUM | low/medium/high/urgent |
| due_date | DATE | Due date |
| is_visible_to_client | BOOLEAN | Client portal visibility |

**Display Template**: `{{name}} - {{project.name}}`

#### `os_project_templates`
Reusable project templates.

| Field | Type | Description |
|-------|------|-------------|
| name | STRING | Template name |
| description | TEXT | Template description |
| tasks | JSONB | Task templates |
| default_duration_days | INTEGER | Estimated duration |

---

## 3. Billing & Invoicing (`synthstack_billing`)

Financial operations and invoicing system.

### Collections (8)

#### `os_invoices`
Client invoices.

| Field | Type | Description |
|-------|------|-------------|
| invoice_number | STRING | Unique invoice # |
| organization | UUID | Client (FK: organizations) |
| invoice_date | DATE | Invoice date |
| due_date | DATE | Payment due date |
| subtotal | DECIMAL | Subtotal (auto-calculated) |
| total_tax | DECIMAL | Total tax (auto-calculated) |
| total | DECIMAL | Grand total (auto-calculated) |
| amount_paid | DECIMAL | Amount paid |
| amount_due | DECIMAL | Amount due (auto-calculated) |
| status | ENUM | draft/sent/paid/overdue/cancelled |

**Display Template**: `{{invoice_number}} - {{organization.name}} - ${{total}}`

**Auto-Calculations**: PostgreSQL triggers calculate totals when invoice items change.

#### `os_payments`
Payment records.

| Field | Type | Description |
|-------|------|-------------|
| invoice | UUID | Invoice (FK: os_invoices) |
| amount | DECIMAL | Payment amount |
| payment_date | DATE | Date received |
| payment_method | ENUM | stripe/check/wire/cash |
| stripe_payment_id | STRING | Stripe payment ID |
| notes | TEXT | Payment notes |

**Display Template**: `${{amount}} - {{payment_date}}`

#### `os_expenses`
Billable expenses.

| Field | Type | Description |
|-------|------|-------------|
| name | STRING | Expense name |
| cost | DECIMAL | Expense cost |
| project | UUID | Related project (FK: os_projects) |
| expense_date | DATE | Date incurred |
| is_billable | BOOLEAN | Can bill to client |
| category | UUID | Expense category (FK: expense_categories) |

**Display Template**: `{{name}} - ${{cost}}`

#### `os_items`
Reusable invoice line items catalog.

| Field | Type | Description |
|-------|------|-------------|
| name | STRING | Item name |
| description | TEXT | Item description |
| unit_price | DECIMAL | Default price |
| unit_type | STRING | hour/day/month/each |
| tax_rate | UUID | Default tax (FK: os_tax_rates) |
| status | ENUM | active/archived |

#### `expense_categories`
Expense categorization.

| Field | Type | Description |
|-------|------|-------------|
| name | STRING | Category name |
| description | TEXT | Category description |
| color | STRING | Display color |

#### `os_tax_rates`
Tax rates for invoicing.

| Field | Type | Description |
|-------|------|-------------|
| name | STRING | Tax name (e.g., "CA Sales Tax") |
| rate | DECIMAL | Tax rate (e.g., 7.25) |
| status | ENUM | active/archived |

#### `os_payment_terms`
Payment terms presets.

| Field | Type | Description |
|-------|------|-------------|
| name | STRING | Term name (e.g., "Net 30") |
| days | INTEGER | Payment days |
| sort | INTEGER | Display order |

Default terms: Due on Receipt (0), Net 15 (15), Net 30 (30), Net 60 (60), Net 90 (90)

#### `items`
Additional reusable line items.

---

## 4. Proposals & Quotes (`synthstack_proposals`)

Sales proposals with content blocks and e-signatures.

### Collections (2)

#### `os_proposals`
Client proposals.

| Field | Type | Description |
|-------|------|-------------|
| name | STRING | Proposal name |
| organization | UUID | Client (FK: organizations) |
| total_value | DECIMAL | Proposal value |
| proposal_date | DATE | Created date |
| valid_until | DATE | Expiration date |
| status | ENUM | draft/sent/accepted/rejected/expired |

**Display Template**: `{{name}} ({{status}})`

#### `os_proposal_approvals`
E-signature approvals.

| Field | Type | Description |
|-------|------|-------------|
| proposal | UUID | Proposal (FK: os_proposals) |
| contact | UUID | Signer (FK: contacts) |
| signature_data | TEXT | Signature image data |
| signed_at | DATETIME | Signature timestamp |
| ip_address | STRING | Signer IP |

---

## 5. Help & Support (`synthstack_help`)

Knowledge base and help center.

### Collections (4)

#### `help_collections`
Help article categories.

| Field | Type | Description |
|-------|------|-------------|
| name | STRING | Category name |
| icon | STRING | Icon name |
| description | TEXT | Category description |
| sort | INTEGER | Display order |

#### `help_articles`
Knowledge base articles.

| Field | Type | Description |
|-------|------|-------------|
| title | STRING | Article title |
| collection | UUID | Category (FK: help_collections) |
| content | TEXT | Article content (Markdown) |
| status | ENUM | draft/published/archived |
| views | INTEGER | View count |

#### `help_feedback`
Article feedback ratings.

| Field | Type | Description |
|-------|------|-------------|
| article | UUID | Article (FK: help_articles) |
| rating | INTEGER | Rating (1-5) |
| comment | TEXT | Feedback comment |

#### `inbox`
Form submissions.

| Field | Type | Description |
|-------|------|-------------|
| subject | STRING | Subject |
| message | TEXT | Message content |
| email | STRING | Sender email |
| status | ENUM | unread/read/archived |

#### `help_search_queries`
Help search analytics.

---

## 6. Content Blocks (`synthstack_blocks`)

Reusable content block components for pages and proposals.

### Collections (23)

Block types:
- `block_hero` - Hero sections
- `block_cta` - Call-to-action blocks
- `block_richtext` - Rich text content
- `block_faq` - FAQ sections
- `block_gallery` - Image galleries
- `block_logocloud` - Logo grids
- `block_steps` - Step-by-step guides
- `block_columns` - Multi-column layouts
- `block_testimonials_slider` - Testimonial carousels
- `block_testimonials` - Testimonial grids
- `block_quote` - Quote blocks
- `block_video` - Video embeds
- `block_team` - Team member cards
- `block_form` - Form blocks
- `block_html` - Custom HTML
- `block_divider` - Section dividers
- `block_pricing` - Pricing tables
- `block_button` - Button elements
- `block_button_group` - Button groups
- `block_column_rows` - Column row layouts

Plus junction tables (hidden):
- `block_gallery_files`
- `block_logocloud_files`
- `block_steps_items`

---

## 7. Settings (`synthstack_settings`)

System configuration and templates.

### Collections (3)

#### `os_email_templates`
Email templates for automation.

| Field | Type | Description |
|-------|------|-------------|
| name | STRING | Template name |
| subject | STRING | Email subject |
| body | TEXT | Email body (HTML) |
| variables | JSONB | Template variables |
| status | ENUM | active/archived |

#### `os_subscriptions`
Subscription tracking.

| Field | Type | Description |
|-------|------|-------------|
| name | STRING | Subscription name |
| organization | UUID | Client (FK: organizations) |
| billing_period | ENUM | monthly/quarterly/annual |
| amount | DECIMAL | Subscription amount |
| status | ENUM | active/cancelled/past_due |

#### `auth_provider_config`
Authentication provider configuration.

---

## 8. Client Portal (`synthstack_portal`)

Client communications and messaging.

### Collections (2)

#### `conversations`
Client portal conversations.

| Field | Type | Description |
|-------|------|-------------|
| subject | STRING | Conversation subject |
| project | UUID | Related project (FK: os_projects) |
| status | ENUM | open/closed/archived |

#### `messages`
Messages within conversations.

| Field | Type | Description |
|-------|------|-------------|
| conversation | UUID | Parent conversation (FK: conversations) |
| content | TEXT | Message content |
| sender | UUID | Sender (FK: directus_users) |
| sent_at | DATETIME | Sent timestamp |

**Hidden Junction**: `message_attachments`, `conversation_participants`

---

## 9. Project Management & Development (`synthstack_projects`)

Internal dev project management (separate from client projects).

### Collections (4)

#### `milestones`
Project milestones and deadlines.

| Field | Type | Description |
|-------|------|-------------|
| name | STRING | Milestone name |
| due_date | DATE | Deadline |
| status | ENUM | not_started/in_progress/completed |

#### `sprints`
Time-bounded work periods with velocity tracking.

| Field | Type | Description |
|-------|------|-------------|
| name | STRING | Sprint name |
| start_date | DATE | Sprint start |
| end_date | DATE | Sprint end |
| point_goal | INTEGER | Sprint point goal |

#### `retrospectives`
Sprint retrospective reviews.

| Field | Type | Description |
|-------|------|-------------|
| sprint | UUID | Sprint (FK: sprints) |
| what_went_well | TEXT | Positives |
| what_needs_improvement | TEXT | Areas to improve |
| action_items | JSONB | Follow-up actions |

#### `project_templates`
Reusable internal project templates.

---

## 10. Gamification & Points (`synthstack_gamification`)

User engagement and gamification system.

### Collections (4)

#### `user_gamification_stats`
User points, streaks, and levels.

| Field | Type | Description |
|-------|------|-------------|
| user | UUID | User (FK: directus_users) |
| total_points | INTEGER | Lifetime points |
| current_level | INTEGER | User level |
| current_streak | INTEGER | Current streak days |

#### `point_events`
Immutable log of all point transactions.

| Field | Type | Description |
|-------|------|-------------|
| user | UUID | User (FK: directus_users) |
| points | INTEGER | Points awarded |
| event_type | STRING | Event type |
| timestamp | DATETIME | Event time |

#### `achievements`
Achievement and badge definitions.

| Field | Type | Description |
|-------|------|-------------|
| name | STRING | Achievement name |
| description | TEXT | Achievement description |
| icon | STRING | Icon name |
| points | INTEGER | Points reward |

#### `user_achievements`
User unlocked achievements.

| Field | Type | Description |
|-------|------|-------------|
| user | UUID | User (FK: directus_users) |
| achievement | UUID | Achievement (FK: achievements) |
| unlocked_at | DATETIME | Unlock timestamp |

---

## 11. AI & Agent Orchestration (`synthstack_ai`)

AI automation and agent orchestration.

### Collections (11)

#### `agent_orchestration_schedules`
Per-project, per-agent scheduling configuration.

| Field | Type | Description |
|-------|------|-------------|
| project | UUID | Project (FK) |
| agent_type | STRING | Agent type |
| schedule | STRING | Cron schedule |
| enabled | BOOLEAN | Active status |

#### `orchestration_jobs`
Batch job executions.

| Field | Type | Description |
|-------|------|-------------|
| project | UUID | Project (FK) |
| started_at | DATETIME | Start time |
| completed_at | DATETIME | End time |
| status | ENUM | pending/running/completed/failed |

#### `orchestration_execution_logs`
Detailed per-agent execution logs.

| Field | Type | Description |
|-------|------|-------------|
| job | UUID | Job (FK: orchestration_jobs) |
| agent_type | STRING | Agent type |
| output | TEXT | Agent output |
| error | TEXT | Error message |

#### `autonomous_action_config`
Per-action toggles for autonomous agent behaviors.

| Field | Type | Description |
|-------|------|-------------|
| action_key | STRING | Action identifier |
| enabled | BOOLEAN | Enable/disable |
| config | JSONB | Action configuration |

#### `copilot_messages`
Copilot messages and interactions.

| Field | Type | Description |
|-------|------|-------------|
| user | UUID | User (FK: directus_users) |
| message | TEXT | Message content |
| response | TEXT | AI response |
| timestamp | DATETIME | Message time |

#### `agent_documents`
Agent-specific knowledge base documents for RAG.

| Field | Type | Description |
|-------|------|-------------|
| agent_type | STRING | Agent type |
| content | TEXT | Document content |
| embedding | VECTOR | Vector embedding |

#### `task_complexity_estimates`
LLM-powered task complexity predictions.

| Field | Type | Description |
|-------|------|-------------|
| task | UUID | Task reference |
| estimated_complexity | INTEGER | Complexity score (1-10) |
| actual_complexity | INTEGER | Actual score |
| accuracy | DECIMAL | Prediction accuracy |

#### `ai_agent_audit_log`
Comprehensive audit trail for all AI agent actions.

| Field | Type | Description |
|-------|------|-------------|
| agent_type | STRING | Agent type |
| action | STRING | Action performed |
| context | JSONB | Full context |
| timestamp | DATETIME | Action time |

#### `ai_agent_knowledge_entries`
Extracted knowledge and learnings from agent interactions.

| Field | Type | Description |
|-------|------|-------------|
| agent_type | STRING | Agent type |
| knowledge | TEXT | Knowledge content |
| embedding | VECTOR | Vector embedding |
| confidence | DECIMAL | Confidence score |

#### `ai_agent_updates`
Agent-initiated messages and notifications.

| Field | Type | Description |
|-------|------|-------------|
| agent_type | STRING | Agent type |
| message | TEXT | Update message |
| priority | ENUM | low/medium/high |
| read | BOOLEAN | Read status |

#### `ai_tools`
AI tools registry.

---

## 12. Content & CMS (`synthstack_content`)

Marketing content and site management.

### Collections (7)

#### `document_chunks`
Document chunks for RAG.

| Field | Type | Description |
|-------|------|-------------|
| content | TEXT | Chunk content |
| embedding | VECTOR | Vector embedding |
| document_id | STRING | Source document |

#### `site_theme_settings`
Global theme settings.

| Field | Type | Description |
|-------|------|-------------|
| primary_color | STRING | Primary color |
| secondary_color | STRING | Secondary color |
| font_family | STRING | Font family |
| logo | FILE | Site logo |

#### `blog_posts`
Blog posts and articles.

| Field | Type | Description |
|-------|------|-------------|
| title | STRING | Post title |
| slug | STRING | URL slug |
| content | TEXT | Post content |
| status | ENUM | draft/published |
| published_at | DATETIME | Publish time |

#### `pages`
Marketing and landing pages.

| Field | Type | Description |
|-------|------|-------------|
| title | STRING | Page title |
| slug | STRING | URL slug |
| content | JSONB | Page blocks |
| status | ENUM | draft/published |

#### `posts`
General posts.

#### `guides`
Tutorial and guide content.

#### `docs`
Technical documentation.

---

## 13. Users & Features (`synthstack_users`)

User management and feature configuration.

### Collections (5)

#### `user_feature_overrides`
Per-user feature flag overrides.

| Field | Type | Description |
|-------|------|-------------|
| user | UUID | User (FK: directus_users) |
| feature_key | STRING | Feature flag key |
| enabled | BOOLEAN | Override value |

#### `referral_uses`
Referral tracking.

| Field | Type | Description |
|-------|------|-------------|
| referrer | UUID | Referring user |
| referred | UUID | Referred user |
| created_at | DATETIME | Referral time |

#### `user_estimation_accuracy`
Track user estimation accuracy for gamification.

| Field | Type | Description |
|-------|------|-------------|
| user | UUID | User (FK: directus_users) |
| total_estimates | INTEGER | Total estimates |
| accurate_estimates | INTEGER | Accurate estimates |
| accuracy_percentage | DECIMAL | Accuracy % |

#### `pricing_tiers`
Pricing tiers and subscription plans.

| Field | Type | Description |
|-------|------|-------------|
| name | STRING | Tier name |
| price | DECIMAL | Monthly price |
| features | JSONB | Feature list |
| sort | INTEGER | Display order |

#### `user_cross_project_consent`
User consent settings for cross-project knowledge sharing.

| Field | Type | Description |
|-------|------|-------------|
| user | UUID | User (FK: directus_users) |
| consent_given | BOOLEAN | Consent status |
| consented_at | DATETIME | Consent timestamp |

---

## 14. Analytics & Tracking (`synthstack_analytics`)

Metrics and monitoring.

### Collections (2)

#### `github_analysis_cache`
Cached GitHub velocity metrics.

| Field | Type | Description |
|-------|------|-------------|
| project | UUID | Project reference |
| metrics | JSONB | Cached metrics |
| cached_at | DATETIME | Cache time |

#### `activities`
General activity tracking.

| Field | Type | Description |
|-------|------|-------------|
| activity_type | STRING | Activity type |
| user | UUID | User (FK: directus_users) |
| metadata | JSONB | Activity metadata |
| timestamp | DATETIME | Activity time |

---

## Hidden Collections

These collections are junction/detail tables and don't appear in the sidebar:

- `activity_attachments` - Files attached to activities
- `activity_contacts` - Contacts in activities (M2M)
- `deal_contacts` - Contacts in deals (M2M)
- `os_invoice_items` - Invoice line items
- `message_attachments` - Message file attachments (M2M)
- `conversation_participants` - Conversation participants (M2M)
- `project_github_issues` - Cached GitHub issues (M2M)
- `project_github_prs` - Cached GitHub PRs (M2M)
- `os_activity_contacts` - Activity contacts (M2M)
- `os_deal_contacts` - Deal contacts (M2M)
- `os_project_contacts` - Project contacts (M2M)
- `os_project_files` - Project files (M2M)
- `os_proposal_blocks` - Proposal content blocks (M2M)
- `os_proposal_contacts` - Proposal contacts (M2M)
- `os_task_files` - Task files (M2M)

---

## Migrations

Database schema is managed through SQL migrations located in `services/directus/migrations/`:

- **071-077**: Core collections (deals, projects, invoices, proposals, help, blocks)
- **078**: PostgreSQL triggers for invoice calculations
- **079**: Collection metadata (icons, colors, notes)
- **080**: Fixed collection group naming (added synthstack_ prefix)

---

## Automation

### PostgreSQL Triggers

**Invoice Calculation** (`trigger_calculate_invoice_item`):
- Automatically calculates `line_amount = unit_price × quantity`
- Calculates `tax_amount = line_amount × tax_rate`
- Updates on `os_invoice_items` INSERT/UPDATE

**Invoice Totals** (`trigger_update_invoice_totals`):
- Recalculates invoice `subtotal`, `total_tax`, `total`
- Updates `amount_due = total - amount_paid`
- Triggers on `os_invoice_items` changes

---

## Access & Permissions

**Admin Access**: http://localhost:8099/admin (dev) / https://admin.synthstack.app (prod)

**Default Credentials**:
- Email: `team@manic.agency`
- Password: `Synthstackadmin!`

**Role-Based Access**:
- **Admin**: Full access to all collections
- **Team Member**: Read/write on projects, tasks, activities
- **Client**: Read-only on portal collections (where `is_visible_to_client = true`)
- **Accountant**: Full access to billing, read-only elsewhere

---

## API Access

All collections accessible via Directus REST/GraphQL API:

**REST**:
```bash
GET  /items/os_invoices
POST /items/os_invoices
GET  /items/os_invoices/{id}
PATCH /items/os_invoices/{id}
DELETE /items/os_invoices/{id}
```

**GraphQL**:
```graphql
query {
  os_invoices {
    invoice_number
    total
    organization {
      name
    }
  }
}
```

---

## Support

For questions about collections or schema:
- Documentation: `/docs`
- Admin CMS: http://localhost:8099/admin
- GitHub Issues: https://github.com/manicinc/synthstack/issues

---

**License**: MIT - See LICENSE file for details
