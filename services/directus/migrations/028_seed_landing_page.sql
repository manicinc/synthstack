-- Seed Landing Page Content
-- Migration 028: Add home/landing page content to pages collection

-- Insert home page with all hero and marketing content
INSERT INTO pages (
  status,
  title,
  slug,
  description,
  content,
  meta_title,
  meta_description,
  created_at,
  updated_at
) VALUES (
  'published',
  'SynthStack - Your Agency in a Box',
  'home',
  'AI-Native. Cross-Platform.',
  '<h1>Your Agency in a Box</h1>
<h2>AI-Native. Cross-Platform.</h2>
<p>Vue Quasar full-stack boilerplate with <strong>6 AI Co-Founders</strong> that know your business and take action. Complete with CMS, analytics, email, payments, and AI agents that write code, blog posts, and marketing content. Ship your next project 10x faster.</p>

<h2>Built with modern, battle-tested technologies</h2>
<ul>
  <li>Vue 3 + Quasar</li>
  <li>Fastify API</li>
  <li>Directus CMS</li>
  <li>PostgreSQL</li>
  <li>Supabase Auth</li>
  <li>Qdrant Vector DB</li>
</ul>

<h2>Complete Admin Dashboard</h2>
<p>Full-featured CMS and administrative control center powered by Directus</p>

<h2>Self-Hosted & Open Source</h2>
<p>MIT License (open source). Deploy on your own infrastructure or use our cloud hosting. Full control over your data and customizations.</p>',
  'SynthStack - Your Agency in a Box | AI-Native Full-Stack Platform',
  'Vue Quasar full-stack boilerplate with 6 AI Co-Founders. Complete with CMS, analytics, email, payments, and AI agents. Ship 10x faster.',
  NOW(),
  NOW()
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  content = EXCLUDED.content,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description,
  updated_at = NOW();

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE pages IS 'Marketing and landing pages with visual editing support';
