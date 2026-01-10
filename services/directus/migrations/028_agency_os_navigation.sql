-- Add Agency-OS modules to navigation and enable theme toggle

-- Update module bar with organized navigation groups
UPDATE directus_settings
SET module_bar = '[
  {"type": "module", "id": "content", "enabled": true},
  {"type": "module", "id": "users", "enabled": true},
  {"type": "module", "id": "files", "enabled": true},
  {"type": "module", "id": "insights", "enabled": true},
  {"type": "divider"},
  {"type": "label", "name": "Business", "color": "#6366F1"},
  {"type": "link", "name": "Organizations", "icon": "business", "url": "/admin/content/organizations", "color": "#6366F1"},
  {"type": "link", "name": "Contacts", "icon": "people", "url": "/admin/content/contacts", "color": "#10B981"},
  {"type": "link", "name": "Deals", "icon": "trending_up", "url": "/admin/content/deals", "color": "#F59E0B"},
  {"type": "divider"},
  {"type": "label", "name": "Invoicing", "color": "#8B5CF6"},
  {"type": "link", "name": "Invoices", "icon": "receipt", "url": "/admin/content/invoices", "color": "#8B5CF6"},
  {"type": "link", "name": "Payments", "icon": "payments", "url": "/admin/content/payments", "color": "#10B981"},
  {"type": "link", "name": "Expenses", "icon": "shopping_cart", "url": "/admin/content/expenses", "color": "#EF4444"},
  {"type": "divider"},
  {"type": "link", "name": "Proposals", "icon": "description", "url": "/admin/content/proposals", "color": "#06B6D4"},
  {"type": "divider"},
  {"type": "module", "id": "settings", "enabled": true}
]'::json
WHERE id = 1;

-- Enable light/dark theme toggle
UPDATE directus_settings
SET
  default_theme_light = NULL,  -- Allow system to use default Directus light theme
  default_theme_dark = NULL,   -- Allow system to use default Directus dark theme
  default_appearance = 'auto'  -- Let users choose light/dark/auto
WHERE id = 1;

-- Verify the changes
SELECT project_name, project_color, default_appearance FROM directus_settings;
