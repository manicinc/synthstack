-- SynthStack Sample Content Seed
-- Run after migration 003

-- Blog categories
INSERT INTO blog_categories (id, name, slug, description, color) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Tutorials', 'tutorials', 'Step-by-step guides', '#6366F1'),
  ('22222222-2222-2222-2222-222222222222', 'Announcements', 'announcements', 'Product updates', '#10B981'),
  ('33333333-3333-3333-3333-333333333333', 'Best Practices', 'best-practices', 'Tips from the team', '#F59E0B')
ON CONFLICT (slug) DO NOTHING;

-- Blog authors
INSERT INTO blog_authors (id, name, slug, bio) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SynthStack Team', 'synthstack-team', 'Building the future of AI-native SaaS development.')
ON CONFLICT (slug) DO NOTHING;

-- Blog posts
INSERT INTO blog_posts (title, slug, summary, body, category_id, author_id, status, published_at, read_time, featured) VALUES
  (
    'Getting Started with SynthStack',
    'getting-started-synthstack',
    'Learn how to build and deploy your AI-powered SaaS in under an hour with our comprehensive boilerplate.',
    E'# Getting Started with SynthStack\n\nWelcome! This guide will walk you through:\n\n## Quick Setup\n\n1. Clone the repo\n2. Configure environment variables\n3. Run Docker services\n4. Start building\n\n## Key Features\n\n- **Authentication** with Supabase\n- **Payments** via Stripe\n- **AI Integration** with OpenAI/Anthropic\n- **Community Forums** built-in\n- **Admin CMS** powered by Directus\n\nLet''s get started!',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'published',
    NOW() - INTERVAL '5 days',
    8,
    true
  ),
  (
    'Integrating OpenAI into Your SaaS',
    'openai-integration-guide',
    'A complete guide to adding OpenAI chat completions and streaming to your SynthStack application.',
    E'# Integrating OpenAI\n\n## Setup\n\nSynthStack comes with OpenAI pre-configured.\n\n## Usage\n\n```typescript\nimport { createOpenAIProvider } from ''@synthstack/ai'';\n\nconst ai = createOpenAIProvider(apiKey);\nconst response = await ai.chat(messages);\n```\n\n## Streaming\n\nEnable real-time responses...',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'published',
    NOW() - INTERVAL '3 days',
    12,
    false
  ),
  (
    'SynthStack v1.0 Launch',
    'synthstack-v1-launch',
    'We''re excited to announce the official launch of SynthStack - the complete AI-native SaaS boilerplate.',
    E'# SynthStack v1.0 is Here!\n\n## What''s Included\n\n- Full authentication flow\n- Stripe subscription tiers\n- AI integration package\n- Community forums\n- Admin CMS\n- And more!\n\n## Get Started\n\nCheck out our Quick Start guide to deploy your first SaaS today.',
    '22222222-2222-2222-2222-222222222222',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'published',
    NOW() - INTERVAL '1 day',
    5,
    false
  )
ON CONFLICT (slug) DO NOTHING;

-- FAQ items
INSERT INTO faq_items (question, answer, category, status) VALUES
  ('What is SynthStack?', 'SynthStack is an AI-native SaaS boilerplate with authentication, subscriptions, community forums, CMS, and AI integration out of the box. It helps you ship faster by providing all the common SaaS features pre-built.', 'General', 'published'),
  ('Is SynthStack free to use?', 'Yes! SynthStack is open source under the MIT license. You can use it for any project, commercial or personal.', 'Pricing', 'published'),
  ('What AI providers are supported?', 'We support OpenAI (GPT-4, GPT-3.5) and Anthropic (Claude) with streaming chat completions, embeddings, and more.', 'Technical', 'published'),
  ('Can I customize the branding?', 'Absolutely! All branding, colors, logos, and content are fully customizable. Check our design system docs for details.', 'General', 'published'),
  ('How do I deploy to production?', 'We provide Docker Compose files for production deployment. You can also deploy to any platform that supports Node.js and PostgreSQL.', 'Technical', 'published'),
  ('What payment processors are supported?', 'Currently we support Stripe for subscriptions and one-time payments. The integration includes webhooks, customer portal, and usage-based billing.', 'Pricing', 'published')
ON CONFLICT DO NOTHING;

-- Company pages
INSERT INTO company_pages (slug, title, content, status, seo_title, seo_description) VALUES
  (
    'about',
    'About SynthStack',
    E'# About SynthStack\n\nWe built SynthStack to solve a problem we faced ourselves: every new SaaS project required building the same authentication, payment, and community features from scratch.\n\n## Our Mission\n\nTo empower developers to ship AI-powered products faster by providing a production-ready, fully-featured boilerplate.\n\n## What Makes Us Different\n\n- **AI-First**: Built with OpenAI and Anthropic integration from day one\n- **Complete**: Not just a template - includes CMS, admin, community, and more\n- **Battle-Tested**: Used in production by multiple startups\n- **Open Source**: MIT licensed, community-driven\n\n## The Team\n\nBuilt with care by [Manic Agency](https://manic.agency)',
    'published',
    'About SynthStack - AI-Native SaaS Boilerplate',
    'Learn about SynthStack and our mission to help developers ship AI-powered SaaS products faster.'
  ),
  (
    'contact',
    'Contact Us',
    E'# Get In Touch\n\nHave questions about SynthStack? Want to collaborate or contribute? We''d love to hear from you.\n\n## Ways to Reach Us\n\n- **Email**: support@synthstack.app\n- **GitHub**: [github.com/manicinc/synthstack](https://github.com/manicinc/synthstack)\n- **Discord**: Join our community\n\nUse the form on this page to send us a message directly.',
    'published',
    'Contact SynthStack',
    'Get in touch with the SynthStack team. We''re here to help!'
  )
ON CONFLICT (slug) DO NOTHING;

-- Career openings
INSERT INTO career_openings (title, slug, department, location, employment_type, description, requirements, benefits, status, posted_at, salary_min, salary_max) VALUES
  (
    'Senior Full Stack Engineer',
    'senior-fullstack-engineer',
    'Engineering',
    'Remote (US/EU)',
    'full-time',
    E'# Senior Full Stack Engineer\n\n## About the Role\n\nJoin our core team to build and maintain SynthStack, helping thousands of developers ship AI-powered SaaS products.\n\n## What You''ll Do\n\n- Architect and build new features across the stack\n- Integrate cutting-edge AI APIs (OpenAI, Anthropic, etc.)\n- Optimize performance and scalability\n- Mentor junior engineers\n- Work directly with our user community',
    E'## Requirements\n\n- 5+ years of full-stack development\n- Expert in TypeScript, Vue.js (or React), Node.js\n- Experience with PostgreSQL, Redis\n- Familiarity with AI/LLMs and their APIs\n- Strong understanding of SaaS architecture\n- Excellent communication skills',
    E'## Benefits\n\n- Competitive salary ($120k-180k)\n- Equity package\n- Fully remote\n- Flexible hours\n- $2k/year learning budget\n- Latest MacBook Pro\n- Health insurance',
    'open',
    NOW() - INTERVAL '10 days',
    120000,
    180000
  ),
  (
    'Developer Advocate',
    'developer-advocate',
    'Marketing',
    'Remote (Global)',
    'full-time',
    E'# Developer Advocate\n\n## About the Role\n\nHelp developers succeed with SynthStack through content creation, community engagement, and technical support.\n\n## What You''ll Do\n\n- Create tutorials, guides, and video content\n- Engage with the developer community\n- Provide technical support\n- Represent SynthStack at conferences\n- Gather feedback and improve documentation',
    E'## Requirements\n\n- 3+ years as a developer\n- Experience with Vue.js, TypeScript, Node.js\n- Excellent written and verbal communication\n- Active on social media (Twitter, YouTube, etc.)\n- Passion for developer tools and AI',
    E'## Benefits\n\n- Competitive salary ($80k-120k)\n- Fully remote\n- Conference travel budget\n- Equipment budget\n- Health insurance',
    'open',
    NOW() - INTERVAL '7 days',
    80000,
    120000
  )
ON CONFLICT (slug) DO NOTHING;

