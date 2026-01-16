-- AI Copilot Dashboard
-- Creates a default dashboard with the AI Copilot widget

-- Create the dashboard
INSERT INTO directus_dashboards (id, name, icon, note, color)
VALUES (
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'AI Copilot',
  'smart_toy',
  'Live AI assistant for SynthStack',
  '#6366F1'
)
ON CONFLICT (id) DO NOTHING;

-- Create the AI Copilot panel (full-width, taller for better UX)
INSERT INTO directus_panels (id, dashboard, name, icon, color, show_header, note, type, position_x, position_y, width, height, options)
VALUES (
  'b2c3d4e5-f6a7-4b5c-8d9e-0f1a2b3c4d5e',
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  '💬 Chat with AI',
  'smart_toy',
  '#6366F1',
  true,
  'Your intelligent assistant for SynthStack, Directus, and data management',
  'copilot-widget',
  1,
  1,
  24,
  20,
  '{"height": 700, "model": "gpt-4"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE directus_dashboards IS 'Custom dashboards for insights and analytics';
COMMENT ON TABLE directus_panels IS 'Dashboard panels displaying various data visualizations';
