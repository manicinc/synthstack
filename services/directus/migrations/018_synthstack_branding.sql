-- SynthStack Branding Configuration
-- This migration sets up the Directus branding for SynthStack
--
-- IMPORTANT: The logo files must exist at /directus/uploads/
-- Copy from public folder in Dockerfile

-- Insert logo mark (icon only - light background) into directus_files
INSERT INTO directus_files (
  id,
  storage,
  filename_disk,
  filename_download,
  title,
  type,
  uploaded_on,
  filesize,
  width,
  height
) VALUES (
  'a1b2c3d4-0001-4000-8000-000000000001'::uuid,
  'local',
  'logo-mark.svg',
  'synthstack-logo-mark.svg',
  'SynthStack Logo Mark',
  'image/svg+xml',
  NOW(),
  1093,
  40,
  40
) ON CONFLICT (id) DO NOTHING;

-- Insert logo dark (for dark theme) into directus_files
INSERT INTO directus_files (
  id,
  storage,
  filename_disk,
  filename_download,
  title,
  type,
  uploaded_on,
  filesize,
  width,
  height
) VALUES (
  'a1b2c3d4-0001-4000-8000-000000000002'::uuid,
  'local',
  'logo-dark.svg',
  'synthstack-logo-dark.svg',
  'SynthStack Logo (Dark Theme)',
  'image/svg+xml',
  NOW(),
  1554,
  200,
  48
) ON CONFLICT (id) DO NOTHING;

-- Insert favicon into directus_files
INSERT INTO directus_files (
  id,
  storage,
  filename_disk,
  filename_download,
  title,
  type,
  uploaded_on,
  filesize,
  width,
  height
) VALUES (
  'a1b2c3d4-0001-4000-8000-000000000003'::uuid,
  'local',
  'favicon.svg',
  'synthstack-favicon.svg',
  'SynthStack Favicon',
  'image/svg+xml',
  NOW(),
  1107,
  32,
  32
) ON CONFLICT (id) DO NOTHING;

-- Insert or update directus_settings with SynthStack branding
-- Using logo mark for logo and favicon (both are the S icon)
INSERT INTO directus_settings (
  id,
  project_name,
  project_descriptor,
  project_color,
  project_logo,
  public_favicon,
  default_language,
  default_appearance
) VALUES (
  1,
  'SynthStack',
  'Your Agency in a Box',
  '#6366F1',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000003',
  'en-US',
  'dark'
) ON CONFLICT (id) DO UPDATE SET
  project_name = 'SynthStack',
  project_descriptor = 'Your Agency in a Box',
  project_color = '#6366F1',
  project_logo = 'a1b2c3d4-0001-4000-8000-000000000001',
  public_favicon = 'a1b2c3d4-0001-4000-8000-000000000003',
  default_appearance = 'dark';

-- Register collections in Directus if not already registered
INSERT INTO directus_collections (collection, icon, note, hidden, singleton, sort)
VALUES
  ('app_users', 'people', 'Application users', false, false, 1),
  ('user_subscriptions', 'credit_card', 'User subscriptions', false, false, 2),
  ('credit_transactions', 'account_balance', 'Credit transactions', false, false, 3),
  ('print_profiles', 'print', 'Print profiles', false, false, 4),
  ('printers', 'devices', 'Printers', false, false, 5),
  ('filaments', 'inventory_2', 'Filaments', false, false, 6),
  ('blog_posts', 'article', 'Blog posts', false, false, 7),
  ('blog_categories', 'category', 'Blog categories', false, false, 8),
  ('documents', 'description', 'RAG Documents', false, false, 9),
  ('document_chunks', 'segment', 'Document chunks for RAG', false, false, 10),
  ('themes', 'palette', 'Website themes', false, false, 11),
  ('feature_flags', 'toggle_on', 'Feature flags', false, false, 12),
  ('ai_agents', 'smart_toy', 'AI Agents', false, false, 13),
  ('copilot_sessions', 'chat', 'Copilot chat sessions', false, false, 14),
  ('copilot_messages', 'message', 'Copilot messages', false, false, 15),
  ('onboarding_progress', 'school', 'Onboarding progress', false, false, 16),
  ('referral_codes', 'share', 'Referral codes', false, false, 17),
  ('referral_uses', 'people', 'Referral uses', false, false, 18),
  ('user_feature_overrides', 'admin_panel_settings', 'User feature overrides', false, false, 19)
ON CONFLICT (collection) DO NOTHING;

-- Create AI Co-Founders insight dashboard if not exists
INSERT INTO directus_dashboards (id, name, icon, note, color)
VALUES
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'AI Co-Founders', 'groups', 'Multi-agent AI Co-Founders dashboard with specialized AI experts', '#6366F1'),
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'AI Copilot', 'smart_toy', 'Live AI assistant for SynthStack', '#10B981')
ON CONFLICT (id) DO NOTHING;

-- Create panels for AI Co-Founders dashboard
INSERT INTO directus_panels (id, dashboard, name, icon, color, show_header, note, type, position_x, position_y, width, height, options)
VALUES
  ('95628a3b-524e-417f-9b82-e66c8ee671a3', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'AI Co-Founders Widget', 'groups', '#6366F1', true, 'Multi-agent chat', 'ai-cofounders', 1, 1, 12, 12, '{"height": 600}'),
  ('97ab350b-4f04-4fd9-bbc6-ed6606709da6', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Agent Stats', 'analytics', '#10B981', true, 'Agent usage stats', 'ai-cofounders', 13, 1, 6, 6, '{"height": 300}')
ON CONFLICT (id) DO NOTHING;

-- Create panel for AI Copilot dashboard
INSERT INTO directus_panels (id, dashboard, name, icon, color, show_header, note, type, position_x, position_y, width, height, options)
VALUES
  ('da1e3c96-c55b-4f65-abcb-f3217e4de90d', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Chat with AI', 'chat', '#10B981', true, 'Live AI chat', 'copilot-widget', 1, 1, 12, 10, '{"height": 500}')
ON CONFLICT (id) DO NOTHING;
